import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { getStorage } from 'firebase-admin/storage';

let app: App;

const BUCKET_NAME = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 
  process.env.FIREBASE_STORAGE_BUCKET || 
  "housemanagement-7902d.firebasestorage.app";

const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "housemanagement-7902d";

if (!getApps().length) {
  try {
    if (clientEmail && privateKey) {
      // Use explicit service account credentials when available (bypasses GCP IAM signBlob requirement)
      app = initializeApp({
        credential: cert({
          projectId,
          clientEmail,
          privateKey,
        }),
        storageBucket: BUCKET_NAME,
      });
    } else {
      // Fallback for GCP managed ADC
      app = initializeApp({
        storageBucket: BUCKET_NAME,
      });
    }
  } catch (error) {
    console.error('Firebase admin initialization error', error);
    const apps = getApps();
    if (apps.length > 0) {
      app = apps[0];
    } else {
      throw error;
    }
  }
} else {
  app = getApps()[0];
}

export const adminDb = getFirestore(app);
export const adminAuth = getAuth(app);
export const adminStorage = getStorage(app).bucket(BUCKET_NAME);
