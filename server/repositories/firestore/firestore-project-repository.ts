import { ProjectRepository } from '../../../src/domain/contracts/repository-contracts.ts';
import { Project } from '../../../src/domain/models/index.ts';
import { getAdminFirestore } from '../../services/firebase-admin.ts';

export class FirestoreProjectRepository implements ProjectRepository {
  private getCollection(userId: string) {
    if (!userId) {
      throw new Error('UserId is required for user-scoped Firestore project repository');
    }
    return getAdminFirestore().collection('users').doc(userId).collection('projects');
  }

  async findAll(userId?: string): Promise<Project[]> {
    if (!userId) return [];
    const snapshot = await this.getCollection(userId).get();
    return snapshot.docs.map((doc) => doc.data() as Project);
  }

  async findById(id: string, userId?: string): Promise<Project | null> {
    if (!userId) return null;
    const doc = await this.getCollection(userId).doc(id).get();
    if (!doc.exists) return null;
    return doc.data() as Project;
  }

  async create(project: Omit<Project, 'schemaVersion'>, userId?: string): Promise<Project> {
    const ownerId = userId || project.ownerId || 'unknown';
    const entity: Project = {
      ...project,
      ownerId,
      schemaVersion: 1,
      updatedAt: project.updatedAt || new Date().toISOString(),
    };
    await this.getCollection(ownerId).doc(entity.id).set(entity);
    return entity;
  }

  async update(id: string, updates: Partial<Project>, userId?: string): Promise<Project | null> {
    if (!userId) return null;
    const ref = this.getCollection(userId).doc(id);
    const existing = await ref.get();
    if (!existing.exists) return null;

    const updatedData: Partial<Project> = {
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    await ref.update(updatedData);
    const refreshed = await ref.get();
    return refreshed.data() as Project;
  }

  async delete(id: string, userId?: string): Promise<boolean> {
    if (!userId) return false;
    const ref = this.getCollection(userId).doc(id);
    const existing = await ref.get();
    if (!existing.exists) return false;
    await ref.delete();
    return true;
  }
}
