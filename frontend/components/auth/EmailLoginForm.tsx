'use client';

import React, { useState, useCallback } from 'react';
import { LoginCredentials } from './auth.types';

interface UsernameLoginFormProps {
  onSubmit: (credentials: LoginCredentials) => Promise<void>;
  isLoading?: boolean;
  error?: string | null;
}

/**
 * Formulario de login con email y contraseña
 * Este es el método de autenticación más común
 */
export default function EmailLoginForm({
  onSubmit,
  isLoading = false,
  error,
}: UsernameLoginFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setLocalError(null);

      // Validación básica
      if (!email.trim()) {
        setLocalError('El email es obligatorio');
        return;
      }

      if (!password) {
        setLocalError('Password is required');
        return;
      }

      try {
        await onSubmit({ email: email.trim(), password });
      } catch (err) {
        setLocalError(err instanceof Error ? err.message : 'Login failed');
      }
    },
    [email, password, onSubmit]
  );

  const displayError = error || localError;

  return (
    <form onSubmit={handleSubmit} className="w-full space-y-4">
      {/* Campo de email */}
      <div className="space-y-2">
        <label htmlFor="email" className="text-sm font-medium text-on-surface">
          Email
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="tu@email.com"
          required
          autoComplete="email"
          disabled={isLoading}
          className="w-full rounded-xl border border-outline-variant bg-surface-bright px-4 py-3 text-on-surface placeholder-on-surface-variant transition-all focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-50"
        />
      </div>

      {/* Campo de Contraseña */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label htmlFor="password" className="text-sm font-medium text-on-surface">
            Contraseña
          </label>
          <a
            href="/forgot-password"
            className="text-xs text-primary hover:text-primary-container transition-colors"
          >
            ¿Olvidaste tu contraseña?
          </a>
        </div>
        <div className="relative">
          <input
            id="password"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            disabled={isLoading}
            className="w-full rounded-xl border border-outline-variant bg-surface-bright px-4 py-3 pr-12 text-on-surface placeholder-on-surface-variant transition-all focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-50"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant transition-colors hover:text-on-surface disabled:opacity-50"
            disabled={isLoading}
          >
            <span className="material-symbols-outlined text-[20px]">
              {showPassword ? 'visibility_off' : 'visibility'}
            </span>
          </button>
        </div>
      </div>

      {/* Mensaje de error */}
      {displayError && (
        <div className="p-3 bg-error/10 border border-error/20 rounded-lg text-error text-sm">
          <div className="flex items-start gap-2">
            <span className="material-symbols-outlined text-[18px] shrink-0 mt-0.5">
              error
            </span>
            <span>{displayError}</span>
          </div>
        </div>
      )}

      {/* Botón de login */}
      <button
        type="submit"
        disabled={isLoading}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 font-semibold text-white transition-colors hover:bg-primary-container disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isLoading && (
          <span className="material-symbols-outlined text-[20px] animate-spin">
            hourglass_empty
          </span>
        )}
        <span>{isLoading ? 'Iniciando sesión...' : 'Entrar'}</span>
      </button>

    </form>
  );
}
