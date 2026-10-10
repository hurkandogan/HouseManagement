"use server";

import { adminDb, adminStorage } from "@/lib/firebase/admin";
import { getDownloadURL } from "firebase-admin/storage";
import { revalidatePath } from "next/cache";
import { v4 as uuidv4 } from "uuid";

export interface Document {
  id: string;
  title: string;
  propertyId: string | null; // null means "General"
  fileUrl: string;
  fileName: string;
  fileType: string;
  size: number;
  uploadedAt: string;
}

let corsConfigured = false;
async function ensureBucketCors() {
  if (corsConfigured) return;
  try {
    await adminStorage.setCorsConfiguration([
      {
        maxAgeSeconds: 3600,
        method: ["GET", "PUT", "POST", "DELETE", "HEAD", "OPTIONS"],
        origin: ["*"],
        responseHeader: ["*"],
      },
    ]);
    corsConfigured = true;
  } catch (err) {
    console.error("Warning: Failed to auto-configure GCS CORS:", err);
  }
}

/**
 * Generates a signed upload URL to allow direct browser uploads to Google Cloud Storage.
 * Bypasses Cloud Run / Next.js Server Action 32MB payload limit for large files (e.g. 50MB+ PDFs).
 */
export async function getSignedUploadUrl(folder: "expenses" | "documents", fileName: string, contentType: string) {
  try {
    await ensureBucketCors();
    const cleanFileName = fileName.replace(/[^a-zA-Z0-9_.-]/g, "_");
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const filePath = `${folder}/${uniqueSuffix}-${cleanFileName}`;
    const file = adminStorage.file(filePath);

    const downloadToken = uuidv4();

    const [uploadUrl] = await file.getSignedUrl({
      version: "v4",
      action: "write",
      expires: Date.now() + 15 * 60 * 1000, // 15 minutes
      contentType: contentType || "application/octet-stream",
    });

    const downloadUrl = `https://firebasestorage.googleapis.com/v0/b/${adminStorage.name}/o/${encodeURIComponent(filePath)}?alt=media&token=${downloadToken}`;

    return { success: true, uploadUrl, downloadUrl, fileName: cleanFileName, filePath, downloadToken };
  } catch (error: any) {
    console.error("Error generating signed upload URL:", error);
    return { success: false, error: error?.message || "Failed to prepare file upload." };
  }
}

export async function getDocuments(): Promise<Document[]> {
  try {
    const snapshot = await adminDb.collection("documents").orderBy("uploadedAt", "desc").get();
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Document));
  } catch (error) {
    console.error("Error fetching documents:", error);
    return [];
  }
}

export async function createDocument(formData: FormData) {
  try {
    const title = formData.get("title") as string;
    const rawPropertyId = formData.get("propertyId") as string | null;
    const propertyId = rawPropertyId === "general" || !rawPropertyId ? null : rawPropertyId;

    let fileUrl = formData.get("fileUrl") as string | null;
    let fileName = formData.get("fileName") as string | null;
    let filePath = formData.get("filePath") as string | null;
    let downloadToken = formData.get("downloadToken") as string | null;
    let fileType = (formData.get("fileType") as string) || "application/octet-stream";
    let size = parseInt((formData.get("size") as string) || "0", 10);

    const file = formData.get("file") as File | null;

    // Attach download token metadata to GCS file if uploaded directly
    if (filePath && downloadToken) {
      try {
        await adminStorage.file(filePath).setMetadata({
          metadata: {
            firebaseStorageDownloadTokens: downloadToken,
          }
        });
      } catch (metaErr) {
        console.error("Error setting download token metadata:", metaErr);
      }
    }

    // Fallback if file was uploaded via server action (small files)
    if (!fileUrl && file && file.size > 0) {
      fileName = file.name;
      fileType = file.type || "application/octet-stream";
      size = file.size;

      const buffer = Buffer.from(await file.arrayBuffer());
      const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      const newFilePath = `documents/${uniqueSuffix}-${fileName}`;

      const storageFile = adminStorage.file(newFilePath);
      const token = uuidv4();
      await storageFile.save(buffer, {
        metadata: {
          contentType: fileType,
          metadata: {
            firebaseStorageDownloadTokens: token,
          }
        }
      });

      fileUrl = `https://firebasestorage.googleapis.com/v0/b/${adminStorage.name}/o/${encodeURIComponent(newFilePath)}?alt=media&token=${token}`;
    }

    if (!fileUrl || !title) {
      return { success: false, error: "Please provide a document title and select a file." };
    }

    const docRef = await adminDb.collection("documents").add({
      title,
      propertyId,
      fileUrl,
      fileName: fileName || "document",
      fileType,
      size,
      uploadedAt: new Date().toISOString()
    });

    revalidatePath("/documents");
    revalidatePath("/properties/[id]");
    return { success: true, id: docRef.id };
  } catch (error: any) {
    console.error("Error creating document:", error);
    return { success: false, error: error?.message || "Failed to create document." };
  }
}

export async function deleteDocument(id: string) {
  try {
    const docSnap = await adminDb.collection("documents").doc(id).get();
    if (docSnap.exists) {
      const data = docSnap.data() as Document;
      if (data.fileUrl) {
        try {
          const urlObj = new URL(data.fileUrl);
          const bucketPrefix = `/${adminStorage.name}/`;
          const filePath = decodeURIComponent(
            urlObj.pathname.startsWith(bucketPrefix)
              ? urlObj.pathname.slice(bucketPrefix.length)
              : urlObj.pathname.slice(1)
          );
          await adminStorage.file(filePath).delete();
        } catch (storageErr) {
          console.error("Error deleting document file from storage:", storageErr);
        }
      }
    }

    await adminDb.collection("documents").doc(id).delete();
    revalidatePath("/documents");
    revalidatePath("/properties/[id]");
    return { success: true };
  } catch (error: any) {
    console.error("Error deleting document:", error);
    return { success: false, error: error?.message || "Failed to delete document." };
  }
}
