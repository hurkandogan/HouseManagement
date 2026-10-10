import "dotenv/config";
import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getStorage } from "firebase-admin/storage";
import { v4 as uuidv4 } from "uuid";

const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const bucketName = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "housemanagement-7902d.firebasestorage.app";

const app = initializeApp({
  credential: cert({
    projectId,
    clientEmail,
    privateKey,
  }),
  storageBucket: bucketName,
});

const adminStorage = getStorage(app).bucket(bucketName);

async function testCertUpload() {
  try {
    console.log("Bucket name:", adminStorage.name);
    const fileName = "test-cert.txt";
    const filePath = `documents/${Date.now()}-${fileName}`;
    const file = adminStorage.file(filePath);

    // Test 1: Signed Upload URL using cert (offline signature)
    const [uploadUrl] = await file.getSignedUrl({
      version: "v4",
      action: "write",
      expires: Date.now() + 15 * 60 * 1000,
      contentType: "text/plain",
    });
    console.log("Offline Signed Upload URL generated successfully!");

    // Test 2: Upload file via PUT
    const putRes = await fetch(uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": "text/plain" },
      body: "Hello from cert direct upload!",
    });
    console.log("PUT status:", putRes.status, putRes.statusText);

    // Test 3: Instant Download URL via token (no 404 error!)
    const downloadToken = uuidv4();
    await file.setMetadata({
      metadata: {
        firebaseStorageDownloadTokens: downloadToken,
      },
    });

    const downloadUrl = `https://firebasestorage.googleapis.com/v0/b/${adminStorage.name}/o/${encodeURIComponent(filePath)}?alt=media&token=${downloadToken}`;
    console.log("Generated Instant Download URL:", downloadUrl);

    // Test 4: Verify download
    const getRes = await fetch(downloadUrl);
    console.log("Download HTTP Status:", getRes.status, await getRes.text());
  } catch (err) {
    console.error("Cert test failed:", err);
  }
}

testCertUpload();
