"use server";

import { adminDb } from "@/lib/firebase/admin";

export interface Tag {
  id: string;
  value: string; // the internal ID/slug (e.g., 'plumbing')
  label: string; // the display name (e.g., 'Plumbing')
  color: string; // HEX color for tags
  createdAt: string;
}

const COLLECTION_NAME = "tags";

// Seed default tags if none exist
const DEFAULT_TAGS = [
  { value: "plumbing", label: "Plumbing", color: "#3b82f6" },
  { value: "electrical", label: "Electrical", color: "#eab308" },
  { value: "cleaning", label: "Cleaning", color: "#10b981" }
];

export async function seedDefaultTags() {
  const snapshot = await adminDb.collection(COLLECTION_NAME).limit(1).get();
  if (snapshot.empty) {
    const batch = adminDb.batch();
    for (const tag of DEFAULT_TAGS) {
      const docRef = adminDb.collection(COLLECTION_NAME).doc();
      batch.set(docRef, {
        ...tag,
        createdAt: new Date().toISOString()
      });
    }
    await batch.commit();
  }
}

export async function getTags(): Promise<Tag[]> {
  await seedDefaultTags(); // Ensure defaults exist
  
  const snapshot = await adminDb.collection(COLLECTION_NAME).orderBy("createdAt", "asc").get();
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  } as Tag));
}

export async function createTag(data: Omit<Tag, "id" | "createdAt">) {
  const docRef = await adminDb.collection(COLLECTION_NAME).add({
    ...data,
    createdAt: new Date().toISOString()
  });
  return docRef.id;
}

export async function updateTag(id: string, data: Partial<Omit<Tag, "id" | "createdAt">>) {
  await adminDb.collection(COLLECTION_NAME).doc(id).update(data);
}

export async function deleteTag(id: string) {
  await adminDb.collection(COLLECTION_NAME).doc(id).delete();
}
