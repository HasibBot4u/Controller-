import { initializeApp, getApps, getApp, App } from 'firebase-admin/app';
import { getAuth, Auth } from 'firebase-admin/auth';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import firebaseConfig from '../../firebase-applet-config.json' with { type: 'json' };

let adminApp: App | null = null;
let adminAuth: Auth | null = null;
let adminFirestore: Firestore | null = null;

export const FIRESTORE_DATABASE_ID =
  process.env.FIRESTORE_DATABASE_ID ||
  firebaseConfig.firestoreDatabaseId ||
  '(default)';

export const FIREBASE_PROJECT_ID =
  process.env.FIREBASE_PROJECT_ID ||
  firebaseConfig.projectId ||
  'sacred-tune-blxdt';

export function getAdminApp(): App {
  if (!adminApp) {
    if (getApps().length === 0) {
      adminApp = initializeApp({
        projectId: FIREBASE_PROJECT_ID,
      });
    } else {
      adminApp = getApp();
    }
  }
  return adminApp;
}

export function getAdminAuth(): Auth {
  if (!adminAuth) {
    adminAuth = getAuth(getAdminApp());
  }
  return adminAuth;
}

export function getAdminFirestore(): Firestore {
  if (!adminFirestore) {
    adminFirestore = getFirestore(getAdminApp(), FIRESTORE_DATABASE_ID);
  }
  return adminFirestore;
}

export interface FirestoreCheckResult {
  available: boolean;
  status: 'HEALTHY' | 'UNAVAILABLE' | 'NOT_CONFIGURED';
  databaseId: string;
  projectId: string;
  latencyMs: number | null;
  error?: string;
  checkedAt: string;
}

let lastCheckCache: { result: FirestoreCheckResult; timestamp: number } | null = null;

export async function checkFirestoreReadiness(force = false): Promise<FirestoreCheckResult> {
  const now = Date.now();
  if (!force && lastCheckCache && now - lastCheckCache.timestamp < 10000) {
    return lastCheckCache.result;
  }

  const start = Date.now();
  try {
    const db = getAdminFirestore();
    // Test connectivity against the system collection with a 3-second timeout
    const testPromise = db.collection('system').limit(1).get();
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Firestore connectivity test timed out after 3000ms')), 3000)
    );

    await Promise.race([testPromise, timeoutPromise]);
    const latency = Date.now() - start;

    const result: FirestoreCheckResult = {
      available: true,
      status: 'HEALTHY',
      databaseId: FIRESTORE_DATABASE_ID,
      projectId: FIREBASE_PROJECT_ID,
      latencyMs: latency,
      checkedAt: new Date().toISOString(),
    };
    lastCheckCache = { result, timestamp: now };
    return result;
  } catch (err: any) {
    const latency = Date.now() - start;
    const msg = err?.message || String(err);
    const result: FirestoreCheckResult = {
      available: false,
      status: 'UNAVAILABLE',
      databaseId: FIRESTORE_DATABASE_ID,
      projectId: FIREBASE_PROJECT_ID,
      latencyMs: latency,
      error: msg,
      checkedAt: new Date().toISOString(),
    };
    lastCheckCache = { result, timestamp: now };
    return result;
  }
}
