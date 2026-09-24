import { randomToken } from '../../shared/crypto/randomToken.js';
import type { Card, CreateCardInput, MoveCardInput, UpdateCardInput } from './cards.types.js';
import { paginateArray, type Page, type PaginationInput } from '../../shared/pagination.js';
import type { ActivityMutation } from '../activity/activity.types.js';
import { conflict } from '../../shared/errors/httpErrors.js';

export interface CardsRepository {
  create(input: CreateCardInput, activity?: ActivityMutation): Promise<Card>;
  listForList(listId: string, pagination: PaginationInput): Promise<Page<Card>>;
  findById(cardId: string): Promise<Card | null>;
  update(input: UpdateCardInput, activity?: ActivityMutation): Promise<Card>;
  move(input: MoveCardInput, activity?: ActivityMutation): Promise<Card>;
  archive(cardId: string, activity?: ActivityMutation): Promise<void>;
}

export class InMemoryCardsRepository implements CardsRepository {
  private readonly cards = new Map<string, Card>();

  async create(input: CreateCardInput): Promise<Card> {
    const now = new Date();
    const cards = this.allCards(input.listId);
    const card: Card = {
      id: randomToken(16),
      listId: input.listId,
      title: input.title.trim(),
      description: input.description?.trim() || null,
      position: cards.length ? Math.max(...cards.map((item) => item.position)) + 1000 : 1000,
      dueDate: input.dueDate ?? null,
      priority: input.priority ?? 'Medium',
      completed: input.completed ?? false,
      version: 1,
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
    if (input.expectedVersion !== undefined && card.version !== input.expectedVersion) throw conflict('Card has changed since it was loaded', 'STALE_CARD');
    card.title = input.title?.trim() ?? card.title;
    card.description = input.description === undefined ? card.description : input.description?.trim() || null;
    card.dueDate = input.dueDate === undefined ? card.dueDate : input.dueDate;
    card.priority = input.priority ?? card.priority;
    card.completed = input.completed ?? card.completed;
    card.version += 1;
    card.updatedAt = new Date();
    return card;
  }

  async move(input: MoveCardInput): Promise<Card> {
    const card = this.cards.get(input.cardId);
    if (!card || card.archivedAt) throw new Error('Card not found');
    if (input.expectedVersion !== undefined && card.version !== input.expectedVersion) throw conflict('Card has changed since it was loaded', 'STALE_CARD');
    const targetCards = this.allCards(input.targetListId).filter((item) => item.id !== input.cardId);
    card.listId = input.targetListId;
    card.version += 1;
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
    return this.allCards(listId)
      .filter((card) => !card.archivedAt)
      .sort((left, right) => left.position - right.position);
  }

  private allCards(listId: string): Card[] {
    return [...this.cards.values()].filter((card) => card.listId === listId);
  }
}
