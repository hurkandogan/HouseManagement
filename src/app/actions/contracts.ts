"use server";

import { adminDb, adminStorage } from "@/lib/firebase/admin";
import { getDownloadURL } from "firebase-admin/storage";

export type Contract = {
  id: string;
  propertyId: string;
  title: string;
  provider: string;
  contractNumber: string;
  category: "insurance" | "maintenance" | "service" | "other";
  status: "active" | "canceled";
  startDate: string;
  endDate: string | null;
  documentUrl: string | null;
  fileName: string | null;
  createdAt: string;
};

export async function getContracts(): Promise<Contract[]> {
  try {
    const snapshot = await adminDb.collection("contracts").orderBy("createdAt", "desc").get();
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Contract));
  } catch (error) {
    console.error("Error getting contracts:", error);
    return [];
  }
}

export async function createContract(formData: FormData) {
  try {
    const propertyId = formData.get("propertyId") as string;
    const title = formData.get("title") as string;
    const provider = formData.get("provider") as string;
    const contractNumber = formData.get("contractNumber") as string;
    const category = formData.get("category") as Contract["category"];
    const startDate = formData.get("startDate") as string;
    const endDate = formData.get("endDate") as string | null;
    const file = formData.get("file") as File | null;

    let documentUrl = null;
    let fileName = null;

    if (file && file.size > 0) {
      fileName = file.name;
      const buffer = Buffer.from(await file.arrayBuffer());
      const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      const filePath = `contracts/${uniqueSuffix}-${fileName}`;
      
      const storageFile = adminStorage.file(filePath);
      await storageFile.save(buffer, {
        metadata: {
          contentType: file.type,
        }
      });
      
      documentUrl = await getDownloadURL(storageFile);
    }

    const contractData: Omit<Contract, "id" | "createdAt"> = {
      propertyId,
      title,
      provider,
      contractNumber,
      category,
      startDate,
      endDate: endDate || null,
      status: "active",
      documentUrl,
      fileName
    };

    const docRef = await adminDb.collection("contracts").add({
      ...contractData,
      createdAt: new Date().toISOString()
    });

    return { success: true, id: docRef.id };
  } catch (error) {
    console.error("Error creating contract:", error);
    return { success: false, error: "Failed to create contract." };
  }
}

export async function updateContract(id: string, formData: FormData, oldDocumentUrl: string | null) {
  try {
    const propertyId = formData.get("propertyId") as string;
    const title = formData.get("title") as string;
    const provider = formData.get("provider") as string;
    const contractNumber = formData.get("contractNumber") as string;
    const category = formData.get("category") as Contract["category"];
    const startDate = formData.get("startDate") as string;
    const endDate = formData.get("endDate") as string | null;
    const status = formData.get("status") as Contract["status"];
    const file = formData.get("file") as File | null;

    let documentUrl = oldDocumentUrl || null;
    let fileName = formData.get("oldFileName") as string | null;

    if (file && file.size > 0) {
      fileName = file.name;
      const buffer = Buffer.from(await file.arrayBuffer());
      const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      const filePath = `contracts/${uniqueSuffix}-${fileName}`;
      
      const storageFile = adminStorage.file(filePath);
      await storageFile.save(buffer, {
        metadata: {
          contentType: file.type,
        }
      });
      
      documentUrl = await getDownloadURL(storageFile);

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

    const contractData: Partial<Contract> = {
      propertyId,
      title,
      provider,
      contractNumber,
      category,
      startDate,
      endDate: endDate || null,
      status,
      documentUrl,
      fileName
    };

    await adminDb.collection("contracts").doc(id).update(contractData);
    return { success: true };
  } catch (error) {
    console.error("Error updating contract:", error);
    return { success: false, error: "Failed to update contract." };
  }
}

export async function cancelContract(id: string, documentUrl: string | null) {
  try {
    let newDocumentUrl = documentUrl;

    if (documentUrl) {
      // Move the file from contracts/ to contracts/cancelled/
      const urlObj = new URL(documentUrl);
      const bucketPrefix = `/${adminStorage.name}/`;
      const oldFilePath = decodeURIComponent(urlObj.pathname.startsWith(bucketPrefix) 
        ? urlObj.pathname.slice(bucketPrefix.length) 
        : urlObj.pathname.slice(1));

      if (oldFilePath.startsWith('contracts/') && !oldFilePath.startsWith('contracts/cancelled/')) {
        const newFilePath = oldFilePath.replace('contracts/', 'contracts/cancelled/');
        
        try {
          await adminStorage.file(oldFilePath).move(newFilePath);
          newDocumentUrl = await getDownloadURL(adminStorage.file(newFilePath));
        } catch (storageError) {
          console.error("Error moving file to cancelled folder:", storageError);
          // If move fails, we just keep the old url, but still mark as canceled
        }
      }
    }

    await adminDb.collection("contracts").doc(id).update({
      status: "canceled",
      documentUrl: newDocumentUrl
    });
    
    return { success: true };
  } catch (error) {
    console.error("Error canceling contract:", error);
    return { success: false, error: "Failed to cancel contract." };
  }
}

export async function deleteContract(id: string, documentUrl?: string | null) {
  try {
    if (documentUrl) {
      const urlObj = new URL(documentUrl);
      const bucketPrefix = `/${adminStorage.name}/`;
      const filePath = decodeURIComponent(urlObj.pathname.startsWith(bucketPrefix) 
        ? urlObj.pathname.slice(bucketPrefix.length) 
        : urlObj.pathname.slice(1));
        
      try {
        await adminStorage.file(filePath).delete();
      } catch (e) {
        console.error("Error deleting contract file:", e);
      }
    }

    await adminDb.collection("contracts").doc(id).delete();
    return { success: true };
  } catch (error) {
    console.error("Error deleting contract:", error);
    return { success: false, error: "Failed to delete contract." };
  }
}
