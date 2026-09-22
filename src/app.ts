import cookie from '@fastify/cookie';
import Fastify from 'fastify';
import {
  hasZodFastifySchemaValidationErrors,
  validatorCompiler
} from 'fastify-type-provider-zod';
import { env } from './config/env.js';
import { securityConfig } from './config/security.js';
import { createPrismaClient } from './db/client.js';
import { AppError } from './shared/errors/AppError.js';
import { SecretBox } from './shared/crypto/encryption.js';
import { ScryptPasswordHasher } from './shared/crypto/passwordHasher.js';
import { InMemoryUsersRepository } from './modules/users/users.repository.js';
import { PrismaUsersRepository } from './modules/users/users.prismaRepository.js';
import { UsersService } from './modules/users/users.service.js';
import { InMemorySessionsRepository } from './modules/sessions/sessions.repository.js';
import { PrismaSessionsRepository } from './modules/sessions/sessions.prismaRepository.js';
import { SessionsService } from './modules/sessions/sessions.service.js';
import { InMemoryAuthRepository } from './modules/auth/auth.repository.js';
import { PrismaAuthRepository } from './modules/auth/auth.prismaRepository.js';
import {
  InMemoryRegistrationRepository,
  PrismaRegistrationRepository
} from './modules/auth/registration.repository.js';
import { AuthService } from './modules/auth/auth.service.js';
import { InMemoryTwoFactorRepository } from './modules/two_factor/twoFactor.repository.js';
import { PrismaTwoFactorRepository } from './modules/two_factor/twoFactor.prismaRepository.js';
import { TotpService } from './modules/two_factor/totp.service.js';
import { RecoveryCodesService } from './modules/two_factor/recoveryCodes.service.js';
import { TwoFactorService } from './modules/two_factor/twoFactor.service.js';
import { registerAuthRoutes } from './modules/auth/auth.routes.js';
import { registerTwoFactorRoutes } from './modules/two_factor/twoFactor.routes.js';
import { registerUserRoutes } from './modules/users/users.routes.js';
import { registerUiRoutes } from './ui/ui.routes.js';
import { InMemoryOrganizationsRepository } from './modules/organizations/organizations.repository.js';
import { PrismaOrganizationsRepository } from './modules/organizations/organizations.prismaRepository.js';
import { OrganizationsService } from './modules/organizations/organizations.service.js';
import { registerOrganizationRoutes } from './modules/organizations/organizations.routes.js';
import { InMemoryBoardsRepository } from './modules/boards/boards.repository.js';
import { PrismaBoardsRepository } from './modules/boards/boards.prismaRepository.js';
import { BoardsService } from './modules/boards/boards.service.js';
import { registerBoardRoutes } from './modules/boards/boards.routes.js';
import { InMemoryListsRepository } from './modules/lists/lists.repository.js';
import { PrismaListsRepository } from './modules/lists/lists.prismaRepository.js';
import { ListsService } from './modules/lists/lists.service.js';
import { registerListRoutes } from './modules/lists/lists.routes.js';
import { InMemoryCardsRepository } from './modules/cards/cards.repository.js';
import { PrismaCardsRepository } from './modules/cards/cards.prismaRepository.js';
import { CardsService } from './modules/cards/cards.service.js';
import { registerCardRoutes } from './modules/cards/cards.routes.js';
import { InMemoryLabelsRepository } from './modules/labels/labels.repository.js';
import { PrismaLabelsRepository } from './modules/labels/labels.prismaRepository.js';
import { LabelsService } from './modules/labels/labels.service.js';
import { registerLabelRoutes } from './modules/labels/labels.routes.js';

