'use client';

import React, { useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import EmailLoginForm from './EmailLoginForm';
import { LoginCredentials, TwoFactorMethod } from './auth.types';
import { useAuth } from './useAuth';

/**
 * Página principal de login.
 * Flujo único: email y contraseña.
 */
export default function LoginPage() {
  const { login, completeTwoFactorLogin, twoFactorChallenge, isLoading, error } = useAuth();
  const router = useRouter();
  const [method, setMethod] = React.useState<TwoFactorMethod>('totp');
  const [code, setCode] = React.useState('');
  const [twoFactorError, setTwoFactorError] = React.useState<string | null>(null);

  /**
   * Login email/password.
   */
  const handleEmailLogin = useCallback(async (credentials: LoginCredentials) => {
    try {
      const result = await login(credentials.email, credentials.password);
      if (result === 'authenticated') router.push('/');
    } catch {
      // El hook conserva el error para mostrarlo en el formulario.
    }
  }, [login, router]);

  const handleTwoFactorSubmit = useCallback(async (event: React.FormEvent) => {
    event.preventDefault();
    setTwoFactorError(null);
    try {
      await completeTwoFactorLogin(method, code);
      router.push('/');
    } catch (cause) {
      setTwoFactorError(cause instanceof Error ? cause.message : 'Código 2FA no válido');
    }
  }, [code, completeTwoFactorLogin, method, router]);

  return (
    <main className="relative min-h-screen bg-surface-bright px-4 py-10 text-on-surface md:px-8 flex items-center justify-center">
      <div className="w-full max-w-xl space-y-6">
        <section className="text-center space-y-4">
          <div className="inline-flex items-center gap-3 rounded-full border border-outline-variant bg-white px-4 py-2 text-sm text-on-surface-variant shadow-sm">
            <span className="material-symbols-outlined text-[18px] text-primary">
              lock
            </span>
            Acceso seguro al espacio de trabajo
          </div>

          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-primary">
              TaskFlow
            </p>
            <h1 className="mt-3 text-4xl font-bold tracking-tight md:text-5xl">
              Inicia sesión para continuar.
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-base text-on-surface-variant md:text-lg">
              Accede a tu espacio de trabajo con tu email y contraseña.
            </p>
          </div>
        </section>

        <section>
          <div className="w-full rounded-[28px] border border-outline-variant bg-white p-6 shadow-sm md:p-8">
            <div className="mb-6 text-center">
              <h2 className="text-2xl font-semibold text-on-surface">Login</h2>
              <p className="mt-2 text-sm text-on-surface-variant">
                Usa tu email y contraseña para entrar al tablero.
              </p>
            </div>

            <EmailLoginForm
              onSubmit={handleEmailLogin}
              isLoading={isLoading}
              error={error}
            />

            {twoFactorChallenge && (
              <form onSubmit={handleTwoFactorSubmit} className="mt-6 space-y-4 border-t border-outline-variant pt-6">
                <div>
                  <h3 className="text-lg font-semibold text-on-surface">Verificación en dos pasos</h3>
                  <p className="mt-1 text-sm text-on-surface-variant">Introduce el código de tu aplicación autenticadora o un código de recuperación.</p>
                </div>
                <label className="block text-sm font-medium text-on-surface">
                  Método
                  <select value={method} onChange={(event) => setMethod(event.target.value as TwoFactorMethod)} className="mt-2 w-full rounded-xl border border-outline-variant bg-surface-bright px-4 py-3">
                    <option value="totp">Aplicación autenticadora</option>
                    <option value="recovery_code">Código de recuperación</option>
                  </select>
                </label>
                <label className="block text-sm font-medium text-on-surface">
                  Código
                  <input value={code} onChange={(event) => setCode(event.target.value)} required autoComplete="one-time-code" inputMode={method === 'totp' ? 'numeric' : 'text'} className="mt-2 w-full rounded-xl border border-outline-variant bg-surface-bright px-4 py-3" />
                </label>
                {(twoFactorError || error) && <p className="rounded-lg border border-error/20 bg-error/10 p-3 text-sm text-error">{twoFactorError ?? error}</p>}
                <button type="submit" disabled={isLoading} className="flex w-full items-center justify-center rounded-xl bg-primary px-4 py-3 font-semibold text-white disabled:opacity-50">
                  {isLoading ? 'Verificando...' : 'Verificar código'}
                </button>
              </form>
            )}
          </div>
        </section>
      </div>

      <div className="absolute bottom-6 left-1/2 w-full max-w-xl -translate-x-1/2 px-4 text-center text-sm text-on-surface-variant md:px-8">
        Don&apos;t have an account?{' '}
        <Link href="/signup" className="font-medium text-primary transition-colors hover:text-primary-container">
          Sign up
        </Link>
      </div>
    </main>
  );
}
