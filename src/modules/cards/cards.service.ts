import { notFound } from '../../shared/errors/httpErrors.js';
import type { ListsService } from '../lists/lists.service.js';
import type { CardsRepository } from './cards.repository.js';
import type { ArchiveCardInput, Card, CreateCardInput, MoveCardInput, UpdateCardInput } from './cards.types.js';
import { defaultPagination, type Page, type PaginationInput } from '../../shared/pagination.js';
import { recordActivityIfNotAtomic, type ActivityRepository } from '../activity/activity.repository.js';
import type { RealtimeService } from '../realtime/realtime.service.js';

export class CardsService {
  constructor(
    private readonly cardsRepository: CardsRepository,
    private readonly listsService: ListsService,
    private readonly activityRepository?: ActivityRepository,
    private readonly realtimeService?: RealtimeService
  ) {}

  async createCard(input: CreateCardInput): Promise<Card> {
    const list = await this.listsService.getListForUser(input.listId, input.actorUserId, 'write');
    const event = { boardId: list.boardId, actorId: input.actorUserId, entityType: 'card' as const, action: 'card.created' as const };
    const card = await this.cardsRepository.create(input, event);
    await recordActivityIfNotAtomic(this.cardsRepository, this.activityRepository, { ...event, entityId: card.id });
    this.realtimeService?.publish({ type: 'card.created', boardId: list.boardId, actorUserId: input.actorUserId, entityId: card.id, data: { card } });
    return card;
  }

  async listListCards(listId: string, actorUserId: string, pagination: PaginationInput = defaultPagination): Promise<Page<Card>> {
    await this.listsService.getListForUser(listId, actorUserId);
    return this.cardsRepository.listForList(listId, pagination);
  }

  async getCardForUser(cardId: string, actorUserId: string, permission: 'read' | 'write' = 'read'): Promise<Card> {
    const card = await this.cardsRepository.findById(cardId);
    if (!card) throw notFound('Card not found', 'CARD_NOT_FOUND');
    await this.listsService.getListForUser(card.listId, actorUserId, permission);
    return card;
  }

  async updateCard(input: UpdateCardInput): Promise<Card> {
    const card = await this.getCardForUser(input.cardId, input.actorUserId, 'write');
    const list = await this.listsService.getListForUser(card.listId, input.actorUserId);
    const event = { boardId: list.boardId, actorId: input.actorUserId, entityType: 'card' as const, entityId: card.id, action: 'card.updated' as const };
    const updated = await this.cardsRepository.update({ ...input, cardId: card.id }, event);
    await recordActivityIfNotAtomic(this.cardsRepository, this.activityRepository, event);
    this.realtimeService?.publish({ type: 'card.updated', boardId: list.boardId, actorUserId: input.actorUserId, entityId: card.id, data: { card: updated } });
    return updated;
  }

  async moveCard(input: MoveCardInput): Promise<Card> {
    const card = await this.getCardForUser(input.cardId, input.actorUserId, 'write');
    const targetList = await this.listsService.getListForUser(input.targetListId, input.actorUserId, 'write');
    const event = { boardId: targetList.boardId, actorId: input.actorUserId, entityType: 'card' as const, entityId: card.id, action: 'card.moved' as const };
    const moved = await this.cardsRepository.move({ ...input, cardId: card.id }, event);
    await recordActivityIfNotAtomic(this.cardsRepository, this.activityRepository, event);
    this.realtimeService?.publish({ type: 'card.moved', boardId: targetList.boardId, actorUserId: input.actorUserId, entityId: card.id, data: { card: moved } });
    return moved;
  }

  async archiveCard(input: ArchiveCardInput): Promise<void> {
    const card = await this.getCardForUser(input.cardId, input.actorUserId, 'write');
    const list = await this.listsService.getListForUser(card.listId, input.actorUserId);
    const event = { boardId: list.boardId, actorId: input.actorUserId, entityType: 'card' as const, entityId: card.id, action: 'card.archived' as const };
    await this.cardsRepository.archive(card.id, event);
    await recordActivityIfNotAtomic(this.cardsRepository, this.activityRepository, event);
    this.realtimeService?.publish({ type: 'card.archived', boardId: list.boardId, actorUserId: input.actorUserId, entityId: card.id });
  }
}
