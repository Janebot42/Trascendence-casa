import { securityConfig } from '../../config/security.js';
import type { PasswordHasher } from '../../shared/crypto/passwordHasher.js';
import { hashToken } from '../../shared/crypto/hashToken.js';
import { randomToken } from '../../shared/crypto/randomToken.js';
import { InMemoryRateLimiter, rateLimitKey } from '../../shared/http/rateLimit.js';
import { badRequest, unauthorized } from '../../shared/errors/httpErrors.js';
import type { SessionsService } from '../sessions/sessions.service.js';
import type { TwoFactorService } from '../two_factor/twoFactor.service.js';
import type { UsersService } from '../users/users.service.js';
import type { AuthRepository } from './auth.repository.js';
import type { RegistrationRepository } from './registration.repository.js';
import type { LoginResult } from './auth.types.js';

export class AuthService 
{
  private readonly registrationLimiter = new InMemoryRateLimiter(5, 15 * 60 * 1000);
  private readonly passwordIdentityLimiter = new InMemoryRateLimiter(5, 15 * 60 * 1000);
  private readonly passwordIpLimiter = new InMemoryRateLimiter(30, 15 * 60 * 1000);
  private readonly secondFactorChallengeLimiter = new InMemoryRateLimiter(5, 5 * 60 * 1000);
  private readonly secondFactorIpLimiter = new InMemoryRateLimiter(30, 5 * 60 * 1000);
  private readonly reauthenticationLimiter = new InMemoryRateLimiter(5, 15 * 60 * 1000);

  constructor(
    private readonly usersService: UsersService,
    private readonly authRepository: AuthRepository,
    private readonly registrationRepository: RegistrationRepository,
    private readonly passwordHasher: PasswordHasher,
    private readonly sessionsService: SessionsService,
    private readonly twoFactorService: TwoFactorService
  ) {}

  async register(input: {
    username: string;
    email?: string | null;
    password: string;
    ipAddress?: string | null;
    userAgent?: string | null;
  }): Promise<LoginResult> {
    if (input.password.length < 12 || input.password.length > 128)
      throw badRequest('Password must be between 12 and 128 characters');

    this.registrationLimiter.consume(rateLimitKey('register-ip', input.ipAddress));

    const passwordHash = await this.passwordHasher.hash(input.password);
    const user = await this.registrationRepository.createUserWithCredential({
      username: input.username,
      email: input.email ?? null,
      passwordHash,
      passwordUpdatedAt: new Date()
    });

    const createdSession = await this.sessionsService.createSession({
      userId: user.id,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent
    });

    return {
      status: 'authenticated',
      user,
      sessionToken: createdSession.token,
      sessionExpiresAt: createdSession.session.expiresAt
    };
  }

  async login(input: {
    username: string;
    password: string;
    ipAddress?: string | null;
    userAgent?: string | null;
  }): Promise<LoginResult> {
    const identityKey = rateLimitKey('login-identity', input.ipAddress, input.username.trim().toLowerCase());
    const ipKey = rateLimitKey('login-ip', input.ipAddress);
    this.passwordIdentityLimiter.assertAllowed(identityKey);
    this.passwordIpLimiter.assertAllowed(ipKey);

    const user = await this.usersService.findByUsername(input.username);
    if (!user || user.status !== 'active')
    {
      this.passwordIdentityLimiter.recordFailure(identityKey);
      this.passwordIpLimiter.recordFailure(ipKey);
      throw unauthorized('Invalid credentials');
    }

    const credential = await this.authRepository.findPasswordCredential(user.id);
    if (!credential || !(await this.passwordHasher.verify(credential.passwordHash, input.password))) {
      this.passwordIdentityLimiter.recordFailure(identityKey);
      this.passwordIpLimiter.recordFailure(ipKey);
      throw unauthorized('Invalid credentials');
    }

    this.passwordIdentityLimiter.reset(identityKey);

    return this.completeTrustedLogin({
      userId: user.id,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent
    });
  }

