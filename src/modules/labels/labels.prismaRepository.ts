import { PrismaClient } from '@prisma/client';
import { randomToken } from '../../shared/crypto/randomToken.js';
import type { Label, CreateLabelInput, UpdateLabelInput } from './labels.types.js';
import type { LabelsRepository } from './labels.repository.js';
import { conflict } from '../../shared/errors/httpErrors.js';

export class PrismaLabelsRepository implements LabelsRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(input: CreateLabelInput): Promise<Label> {
    try {
      const row = await this.prisma.label.create({
        data: { id: randomToken(16), boardId: input.boardId, name: input.name.trim(), color: input.color },
      });
      return mapLabel(row);
    } catch (error) {
      if (isUniqueViolation(error)) throw conflict('Label name already exists on this board', 'LABEL_NAME_EXISTS');
      throw error;
    }
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

  async listForCard(cardId: string): Promise<Label[]> {
    const rows = await this.prisma.cardLabel.findMany({ where: { cardId }, include: { label: true } });
    return rows.map((row) => mapLabel(row.label));
  }

  async attachToCard(cardId: string, labelId: string): Promise<void> {
    await this.prisma.cardLabel.upsert({
      where: { cardId_labelId: { cardId, labelId } },
      create: { cardId, labelId },
      update: {},
    });
  }

  async detachFromCard(cardId: string, labelId: string): Promise<void> {
    await this.prisma.cardLabel.delete({ where: { cardId_labelId: { cardId, labelId } } });
  }
}

function mapLabel(row: { id: string; boardId: string; name: string; color: string }): Label {
  return { id: row.id, boardId: row.boardId, name: row.name, color: row.color };
}

function isUniqueViolation(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002';
}
