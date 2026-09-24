import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import { after, before, test } from 'node:test';
import { assertLocalDatabase } from './assert-local-database.mjs';

assertLocalDatabase();
process.env.NODE_ENV = 'test';

const { buildApp } = await import('../dist/app.js');
const { securityConfig } = await import('../dist/config/security.js');
const prisma = new PrismaClient();
let app;
let appServices;
let organization;
const users = {};
const tokens = {};
const prefix = randomUUID().replaceAll('-', '').slice(0, 8);

before(async () => {
  app = await buildApp();
  appServices = app.testContext;
  const addUser = async (name) => {
    const user = await appServices.usersService.createUser({
      username: `${prefix}-${name}`,
      email: `${prefix}-${name}@http-permissions.test`
    });
    users[name] = user;
    tokens[name] = (await appServices.sessionsService.createSession({ userId: user.id })).token;
    return user;
  };

  const [owner, admin, adminPeer, member, secondMember, boardAdmin, observer, leaver, boardLeaver, outsider] = await Promise.all([
    addUser('owner'), addUser('admin'), addUser('admin2'), addUser('member'), addUser('member2'),
    addUser('boardadmin'), addUser('observer'), addUser('leaver'), addUser('boardleaver'), addUser('outsider')
  ]);
  organization = await appServices.organizationsService.createOrganization({ name: `HTTP ${prefix}`, createdByUserId: owner.id });
  const invite = (user, role = 'member') => appServices.organizationsService.inviteMember({
    organizationId: organization.id, actorUserId: owner.id, email: user.email, role
  });
  await Promise.all([
    invite(admin, 'admin'), invite(adminPeer, 'admin'), invite(member), invite(secondMember),
    invite(boardAdmin), invite(observer), invite(leaver), invite(boardLeaver)
  ]);

  const privateBoard = await appServices.boardsService.createBoard({
    organizationId: organization.id, actorUserId: owner.id, name: 'Private HTTP', visibility: 'PRIVATE'
  });
  const otherBoard = await appServices.boardsService.createBoard({
    organizationId: organization.id, actorUserId: owner.id, name: 'Other HTTP', visibility: 'PRIVATE'
  });
  const workspaceBoard = await appServices.boardsService.createBoard({
    organizationId: organization.id, actorUserId: owner.id, name: 'Workspace HTTP', visibility: 'WORKSPACE'
  });
  Object.assign(organization, { privateBoard, otherBoard, workspaceBoard });

  await Promise.all([
    appServices.boardsService.setBoardMemberRole({ boardId: privateBoard.id, actorUserId: owner.id, userId: member.id, role: 'member' }),
    appServices.boardsService.setBoardMemberRole({ boardId: privateBoard.id, actorUserId: owner.id, userId: secondMember.id, role: 'member' }),
    appServices.boardsService.setBoardMemberRole({ boardId: privateBoard.id, actorUserId: owner.id, userId: boardAdmin.id, role: 'admin' }),
    appServices.boardsService.setBoardMemberRole({ boardId: privateBoard.id, actorUserId: owner.id, userId: observer.id, role: 'observer' }),
    appServices.boardsService.setBoardMemberRole({ boardId: privateBoard.id, actorUserId: owner.id, userId: boardLeaver.id, role: 'member' })
  ]);
  const list = await appServices.listsService.createList({ boardId: privateBoard.id, actorUserId: owner.id, name: 'Inbox' });
  const card = await appServices.cardsService.createCard({ listId: list.id, actorUserId: owner.id, title: 'HTTP card' });
  const label = await appServices.labelsService.createLabel({ boardId: privateBoard.id, actorUserId: owner.id, name: 'Private label', color: '#112233' });
  const otherLabel = await appServices.labelsService.createLabel({ boardId: otherBoard.id, actorUserId: owner.id, name: 'Other label', color: '#445566' });
  Object.assign(organization, { list, card, label, otherLabel });
});

after(async () => {
  if (app) await app.close();
  await prisma.$transaction(async (tx) => {
    if (organization?.id) await tx.organization.deleteMany({ where: { id: organization.id } });
    const userIds = Object.values(users).map((user) => user.id);
    if (userIds.length) await tx.user.deleteMany({ where: { id: { in: userIds } } });
  });
  await prisma.$disconnect();
});

function request(method, url, userName, payload) {
  return app.inject({
    method,
    url,
    ...(userName ? { headers: { cookie: `${securityConfig.cookieName}=${tokens[userName]}` } } : {}),
    ...(payload === undefined ? {} : { payload })
  });
}

async function expectStatus(responsePromise, statusCode) {
  const response = await responsePromise;
  assert.equal(response.statusCode, statusCode, `Expected HTTP ${statusCode}, received ${response.statusCode}: ${response.body}`);
  return response;
}

