'use client';

import React from 'react';
import { BoardColumn, TaskItem, TaskPriority, User, TaskLabel } from '@/types/board';
import KanbanColumn from '../kanbanColumn';
import TaskModal from '../taskModal/TaskModal';
import { useKanbanState } from './useKanbanState';
import { useKanbanHandlers } from './useKanbanHandlers';

// Props del tablero Kanban.
interface KanbanBoardProps {
  initialColumns: BoardColumn[];
  searchQuery: string;
  labels?: TaskLabel[];
  users?: User[];
  onCreateTask?: (columnId: string, title: string, priority: TaskPriority) => Promise<void>;
  onSaveTask?: (task: TaskItem, newColumnId: string) => Promise<void>;
  onDeleteTask?: (taskId: string, columnId: string) => Promise<void>;
  onCreateList?: (title: string) => Promise<void>;
  onRenameList?: (listId: string, name: string) => Promise<void>;
  onArchiveList?: (listId: string) => Promise<void>;
  onReorderLists?: (listIds: string[]) => Promise<void>;
  onError?: (error: unknown) => void;
}

/**
 * Tablero Kanban principal
 * Orquestador que combina hooks de estado y handlers
 * Responsable de renderizar columnas y modal
 */
export default function KanbanBoard({
  initialColumns,
  searchQuery,
  labels = [],
  users = [],
  onCreateTask,
  onSaveTask,
  onDeleteTask,
  onCreateList,
  onRenameList,
  onArchiveList,
  onReorderLists,
  onError,
}: KanbanBoardProps) {
  // Estado del tablero (columnas, tarea seleccionada, filtrado)
  const {
    columns,
    setColumns,
    selectedTask,
    setSelectedTask,
    selectedColumnId,
    setSelectedColumnId,
    filteredColumns,
  } = useKanbanState(initialColumns, searchQuery);

  // Handlers del tablero (agregar tarea, guardar, eliminar, etc.)
  const {
    handleAddTask,
    handleTaskClick,
    handleSaveTask,
    handleDeleteTask,
    handleAddColumn,
  } = useKanbanHandlers({
    columns,
    selectedColumnId,
    onColumnsChange: setColumns,
    onSelectedTaskChange: setSelectedTask,
    onSelectedColumnIdChange: setSelectedColumnId,
  });

  const persist = (operation: (() => Promise<void>) | undefined) => {
    if (!operation) return;
    void operation().catch((error) => onError?.(error));
  };

  const moveColumn = (index: number, direction: -1 | 1) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= columns.length) return;
    const next = [...columns];
    [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
    setColumns(next);
    persist(onReorderLists ? () => onReorderLists(next.map((column) => column.id)) : undefined);
  };

  return (
    <div className="kanban-board flex-1">
      {filteredColumns.map((column, index) => (
        <KanbanColumn
          key={column.id}
          column={column}
          onAddTask={(columnId, title, priority) => {
            handleAddTask(columnId, title, priority);
            persist(onCreateTask ? () => onCreateTask(columnId, title, priority) : undefined);
          }}
          onTaskClick={handleTaskClick}
          onRenameList={(listId, name) => persist(onRenameList ? () => onRenameList(listId, name) : undefined)}
          onArchiveList={(listId) => persist(onArchiveList ? () => onArchiveList(listId) : undefined)}
          onMoveLeft={() => moveColumn(index, -1)}
          onMoveRight={() => moveColumn(index, 1)}
          canMoveLeft={index > 0}
          canMoveRight={index < filteredColumns.length - 1}
        />
      ))}

      {/* Botón para agregar otra lista. */}
      <button
        onClick={() => {
          const title = prompt('Enter new list name:');
          if (!title?.trim()) return;
          handleAddColumn(title.trim());
          persist(onCreateList ? () => onCreateList(title.trim()) : undefined);
        }}
        className="w-70 min-w-70 flex items-center gap-2 p-3 text-on-surface bg-surface-container hover:bg-surface-container-high rounded-lg hover:text-on-surface transition-colors h-fit text-[14px] font-medium cursor-pointer shrink-0"
      >
        <span className="material-symbols-outlined text-[20px]">add</span>
        Add another list
      </button>

      {/* Modal de detalle y edición de tarea. */}
      {selectedTask && (
        <TaskModal
          task={selectedTask}
          currentColumnId={selectedColumnId}
          columns={columns}
          users={users}
          labels={labels}
          onClose={() => setSelectedTask(null)}
          onSave={(task, columnId) => {
            handleSaveTask(task, columnId);
            persist(onSaveTask ? () => onSaveTask(task, columnId) : undefined);
          }}
          onDelete={(taskId, columnId) => {
            handleDeleteTask(taskId, columnId);
            persist(onDeleteTask ? () => onDeleteTask(taskId, columnId) : undefined);
          }}
        />
      )}
    </div>
  );
}
