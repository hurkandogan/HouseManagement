"use server";

import { adminDb } from "@/lib/firebase/admin";

export interface Category {
  id: string;
  value: string; // the internal ID/slug (e.g., 'maintenance')
  label: string; // the display name (e.g., 'Maintenance')
  color: string; // HEX color for charts
  createdAt: string;
}

const COLLECTION_NAME = "categories";

// Seed default categories if none exist
const DEFAULT_CATEGORIES = [
  { value: "maintenance", label: "Maintenance", color: "#3b82f6" },
  { value: "utilities", label: "Utilities", color: "#10b981" },
  { value: "insurance", label: "Insurance", color: "#8b5cf6" },
  { value: "taxes", label: "Taxes", color: "#f59e0b" },
  { value: "other", label: "Other", color: "#64748b" }
];

export async function seedDefaultCategories() {
  const snapshot = await adminDb.collection(COLLECTION_NAME).limit(1).get();
  if (snapshot.empty) {
    const batch = adminDb.batch();
    for (const cat of DEFAULT_CATEGORIES) {
      const docRef = adminDb.collection(COLLECTION_NAME).doc();
      batch.set(docRef, {
        ...cat,
        createdAt: new Date().toISOString()
      });
    }
    await batch.commit();
  }
}

export async function getCategories(): Promise<Category[]> {
  await seedDefaultCategories(); // Ensure defaults exist
  
  const snapshot = await adminDb.collection(COLLECTION_NAME).orderBy("createdAt", "asc").get();
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  } as Category));
}

export async function createCategory(data: Omit<Category, "id" | "createdAt">) {
  const docRef = await adminDb.collection(COLLECTION_NAME).add({
    ...data,
    createdAt: new Date().toISOString()
  });
  return docRef.id;
}

export async function updateCategory(id: string, data: Partial<Omit<Category, "id" | "createdAt">>) {
  await adminDb.collection(COLLECTION_NAME).doc(id).update(data);
}

export async function deleteCategory(id: string) {
  await adminDb.collection(COLLECTION_NAME).doc(id).delete();
}
