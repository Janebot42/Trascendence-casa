'use client';

import React from 'react';
import { BoardColumn, TaskItem, TaskPriority } from '@/types/board';
import TaskCard from '../TaskCard';
import ColumnHeader from './ColumnHeader';
import AddTaskForm from './AddTaskForm';
import AddTaskButton from './AddTaskButton';
import { useColumnState } from './useColumnState';

interface KanbanColumnProps {
  column: BoardColumn;
  onAddTask: (columnId: string, title: string, priority: TaskPriority) => void;
  onTaskClick: (task: TaskItem, columnId: string) => void;
}

/**
 * Columna del tablero Kanban
 * Orquestrador que combina header, tareas y formulario de agregar
 */
export default function KanbanColumn({
  column,
  onAddTask,
  onTaskClick,
}: KanbanColumnProps) {
  const {
    isAdding,
    newTitle,
    newPriority,
    setNewTitle,
    setNewPriority,
    startAdding,
    cancelAdding,
    resetForm,
  } = useColumnState();

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    
    onAddTask(column.id, newTitle.trim(), newPriority);
    resetForm();
  };

  const isDoneColumn = column.id === 'col-done';

  return (
    <div className={`kanban-column ${isDoneColumn ? 'opacity-80' : ''}`}>
      <ColumnHeader title={column.title} taskCount={column.tasks.length} />

      <div className="kanban-cards">
        {column.tasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            onClick={() => onTaskClick(task, column.id)}
          />
        ))}
      </div>

      <div className="p-2">
        {isAdding ? (
          <AddTaskForm
            title={newTitle}
            priority={newPriority}
            onTitleChange={setNewTitle}
            onPriorityChange={setNewPriority}
            onSubmit={handleFormSubmit}
            onCancel={cancelAdding}
          />
        ) : (
          <AddTaskButton onClick={startAdding} />
        )}
      </div>
    </div>
  );
}
