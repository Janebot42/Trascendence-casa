import 'dotenv/config';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import { test } from 'node:test';
import { PrismaUsersRepository } from '../dist/modules/users/users.prismaRepository.js';
import { UsersService } from '../dist/modules/users/users.service.js';
import { PrismaOrganizationsRepository } from '../dist/modules/organizations/organizations.prismaRepository.js';
import { OrganizationsService } from '../dist/modules/organizations/organizations.service.js';
import { PrismaBoardsRepository } from '../dist/modules/boards/boards.prismaRepository.js';
import { BoardsService } from '../dist/modules/boards/boards.service.js';
import { PrismaListsRepository } from '../dist/modules/lists/lists.prismaRepository.js';
import { ListsService } from '../dist/modules/lists/lists.service.js';
import { PrismaCardsRepository } from '../dist/modules/cards/cards.prismaRepository.js';
import { CardsService } from '../dist/modules/cards/cards.service.js';
import { PrismaLabelsRepository } from '../dist/modules/labels/labels.prismaRepository.js';
import { LabelsService } from '../dist/modules/labels/labels.service.js';
import { PrismaActivityRepository } from '../dist/modules/activity/activity.prismaRepository.js';
import { registerPermissionCases } from './permission-cases.mjs';
import { assertLocalDatabase } from './assert-local-database.mjs';

assertLocalDatabase();

const prisma = new PrismaClient();
const activityRepository = new PrismaActivityRepository(prisma);

async function createDatabaseContext() {
  const users = new UsersService(new PrismaUsersRepository(prisma));
  const organizationsRepository = new PrismaOrganizationsRepository(prisma);
  const organizations = new OrganizationsService(organizationsRepository, users);
  const boardsRepository = new PrismaBoardsRepository(prisma);
  const boards = new BoardsService(boardsRepository, organizations, users, activityRepository);
  const lists = new ListsService(new PrismaListsRepository(prisma), boards, activityRepository);
  const cards = new CardsService(new PrismaCardsRepository(prisma), lists, activityRepository);
  const labels = new LabelsService(new PrismaLabelsRepository(prisma), boards, cards, lists, activityRepository);
  const prefix = randomUUID().replaceAll('-', '').slice(0, 8);
  const userIds = [];
  let organizationId = null;

  const addUser = async (label) => {
    const user = await users.createUser({ username: `${prefix}-${label}`, email: `${prefix}-${label}@permissions.test` });
    userIds.push(user.id);
    return user;
  };

  try {
    const owner = await addUser('owner');
    const admin = await addUser('admin');
    const secondAdmin = await addUser('admin2');
    const member = await addUser('member');
    const secondMember = await addUser('member2');
    const observer = await addUser('observer');
    const outsider = await addUser('outsider');
    const organization = await organizations.createOrganization({ name: `Permissions ${prefix}`, createdByUserId: owner.id });
    organizationId = organization.id;
    const invite = (user, role = 'member') => organizations.inviteMember({ organizationId: organization.id, actorUserId: owner.id, email: user.email, role });
    await invite(admin, 'admin');
    await invite(secondAdmin, 'admin');
    await invite(member);
    await invite(secondMember);
    await invite(observer);

    return {
      users, organizationsRepository, organizations, boardsRepository, boards, lists, cards, labels,
      owner, admin, secondAdmin, member, secondMember, observer, outsider, organization, invite,
      createBoard: (visibility = 'WORKSPACE') => boards.createBoard({ organizationId: organization.id, actorUserId: owner.id, name: 'Project', visibility }),
      async dispose() {
        await prisma.$transaction(async (tx) => {
          await tx.organization.deleteMany({ where: { id: organization.id } });
          await tx.user.deleteMany({ where: { id: { in: userIds } } });
        });
      }
    };
  } catch (error) {
    await prisma.$transaction(async (tx) => {
      if (organizationId) await tx.organization.deleteMany({ where: { id: organizationId } });
      await tx.user.deleteMany({ where: { id: { in: userIds } } });
    });
    throw error;
  }
}

registerPermissionCases(test, createDatabaseContext);

