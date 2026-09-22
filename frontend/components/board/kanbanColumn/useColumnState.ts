'use client';

import { useCallback, useState } from 'react';
import { TaskPriority } from '@/types/board';
import { DEFAULT_PRIORITY } from './kanbanColumn.constants';

interface UseColumnStateReturn {
  isAdding: boolean;
  newTitle: string;
  newPriority: TaskPriority;
  setNewTitle: (value: string) => void;
  setNewPriority: (value: TaskPriority) => void;
  startAdding: () => void;
  cancelAdding: () => void;
  resetForm: () => void;
}

/**
 * Hook que centraliza el estado del formulario de agregar tarea
 * Maneja:
 * - isAdding: si el formulario está visible
 * - newTitle: título de la nueva tarea
 * - newPriority: prioridad de la nueva tarea
 */
export function useColumnState(): UseColumnStateReturn {
  const [isAdding, setIsAdding] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newPriority, setNewPriority] = useState<TaskPriority>(DEFAULT_PRIORITY);

  const startAdding = useCallback(() => {
    setIsAdding(true);
  }, []);

  const resetForm = useCallback(() => {
    setNewTitle('');
    setNewPriority(DEFAULT_PRIORITY);
  }, []);

  const cancelAdding = useCallback(() => {
    setIsAdding(false);
    resetForm();
  }, [resetForm]);

  return {
    isAdding,
    newTitle,
    newPriority,
    setNewTitle,
    setNewPriority,
    startAdding,
    cancelAdding,
    resetForm,
  };
}
