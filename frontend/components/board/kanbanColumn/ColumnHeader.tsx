'use client';

import React from 'react';

interface ColumnHeaderProps {
  title: string;
  taskCount: number;
}

/**
 * Encabezado de la columna Kanban
 * Muestra el título y la cantidad de tareas
 */
export default function ColumnHeader({ title, taskCount }: ColumnHeaderProps) {
  return (
    <div className="kanban-column-header">
      <span className="text-[16px] font-semibold text-on-surface">{title}</span>
      <span className="text-on-surface-variant text-xs font-semibold bg-surface-container-lowest px-2 py-0.5 rounded-full">
        {taskCount}
      </span>
    </div>
  );
}
