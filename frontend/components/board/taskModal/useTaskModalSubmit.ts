'use client';

import { useCallback } from 'react';
import { TaskItem, TaskPriority } from '@/types/board';
import { buildUpdatedTask } from './taskModal.utils';
import { User } from '@/types/board';

interface TaskFormData {
  title: string;
  description: string;
  priority: TaskPriority;
  dueDate: string;
  columnId: string;
  completed: boolean;
  assignedUserIds: string[];
}

interface UseTaskModalSubmitReturn {
  handleSubmit: (event: React.FormEvent) => void;
}

/**
 * Hook specializado para manejar la lógica de envío del formulario
 * Separa validación, transformación y callbacks del componente principal
 */
export function useTaskModalSubmit(
  task: TaskItem,
  formData: TaskFormData,
  users: User[],
  onSave: (updatedTask: TaskItem, newColumnId: string) => void,
  onClose: () => void
): UseTaskModalSubmitReturn {
  const handleSubmit = useCallback(
    (event: React.FormEvent) => {
      event.preventDefault();

      // Validación
      if (!formData.title.trim()) {
        console.warn('Task title cannot be empty');
        return;
      }

      // Transformación
      const updatedTask = buildUpdatedTask({
        task,
        title: formData.title,
        description: formData.description,
        priority: formData.priority,
        dueDate: formData.dueDate,
        completed: formData.completed,
        assignedUserIds: formData.assignedUserIds,
        users,
      });

      // Persistencia
      onSave(updatedTask, formData.columnId);
      onClose();
    },
    [task, formData, users, onSave, onClose]
  );

  return { handleSubmit };
}
