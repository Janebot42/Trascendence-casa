'use client';

import React, { useCallback, useState } from 'react';
import Link from 'next/link';
import EmailLoginForm from './EmailLoginForm';
import { LoginCredentials } from './auth.types';

/**
 * Página principal de login.
 * Flujo único: email y contraseña.
 */
export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Login email/password.
   * TODO: Sustituir el mock por la llamada real al backend.
   */
  const handleEmailLogin = useCallback(async (credentials: LoginCredentials) => {
    setIsLoading(true);
    setError(null);

    try {
      console.log('Login attempt with:', credentials);
      await new Promise((resolve) => setTimeout(resolve, 900));

      if (credentials.email === 'test@error.com') {
        throw new Error('Invalid credentials');
      }

      alert('Login simulado exitoso. Backend no implementado aún.');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Login failed';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

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
              Estamos dejando esta pantalla lista para crecer, pero por ahora solo
              usamos email y contraseña para mantener el flujo claro.
            </p>
          </div>
        </section>

        <section>
          <div className="w-full rounded-[28px] border border-outline-variant bg-white p-6 shadow-sm md:p-8">
            <div className="mb-6 text-center">
              <h2 className="text-2xl font-semibold text-on-surface">Email login</h2>
              <p className="mt-2 text-sm text-on-surface-variant">
                Usa tu correo corporativo para entrar al tablero.
              </p>
            </div>

            <EmailLoginForm
              onSubmit={handleEmailLogin}
              isLoading={isLoading}
              error={error}
            />
          </div>
        </section>
      </div>

      <div className="absolute bottom-6 left-1/2 w-full max-w-xl -translate-x-1/2 px-4 text-center text-sm text-on-surface-variant md:px-8">
        Don't have an account?{' '}
        <Link href="/signup" className="font-medium text-primary transition-colors hover:text-primary-container">
          Sign up
        </Link>
      </div>
    </main>
  );
}
