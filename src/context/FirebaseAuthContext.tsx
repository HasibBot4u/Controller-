import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, onAuthStateChanged, onIdTokenChanged } from 'firebase/auth';
import { auth, signInWithGoogle, signOutUser, testFirestoreConnection } from '../services/firebase.ts';
import { setClientAuthToken } from '../adapters/http/http-client.ts';

interface FirebaseAuthContextType {
  currentUser: User | null;
  authLoading: boolean;
  firestoreConnected: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  checkConnection: () => Promise<boolean>;
}

const FirebaseAuthContext = createContext<FirebaseAuthContextType | null>(null);

export const FirebaseAuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);
  const [firestoreConnected, setFirestoreConnected] = useState<boolean>(false);

  useEffect(() => {
    // Listen to token refresh as well as sign-in / sign-out
    const unsubscribe = onIdTokenChanged(auth, async (user) => {
      setCurrentUser(user);
      setAuthLoading(false);
      if (user) {
        try {
          const idToken = await user.getIdToken();
          setClientAuthToken(idToken);
        } catch (_tokenErr) {
          setClientAuthToken(null);
        }
        const connected = await testFirestoreConnection();
        setFirestoreConnected(connected);
      } else {
        setClientAuthToken(null);
        setFirestoreConnected(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const signIn = async () => {
    try {
      await signInWithGoogle();
    } catch (err) {
      console.error('Firebase Google sign-in failed:', err);
      throw err;
    }
  };

  const signOut = async () => {
    try {
      await signOutUser();
    } catch (err) {
      console.error('Firebase sign-out failed:', err);
      throw err;
    }
  };

  const checkConnection = async () => {
    const connected = await testFirestoreConnection();
    setFirestoreConnected(connected);
    return connected;
  };

  return (
    <FirebaseAuthContext.Provider
      value={{
        currentUser,
        authLoading,
        firestoreConnected,
        signIn,
        signOut,
        checkConnection,
      }}
    >
      {children}
    </FirebaseAuthContext.Provider>
  );
};

export const useFirebaseAuth = (): FirebaseAuthContextType => {
  const context = useContext(FirebaseAuthContext);
  if (!context) {
    throw new Error('useFirebaseAuth must be used within FirebaseAuthProvider');
  }
  return context;
};
