import { notFound } from '../../shared/errors/httpErrors.js';
import type { BoardsService } from '../boards/boards.service.js';
import type { CardsService } from '../cards/cards.service.js';
import type { ListsService } from '../lists/lists.service.js';
import type { LabelsRepository } from './labels.repository.js';
import type { CreateLabelInput, DeleteLabelInput, Label, UpdateLabelInput } from './labels.types.js';
import { recordActivityIfNotAtomic, type ActivityRepository } from '../activity/activity.repository.js';

export class LabelsService {
  constructor(
    private readonly labelsRepository: LabelsRepository,
    private readonly boardsService: BoardsService,
    private readonly cardsService: CardsService,
    private readonly listsService: ListsService,
    private readonly activityRepository?: ActivityRepository
  ) {}

  async createLabel(input: CreateLabelInput): Promise<Label> {
    await this.boardsService.getBoardForUser(input.boardId, input.actorUserId, 'write');
    const event = { boardId: input.boardId, actorId: input.actorUserId, entityType: 'label' as const, action: 'label.created' as const };
    const label = await this.labelsRepository.create(input, event);
    await recordActivityIfNotAtomic(this.labelsRepository, this.activityRepository, { ...event, entityId: label.id });
    return label;
  }

  async listBoardLabels(boardId: string, actorUserId: string): Promise<Label[]> {
    await this.boardsService.getBoardForUser(boardId, actorUserId);
    return this.labelsRepository.listForBoard(boardId);
  }

  async updateLabel(input: UpdateLabelInput): Promise<Label> {
    const label = await this.getWritableLabel(input.labelId, input.actorUserId);
    const event = { boardId: label.boardId, actorId: input.actorUserId, entityType: 'label' as const, entityId: label.id, action: 'label.updated' as const };
    const updated = await this.labelsRepository.update({ ...input, labelId: label.id }, event);
    await recordActivityIfNotAtomic(this.labelsRepository, this.activityRepository, event);
    return updated;
  }

  async deleteLabel(input: DeleteLabelInput): Promise<void> {
    const label = await this.getWritableLabel(input.labelId, input.actorUserId);
    const event = { boardId: label.boardId, actorId: input.actorUserId, entityType: 'label' as const, entityId: label.id, action: 'label.deleted' as const };
    await this.labelsRepository.delete(label.id, event);
    await recordActivityIfNotAtomic(this.labelsRepository, this.activityRepository, event);
  }

  async listCardLabels(cardId: string, actorUserId: string): Promise<Label[]> {
    await this.cardsService.getCardForUser(cardId, actorUserId);
    return this.labelsRepository.listForCard(cardId);
  }

  async attachLabelToCard(cardId: string, labelId: string, actorUserId: string): Promise<void> {
    const boardId = await this.resolveCardBoardId(cardId, actorUserId);
    const label = await this.labelsRepository.findById(labelId);
    if (!label) throw notFound('Label not found', 'LABEL_NOT_FOUND');
    if (label.boardId !== boardId) throw notFound('Label not found', 'LABEL_NOT_FOUND');
    const event = { boardId, actorId: actorUserId, entityType: 'card_label' as const, entityId: cardId, action: 'card_label.added' as const };
    await this.labelsRepository.attachToCard(cardId, labelId, event);
    await recordActivityIfNotAtomic(this.labelsRepository, this.activityRepository, event);
  }

  async detachLabelFromCard(cardId: string, labelId: string, actorUserId: string): Promise<void> {
    const boardId = await this.resolveCardBoardId(cardId, actorUserId);
    const label = await this.labelsRepository.findById(labelId);
    if (!label || label.boardId !== boardId) throw notFound('Label not found', 'LABEL_NOT_FOUND');
    const event = { boardId, actorId: actorUserId, entityType: 'card_label' as const, entityId: cardId, action: 'card_label.removed' as const };
    await this.labelsRepository.detachFromCard(cardId, labelId, event);
    await recordActivityIfNotAtomic(this.labelsRepository, this.activityRepository, event);
  }

  private async resolveCardBoardId(cardId: string, actorUserId: string): Promise<string> {
    const card = await this.cardsService.getCardForUser(cardId, actorUserId, 'write');
    const list = await this.listsService.getListForUser(card.listId, actorUserId);
    return list.boardId;
  }

  private async getWritableLabel(labelId: string, actorUserId: string): Promise<Label> {
    const label = await this.labelsRepository.findById(labelId);
    if (!label) throw notFound('Label not found', 'LABEL_NOT_FOUND');
    await this.boardsService.getBoardForUser(label.boardId, actorUserId, 'write');
    return label;
  }
}
