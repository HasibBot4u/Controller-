import { ProjectRepository } from '../../../src/domain/contracts/repository-contracts.ts';
import { Project } from '../../../src/domain/models/index.ts';

export class MemoryProjectRepository implements ProjectRepository {
  private projects: Map<string, Project> = new Map();

  constructor(initialData: Project[] = []) {
    initialData.forEach((p) => this.projects.set(p.id, { ...p }));
  }

  async findAll(userId?: string): Promise<Project[]> {
    const list = Array.from(this.projects.values());
    if (!userId) return list;
    return list.filter((p) => !p.ownerId || p.ownerId === userId || p.ownerId === 'phase1-demo-user');
  }

  async findById(id: string, userId?: string): Promise<Project | null> {
    const proj = this.projects.get(id);
    if (!proj) return null;
    if (userId && proj.ownerId && proj.ownerId !== userId && proj.ownerId !== 'phase1-demo-user') {
      return null;
    }
    return { ...proj };
  }

  async create(project: Omit<Project, 'schemaVersion'>, userId?: string): Promise<Project> {
    const ownerId = userId || project.ownerId || 'unknown';
    const created: Project = { ...project, ownerId, schemaVersion: 1 };
    this.projects.set(created.id, created);
    return { ...created };
  }

  async update(id: string, updates: Partial<Project>, userId?: string): Promise<Project | null> {
    const existing = await this.findById(id, userId);
    if (!existing) return null;
    const updated: Project = { ...existing, ...updates, updatedAt: new Date().toISOString() };
    this.projects.set(id, updated);
    return { ...updated };
  }

  async delete(id: string, userId?: string): Promise<boolean> {
    const existing = await this.findById(id, userId);
    if (!existing) return false;
    return this.projects.delete(id);
  }
}
