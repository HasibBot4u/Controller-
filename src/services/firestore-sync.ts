import {
  collection,
  doc,
  setDoc,
  getDocs,
  deleteDoc,
  onSnapshot,
} from 'firebase/firestore';
import { db, auth } from './firebase.ts';
import { handleFirestoreError, OperationType } from './firestore-errors.ts';

export interface UserProjectDoc {
  id: string;
  name: string;
  description?: string;
  ownerId: string;
  updatedAt: string;
  status: 'ACTIVE' | 'ARCHIVED' | 'SYNCING';
}

export interface UserActivityDoc {
  id: string;
  projectId: string;
  title: string;
  description?: string;
  status: string;
  ownerId: string;
  updatedAt: string;
}

export async function saveUserProject(userId: string, project: UserProjectDoc): Promise<void> {
  const path = `users/${userId}/projects/${project.id}`;
  try {
    const docRef = doc(db, 'users', userId, 'projects', project.id);
    await setDoc(docRef, project, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function getUserProjects(userId: string): Promise<UserProjectDoc[]> {
  const path = `users/${userId}/projects`;
  try {
    const colRef = collection(db, 'users', userId, 'projects');
    const snapshot = await getDocs(colRef);
    return snapshot.docs.map((d) => d.data() as UserProjectDoc);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function deleteUserProject(userId: string, projectId: string): Promise<void> {
  const path = `users/${userId}/projects/${projectId}`;
  try {
    const docRef = doc(db, 'users', userId, 'projects', projectId);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export function subscribeUserProjects(
  userId: string,
  onUpdate: (projects: UserProjectDoc[]) => void,
  onError?: (error: unknown) => void
): () => void {
  const path = `users/${userId}/projects`;
  const colRef = collection(db, 'users', userId, 'projects');

  return onSnapshot(
    colRef,
    (snapshot) => {
      const items = snapshot.docs.map((d) => d.data() as UserProjectDoc);
      onUpdate(items);
    },
    (error) => {
      if (onError) onError(error);
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}
