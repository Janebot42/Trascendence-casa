import { notFound } from '../../shared/errors/httpErrors.js';
import type { BoardsService } from '../boards/boards.service.js';
import type { CardsService } from '../cards/cards.service.js';
import type { ListsService } from '../lists/lists.service.js';
import type { LabelsRepository } from './labels.repository.js';
import type { CreateLabelInput, DeleteLabelInput, Label, UpdateLabelInput } from './labels.types.js';

export class LabelsService {
  constructor(
    private readonly labelsRepository: LabelsRepository,
    private readonly boardsService: BoardsService,
    private readonly cardsService: CardsService,
    private readonly listsService: ListsService
  ) {}

  async createLabel(input: CreateLabelInput): Promise<Label> {
    await this.boardsService.getBoardForUser(input.boardId, input.actorUserId, 'write');
    return this.labelsRepository.create(input);
  }

  async listBoardLabels(boardId: string, actorUserId: string): Promise<Label[]> {
    await this.boardsService.getBoardForUser(boardId, actorUserId);
    return this.labelsRepository.listForBoard(boardId);
  }

  async updateLabel(input: UpdateLabelInput): Promise<Label> {
    const label = await this.getWritableLabel(input.labelId, input.actorUserId);
    return this.labelsRepository.update({ ...input, labelId: label.id });
  }

  async deleteLabel(input: DeleteLabelInput): Promise<void> {
    const label = await this.getWritableLabel(input.labelId, input.actorUserId);
    await this.labelsRepository.delete(label.id);
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
    await this.labelsRepository.attachToCard(cardId, labelId);
  }

  async detachLabelFromCard(cardId: string, labelId: string, actorUserId: string): Promise<void> {
    const boardId = await this.resolveCardBoardId(cardId, actorUserId);
    const label = await this.labelsRepository.findById(labelId);
    if (!label || label.boardId !== boardId) throw notFound('Label not found', 'LABEL_NOT_FOUND');
    await this.labelsRepository.detachFromCard(cardId, labelId);
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
