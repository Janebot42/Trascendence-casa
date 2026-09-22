'use client';

import React from 'react';
import { TaskPriority } from '@/types/board';
import { priorityOptions } from './kanbanColumn.constants';

interface AddTaskFormProps {
  title: string;
  priority: TaskPriority;
  onTitleChange: (value: string) => void;
  onPriorityChange: (value: TaskPriority) => void;
  onSubmit: (event: React.FormEvent) => void;
  onCancel: () => void;
}

/**
 * Formulario para agregar una nueva tarea
 * Incluye inputs para título y selector de prioridad
 */
export default function AddTaskForm({
  title,
  priority,
  onTitleChange,
  onPriorityChange,
  onSubmit,
  onCancel,
}: AddTaskFormProps) {
  return (
    <form
      onSubmit={onSubmit}
      className="bg-white p-3 rounded-lg border border-outline-variant flex flex-col gap-2 shadow-xs"
    >
      <input
        type="text"
        autoFocus
        value={title}
        onChange={(event) => onTitleChange(event.target.value)}
        placeholder="Enter card title..."
        className="text-[14px] p-2 border border-outline-variant rounded focus:outline-none focus:ring-2 focus:ring-primary"
      />

      <div className="flex items-center justify-between gap-2">
        <select
          value={priority}
          onChange={(event) => onPriorityChange(event.target.value as TaskPriority)}
          className="text-[12px] p-1 border border-outline-variant rounded text-on-surface-variant"
        >
          {priorityOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>

        <div className="flex items-center gap-1">
          <button
            type="submit"
            className="bg-primary text-white px-3 py-1 rounded text-[12px] font-medium hover:bg-primary-container cursor-pointer"
          >
            Add
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="text-on-surface-variant px-2 py-1 text-[12px] hover:text-on-surface cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </div>
    </form>
  );
}
