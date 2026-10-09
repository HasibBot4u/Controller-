import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Export Firestore with explicit firestoreDatabaseId (Required per Skill)
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

// Export Auth
export const auth = getAuth(app);
export const googleAuthProvider = new GoogleAuthProvider();

export async function signInWithGoogle() {
  return signInWithPopup(auth, googleAuthProvider);
}

export async function signOutUser() {
  return signOut(auth);
}

export interface FirestorePingDetail {
  ok: boolean;
  latencyMs: number;
  timestamp: string;
  error?: string;
}

// Connectivity test per skill instructions
export async function testFirestoreConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'system', 'connection-check'));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firestore offline or connection check failed.');
    }
    return false;
  }
}

export async function testFirestoreConnectionDetailed(): Promise<FirestorePingDetail> {
  const start = Date.now();
  try {
    await getDocFromServer(doc(db, 'system', 'connection-check'));
    return {
      ok: true,
      latencyMs: Date.now() - start,
      timestamp: new Date().toISOString(),
    };
  } catch (error: any) {
    return {
      ok: false,
      latencyMs: Date.now() - start,
      timestamp: new Date().toISOString(),
      error: error?.message || 'Connection failed',
    };
  }
}