test('HTTP authorization rejects unauthenticated access across resource routes', async () => {
  const id = organization;
  const calls = [
    ['POST', '/organizations', { name: 'No session' }],
    ['GET', '/organizations'],
    ['GET', `/organizations/${id.id}`],
    ['PATCH', `/organizations/${id.id}`, { name: 'No session' }],
    ['DELETE', `/organizations/${id.id}`],
    ['GET', `/organizations/${id.id}/members`],
    ['DELETE', `/organizations/${id.id}/members/me`],
    ['PUT', `/organizations/${id.id}/owner`, { userId: users.admin.id }],
    ['DELETE', `/organizations/${id.id}/members/${users.member.id}`],
    ['PUT', `/organizations/${id.id}/members/${users.member.id}`, { role: 'member' }],
    ['POST', `/organizations/${id.id}/invitations`, { email: users.outsider.email, role: 'member' }],
    ['GET', `/organizations/${id.id}/boards`],
    ['POST', `/organizations/${id.id}/boards`, { name: 'No session' }],
    ['GET', `/boards/${id.privateBoard.id}`],
    ['GET', `/boards/${id.privateBoard.id}/activity`],
    ['PATCH', `/boards/${id.privateBoard.id}`, { name: 'No session' }],
    ['DELETE', `/boards/${id.privateBoard.id}`],
    ['GET', `/boards/${id.privateBoard.id}/members`],
    ['DELETE', `/boards/${id.privateBoard.id}/members/me`],
    ['DELETE', `/boards/${id.privateBoard.id}/members/${users.member.id}`],
    ['PUT', `/boards/${id.privateBoard.id}/members/${users.member.id}`, { role: 'member' }],
    ['GET', `/boards/${id.privateBoard.id}/lists`],
    ['POST', `/boards/${id.privateBoard.id}/lists`, { name: 'No session' }],
    ['PATCH', `/lists/${id.list.id}`, { name: 'No session' }],
    ['DELETE', `/lists/${id.list.id}`],
    ['POST', `/boards/${id.privateBoard.id}/lists/reorder`, { listIds: [id.list.id], expectedListIds: [id.list.id] }],
    ['POST', `/lists/${id.list.id}/cards`, { title: 'No session' }],
    ['GET', `/lists/${id.list.id}/cards`],
    ['GET', `/cards/${id.card.id}`],
    ['PATCH', `/cards/${id.card.id}`, { title: 'No session', expectedVersion: id.card.version }],
    ['POST', `/cards/${id.card.id}/move`, { targetListId: id.list.id, expectedVersion: id.card.version }],
    ['DELETE', `/cards/${id.card.id}`],
    ['GET', `/boards/${id.privateBoard.id}/labels`],
    ['POST', `/boards/${id.privateBoard.id}/labels`, { name: 'No session', color: '#112233' }],
    ['PATCH', `/labels/${id.label.id}`, { name: 'No session' }],
    ['DELETE', `/labels/${id.label.id}`],
    ['GET', `/cards/${id.card.id}/labels`],
    ['POST', `/cards/${id.card.id}/labels/${id.label.id}`],
    ['DELETE', `/cards/${id.card.id}/labels/${id.label.id}`]
  ];
  for (const [method, url, payload] of calls) await expectStatus(request(method, url, null, payload), 401);
});

test('HTTP authorization enforces organization and private-board boundaries', async () => {
  const id = organization;
  await expectStatus(request('GET', `/organizations/${id.id}`, 'outsider'), 404);
  await expectStatus(request('GET', `/boards/${id.privateBoard.id}`, 'outsider'), 404);
  await expectStatus(request('GET', `/boards/${id.workspaceBoard.id}`, 'outsider'), 404);
  await expectStatus(request('GET', `/boards/${id.privateBoard.id}`, 'member'), 200);
  await expectStatus(request('GET', `/boards/${id.privateBoard.id}`, 'observer'), 200);
  await expectStatus(request('GET', `/boards/${id.privateBoard.id}`, 'admin'), 200);
});

test('HTTP organization routes enforce owner and admin hierarchy', async () => {
  const id = organization;
  await expectStatus(request('PATCH', `/organizations/${id.id}`, 'member', { name: 'Forbidden rename' }), 403);
  await expectStatus(request('POST', `/organizations/${id.id}/boards`, 'member', { name: 'Forbidden board' }), 403);
  await expectStatus(request('DELETE', `/organizations/${id.id}/members/${users.admin2.id}`, 'admin'), 403);
  await expectStatus(request('PUT', `/organizations/${id.id}/members/${users.member.id}`, 'admin', { role: 'admin' }), 403);
  await expectStatus(request('DELETE', `/organizations/${id.id}/members/${users.admin2.id}`, 'owner'), 204);
  await expectStatus(request('GET', `/organizations/${id.id}`, 'admin2'), 404);
});

