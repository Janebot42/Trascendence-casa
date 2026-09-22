import { api } from './api';
import { TwoFactorMethod } from '@/components/auth/auth.types';

export async function reauthenticate(input: {
  password: string;
  secondFactorCode?: string;
  secondFactorMethod?: TwoFactorMethod;
}) {
  await api('/auth/reauthenticate', { method: 'POST', body: JSON.stringify(input) });
}

export async function beginTwoFactorSetup() {
  return api<{ provisioningUri: string }>('/2fa/setup', { method: 'POST' });
}

export async function confirmTwoFactor(code: string) {
  return api<{ recoveryCodes: string[] }>('/2fa/confirm', {
    method: 'POST',
    body: JSON.stringify({ code }),
  });
}

export async function regenerateRecoveryCodes() {
  return api<{ recoveryCodes: string[] }>('/2fa/recovery-codes/regenerate', { method: 'POST' });
}

export async function disableTwoFactor() {
  await api('/2fa', { method: 'DELETE' });
}
