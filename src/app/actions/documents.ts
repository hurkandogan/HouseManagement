"use server";

import { adminDb } from "@/lib/firebase/admin";
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

export async function createDocument(data: Omit<Document, "id" | "uploadedAt">) {
  try {
    const docRef = await adminDb.collection("documents").add({
      ...data,
      uploadedAt: new Date().toISOString()
    });
    revalidatePath("/documents");
    revalidatePath("/properties/[id]");
    return { success: true, id: docRef.id };
  } catch (error) {
    console.error("Error creating document:", error);
    return { success: false, error: "Failed to create document" };
  }
}

export async function deleteDocument(id: string) {
  try {
    await adminDb.collection("documents").doc(id).delete();
    revalidatePath("/documents");
    revalidatePath("/properties/[id]");
    return { success: true };
  } catch (error) {
    console.error("Error deleting document:", error);
    return { success: false, error: "Failed to delete document" };
  }
}