export async function buildApp() 
{
  const app = Fastify({ logger: env.NODE_ENV !== 'test' });
  app.setValidatorCompiler(validatorCompiler);

  /*Si un usuario envía una peticion HTTP con el cuerpo completamente vacio 
   en lugar de que Fastify rechace la peticion de inmediato con
   un error generico, lo transforma en un objeto vacio {} para que Zod sea el 
   que decida que error devolver de forma controlada.*/
  app.addContentTypeParser('application/json', { parseAs: 'string' }, (_request, body, done) => {
    const rawBody = body.toString();
    if (!rawBody.trim()) 
    {
      done(null, {});
      return;
    }

    try 
    {
      done(null, JSON.parse(rawBody));
    } 
    catch (_error)
    {
      done(new AppError('Malformed JSON request body', 400, 'INVALID_JSON'));
    }
  });

  await app.register(cookie); //Permite que Fastify pueda leer y escribir cookies en las peticiones HTTP

  const prisma = createPrismaClient();
  if (prisma) 
  {
    app.addHook('onClose', async () => {
      await prisma.$disconnect();
    });
  }

  const usersRepository = prisma ? new PrismaUsersRepository(prisma) : new InMemoryUsersRepository();
  const usersService = new UsersService(usersRepository);
  const sessionsRepository = prisma ? new PrismaSessionsRepository(prisma) : new InMemorySessionsRepository();
  const authRepository = prisma ? new PrismaAuthRepository(prisma) : new InMemoryAuthRepository();
  const registrationRepository = prisma
    ? new PrismaRegistrationRepository(prisma)
    : new InMemoryRegistrationRepository(usersRepository, authRepository);
  const twoFactorRepository = prisma ? new PrismaTwoFactorRepository(prisma) : new InMemoryTwoFactorRepository();
  const organizationsRepository = prisma
    ? new PrismaOrganizationsRepository(prisma)
    : new InMemoryOrganizationsRepository();
  const boardsRepository = prisma ? new PrismaBoardsRepository(prisma) : new InMemoryBoardsRepository();
  const listsRepository = prisma ? new PrismaListsRepository(prisma) : new InMemoryListsRepository();
  const cardsRepository = prisma ? new PrismaCardsRepository(prisma) : new InMemoryCardsRepository();
  const labelsRepository = prisma ? new PrismaLabelsRepository(prisma) : new InMemoryLabelsRepository();
  const sessionsService = new SessionsService(sessionsRepository, usersService);
  const totpService = new TotpService(new SecretBox(securityConfig.totpEncryptionKeyBase64));
  const recoveryCodesService = new RecoveryCodesService(twoFactorRepository);
  const twoFactorService = new TwoFactorService(
    twoFactorRepository,
    usersService,
    totpService,
    recoveryCodesService
  );
  const authService = new AuthService(
    usersService,
    authRepository,
    registrationRepository,
    new ScryptPasswordHasher(),
    sessionsService,
    twoFactorService
  );
  const organizationsService = new OrganizationsService(organizationsRepository, usersService);
  const boardsService = new BoardsService(boardsRepository, organizationsService);
  const listsService = new ListsService(listsRepository, boardsService);
  const cardsService = new CardsService(cardsRepository, listsService);
  const labelsService = new LabelsService(labelsRepository, boardsService, cardsService, listsService);

  if (env.NODE_ENV === 'test') 
  {
    app.decorate('testContext', {
      usersService,
      authService,
      authRepository,
      twoFactorService,
      sessionsService,
      organizationsService,
      boardsService,
      listsService,
      cardsService
    });
  }

  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof AppError) 
    {
      return reply.status(error.statusCode).send({ error: error.code, message: error.message });
    }
    if (hasZodFastifySchemaValidationErrors(error)) 
    {
      return reply.status(400).send({ error: 'VALIDATION_ERROR', message: 'Invalid request body' });
    }
    app.log.error(error);
    return reply.status(500).send({ error: 'INTERNAL_ERROR', message: 'Internal server error' });
  });

  app.get('/health', async () => ({ ok: true }));
  await registerAuthRoutes(app, authService, sessionsService);
  await registerOrganizationRoutes(app, organizationsService, sessionsService);
  await registerBoardRoutes(app, boardsService, sessionsService);
  await registerListRoutes(app, listsService, sessionsService);
  await registerCardRoutes(app, cardsService, sessionsService);
  await registerLabelRoutes(app, labelsService, sessionsService);
  await registerTwoFactorRoutes(app, twoFactorService, sessionsService);
  await registerUserRoutes(app, sessionsService, usersService);
  await registerUiRoutes(app);

  return app;
}