test('HTTP board permissions protect member management and observers are read-only', async () => {
  const id = organization;
  const memberListing = await expectStatus(request('GET', `/boards/${id.privateBoard.id}/members`, 'member'), 200);
  assert.equal(memberListing.json().canManageMembers, false);
  const adminListing = await expectStatus(request('GET', `/boards/${id.privateBoard.id}/members`, 'boardadmin'), 200);
  assert.equal(adminListing.json().canManageMembers, true);
  await expectStatus(request('DELETE', `/boards/${id.privateBoard.id}/members/${users.member2.id}`, 'member'), 403);
  await expectStatus(request('DELETE', `/boards/${id.privateBoard.id}/members/${users.boardadmin.id}`, 'boardadmin'), 403);
  await expectStatus(request('PUT', `/boards/${id.privateBoard.id}/members/${users.member2.id}`, 'admin', { role: 'admin' }), 403);
  await expectStatus(request('POST', `/boards/${id.privateBoard.id}/lists`, 'observer', { name: 'Observer list' }), 403);
  await expectStatus(request('GET', `/boards/${id.privateBoard.id}/lists`, 'observer'), 200);
  await expectStatus(request('PATCH', `/cards/${id.card.id}`, 'observer', { title: 'Observer edit', expectedVersion: id.card.version }), 403);
  await expectStatus(request('DELETE', `/boards/${id.privateBoard.id}/members/${users.member2.id}`, 'boardadmin'), 204);
});

test('HTTP label routes reject observers and prevent cross-board label attachment', async () => {
  const id = organization;
  await expectStatus(request('POST', `/boards/${id.privateBoard.id}/labels`, 'observer', { name: 'Denied', color: '#112233' }), 403);
  await expectStatus(request('PATCH', `/labels/${id.label.id}`, 'observer', { name: 'Denied' }), 403);
  await expectStatus(request('DELETE', `/labels/${id.label.id}`, 'observer'), 403);
  await expectStatus(request('POST', `/cards/${id.card.id}/labels/${id.otherLabel.id}`, 'member'), 404);
  await expectStatus(request('POST', `/cards/${id.card.id}/labels/${id.label.id}`, 'outsider'), 404);
});

test('HTTP activity is paginated and visible only while the user can read the board', async () => {
  const id = organization;
  const ownerPage = await expectStatus(request('GET', `/boards/${id.privateBoard.id}/activity?limit=2&offset=0`, 'owner'), 200);
  assert.equal(ownerPage.json().events.length, 2);
  assert.equal(ownerPage.json().pagination.hasMore, true);
  assert.ok(['card.created', 'label.created', 'list.created', 'board.created'].includes(ownerPage.json().events[0].action));
  assert.equal(ownerPage.json().events[0].actor.username, users.owner.username);
  assert.equal('title' in ownerPage.json().events[0], false);
  const observerPage = await expectStatus(request('GET', `/boards/${id.privateBoard.id}/activity`, 'observer'), 200);
  assert.ok(observerPage.json().events.length > 0);
  await expectStatus(request('GET', `/boards/${id.privateBoard.id}/activity`, 'outsider'), 404);
  await expectStatus(request('DELETE', `/boards/${id.privateBoard.id}/members/${users.member.id}`, 'owner'), 204);
  await expectStatus(request('GET', `/boards/${id.privateBoard.id}/activity`, 'member'), 403);
});

test('HTTP card updates reject a stale version with a conflict response', async () => {
  const initialVersion = organization.card.version;
  const response = await expectStatus(request('PATCH', `/cards/${organization.card.id}`, 'owner', {
    title: 'Fresh version', expectedVersion: initialVersion
  }), 200);
  assert.equal(response.json().card.version, initialVersion + 1);
  const stale = await expectStatus(request('PATCH', `/cards/${organization.card.id}`, 'owner', {
    title: 'Stale overwrite', expectedVersion: initialVersion
  }), 409);
  assert.equal(stale.json().error, 'STALE_CARD');
});

test('HTTP self-service exits revoke access, and owners can leave after transferring ownership', async () => {
  const id = organization;
  await expectStatus(request('DELETE', `/boards/${id.privateBoard.id}/members/me`, 'boardleaver'), 204);
  await expectStatus(request('GET', `/boards/${id.privateBoard.id}`, 'boardleaver'), 403);
  await expectStatus(request('DELETE', `/organizations/${id.id}/members/me`, 'leaver'), 204);
  await expectStatus(request('GET', `/organizations/${id.id}`, 'leaver'), 404);
  await expectStatus(request('DELETE', `/organizations/${id.id}/members/me`, 'owner'), 403);
  await expectStatus(request('PUT', `/organizations/${id.id}/owner`, 'owner', { userId: users.admin.id }), 204);
  await expectStatus(request('DELETE', `/organizations/${id.id}/members/me`, 'owner'), 204);
  await expectStatus(request('GET', `/organizations/${id.id}`, 'admin'), 200);
});
