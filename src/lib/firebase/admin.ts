import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { getStorage } from 'firebase-admin/storage';

let app: App;

if (!getApps().length) {
  try {
    // In Firebase App Hosting, FIREBASE_CONFIG is automatically set.
    // If it exists, we can rely on it and Application Default Credentials.
    if (process.env.FIREBASE_CONFIG) {
      app = initializeApp();
    } else {
      // Local development fallback using explicit environment variables
      const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
      
      app = initializeApp({
        credential: cert({
          projectId: process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: privateKey,
        }),
        storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      });
    }
  } catch (error) {
    console.error('Firebase admin initialization error', error);
    const apps = getApps();
    if (apps.length > 0) {
      app = apps[0];
    } else {
      throw error; // Fail fast if initialization fails
    }
  }
} else {
  app = getApps()[0];
}

export const adminDb = getFirestore(app);
export const adminAuth = getAuth(app);
export const adminStorage = getStorage(app).bucket();
