import type { Label, CreateLabelInput, UpdateLabelInput } from './labels.types.js';

export interface LabelsRepository {
  create(input: CreateLabelInput): Promise<Label>;
  listForBoard(boardId: string): Promise<Label[]>;
  findById(labelId: string): Promise<Label | null>;
  update(input: UpdateLabelInput): Promise<Label>;
  delete(labelId: string): Promise<void>;
}

export class InMemoryLabelsRepository implements LabelsRepository {
  private readonly labels = new Map<string, Label>();

  async create(input: CreateLabelInput): Promise<Label> {
    const label = { id: crypto.randomUUID(), boardId: input.boardId, name: input.name.trim(), color: input.color };
    this.labels.set(label.id, label);
    return label;
  }

  async listForBoard(boardId: string): Promise<Label[]> {
    return [...this.labels.values()].filter((label) => label.boardId === boardId).sort((a, b) => a.name.localeCompare(b.name));
  }

  async findById(labelId: string): Promise<Label | null> {
    return this.labels.get(labelId) ?? null;
  }

  async update(input: UpdateLabelInput): Promise<Label> {
    const current = this.labels.get(input.labelId);
    if (!current) throw new Error('Label not found');
    const updated = { ...current, name: input.name?.trim() ?? current.name, color: input.color ?? current.color };
    this.labels.set(updated.id, updated);
    return updated;
  }

  async delete(labelId: string): Promise<void> {
    this.labels.delete(labelId);
  }
}
