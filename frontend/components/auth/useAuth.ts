'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { AuthState, AuthUser, LoginResponse, TwoFactorChallenge, TwoFactorMethod } from './auth.types';

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isLoading: true,
    error: null,
    isAuthenticated: false,
  });
  const [twoFactorChallenge, setTwoFactorChallenge] = useState<TwoFactorChallenge | null>(null);

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
        if (!data.challengeToken || !data.expiresAt) throw new Error('El desafío 2FA recibido no es válido.');
        setTwoFactorChallenge({ challengeToken: data.challengeToken, expiresAt: data.expiresAt });
        setAuthState((prev) => ({ ...prev, isLoading: false, error: null, isAuthenticated: false }));
        return;
      }
      const current = await api<{ user: AuthUser }>('/me');
      setAuthState({ user: current.user, isLoading: false, error: null, isAuthenticated: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo iniciar sesión';
      setAuthState((prev) => ({ ...prev, isLoading: false, error: message, isAuthenticated: false }));
      throw error;
    }
  }, []);

  const completeTwoFactorLogin = useCallback(async (method: TwoFactorMethod, code: string) => {
    if (!twoFactorChallenge) throw new Error('No hay ningún desafío 2FA pendiente.');
    setAuthState((prev) => ({ ...prev, isLoading: true, error: null }));
    try {
      await api<LoginResponse>('/auth/login/2fa', {
        method: 'POST',
        body: JSON.stringify({
          challengeToken: twoFactorChallenge.challengeToken,
          method,
          code: code.trim(),
        }),
      });
      const current = await api<{ user: AuthUser }>('/me');
      setTwoFactorChallenge(null);
      setAuthState({ user: current.user, isLoading: false, error: null, isAuthenticated: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo verificar el segundo factor';
      setAuthState((prev) => ({ ...prev, isLoading: false, error: message, isAuthenticated: false }));
      throw error;
    }
  }, [twoFactorChallenge]);

  const logout = useCallback(async () => {
    setAuthState((prev) => ({ ...prev, isLoading: true }));
    try { await api('/auth/logout', { method: 'POST' }); }
    finally {
      setTwoFactorChallenge(null);
      setAuthState({ user: null, isLoading: false, error: null, isAuthenticated: false });
    }
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

  return { ...authState, twoFactorChallenge, login, completeTwoFactorLogin, logout, signup, refreshToken, clearError };
}
