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
  onRenameList?: (listId: string, name: string) => void;
  onArchiveList?: (listId: string) => void;
  onMoveLeft?: () => void;
  onMoveRight?: () => void;
  canMoveLeft?: boolean;
  canMoveRight?: boolean;
  onMoveTask?: (taskId: string, targetListId: string, beforeCardId?: string, afterCardId?: string) => void;
  onTaskDragStart?: (taskId: string) => void;
  onTaskDragEnd?: () => void;
  onTaskDrop?: (taskId: string, targetListId: string, beforeCardId?: string, afterCardId?: string) => void;
  draggableList?: boolean;
  onListPointerDown?: (listId: string, event: React.PointerEvent<HTMLButtonElement>) => void;
}

/**
 * Columna del tablero Kanban
 * Orquestrador que combina header, tareas y formulario de agregar
 */
export default function KanbanColumn({
  column,
  onAddTask,
  onTaskClick,
  onRenameList,
  onArchiveList,
  onMoveLeft,
  onMoveRight,
  canMoveLeft,
  canMoveRight,
  onTaskDragStart,
  onTaskDragEnd,
  onTaskDrop,
  draggableList,
  onListPointerDown,
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
    <div data-list-drop={column.id} className={`kanban-column ${isDoneColumn ? 'opacity-80' : ''}`}>
      <ColumnHeader title={column.title} taskCount={column.tasks.length} onRename={(name) => onRenameList?.(column.id, name)} onArchive={() => onArchiveList?.(column.id)} onMoveLeft={onMoveLeft} onMoveRight={onMoveRight} canMoveLeft={canMoveLeft} canMoveRight={canMoveRight} draggable={draggableList} onPointerDown={(event) => onListPointerDown?.(column.id, event)} />

      <div className="kanban-cards" onDragOver={(event) => event.preventDefault()} onDrop={(event) => {
        event.preventDefault();
        const taskId = event.dataTransfer.getData('text/card-id');
        if (taskId) onTaskDrop?.(taskId, column.id);
      }}>
        {column.tasks.map((task, index) => (
          <TaskCard
            key={task.id}
            task={task}
            onClick={() => onTaskClick(task, column.id)}
            onDragStart={(event) => { event.stopPropagation(); event.dataTransfer.setData('text/card-id', task.id); event.dataTransfer.effectAllowed = 'move'; onTaskDragStart?.(task.id); }}
            onDragEnd={onTaskDragEnd}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => { event.preventDefault(); event.stopPropagation(); const id = event.dataTransfer.getData('text/card-id'); if (id) onTaskDrop?.(id, column.id, task.id, column.tasks[index - 1]?.id); }}
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
