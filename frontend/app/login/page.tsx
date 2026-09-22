import React from 'react';
import { LoginPage } from '@/components/auth';

/**
 * Página de login
 * Flujo temporal reducido a email/password.
 * El resto de métodos queda deshabilitado hasta nuevo visto bueno.
 */
export default function LoginRoute() {
  return <LoginPage />;
}
