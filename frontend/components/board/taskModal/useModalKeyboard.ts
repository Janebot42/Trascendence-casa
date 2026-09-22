'use client';

import { useEffect } from 'react';

/**
 * Hook para manejar atajos de teclado en modales
 * Especialmente cierre con ESC
 */
export function useModalKeyboard(onClose: () => void) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);
}
