'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { AuthState, AuthUser, LoginResponse } from './auth.types';

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isLoading: true,
    error: null,
    isAuthenticated: false,
  });

  useEffect(() => {
    let active = true;
    void api<{ user: AuthUser }>('/me')
      .then((data) => {
        if (active) setAuthState({ user: data.user, isLoading: false, error: null, isAuthenticated: true });
      })
      .catch(() => {
        if (active) setAuthState({ user: null, isLoading: false, error: null, isAuthenticated: false });
      });
    return () => { active = false; };
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    setAuthState((prev) => ({ ...prev, isLoading: true, error: null }));
    try {
      const data = await api<LoginResponse>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username: username.trim(), password }),
      });
      if (data.status === 'requires_2fa') {
        throw new Error('Esta cuenta requiere 2FA; el formulario de segundo factor se conectará en la siguiente fase.');
      }
      const current = await api<{ user: AuthUser }>('/me');
      setAuthState({ user: current.user, isLoading: false, error: null, isAuthenticated: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo iniciar sesión';
      setAuthState((prev) => ({ ...prev, isLoading: false, error: message, isAuthenticated: false }));
      throw error;
    }
  }, []);

  const logout = useCallback(async () => {
    setAuthState((prev) => ({ ...prev, isLoading: true }));
    try { await api('/auth/logout', { method: 'POST' }); }
    finally { setAuthState({ user: null, isLoading: false, error: null, isAuthenticated: false }); }
  }, []);

  const signup = useCallback(async () => {
    throw new Error('El registro se conectará cuando exista el formulario de username.');
  }, []);

  const refreshToken = useCallback(async () => {
    const data = await api<{ user: AuthUser }>('/me');
    setAuthState({ user: data.user, isLoading: false, error: null, isAuthenticated: true });
  }, []);

  const clearError = useCallback(() => {
    setAuthState((prev) => ({ ...prev, error: null }));
  }, []);

  return { ...authState, login, logout, signup, refreshToken, clearError };
}
