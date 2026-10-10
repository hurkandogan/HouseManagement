"use server";

import { adminDb, adminStorage } from "@/lib/firebase/admin";
import { appendExpenseToGoogleSheet } from "@/lib/googleSheets";
import { v4 as uuidv4 } from "uuid";

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
    let documentUrl = (formData.get("documentUrl") as string | null) || null;
    let fileName = (formData.get("fileName") as string | null) || null;
    let filePath = formData.get("filePath") as string | null;
    let downloadToken = formData.get("downloadToken") as string | null;
    const file = formData.get("file") as File | null;

    if (filePath && downloadToken) {
      try {
        await adminStorage.file(filePath).setMetadata({
          metadata: {
            firebaseStorageDownloadTokens: downloadToken,
          }
        });
      } catch (metaErr) {
        console.error("Error setting download token metadata for expense:", metaErr);
      }
    }

    if (!documentUrl && file && file.size > 0) {
      fileName = file.name;
      const buffer = Buffer.from(await file.arrayBuffer());
      const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      const newFilePath = `expenses/${uniqueSuffix}-${fileName}`;
      
      const storageFile = adminStorage.file(newFilePath);
      const token = uuidv4();
      await storageFile.save(buffer, {
        metadata: {
          contentType: file.type,
          metadata: {
            firebaseStorageDownloadTokens: token,
          }
        }
      });
      
      documentUrl = `https://firebasestorage.googleapis.com/v0/b/${adminStorage.name}/o/${encodeURIComponent(newFilePath)}?alt=media&token=${token}`;
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

    if (contractId) {
      expenseData.contractId = contractId;
    }

    const docRef = await adminDb.collection("expenses").add({
      ...expenseData,
      createdAt: new Date().toISOString()
    });

    // Automatically sync with Google Sheet
    try {
      await appendExpenseToGoogleSheet({
        propertyId,
        category,
        date,
        vendor,
        title,
        amount,
        documentUrl,
      });
    } catch (sheetErr) {
      console.error("Failed to sync expense to Google Sheet:", sheetErr);
    }

    return { success: true, id: docRef.id };
  } catch (error) {
    console.error("Error creating expense:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to create expense." };
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

    let documentUrl = (formData.get("documentUrl") as string | null) || oldDocumentUrl || null;
    let fileName = (formData.get("fileName") as string | null) || (formData.get("oldFileName") as string | null) || null;
    let filePath = formData.get("filePath") as string | null;
    let downloadToken = formData.get("downloadToken") as string | null;

    if (filePath && downloadToken) {
      try {
        await adminStorage.file(filePath).setMetadata({
          metadata: {
            firebaseStorageDownloadTokens: downloadToken,
          }
        });
      } catch (metaErr) {
        console.error("Error setting download token metadata for updated expense:", metaErr);
      }
    }

    // If a new documentUrl was provided via direct upload, delete old file if it exists
    if (formData.get("documentUrl") && oldDocumentUrl) {
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

    // If there's a new file and no direct documentUrl, upload via server fallback
    if (!formData.get("documentUrl") && file && file.size > 0) {
      fileName = file.name;
      const buffer = Buffer.from(await file.arrayBuffer());
      const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      const newFilePath = `expenses/${uniqueSuffix}-${fileName}`;
      
      const storageFile = adminStorage.file(newFilePath);
      const token = uuidv4();
      await storageFile.save(buffer, {
        metadata: {
          contentType: file.type,
          metadata: {
            firebaseStorageDownloadTokens: token,
          }
        }
      });
      
      documentUrl = `https://firebasestorage.googleapis.com/v0/b/${adminStorage.name}/o/${encodeURIComponent(newFilePath)}?alt=media&token=${token}`;

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

    // Automatically sync updated expense to Google Sheet as well
    try {
      await appendExpenseToGoogleSheet({
        propertyId,
        category,
        date,
        vendor,
        title,
        amount,
        documentUrl,
      });
    } catch (sheetErr) {
      console.error("Failed to sync updated expense to Google Sheet:", sheetErr);
    }

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
