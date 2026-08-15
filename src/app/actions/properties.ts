"use server";

import { adminDb } from "@/lib/firebase/admin";
import { revalidatePath } from "next/cache";

export type Property = {
  id: string;
  name: string;
  address?: string;
  type: "building" | "apartment" | "private" | "corporate";
  parentId: string | null;
  createdAt?: string;
};

export async function getProperties(): Promise<Property[]> {
  try {
    const snapshot = await adminDb.collection("properties").get();
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Property));
  } catch (error) {
    console.error("Error fetching properties:", error);
    return [];
  }
}

export async function getPropertyById(id: string): Promise<Property | null> {
  try {
    const doc = await adminDb.collection("properties").doc(id).get();
    if (!doc.exists) return null;
    return {
      id: doc.id,
      ...doc.data()
    } as Property;
  } catch (error) {
    console.error("Error fetching property by id:", error);
    return null;
  }
}

export async function createProperty(data: Omit<Property, "id" | "createdAt">) {
  try {
    const docRef = await adminDb.collection("properties").add({
      ...data,
      createdAt: new Date().toISOString()
    });
    return { success: true, id: docRef.id };
  } catch (error) {
    console.error("Error creating property:", error);
    return { success: false, error: "Failed to create property." };
  }
}

export async function updateProperty(id: string, data: Partial<Omit<Property, "id" | "createdAt">>) {
  try {
    await adminDb.collection("properties").doc(id).update(data);
    return { success: true };
  } catch (error) {
    console.error("Error updating property:", error);
    return { success: false, error: "Failed to update property." };
  }
}

export async function deleteProperty(id: string) {
  try {
    await adminDb.collection("properties").doc(id).delete();
    revalidatePath("/properties");
    return { success: true };
  } catch (error) {
    console.error("Error deleting property:", error);
    return { success: false, error: "Failed to delete property." };
  }
}
