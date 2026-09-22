/**
 * Tipos y interfaces para autenticación
 */

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface AuthUser {
  id: string;
  username: string;
  email: string | null;
  displayName: string | null;
  role: string;
  status: string;
}

export interface AuthState {
  user: AuthUser | null;
  isLoading: boolean;
  error: string | null;
  isAuthenticated: boolean;
}

export interface LoginResponse {
  user?: AuthUser;
  status: 'authenticated' | 'requires_2fa';
  challengeToken?: string;
  expiresAt?: string;
}

export type TwoFactorMethod = 'totp' | 'recovery_code';

export type TwoFactorChallenge = {
  challengeToken: string;
  expiresAt: string;
};

/**
 * Respuesta de error de autenticación
 */
export interface AuthError {
  code: string;
  message: string;
  field?: string;
}
