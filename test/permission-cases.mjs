import assert from 'node:assert/strict';
import { AppError } from '../dist/shared/errors/AppError.js';

async function expectCode(promise, code) {
  await assert.rejects(promise, (error) => error instanceof AppError && error.code === code);
}

export function registerPermissionCases(test, createContext) {
  const scenario = (name, action) => test(name, async () => {
    const ctx = await createContext();
    try { await action(ctx); }
    finally { await ctx.dispose?.(); }
  });

  scenario('organization role hierarchy protects admins and the owner', async (ctx) => {
    await expectCode(ctx.organizations.removeOrganizationMember(ctx.organization.id, ctx.admin.id, ctx.secondAdmin.id), 'ORGANIZATION_OWNER_REQUIRED');
    await expectCode(ctx.organizations.setOrganizationMemberRole({ organizationId: ctx.organization.id, actorUserId: ctx.admin.id, userId: ctx.secondAdmin.id, role: 'member' }), 'ORGANIZATION_OWNER_REQUIRED');
    await expectCode(ctx.organizations.inviteMember({ organizationId: ctx.organization.id, actorUserId: ctx.admin.id, email: ctx.outsider.email, role: 'admin' }), 'ORGANIZATION_OWNER_REQUIRED');
    await expectCode(ctx.organizations.removeOrganizationMember(ctx.organization.id, ctx.owner.id, ctx.owner.id), 'ORGANIZATION_OWNER_IMMUTABLE');
    await ctx.organizations.removeOrganizationMember(ctx.organization.id, ctx.owner.id, ctx.secondAdmin.id);
    await expectCode(ctx.organizations.getOrganizationForUser(ctx.organization.id, ctx.secondAdmin.id), 'ORGANIZATION_NOT_FOUND');
  });

  scenario('owner can transfer ownership, after which the former owner can leave', async (ctx) => {
    await expectCode(ctx.organizations.leaveOrganization(ctx.organization.id, ctx.owner.id), 'ORGANIZATION_OWNER_TRANSFER_REQUIRED');
    await ctx.organizations.transferOwnership(ctx.organization.id, ctx.owner.id, ctx.admin.id);
    assert.equal((await ctx.organizations.getOrganizationForUser(ctx.organization.id, ctx.admin.id)).role, 'owner');
    assert.equal((await ctx.organizations.getOrganizationForUser(ctx.organization.id, ctx.owner.id)).role, 'admin');
    await ctx.organizations.leaveOrganization(ctx.organization.id, ctx.owner.id);
    await expectCode(ctx.organizations.getOrganizationForUser(ctx.organization.id, ctx.owner.id), 'ORGANIZATION_NOT_FOUND');
    await expectCode(ctx.organizations.transferOwnership(ctx.organization.id, ctx.admin.id, ctx.secondMember.id), 'ORGANIZATION_ADMIN_REQUIRED');
  });

  scenario('organization departure removes private-board grants and rejoining does not restore them', async (ctx) => {
    const board = await ctx.createBoard('PRIVATE');
    await ctx.boards.setBoardMemberRole({ boardId: board.id, actorUserId: ctx.owner.id, userId: ctx.member.id, role: 'member' });
    await ctx.organizations.removeOrganizationMember(ctx.organization.id, ctx.owner.id, ctx.member.id);
    await ctx.invite(ctx.member);
    await expectCode(ctx.boards.getBoardForUser(board.id, ctx.member.id), 'BOARD_MEMBERSHIP_REQUIRED');
  });

  scenario('private boards require explicit membership; workspace boards still require organization membership', async (ctx) => {
    const privateBoard = await ctx.createBoard('PRIVATE');
    const workspaceBoard = await ctx.createBoard('WORKSPACE');
    assert.equal((await ctx.boards.getBoardForUser(privateBoard.id, ctx.admin.id)).id, privateBoard.id);
    assert.equal((await ctx.boards.listOrganizationBoards(ctx.organization.id, ctx.admin.id)).items.length, 2);
    await expectCode(ctx.boards.getBoardForUser(privateBoard.id, ctx.member.id), 'BOARD_MEMBERSHIP_REQUIRED');
    assert.equal((await ctx.boards.getBoardForUser(workspaceBoard.id, ctx.member.id)).id, workspaceBoard.id);
    await expectCode(ctx.boards.getBoardForUser(workspaceBoard.id, ctx.outsider.id), 'ORGANIZATION_NOT_FOUND');
  });

  scenario('observers can read board content but cannot mutate lists or cards', async (ctx) => {
    const board = await ctx.createBoard('PRIVATE');
    await ctx.boards.setBoardMemberRole({ boardId: board.id, actorUserId: ctx.owner.id, userId: ctx.observer.id, role: 'observer' });
    const list = await ctx.lists.createList({ boardId: board.id, actorUserId: ctx.owner.id, name: 'Todo' });
    const card = await ctx.cards.createCard({ listId: list.id, actorUserId: ctx.owner.id, title: 'Task' });
    await ctx.boards.setBoardMemberRole({ boardId: board.id, actorUserId: ctx.owner.id, userId: ctx.member.id, role: 'member' });
    assert.equal((await ctx.lists.listBoardLists(board.id, ctx.observer.id)).items.length, 1);
    assert.equal((await ctx.cards.getCardForUser(card.id, ctx.observer.id)).id, card.id);
    assert.equal((await ctx.cards.updateCard({ cardId: card.id, actorUserId: ctx.member.id, title: 'Member edit' })).title, 'Member edit');
    await expectCode(ctx.lists.createList({ boardId: board.id, actorUserId: ctx.observer.id, name: 'Nope' }), 'BOARD_READ_ONLY');
    await expectCode(ctx.cards.updateCard({ cardId: card.id, actorUserId: ctx.observer.id, title: 'Changed' }), 'BOARD_READ_ONLY');
    await expectCode(ctx.cards.archiveCard({ cardId: card.id, actorUserId: ctx.observer.id }), 'BOARD_READ_ONLY');
  });

  scenario('only organization owner can assign, change, or remove board admins', async (ctx) => {
    const board = await ctx.createBoard('PRIVATE');
    await ctx.boards.setBoardMemberRole({ boardId: board.id, actorUserId: ctx.owner.id, userId: ctx.member.id, role: 'admin' });
    await expectCode(ctx.boards.setBoardMemberRole({ boardId: board.id, actorUserId: ctx.admin.id, userId: ctx.secondMember.id, role: 'admin' }), 'ORGANIZATION_OWNER_REQUIRED');
    await expectCode(ctx.boards.setBoardMemberRole({ boardId: board.id, actorUserId: ctx.admin.id, userId: ctx.member.id, role: 'member' }), 'BOARD_ADMIN_REQUIRED');
    await expectCode(ctx.boards.removeBoardMember(board.id, ctx.admin.id, ctx.member.id), 'BOARD_ADMIN_REQUIRED');
    await ctx.boards.removeBoardMember(board.id, ctx.owner.id, ctx.member.id);
    await expectCode(ctx.boards.getBoardForUser(board.id, ctx.member.id), 'BOARD_MEMBERSHIP_REQUIRED');
  });

  scenario('label access is scoped to its board and observers cannot change labels', async (ctx) => {
    const board = await ctx.createBoard('PRIVATE');
    const otherBoard = await ctx.createBoard('PRIVATE');
    await ctx.boards.setBoardMemberRole({ boardId: board.id, actorUserId: ctx.owner.id, userId: ctx.member.id, role: 'member' });
    await ctx.boards.setBoardMemberRole({ boardId: board.id, actorUserId: ctx.owner.id, userId: ctx.observer.id, role: 'observer' });
    const list = await ctx.lists.createList({ boardId: board.id, actorUserId: ctx.owner.id, name: 'Todo' });
    const card = await ctx.cards.createCard({ listId: list.id, actorUserId: ctx.owner.id, title: 'Task' });
    const label = await ctx.labels.createLabel({ boardId: board.id, actorUserId: ctx.member.id, name: 'Urgent', color: '#FF0000' });
    const otherLabel = await ctx.labels.createLabel({ boardId: otherBoard.id, actorUserId: ctx.owner.id, name: 'Other', color: '#0000FF' });
    await ctx.labels.attachLabelToCard(card.id, label.id, ctx.member.id);
    assert.equal((await ctx.labels.listCardLabels(card.id, ctx.member.id))[0].id, label.id);
    await expectCode(ctx.labels.attachLabelToCard(card.id, otherLabel.id, ctx.member.id), 'LABEL_NOT_FOUND');
    await expectCode(ctx.labels.createLabel({ boardId: board.id, actorUserId: ctx.observer.id, name: 'Nope', color: '#00FF00' }), 'BOARD_READ_ONLY');
    await expectCode(ctx.labels.updateLabel({ labelId: label.id, actorUserId: ctx.observer.id, name: 'Changed' }), 'BOARD_READ_ONLY');
    await expectCode(ctx.labels.deleteLabel({ labelId: label.id, actorUserId: ctx.observer.id }), 'BOARD_READ_ONLY');
    await expectCode(ctx.labels.attachLabelToCard(card.id, label.id, ctx.outsider.id), 'ORGANIZATION_NOT_FOUND');
  });

  scenario('board admins can remove regular members but not peer admins or themselves', async (ctx) => {
    const board = await ctx.createBoard('PRIVATE');
    await ctx.boards.setBoardMemberRole({ boardId: board.id, actorUserId: ctx.owner.id, userId: ctx.member.id, role: 'admin' });
    await ctx.boards.setBoardMemberRole({ boardId: board.id, actorUserId: ctx.owner.id, userId: ctx.secondMember.id, role: 'member' });
    await ctx.boards.setBoardMemberRole({ boardId: board.id, actorUserId: ctx.owner.id, userId: ctx.observer.id, role: 'admin' });
    await ctx.boards.removeBoardMember(board.id, ctx.member.id, ctx.secondMember.id);
    await expectCode(ctx.boards.removeBoardMember(board.id, ctx.member.id, ctx.observer.id), 'BOARD_ADMIN_REQUIRED');
    await expectCode(ctx.boards.removeBoardMember(board.id, ctx.member.id, ctx.member.id), 'USE_LEAVE_ACTION');
    await ctx.boards.leaveBoard(board.id, ctx.member.id);
    await expectCode(ctx.boards.getBoardForUser(board.id, ctx.member.id), 'BOARD_MEMBERSHIP_REQUIRED');
  });

  scenario('organization admins inherit board admin rights, while ordinary members cannot manage members', async (ctx) => {
    const board = await ctx.createBoard('PRIVATE');
    await ctx.boards.setBoardMemberRole({ boardId: board.id, actorUserId: ctx.owner.id, userId: ctx.member.id, role: 'member' });
    assert.equal((await ctx.boards.listBoardMembers(board.id, ctx.admin.id)).canManageMembers, true);
    await ctx.boards.removeBoardMember(board.id, ctx.admin.id, ctx.member.id);
    await ctx.boards.setBoardMemberRole({ boardId: board.id, actorUserId: ctx.owner.id, userId: ctx.secondMember.id, role: 'member' });
    assert.equal((await ctx.boards.listBoardMembers(board.id, ctx.secondMember.id)).canManageMembers, false);
    await expectCode(ctx.boards.removeBoardMember(board.id, ctx.secondMember.id, ctx.owner.id), 'BOARD_ADMIN_REQUIRED');
  });

  scenario('users cannot change board membership for a person outside that organization', async (ctx) => {
    const board = await ctx.createBoard('PRIVATE');
    await expectCode(ctx.boards.setBoardMemberRole({ boardId: board.id, actorUserId: ctx.owner.id, userId: ctx.outsider.id, role: 'member' }), 'ORGANIZATION_NOT_FOUND');
    await expectCode(ctx.boards.removeBoardMember(board.id, ctx.owner.id, ctx.outsider.id), 'ORGANIZATION_NOT_FOUND');
  });

  scenario('members cannot leave a workspace board they do not explicitly belong to', async (ctx) => {
    const board = await ctx.createBoard('WORKSPACE');
    await expectCode(ctx.boards.leaveBoard(board.id, ctx.member.id), 'BOARD_MEMBER_NOT_FOUND');
  });
}
