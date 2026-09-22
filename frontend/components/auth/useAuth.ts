'use client';

import { useState, useCallback, useEffect } from 'react';
import { AuthState, AuthUser, LoginResponse } from './auth.types';

/**
 * Hook personalizado para manejar autenticación
 * TODO: Integrar con backend real
 */
export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isLoading: false,
    error: null,
    isAuthenticated: false,
  });

  /**
   * Recuperar usuario guardado en localStorage al montar
   * TODO: Validar token con backend
   */
  useEffect(() => {
    const checkAuth = () => {
      try {
        const token = localStorage.getItem('authToken');
        const userStr = localStorage.getItem('authUser');

        if (token && userStr) {
          const user = JSON.parse(userStr) as AuthUser;
          setAuthState({
            user,
            isLoading: false,
            error: null,
            isAuthenticated: true,
          });
        }
      } catch (err) {
        console.error('Error recovering auth state:', err);
        localStorage.removeItem('authToken');
        localStorage.removeItem('authUser');
      }
    };

    checkAuth();
  }, []);

  /**
   * Login con credenciales
   * TODO: Llamar a backend real
   */
  const login = useCallback(async (email: string, password: string) => {
    setAuthState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      // TODO: Reemplazar con llamada real al backend
      // const response = await fetch('/api/auth/login', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ email, password }),
      // });
      //
      // if (!response.ok) {
      //   const error = await response.json();
      //   throw new Error(error.message);
      // }
      //
      // const data: LoginResponse = await response.json();
      // localStorage.setItem('authToken', data.token);
      // localStorage.setItem('authUser', JSON.stringify(data.user));
      //
      // setAuthState({
      //   user: data.user,
      //   isLoading: false,
      //   error: null,
      //   isAuthenticated: true,
      // });

      console.log('Login backend no implementado:', { email, password });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Login failed';
      setAuthState((prev) => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));
      throw err;
    }
  }, []);

  /**
   * Logout del usuario
   * TODO: Notificar al backend
   */
  const logout = useCallback(async () => {
    setAuthState((prev) => ({ ...prev, isLoading: true }));

    try {
      // TODO: Llamar a backend para invalidar sesión
      // await fetch('/api/auth/logout', {
      //   method: 'POST',
      //   headers: { Authorization: `Bearer ${authState.user?.id}` },
      // });

      localStorage.removeItem('authToken');
      localStorage.removeItem('authUser');

      setAuthState({
        user: null,
        isLoading: false,
        error: null,
        isAuthenticated: false,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Logout failed';
      setAuthState((prev) => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));
      throw err;
    }
  }, []);

  /**
   * Signup con email y contraseña
   * TODO: Implementar registro
   */
  const signup = useCallback(async (email: string, password: string, name: string) => {
    setAuthState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      // TODO: Implementar signup en backend
      // const response = await fetch('/api/auth/signup', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ email, password, name }),
      // });
      //
      // if (!response.ok) {
      //   const error = await response.json();
      //   throw new Error(error.message);
      // }
      //
      // const data: LoginResponse = await response.json();
      // localStorage.setItem('authToken', data.token);
      // localStorage.setItem('authUser', JSON.stringify(data.user));
      //
      // setAuthState({
      //   user: data.user,
      //   isLoading: false,
      //   error: null,
      //   isAuthenticated: true,
      // });

      console.log('Signup backend no implementado:', { email, password, name });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Signup failed';
      setAuthState((prev) => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));
      throw err;
    }
  }, []);

  /**
   * Refresh token
   * TODO: Implementar token refresh
   */
  const refreshToken = useCallback(async () => {
    try {
      // TODO: Llamar a backend para refrescar token
      // const response = await fetch('/api/auth/refresh', {
      //   method: 'POST',
      //   headers: {
      //     Authorization: `Bearer ${localStorage.getItem('authToken')}`,
      //   },
      // });
      //
      // if (!response.ok) {
      //   throw new Error('Token refresh failed');
      // }
      //
      // const data: LoginResponse = await response.json();
      // localStorage.setItem('authToken', data.token);
    } catch (err) {
      await logout();
      throw err;
    }
  }, [logout]);

  /**
   * Reset error
   */
  const clearError = useCallback(() => {
    setAuthState((prev) => ({ ...prev, error: null }));
  }, []);

  return {
    // Estado
    ...authState,

    // Acciones
    login,
    logout,
    signup,
    refreshToken,
    clearError,
  };
}
