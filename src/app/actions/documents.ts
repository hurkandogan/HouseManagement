"use server";

import { adminDb, adminStorage } from "@/lib/firebase/admin";
import { getDownloadURL } from "firebase-admin/storage";
import { revalidatePath } from "next/cache";

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
    const file = formData.get("file") as File | null;

    if (!file || file.size === 0 || !title) {
      return { success: false, error: "Please provide a document title and select a file." };
    }

    const fileName = file.name;
    const buffer = Buffer.from(await file.arrayBuffer());
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const filePath = `documents/${uniqueSuffix}-${fileName}`;

    const storageFile = adminStorage.file(filePath);
    await storageFile.save(buffer, {
      metadata: {
        contentType: file.type || "application/octet-stream",
      }
    });

    const fileUrl = await getDownloadURL(storageFile);

    const docRef = await adminDb.collection("documents").add({
      title,
      propertyId,
      fileUrl,
      fileName,
      fileType: file.type || "application/octet-stream",
      size: file.size,
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
