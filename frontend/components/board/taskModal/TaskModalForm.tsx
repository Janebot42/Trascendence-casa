'use client';

import React from 'react';
import { BoardColumn, TaskItem, TaskPriority } from '@/types/board';
import { User } from '@/types/board';
import TaskTitleField from './TaskTitleField';
import TaskDescriptionField from './TaskDescriptionField';
import TaskPropertiesPanel from './TaskPropertiesPanel';
import AssigneeSelector from './AssigneeSelector';
import TaskModalFooter from './TaskModalFooter';

interface TaskFormData {
  title: string;
  description: string;
  priority: TaskPriority;
  dueDate: string;
  columnId: string;
  completed: boolean;
  assignedUserIds: string[];
}

interface TaskModalFormProps {
  task: TaskItem;
  currentColumnId: string;
  columns: BoardColumn[];
  users: User[];
  formData: TaskFormData;
  onTitleChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onColumnChange: (value: string) => void;
  onPriorityChange: (value: TaskPriority) => void;
  onDueDateChange: (value: string) => void;
  onCompletedChange: (value: boolean) => void;
  onToggleUser: (userId: string) => void;
  onSubmit: (event: React.FormEvent) => void;
  onClose: () => void;
  onDelete: (taskId: string, columnId: string) => void;
}

/**
 * Componente que contiene la lógica y renderizado del formulario
 * Separa el modal wrapper del contenido interno
 */
export default function TaskModalForm({
  task,
  currentColumnId,
  columns,
  users,
  formData,
  onTitleChange,
  onDescriptionChange,
  onColumnChange,
  onPriorityChange,
  onDueDateChange,
  onCompletedChange,
  onToggleUser,
  onSubmit,
  onClose,
  onDelete,
}: TaskModalFormProps) {
  return (
    <form onSubmit={onSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
      <TaskTitleField value={formData.title} onChange={onTitleChange} />

      <TaskPropertiesPanel
        columns={columns}
        columnId={formData.columnId}
        priority={formData.priority}
        dueDate={formData.dueDate}
        completed={formData.completed}
        onColumnChange={onColumnChange}
        onPriorityChange={onPriorityChange}
        onDueDateChange={onDueDateChange}
        onCompletedChange={onCompletedChange}
      />

      <TaskDescriptionField value={formData.description} onChange={onDescriptionChange} />

      <AssigneeSelector
        users={users}
        assignedUserIds={formData.assignedUserIds}
        onToggleUser={onToggleUser}
      />

      <TaskModalFooter
        taskId={task.id}
        currentColumnId={currentColumnId}
        onClose={onClose}
        onDelete={onDelete}
      />
    </form>
  );
}
