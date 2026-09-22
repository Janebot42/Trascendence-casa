/**
 * Tipos y interfaces para autenticación
 */

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  role?: string;
}

export interface AuthState {
  user: AuthUser | null;
  isLoading: boolean;
  error: string | null;
  isAuthenticated: boolean;
}

export interface LoginResponse {
  user: AuthUser;
  token: string;
  refreshToken?: string;
}

/**
 * Respuesta de error de autenticación
 */
export interface AuthError {
  code: string;
  message: string;
  field?: string;
}
