'use client';

import React from 'react';
import { BoardColumn, TaskItem } from '@/types/board';
import TaskModalHeader from './TaskModalHeader';
import TaskModalForm from './TaskModalForm';
import { useTaskModalState } from './useTaskModalState';
import { useTaskModalSubmit } from './useTaskModalSubmit';
import { useModalKeyboard } from './useModalKeyboard';
import { TaskLabel, User } from '@/types/board';

// Props del modal de edición y detalle de tarea.
interface TaskModalProps {
  task: TaskItem;
  currentColumnId: string;
  columns: BoardColumn[];
  users: User[];
  labels: TaskLabel[];
  onClose: () => void;
  onSave: (updatedTask: TaskItem, newColumnId: string) => void;
  onDelete: (taskId: string, columnId: string) => void;
}

/**
 * Modal para editar y ver detalles de una tarea
 * Orchestrador: combina state management, form submission y keyboard shortcuts
 * La lógica compleja está delegada a hooks especializados
 */
export default function TaskModal({
  task,
  currentColumnId,
  columns,
  users,
  labels,
  onClose,
  onSave,
  onDelete,
}: TaskModalProps) {
  // Estado del formulario
  const { formData, updateField } = useTaskModalState(task, currentColumnId);
  const [selectedLabels, setSelectedLabels] = React.useState<TaskLabel[]>(task.labels ?? []);

  React.useEffect(() => {
    setSelectedLabels(task.labels ?? []);
  }, [task]);

  const toggleLabel = (label: TaskLabel) => {
    setSelectedLabels((current) => current.some((item) => item.id === label.id) ? current.filter((item) => item.id !== label.id) : [...current, label]);
  };

  // Lógica de envío del formulario
  const { handleSubmit } = useTaskModalSubmit(task, formData, users, (updatedTask, columnId) => onSave({ ...updatedTask, labels: selectedLabels }, columnId), onClose);

  // Atajos de teclado (ESC para cerrar)
  useModalKeyboard(onClose);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs transition-opacity animate-in fade-in duration-200">
      <div className="absolute inset-0" onClick={onClose} />

      <div className="relative w-full max-w-2xl bg-white rounded-xl shadow-2xl border border-outline-variant overflow-hidden flex flex-col max-h-[90vh] z-10 animate-in zoom-in-95 duration-200">
        <TaskModalHeader onClose={onClose} />

        <TaskModalForm
          task={task}
          currentColumnId={currentColumnId}
          columns={columns}
          users={users}
          labels={labels}
          selectedLabels={selectedLabels}
          onToggleLabel={toggleLabel}
          formData={formData}
          onTitleChange={updateField.setTitle}
          onDescriptionChange={updateField.setDescription}
          onColumnChange={updateField.setColumnId}
          onPriorityChange={updateField.setPriority}
          onDueDateChange={updateField.setDueDate}
          onCompletedChange={updateField.setCompleted}
          onToggleUser={updateField.toggleUserAssignment}
          onSubmit={handleSubmit}
          onClose={onClose}
          onDelete={onDelete}
        />
      </div>
    </div>
  );
}
