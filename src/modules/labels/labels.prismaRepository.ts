import { PrismaClient } from '@prisma/client';
import { randomToken } from '../../shared/crypto/randomToken.js';
import type { Label, CreateLabelInput, UpdateLabelInput } from './labels.types.js';
import type { LabelsRepository } from './labels.repository.js';
import { conflict } from '../../shared/errors/httpErrors.js';
import type { ActivityMutation } from '../activity/activity.types.js';
import { writeActivityEvent } from '../activity/activity.write.js';

export class PrismaLabelsRepository implements LabelsRepository {
  readonly supportsAtomicActivity = true;
  constructor(private readonly prisma: PrismaClient) {}

  async create(input: CreateLabelInput, activity?: ActivityMutation): Promise<Label> {
    try {
      const row = await this.prisma.$transaction(async (tx) => {
        const created = await tx.label.create({
        data: { id: randomToken(16), boardId: input.boardId, name: input.name.trim(), color: input.color },
        });
        await writeActivityEvent(tx, activity, created.id);
        return created;
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

  async update(input: UpdateLabelInput, activity?: ActivityMutation): Promise<Label> {
    const row = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.label.update({
      where: { id: input.labelId },
      data: { name: input.name?.trim(), color: input.color },
      });
      await writeActivityEvent(tx, activity);
      return updated;
    });
    return mapLabel(row);
  }

  async delete(labelId: string, activity?: ActivityMutation): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.label.delete({ where: { id: labelId } });
      await writeActivityEvent(tx, activity);
    });
  }

  async listForCard(cardId: string): Promise<Label[]> {
    const rows = await this.prisma.cardLabel.findMany({ where: { cardId }, include: { label: true } });
    return rows.map((row) => mapLabel(row.label));
  }

  async attachToCard(cardId: string, labelId: string, activity?: ActivityMutation): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const exists = await tx.cardLabel.findUnique({ where: { cardId_labelId: { cardId, labelId } } });
      if (exists) return;
      await tx.cardLabel.create({ data: { cardId, labelId } });
      await writeActivityEvent(tx, activity);
    });
  }

  async detachFromCard(cardId: string, labelId: string, activity?: ActivityMutation): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.cardLabel.delete({ where: { cardId_labelId: { cardId, labelId } } });
      await writeActivityEvent(tx, activity);
    });
  }
}

function mapLabel(row: { id: string; boardId: string; name: string; color: string }): Label {
  return { id: row.id, boardId: row.boardId, name: row.name, color: row.color };
}

function isUniqueViolation(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002';
}