  async completeTrustedLogin(input: {
    userId: string;
    ipAddress?: string | null;
    userAgent?: string | null;
  }): Promise<LoginResult> {
    const user = await this.usersService.findById(input.userId);
    if (!user || user.status !== 'active') 
      throw unauthorized();

    if (await this.twoFactorService.isEnabled(user.id)) 
    {
      const challengeToken = randomToken(32);
      const challenge = await this.authRepository.createLoginChallenge({
        userId: user.id,
        tokenHash: hashToken(challengeToken),
        expiresAt: new Date(Date.now() + securityConfig.loginChallengeTtlMs),
        ipAddress: input.ipAddress ?? null,
        userAgent: input.userAgent ?? null
      });
      return {
        status: 'requires_2fa',
        challengeToken,
        expiresAt: challenge.expiresAt
      };
    }

    const createdSession = await this.sessionsService.createSession({
      userId: user.id,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent
    });
    return {
      status: 'authenticated',
      user,
      sessionToken: createdSession.token,
      sessionExpiresAt: createdSession.session.expiresAt
    };
  }

  async completeTwoFactorLogin(input: {
    challengeToken: string;
    code: string;
    method: 'totp' | 'recovery_code';
    ipAddress?: string | null;
    userAgent?: string | null;
  }): Promise<LoginResult> {
    const challengeKey = rateLimitKey('2fa-challenge', input.challengeToken);
    const ipKey = rateLimitKey('2fa-ip', input.ipAddress);
    this.secondFactorChallengeLimiter.assertAllowed(challengeKey);
    this.secondFactorIpLimiter.assertAllowed(ipKey);

    const challenge = await this.authRepository.findLoginChallengeByTokenHash(hashToken(input.challengeToken));
    if (!challenge || challenge.consumedAt || challenge.expiresAt <= new Date()) 
    {
      this.secondFactorChallengeLimiter.recordFailure(challengeKey);
      this.secondFactorIpLimiter.recordFailure(ipKey);
      throw unauthorized('Invalid or expired login challenge');
    }

    const ok =
      input.method === 'totp'
        ? await this.twoFactorService.verifyTotp(challenge.userId, input.code)
        : await this.twoFactorService.consumeRecoveryCode(challenge.userId, input.code);

    if (!ok) 
    {
      this.secondFactorChallengeLimiter.recordFailure(challengeKey);
      this.secondFactorIpLimiter.recordFailure(ipKey);
      throw unauthorized('Invalid second factor');
    }

    // Compare-and-set: only one concurrent request can claim this challenge.
    if (!(await this.authRepository.claimLoginChallenge(challenge.id, new Date())))
      throw unauthorized('Invalid or expired login challenge');
    this.secondFactorChallengeLimiter.reset(challengeKey);

    const user = await this.usersService.findById(challenge.userId);
    if (!user || user.status !== 'active') 
      throw unauthorized();

    const createdSession = await this.sessionsService.createSession({
      userId: user.id,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent
    });

    return {
      status: 'authenticated',
      user,
      sessionToken: createdSession.token,
      sessionExpiresAt: createdSession.session.expiresAt
    };
  }

  async reauthenticate(input: {
    userId: string;
    password: string;
    sessionId: string;
    secondFactorCode?: string;
    secondFactorMethod?: 'totp' | 'recovery_code';
  }): Promise<void> 
  {
    const { userId, password, sessionId, secondFactorCode, secondFactorMethod } = input;
    const limiterKey = rateLimitKey('reauth-session', sessionId);
    this.reauthenticationLimiter.assertAllowed(limiterKey);
    const credential = await this.authRepository.findPasswordCredential(userId);
    if (!credential || !(await this.passwordHasher.verify(credential.passwordHash, password))) 
    {
      this.reauthenticationLimiter.recordFailure(limiterKey);
      throw unauthorized('Invalid credentials');
    }

    if (await this.twoFactorService.isEnabled(userId)) 
    {
      if (!secondFactorCode || !secondFactorMethod) 
      {
        this.reauthenticationLimiter.recordFailure(limiterKey);
        throw unauthorized('Second factor required');
      }

      const secondFactorOk =
        secondFactorMethod === 'totp'
          ? await this.twoFactorService.verifyTotp(userId, secondFactorCode)
          : await this.twoFactorService.consumeRecoveryCode(userId, secondFactorCode);

      if (!secondFactorOk) 
      {
        this.reauthenticationLimiter.recordFailure(limiterKey);
        throw unauthorized('Invalid second factor');
      }
    }

    this.reauthenticationLimiter.reset(limiterKey);
    await this.sessionsService.markReauthenticated(sessionId);
  }

  async changePassword(userId: string, newPassword: string): Promise<void> 
  {
    if (newPassword.length < 12 || newPassword.length > 128)
      throw badRequest('Password must be between 12 and 128 characters');
    await this.authRepository.updatePasswordCredential({
      userId,
      passwordHash: await this.passwordHasher.hash(newPassword),
      passwordUpdatedAt: new Date()
    });
  }
}
