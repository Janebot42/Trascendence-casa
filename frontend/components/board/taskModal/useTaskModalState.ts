'use client';

import { useCallback, useEffect, useState } from 'react';
import { TaskItem, TaskPriority } from '@/types/board';

// Tipo para el estado del formulario
interface TaskFormState {
  title: string;
  description: string;
  priority: TaskPriority;
  dueDate: string;
  columnId: string;
  completed: boolean;
  assignedUserIds: string[];
}

// Tipo para el retorno del hook
interface UseTaskModalStateReturn {
  formData: TaskFormState;
  updateField: {
    setTitle: (value: string) => void;
    setDescription: (value: string) => void;
    setPriority: (value: TaskPriority) => void;
    setDueDate: (value: string) => void;
    setColumnId: (value: string) => void;
    setCompleted: (value: boolean) => void;
    toggleUserAssignment: (userId: string) => void;
  };
}

function createTaskFormState(task: TaskItem, currentColumnId: string): TaskFormState {
  return {
    title: task.title || '',
    description: task.description || '',
    priority: task.priority || 'Medium',
    dueDate: task.dueDate || '',
    columnId: currentColumnId,
    completed: !!task.completed,
    assignedUserIds: task.assignees?.map((user) => user.id) || [],
  };
}

/**
 * Hook personalizado que centraliza toda la lógica de estado del modal de tareas
 * Agrupa 8 estados en uno solo para simplificar el componente principal
 */
export function useTaskModalState(
  task: TaskItem,
  currentColumnId: string
): UseTaskModalStateReturn {
  const [formData, setFormData] = useState<TaskFormState>(() =>
    createTaskFormState(task, currentColumnId)
  );

  useEffect(() => {
    setFormData(createTaskFormState(task, currentColumnId));
  }, [task, currentColumnId]);

  const setTitle = useCallback((value: string) => {
    setFormData((prev) => ({ ...prev, title: value }));
  }, []);

  const setDescription = useCallback((value: string) => {
    setFormData((prev) => ({ ...prev, description: value }));
  }, []);

  const setPriority = useCallback((value: TaskPriority) => {
    setFormData((prev) => ({ ...prev, priority: value }));
  }, []);

  const setDueDate = useCallback((value: string) => {
    setFormData((prev) => ({ ...prev, dueDate: value }));
  }, []);

  const setColumnId = useCallback((value: string) => {
    setFormData((prev) => ({
      ...prev,
      columnId: value,
      completed: value === 'col-done' ? true : prev.completed,
    }));
  }, []);

  const setCompleted = useCallback((value: boolean) => {
    setFormData((prev) => ({ ...prev, completed: value }));
  }, []);

  const toggleUserAssignment = useCallback((userId: string) => {
    setFormData((prev) => {
      const updatedIds = prev.assignedUserIds.includes(userId)
        ? prev.assignedUserIds.filter((id) => id !== userId)
        : [...prev.assignedUserIds, userId];

      return {
        ...prev,
        assignedUserIds: updatedIds,
      };
    });
  }, []);

  return {
    formData,
    updateField: {
      setTitle,
      setDescription,
      setPriority,
      setDueDate,
      setColumnId,
      setCompleted,
      toggleUserAssignment,
    },
  };
}
