import { ProjectRepository } from '../../../src/domain/contracts/repository-contracts.ts';
import { Project } from '../../../src/domain/models/index.ts';
import { DEMO_PROJECTS } from '../../adapters/mock/mock-data.ts';

export class MemoryProjectRepository implements ProjectRepository {
  private projects: Map<string, Project> = new Map();

  constructor(initialData: Project[] = []) {
    initialData.forEach((p) => this.projects.set(p.id, { ...p }));
  }

  async findAll(): Promise<Project[]> {
    return Array.from(this.projects.values());
  }

  async findById(id: string): Promise<Project | null> {
    const proj = this.projects.get(id);
    return proj ? { ...proj } : null;
  }

  async create(project: Omit<Project, 'schemaVersion'>): Promise<Project> {
    const created: Project = { ...project, schemaVersion: 1 };
    this.projects.set(created.id, created);
    return { ...created };
  }

  async update(id: string, updates: Partial<Project>): Promise<Project | null> {
    const existing = this.projects.get(id);
    if (!existing) return null;
    const updated: Project = { ...existing, ...updates, updatedAt: new Date().toISOString() };
    this.projects.set(id, updated);
    return { ...updated };
  }

  async delete(id: string): Promise<boolean> {
    return this.projects.delete(id);
  }
}