test('activity events persist in PostgreSQL for board and list mutations', async () => {
  const context = await createDatabaseContext();
  try {
    const board = await context.createBoard();
    const list = await context.lists.createList({ boardId: board.id, actorUserId: context.owner.id, name: 'Activity list' });
    const page = await activityRepository.listForBoard(board.id, { limit: 50, offset: 0 });
    assert.deepEqual(new Set(page.items.map((event) => event.action)), new Set(['board.created', 'list.created']));
    assert.ok(page.items.every((event) => event.actorId === context.owner.id));
    assert.ok(page.items.every((event) => event.entityId === board.id || event.entityId === list.id));
  } finally {
    await context.dispose();
  }
});

test('a failed activity insert rolls back the associated PostgreSQL mutation', async () => {
  const context = await createDatabaseContext();
  try {
    await assert.rejects(context.boardsRepository.create({
      organizationId: context.organization.id, actorUserId: context.owner.id, name: 'Must roll back'
    }, {
      boardId: context.organization.id, actorId: randomUUID(), entityType: 'board', action: 'board.created'
    }));
    assert.equal(await prisma.board.count({ where: { organizationId: context.organization.id, name: 'Must roll back' } }), 0);

    const board = await context.createBoard();
    const listsRepository = new PrismaListsRepository(prisma);
    await assert.rejects(listsRepository.create({ boardId: board.id, actorUserId: context.owner.id, name: 'Must roll back' }, {
      boardId: board.id, actorId: randomUUID(), entityType: 'list', action: 'list.created'
    }));
    assert.equal(await prisma.boardList.count({ where: { boardId: board.id, name: 'Must roll back' } }), 0);
  } finally {
    await context.dispose();
  }
});

test('concurrent card moves and list reorders reject stale versions', async () => {
  const context = await createDatabaseContext();
  try {
    const board = await context.createBoard();
    const source = await context.lists.createList({ boardId: board.id, actorUserId: context.owner.id, name: 'Source' });
    const firstTarget = await context.lists.createList({ boardId: board.id, actorUserId: context.owner.id, name: 'Target A' });
    const secondTarget = await context.lists.createList({ boardId: board.id, actorUserId: context.owner.id, name: 'Target B' });
    const card = await context.cards.createCard({ listId: source.id, actorUserId: context.owner.id, title: 'Concurrent card' });
    const cardsRepository = new PrismaCardsRepository(prisma);
    const moves = await Promise.allSettled([
      cardsRepository.move({ cardId: card.id, actorUserId: context.owner.id, targetListId: firstTarget.id, expectedVersion: card.version }),
      cardsRepository.move({ cardId: card.id, actorUserId: context.owner.id, targetListId: secondTarget.id, expectedVersion: card.version })
    ]);
    assert.equal(moves.filter((result) => result.status === 'fulfilled').length, 1);
    const rejectedMove = moves.find((result) => result.status === 'rejected');
    assert.equal(rejectedMove.reason.code, 'STALE_CARD');
    assert.equal((await cardsRepository.findById(card.id)).version, 2);

    const currentIds = (await context.lists.listBoardLists(board.id, context.owner.id)).items.map((list) => list.id);
    const rotateLeft = [...currentIds.slice(1), currentIds[0]];
    const rotateRight = [currentIds[currentIds.length - 1], ...currentIds.slice(0, -1)];
    const reorder = await Promise.allSettled([
      context.lists.reorderLists({ boardId: board.id, actorUserId: context.owner.id, listIds: rotateLeft, expectedListIds: currentIds }),
      context.lists.reorderLists({ boardId: board.id, actorUserId: context.owner.id, listIds: rotateRight, expectedListIds: currentIds })
    ]);
    assert.equal(reorder.filter((result) => result.status === 'fulfilled').length, 1);
    const rejectedReorder = reorder.find((result) => result.status === 'rejected');
    assert.equal(rejectedReorder.reason.code, 'STALE_LIST_ORDER');
  } finally {
    await context.dispose();
  }
});
test('close the Prisma connection', async () => { await prisma.$disconnect(); });
