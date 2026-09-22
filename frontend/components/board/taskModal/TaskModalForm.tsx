'use client';

import React from 'react';
import { BoardColumn, TaskItem, TaskLabel, TaskPriority } from '@/types/board';
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
  labels: TaskLabel[];
  selectedLabels: TaskLabel[];
  onToggleLabel: (label: TaskLabel) => void;
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
  labels,
  selectedLabels,
  onToggleLabel,
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

      <div className="space-y-2">
        <p className="text-[12px] font-semibold uppercase tracking-wide text-on-surface-variant">Etiquetas</p>
        <div className="flex flex-wrap gap-2 rounded-lg border border-outline-variant bg-surface-container-low p-3">
          {labels.length === 0 && <span className="text-sm text-on-surface-variant">Este tablero no tiene etiquetas.</span>}
          {labels.map((label) => {
            const selected = selectedLabels.some((item) => item.id === label.id);
            return <button type="button" key={label.id} onClick={() => onToggleLabel(label)} className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${selected ? 'border-primary bg-primary/10 text-primary' : 'border-outline-variant bg-white text-on-surface-variant'}`}><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: label.color }} />{label.name}{selected && <span className="material-symbols-outlined text-[14px]">check</span>}</button>;
          })}
        </div>
      </div>

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
