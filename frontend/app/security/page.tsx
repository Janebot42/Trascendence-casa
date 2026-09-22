'use client';

import { FormEvent, useState } from 'react';
import { ProtectedRoute } from '@/components/auth';
import { beginTwoFactorSetup, confirmTwoFactor, disableTwoFactor, regenerateRecoveryCodes, reauthenticate } from '@/lib/security';

export default function SecurityPage() {
  const [password, setPassword] = useState('');
  const [secondFactorCode, setSecondFactorCode] = useState('');
  const [secondFactorMethod, setSecondFactorMethod] = useState<'totp' | 'recovery_code'>('totp');
  const [setupCode, setSetupCode] = useState('');
  const [provisioningUri, setProvisioningUri] = useState('');
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = async (operation: () => Promise<void>, success: string) => {
    setError(null);
    setMessage(null);
    try { await operation(); setMessage(success); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'La operación ha fallado'); }
  };

  const handleReauthenticate = async (event: FormEvent) => {
    event.preventDefault();
    await run(() => reauthenticate({
      password,
      ...(secondFactorCode ? { secondFactorCode, secondFactorMethod } : {}),
    }), 'Sesión reautenticada durante los próximos minutos.');
  };

  const handleSetup = async () => {
    setError(null);
    setMessage(null);
    try {
      const result = await beginTwoFactorSetup();
      setProvisioningUri(result.provisioningUri);
      setMessage('Escanea el código o usa el secreto manual y confirma con un código TOTP.');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudo iniciar 2FA'); }
  };

  const handleConfirm = async (event: FormEvent) => {
    event.preventDefault();
    await run(async () => {
      const result = await confirmTwoFactor(setupCode);
      setRecoveryCodes(result.recoveryCodes);
      setSetupCode('');
    }, '2FA activado. Guarda los códigos de recuperación.');
  };

  return (
    <ProtectedRoute>
      <main className="min-h-screen flex-1 overflow-y-auto bg-surface-bright p-6 text-on-surface md:p-10">
        <div className="mx-auto max-w-3xl space-y-6">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-primary">Seguridad</p>
            <h1 className="mt-2 text-3xl font-bold">Autenticación en dos pasos</h1>
            <p className="mt-2 text-on-surface-variant">Reautentica la sesión antes de configurar o modificar 2FA.</p>
          </div>

          {(message || error) && <div className={`rounded-lg border p-3 text-sm ${error ? 'border-error/20 bg-error/10 text-error' : 'border-primary/20 bg-primary/10 text-primary'}`}>{error ?? message}</div>}

          <form onSubmit={handleReauthenticate} className="space-y-4 rounded-2xl border border-outline-variant bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold">Reautenticar sesión</h2>
            <label className="block text-sm font-medium">Contraseña<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required className="mt-2 w-full rounded-xl border border-outline-variant px-4 py-3" /></label>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="block text-sm font-medium">Método 2FA opcional<select value={secondFactorMethod} onChange={(event) => setSecondFactorMethod(event.target.value as typeof secondFactorMethod)} className="mt-2 w-full rounded-xl border border-outline-variant px-4 py-3"><option value="totp">TOTP</option><option value="recovery_code">Código de recuperación</option></select></label>
              <label className="block text-sm font-medium">Código 2FA<input value={secondFactorCode} onChange={(event) => setSecondFactorCode(event.target.value)} className="mt-2 w-full rounded-xl border border-outline-variant px-4 py-3" /></label>
            </div>
            <button className="rounded-xl bg-primary px-4 py-3 font-semibold text-white">Reautenticar</button>
          </form>

          <section className="space-y-4 rounded-2xl border border-outline-variant bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold">Configurar 2FA</h2>
            <button type="button" onClick={handleSetup} className="rounded-xl border border-primary px-4 py-3 font-semibold text-primary">Generar secreto TOTP</button>
            {provisioningUri && <div className="space-y-3 rounded-xl bg-surface-bright p-4 text-sm"><p className="break-all"><strong>URI:</strong> {provisioningUri}</p><p><strong>Secreto manual:</strong> {new URL(provisioningUri).searchParams.get('secret') ?? 'No disponible'}</p><form onSubmit={handleConfirm} className="flex flex-col gap-3 sm:flex-row"><input value={setupCode} onChange={(event) => setSetupCode(event.target.value)} placeholder="Código de 6 dígitos" required pattern="[0-9]{6}" inputMode="numeric" className="rounded-xl border border-outline-variant px-4 py-3" /><button className="rounded-xl bg-primary px-4 py-3 font-semibold text-white">Confirmar 2FA</button></form></div>}
          </section>

          <section className="flex flex-wrap gap-3 rounded-2xl border border-outline-variant bg-white p-6 shadow-sm">
            <button type="button" onClick={() => run(async () => setRecoveryCodes((await regenerateRecoveryCodes()).recoveryCodes), 'Códigos regenerados. Guarda la nueva lista.')} className="rounded-xl border border-primary px-4 py-3 font-semibold text-primary">Regenerar códigos</button>
            <button type="button" onClick={() => run(disableTwoFactor, '2FA desactivado.')} className="rounded-xl border border-error px-4 py-3 font-semibold text-error">Desactivar 2FA</button>
            {recoveryCodes.length > 0 && <pre className="basis-full rounded-xl bg-surface-bright p-4 text-sm">{recoveryCodes.join('\n')}</pre>}
          </section>
        </div>
      </main>
    </ProtectedRoute>
  );
}
