'use client';

import React, { useCallback, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from './useAuth';

export default function SignupPage() {
  const router = useRouter();
  const { signup, isLoading, error } = useAuth();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  const handleSubmit = useCallback(async (event: React.FormEvent) => {
    event.preventDefault();
    setLocalError(null);

    if (username.trim().length < 3) {
      setLocalError('El username debe tener al menos 3 caracteres.');
      return;
    }
    if (password.length < 12) {
      setLocalError('La contraseña debe tener al menos 12 caracteres.');
      return;
    }
    if (password !== passwordConfirmation) {
      setLocalError('Las contraseñas no coinciden.');
      return;
    }

    try {
      await signup(username, email, password);
      router.push('/');
    } catch {
      // El hook conserva el error para mostrarlo en el formulario.
    }
  }, [email, password, passwordConfirmation, router, signup, username]);

  const displayError = error || localError;

  return (
    <main className="relative flex min-h-screen items-center justify-center bg-surface-bright px-4 py-10 text-on-surface md:px-8">
      <div className="w-full max-w-xl space-y-6">
        <section className="text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-primary">TaskFlow</p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight md:text-5xl">Crea tu cuenta.</h1>
          <p className="mx-auto mt-4 max-w-xl text-base text-on-surface-variant md:text-lg">
            Regístrate para acceder a tu espacio de trabajo.
          </p>
        </section>

        <section className="w-full rounded-[28px] border border-outline-variant bg-white p-6 shadow-sm md:p-8">
          <div className="mb-6 text-center">
            <h2 className="text-2xl font-semibold">Sign up</h2>
            <p className="mt-2 text-sm text-on-surface-variant">Usa un username y una contraseña segura.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <label className="block text-sm font-medium">
              Username
              <input value={username} onChange={(event) => setUsername(event.target.value)} required minLength={3} maxLength={32} autoComplete="username" disabled={isLoading} className="mt-2 w-full rounded-xl border border-outline-variant bg-surface-bright px-4 py-3 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50" />
            </label>
            <label className="block text-sm font-medium">
              Email <span className="font-normal text-on-surface-variant">(opcional)</span>
              <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} maxLength={254} autoComplete="email" disabled={isLoading} className="mt-2 w-full rounded-xl border border-outline-variant bg-surface-bright px-4 py-3 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50" />
            </label>
            <label className="block text-sm font-medium">
              Contraseña
              <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required minLength={12} maxLength={128} autoComplete="new-password" disabled={isLoading} className="mt-2 w-full rounded-xl border border-outline-variant bg-surface-bright px-4 py-3 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50" />
            </label>
            <label className="block text-sm font-medium">
              Repite la contraseña
              <input type="password" value={passwordConfirmation} onChange={(event) => setPasswordConfirmation(event.target.value)} required minLength={12} maxLength={128} autoComplete="new-password" disabled={isLoading} className="mt-2 w-full rounded-xl border border-outline-variant bg-surface-bright px-4 py-3 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50" />
            </label>

            {displayError && <p className="rounded-lg border border-error/20 bg-error/10 p-3 text-sm text-error">{displayError}</p>}

            <button type="submit" disabled={isLoading} className="flex w-full items-center justify-center rounded-xl bg-primary px-4 py-3 font-semibold text-white transition-colors hover:bg-primary-container disabled:cursor-not-allowed disabled:opacity-50">
              {isLoading ? 'Creando cuenta...' : 'Crear cuenta'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-on-surface-variant">
            ¿Ya tienes una cuenta?{' '}
            <Link href="/login" className="font-medium text-primary hover:text-primary-container">Inicia sesión</Link>
          </p>
        </section>
      </div>
    </main>
  );
}
