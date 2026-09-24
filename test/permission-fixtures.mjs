import { InMemoryUsersRepository } from '../dist/modules/users/users.repository.js';
import { UsersService } from '../dist/modules/users/users.service.js';
import { InMemoryOrganizationsRepository } from '../dist/modules/organizations/organizations.repository.js';
import { OrganizationsService } from '../dist/modules/organizations/organizations.service.js';
import { InMemoryBoardsRepository } from '../dist/modules/boards/boards.repository.js';
import { BoardsService } from '../dist/modules/boards/boards.service.js';
import { InMemoryListsRepository } from '../dist/modules/lists/lists.repository.js';
import { ListsService } from '../dist/modules/lists/lists.service.js';
import { InMemoryCardsRepository } from '../dist/modules/cards/cards.repository.js';
import { CardsService } from '../dist/modules/cards/cards.service.js';
import { InMemoryLabelsRepository } from '../dist/modules/labels/labels.repository.js';
import { LabelsService } from '../dist/modules/labels/labels.service.js';

export async function createMemoryContext() {
  const usersRepository = new InMemoryUsersRepository();
  const users = new UsersService(usersRepository);
  const boardsRepository = new InMemoryBoardsRepository();
  const organizationsRepository = new InMemoryOrganizationsRepository(boardsRepository);
  const organizations = new OrganizationsService(organizationsRepository, users);
  const boards = new BoardsService(boardsRepository, organizations, users);
  const lists = new ListsService(new InMemoryListsRepository(), boards);
  const cards = new CardsService(new InMemoryCardsRepository(), lists);
  const labels = new LabelsService(new InMemoryLabelsRepository(), boards, cards, lists);
  const addUser = (username) => usersRepository.create({ username, email: `${username}@example.com` });
  const owner = await addUser('owner');
  const admin = await addUser('admin');
  const secondAdmin = await addUser('second-admin');
  const member = await addUser('member');
  const secondMember = await addUser('second-member');
  const observer = await addUser('observer');
  const outsider = await addUser('outsider');
  const organization = await organizations.createOrganization({ name: 'Acme', createdByUserId: owner.id });
  const invite = (user, role = 'member') => organizations.inviteMember({ organizationId: organization.id, actorUserId: owner.id, email: user.email, role });
  await invite(admin, 'admin'); await invite(secondAdmin, 'admin'); await invite(member); await invite(secondMember); await invite(observer);
  return {
    users, organizationsRepository, organizations, boardsRepository, boards, lists, cards, labels,
    owner, admin, secondAdmin, member, secondMember, observer, outsider, organization, invite,
    createBoard: (visibility = 'WORKSPACE') => boards.createBoard({ organizationId: organization.id, actorUserId: owner.id, name: 'Project', visibility })
  };
}
