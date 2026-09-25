import websocket from '@fastify/websocket';
import type { FastifyInstance } from 'fastify';
import type { BoardsService } from '../boards/boards.service.js';
import type { SessionsService } from '../sessions/sessions.service.js';
import { securityConfig } from '../../config/security.js';
import type { RealtimeService } from './realtime.service.js';

export async function registerRealtimeRoutes(
  app: FastifyInstance,
  realtimeService: RealtimeService,
  sessionsService: SessionsService,
  boardsService: BoardsService
) {
  await app.register(websocket, { options: { maxPayload: 64 * 1024 } });

  app.get('/realtime', { websocket: true }, (socket, request) => {
    const boardId = new URL(request.url, 'http://localhost').searchParams.get('boardId');
    const token = request.cookies?.[securityConfig.cookieName];

    if (!boardId || !token) {
      socket.close(4401, 'Authentication required');
      return;
    }

    void (async () => {
      const session = await sessionsService.getSessionFromToken(token);
      if (!session) {
        socket.close(4401, 'Authentication required');
        return;
      }
      try {
        await boardsService.getBoardForUser(boardId, session.user.id, 'read');
      } catch {
        socket.close(4403, 'Board access denied');
        return;
      }
      if (socket.readyState === socket.OPEN) realtimeService.subscribe(boardId, socket);
    })().catch(() => socket.close(1011, 'Unable to authorize connection'));
  });
}
