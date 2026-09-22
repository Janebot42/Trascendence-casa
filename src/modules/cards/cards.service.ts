import { notFound } from '../../shared/errors/httpErrors.js';
import type { ListsService } from '../lists/lists.service.js';
import type { CardsRepository } from './cards.repository.js';
import type { ArchiveCardInput, Card, CreateCardInput, MoveCardInput, UpdateCardInput } from './cards.types.js';
import { defaultPagination, type Page, type PaginationInput } from '../../shared/pagination.js';

export class CardsService {
  constructor(
    private readonly cardsRepository: CardsRepository,
    private readonly listsService: ListsService
  ) {}

  async createCard(input: CreateCardInput): Promise<Card> {
    await this.listsService.getListForUser(input.listId, input.actorUserId, 'write');
    return this.cardsRepository.create(input);
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
    return this.cardsRepository.update({ ...input, cardId: card.id });
  }

  async moveCard(input: MoveCardInput): Promise<Card> {
    const card = await this.getCardForUser(input.cardId, input.actorUserId, 'write');
    await this.listsService.getListForUser(input.targetListId, input.actorUserId, 'write');
    return this.cardsRepository.move({ ...input, cardId: card.id });
  }

  async archiveCard(input: ArchiveCardInput): Promise<void> {
    const card = await this.getCardForUser(input.cardId, input.actorUserId, 'write');
    await this.cardsRepository.archive(card.id);
  }
}
