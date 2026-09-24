import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { clearSessionCookie, setSessionCookie } from '../../shared/http/cookies.js';
import { securityConfig } from '../../config/security.js';
import { forbidden } from '../../shared/errors/httpErrors.js';
import type { AuthService } from './auth.service.js';
import type { SessionsService } from '../sessions/sessions.service.js';
import { requireAuth } from '../authorization/requireAuth.js';
import type { LoginResult } from './auth.types.js';

const registerSchema = z.object({
  username: z.string().min(3).max(32),
  email: z.string().trim().email().max(254),
  password: z.string().min(12).max(128)
});

const loginSchema = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(1).max(128)
});

const twoFactorLoginSchema = z.discriminatedUnion('method', [
  z.object({
    challengeToken: z.string().length(43),
    code: z.string().regex(/^\d{6}$/),
    method: z.literal('totp')
  }),
  z.object({
    challengeToken: z.string().length(43),
    code: z.string().trim().regex(/^[A-Za-z0-9_-]{12}$/),
    method: z.literal('recovery_code')
  })
]);

const reauthenticateSchema = z.object({
  password: z.string().min(1).max(128),
  secondFactorCode: z.string().min(1).max(64).optional(),
  secondFactorMethod: z.enum(['totp', 'recovery_code']).optional()
});

const changePasswordSchema = z.object({ newPassword: z.string().min(12).max(128) });

function getUserAgent(header: string | string[] | undefined): string | null 
{
  if (!header) return null;
  return Array.isArray(header) ? header.join(', ') : header;
}

function toPublicLoginResult(result: LoginResult) 
{
  if (result.status === 'requires_2fa') {
    return result;
  }

  return {
    status: result.status,
    user: result.user,
    sessionExpiresAt: result.sessionExpiresAt
  };
}

export async function registerAuthRoutes(
  app: FastifyInstance,
  authService: AuthService,
  sessionsService: SessionsService
) 
{
  const typedApp = app.withTypeProvider<ZodTypeProvider>();

  typedApp.post('/auth/register', { schema: { body: registerSchema } }, async (request, reply) => {
    const body = request.body;
    const result = await authService.register({
      ...body,
      ipAddress: request.ip,
      userAgent: getUserAgent(request.headers['user-agent'])
    });

    if (result.status === 'authenticated') {
      setSessionCookie(reply, result.sessionToken, result.sessionExpiresAt);
    }
    return toPublicLoginResult(result);
  });

  typedApp.post('/auth/login', { schema: { body: loginSchema } }, async (request, reply) => {
    const body = request.body;
    const result = await authService.login({
      ...body,
      ipAddress: request.ip,
      userAgent: getUserAgent(request.headers['user-agent'])
    });

    if (result.status === 'authenticated') 
    {
      setSessionCookie(reply, result.sessionToken, result.sessionExpiresAt);
    }
    return toPublicLoginResult(result);
  });

  typedApp.post('/auth/login/2fa', { schema: { body: twoFactorLoginSchema } }, async (request, reply) => {
    const body = request.body;
    const result = await authService.completeTwoFactorLogin({
      ...body,
      ipAddress: request.ip,
      userAgent: getUserAgent(request.headers['user-agent'])
    });

    if (result.status === 'authenticated') 
    {
      setSessionCookie(reply, result.sessionToken, result.sessionExpiresAt);
    }
    return toPublicLoginResult(result);
  });

  typedApp.post('/auth/logout', async (request, reply) => {
    const token = request.cookies[securityConfig.cookieName];
    if (token) await sessionsService.revokeSession(token);
    clearSessionCookie(reply);
    return { ok: true };
  });

  typedApp.post('/auth/reauthenticate', {
    preHandler: requireAuth(sessionsService),
    schema: { body: reauthenticateSchema }
  }, async (request) => {
    const body = request.body;
    await authService.reauthenticate({
      userId: request.currentUser!.id,
      password: body.password,
      sessionId: request.currentSession!.id,
      secondFactorCode: body.secondFactorCode,
      secondFactorMethod: body.secondFactorMethod
    });
    return { ok: true };
  });

  typedApp.post('/auth/password/change', {
    preHandler: requireAuth(sessionsService),
    schema: { body: changePasswordSchema }
  }, async (request) => {
    const body = request.body;
    const reauthenticatedAt = request.currentSession!.reauthenticatedAt;
    if (!reauthenticatedAt || Date.now() - reauthenticatedAt.getTime() > securityConfig.sensitiveActionTtlMs) 
    {
      throw forbidden('Recent reauthentication required', 'REAUTHENTICATION_REQUIRED');
    }
    await authService.changePassword(request.currentUser!.id, body.newPassword);
    await sessionsService.revokeOtherUserSessions(request.currentUser!.id, request.currentSession!.id);
    return { ok: true };
  });
}
