"use server";

import { adminDb, adminStorage } from "@/lib/firebase/admin";

export type Expense = {
  id: string;
  propertyId: string;
  title: string;
  amount: number;
  date: string;
  category: "maintenance" | "utilities" | "tax" | "insurance" | "other";
  documentUrl: string | null;
  fileName: string | null;
  tags?: string[];
  vendor?: string;
  contractId?: string;
  isArchived?: boolean;
  createdAt?: string;
};

export async function getExpenses() {
  try {
    const snapshot = await adminDb.collection("expenses").orderBy("date", "desc").get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Expense));
  } catch (error) {
    console.error("Error fetching expenses:", error);
    return [];
  }
}

export async function createExpense(formData: FormData) {
  try {
    const propertyId = formData.get("propertyId") as string;
    const title = formData.get("title") as string;
    const amount = parseFloat(formData.get("amount") as string);
    const date = formData.get("date") as string;
    const category = formData.get("category") as Expense["category"];
    const tagsStr = formData.get("tags") as string;
    const tags = tagsStr ? JSON.parse(tagsStr) : [];
    const vendor = formData.get("vendor") as string | null;
    const contractId = formData.get("contractId") as string | null;
    const file = formData.get("file") as File | null;

    let documentUrl = null;
    let fileName = null;

    if (file && file.size > 0) {
      fileName = file.name;
      const buffer = Buffer.from(await file.arrayBuffer());
      const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      const filePath = `expenses/${uniqueSuffix}-${fileName}`;
      
      const storageFile = adminStorage.file(filePath);
      await storageFile.save(buffer, {
        metadata: {
          contentType: file.type,
        }
      });
      
      // Make it public
      await storageFile.makePublic();
      documentUrl = `https://storage.googleapis.com/${adminStorage.name}/${filePath}`;
    }

    const expenseData: Omit<Expense, "id" | "createdAt"> = {
      propertyId,
      title,
      amount,
      date,
      category,
      documentUrl,
      fileName,
      tags,
      isArchived: false
    };

    if (vendor) {
      expenseData.vendor = vendor;
    }

    if (vendor) {
      expenseData.vendor = vendor;
    }

    if (contractId) {
      expenseData.contractId = contractId;
    }

    const docRef = await adminDb.collection("expenses").add({
      ...expenseData,
      createdAt: new Date().toISOString()
    });

    return { success: true, id: docRef.id };
  } catch (error) {
    console.error("Error creating expense:", error);
    return { success: false, error: "Failed to create expense." };
  }
}

export async function updateExpense(id: string, formData: FormData, oldDocumentUrl?: string | null) {
  try {
    const propertyId = formData.get("propertyId") as string;
    const title = formData.get("title") as string;
    const amount = parseFloat(formData.get("amount") as string);
    const date = formData.get("date") as string;
    const category = formData.get("category") as Expense["category"];
    const tagsStr = formData.get("tags") as string;
    const tags = tagsStr ? JSON.parse(tagsStr) : [];
    const vendor = formData.get("vendor") as string | null;
    const contractId = formData.get("contractId") as string | null;
    const file = formData.get("file") as File | null;

    let documentUrl = oldDocumentUrl || null;
    let fileName = formData.get("oldFileName") as string | null;

    // If there's a new file, upload it
    if (file && file.size > 0) {
      fileName = file.name;
      const buffer = Buffer.from(await file.arrayBuffer());
      const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      const filePath = `expenses/${uniqueSuffix}-${fileName}`;
      
      const storageFile = adminStorage.file(filePath);
      await storageFile.save(buffer, {
        metadata: {
          contentType: file.type,
        }
      });
      
      await storageFile.makePublic();
      documentUrl = `https://storage.googleapis.com/${adminStorage.name}/${filePath}`;

      // Delete the old file if it exists
      if (oldDocumentUrl) {
        const urlObj = new URL(oldDocumentUrl);
        const bucketPrefix = `/${adminStorage.name}/`;
        const oldFilePath = decodeURIComponent(urlObj.pathname.startsWith(bucketPrefix) 
          ? urlObj.pathname.slice(bucketPrefix.length) 
          : urlObj.pathname.slice(1));
        try {
          await adminStorage.file(oldFilePath).delete();
        } catch (e) {
          console.error("Error deleting old file:", e);
        }
      }
    }

    const expenseData: Partial<Omit<Expense, "id" | "createdAt">> = {
      propertyId,
      title,
      amount,
      date,
      category,
      documentUrl,
      fileName,
      tags
    };

    if (vendor !== null) {
      expenseData.vendor = vendor;
    }

    if (contractId) {
      expenseData.contractId = contractId;
    }

    await adminDb.collection("expenses").doc(id).update(expenseData);

    return { success: true };
  } catch (error) {
    console.error("Error updating expense:", error);
    return { success: false, error: "Failed to update expense." };
  }
}

export async function deleteExpense(id: string) {
  try {
    // Perform a soft delete by setting isArchived to true
    // We intentionally DO NOT delete the document from Storage so history is fully preserved
    await adminDb.collection("expenses").doc(id).update({
      isArchived: true
    });
    
    return { success: true };
  } catch (error) {
    console.error("Error deleting (archiving) expense:", error);
    return { success: false, error: "Failed to delete expense." };
  }
}
