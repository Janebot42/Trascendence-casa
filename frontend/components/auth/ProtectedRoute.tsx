'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth/useAuth';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: string;
}

/**
 * Componente para proteger rutas
 * Solo usuarios autenticados pueden acceder
 * 
 * Uso:
 * <ProtectedRoute requiredRole="admin">
 *   <YourComponent />
 * </ProtectedRoute>
 */
export default function ProtectedRoute({ 
  children, 
  requiredRole 
}: ProtectedRouteProps) {
  const router = useRouter();
  const { isAuthenticated, user, isLoading } = useAuth();

  useEffect(() => {
    // Si está cargando, esperar
    if (isLoading) return;

    // Si no está autenticado, redirigir a login
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    // Si requiere un rol específico y el usuario no lo tiene
    if (requiredRole && user?.role !== requiredRole) {
      router.push('/');
      return;
    }
  }, [isAuthenticated, isLoading, requiredRole, user?.role, router]);

  // Mostrar loading mientras se verifica autenticación
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto mb-4" />
          <p className="text-on-surface-variant">Loading...</p>
        </div>
      </div>
    );
  }

  // Si no está autenticado, no mostrar nada (redirect en progreso)
  if (!isAuthenticated) {
    return null;
  }

  // Si requiere rol y no lo tiene, no mostrar nada (redirect en progreso)
  if (requiredRole && user?.role !== requiredRole) {
    return null;
  }

  // Todo bien, mostrar contenido
  return <>{children}</>;
}
