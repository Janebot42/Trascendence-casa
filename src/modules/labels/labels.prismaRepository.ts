import { PrismaClient } from '@prisma/client';
import { randomToken } from '../../shared/crypto/randomToken.js';
import type { Label, CreateLabelInput, UpdateLabelInput } from './labels.types.js';
import type { LabelsRepository } from './labels.repository.js';

export class PrismaLabelsRepository implements LabelsRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(input: CreateLabelInput): Promise<Label> {
    const row = await this.prisma.label.create({
      data: { id: randomToken(16), boardId: input.boardId, name: input.name.trim(), color: input.color },
    });
    return mapLabel(row);
  }

  async listForBoard(boardId: string): Promise<Label[]> {
    const rows = await this.prisma.label.findMany({ where: { boardId }, orderBy: [{ name: 'asc' }, { id: 'asc' }] });
    return rows.map(mapLabel);
  }

  async findById(labelId: string): Promise<Label | null> {
    const row = await this.prisma.label.findUnique({ where: { id: labelId } });
    return row ? mapLabel(row) : null;
  }

  async update(input: UpdateLabelInput): Promise<Label> {
    const row = await this.prisma.label.update({
      where: { id: input.labelId },
      data: { name: input.name?.trim(), color: input.color },
    });
    return mapLabel(row);
  }

  async delete(labelId: string): Promise<void> {
    await this.prisma.label.delete({ where: { id: labelId } });
  }
}

function mapLabel(row: { id: string; boardId: string; name: string; color: string }): Label {
  return { id: row.id, boardId: row.boardId, name: row.name, color: row.color };
}
