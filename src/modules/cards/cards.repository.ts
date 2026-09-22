import { randomToken } from '../../shared/crypto/randomToken.js';
import type { Card, CreateCardInput, MoveCardInput, UpdateCardInput } from './cards.types.js';
import { paginateArray, type Page, type PaginationInput } from '../../shared/pagination.js';

export interface CardsRepository {
  create(input: CreateCardInput): Promise<Card>;
  listForList(listId: string, pagination: PaginationInput): Promise<Page<Card>>;
  findById(cardId: string): Promise<Card | null>;
  update(input: UpdateCardInput): Promise<Card>;
  move(input: MoveCardInput): Promise<Card>;
  archive(cardId: string): Promise<void>;
}

export class InMemoryCardsRepository implements CardsRepository {
  private readonly cards = new Map<string, Card>();

  async create(input: CreateCardInput): Promise<Card> {
    const now = new Date();
    const cards = this.activeCards(input.listId);
    const card: Card = {
      id: randomToken(16),
      listId: input.listId,
      title: input.title.trim(),
      description: input.description?.trim() || null,
      position: cards.length ? Math.max(...cards.map((item) => item.position)) + 1000 : 1000,
      dueDate: input.dueDate ?? null,
      createdById: input.actorUserId,
      createdAt: now,
      updatedAt: now,
      archivedAt: null
    };
    this.cards.set(card.id, card);
    return card;
  }

  async listForList(listId: string, pagination: PaginationInput): Promise<Page<Card>> {
    return paginateArray(this.activeCards(listId), pagination);
  }

  async findById(cardId: string): Promise<Card | null> {
    const card = this.cards.get(cardId);
    if (!card || card.archivedAt) return null;
    return card;
  }

  async update(input: UpdateCardInput): Promise<Card> {
    const card = this.cards.get(input.cardId);
    if (!card || card.archivedAt) throw new Error('Card not found');
    card.title = input.title?.trim() ?? card.title;
    card.description = input.description === undefined ? card.description : input.description?.trim() || null;
    card.dueDate = input.dueDate === undefined ? card.dueDate : input.dueDate;
    card.updatedAt = new Date();
    return card;
  }

  async move(input: MoveCardInput): Promise<Card> {
    const card = this.cards.get(input.cardId);
    if (!card || card.archivedAt) throw new Error('Card not found');
    const targetCards = this.activeCards(input.targetListId);
    card.listId = input.targetListId;
    card.position = targetCards.length ? Math.max(...targetCards.map((item) => item.position)) + 1000 : 1000;
    card.updatedAt = new Date();
    return card;
  }

  async archive(cardId: string): Promise<void> {
    const card = this.cards.get(cardId);
    if (!card || card.archivedAt) throw new Error('Card not found');
    card.archivedAt = new Date();
    card.updatedAt = new Date();
  }

  private activeCards(listId: string): Card[] {
    return [...this.cards.values()]
      .filter((card) => card.listId === listId && !card.archivedAt)
      .sort((left, right) => left.position - right.position);
  }
}
