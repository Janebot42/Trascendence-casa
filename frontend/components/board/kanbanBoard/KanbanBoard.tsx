'use client';

import React, { useEffect, useRef, useState } from 'react';
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
  onMoveTask?: (taskId: string, targetListId: string, beforeCardId?: string, afterCardId?: string) => Promise<void>;
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
  onMoveTask,
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

  const listPointerRef = useRef<{ id: string; x: number; y: number } | null>(null);
  const [listDragPreview, setListDragPreview] = useState<{ id: string; index: number } | null>(null);

  const insertionAtX = (draggedId: string, x: number) => {
    const remaining = Array.from(document.querySelectorAll<HTMLElement>('[data-list-drop]'))
      .filter((element) => element.dataset.listDrop !== draggedId)
      .sort((left, right) => left.getBoundingClientRect().left - right.getBoundingClientRect().left);
    return remaining.filter((element) => x > element.getBoundingClientRect().left + element.getBoundingClientRect().width / 2).length;
  };

  const commitListDrop = (draggedId: string, x: number) => {
    if (searchQuery) return;
    const index = insertionAtX(draggedId, x);
    const next = [...columns];
    const from = next.findIndex((column) => column.id === draggedId);
    if (from < 0) return;
    const [moved] = next.splice(from, 1);
    next.splice(Math.min(index, next.length), 0, moved);
    if (next.every((column, position) => column.id === columns[position]?.id)) return;
    setColumns(next);
    persist(onReorderLists ? () => onReorderLists(next.map((column) => column.id)) : undefined);
  };

  useEffect(() => {
    const movePointerDrag = (event: PointerEvent) => {
      const dragged = listPointerRef.current;
      if (!dragged || Math.hypot(event.clientX - dragged.x, event.clientY - dragged.y) < 5) return;
      event.preventDefault();
      setListDragPreview({ id: dragged.id, index: insertionAtX(dragged.id, event.clientX) });
    };
    const finishPointerDrag = (event: PointerEvent) => {
      const dragged = listPointerRef.current;
      if (!dragged) return;
      listPointerRef.current = null;
      setListDragPreview(null);
      if (Math.hypot(event.clientX - dragged.x, event.clientY - dragged.y) >= 5) commitListDrop(dragged.id, event.clientX);
    };
    document.addEventListener('pointermove', movePointerDrag, { passive: false });
    document.addEventListener('pointerup', finishPointerDrag);
    document.addEventListener('pointercancel', finishPointerDrag);
    return () => {
      document.removeEventListener('pointerup', finishPointerDrag);
      document.removeEventListener('pointercancel', finishPointerDrag);
      document.removeEventListener('pointermove', movePointerDrag);
    };
  });

  const startListPointerDrag = (listId: string, event: React.PointerEvent<HTMLButtonElement>) => {
    if (searchQuery) return;
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    listPointerRef.current = { id: listId, x: event.clientX, y: event.clientY };
  };

  const dropCard = (taskId: string, targetListId: string, beforeCardId?: string, afterCardId?: string) => {
    const source = columns.find((column) => column.tasks.some((task) => task.id === taskId));
    const card = source?.tasks.find((task) => task.id === taskId);
    const target = columns.find((column) => column.id === targetListId);
    if (!source || !card || !target || (beforeCardId === taskId)) return;
    const next = columns.map((column) => ({ ...column, tasks: column.tasks.filter((task) => task.id !== taskId) }));
    const destination = next.find((column) => column.id === targetListId)!;
    let index = beforeCardId ? destination.tasks.findIndex((task) => task.id === beforeCardId) : -1;
    if (index < 0 && afterCardId) index = destination.tasks.findIndex((task) => task.id === afterCardId) + 1;
    if (index < 0) index = destination.tasks.length;
    destination.tasks.splice(index, 0, card);
    setColumns(next);
    const placedIndex = destination.tasks.findIndex((task) => task.id === taskId);
    persist(onMoveTask ? () => onMoveTask(taskId, targetListId, destination.tasks[placedIndex + 1]?.id, destination.tasks[placedIndex - 1]?.id) : undefined);
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
        <React.Fragment key={column.id}>
        {listDragPreview && listDragPreview.index === index && <div aria-hidden="true" className="w-1 min-w-1 self-stretch rounded-full bg-primary shadow-[0_0_0_3px_rgba(0,75,202,0.14)]" />}
        <KanbanColumn
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
          draggableList={!searchQuery}
          onListPointerDown={startListPointerDrag}
          onTaskDrop={dropCard}
        />
        </React.Fragment>
      ))}
      {listDragPreview && listDragPreview.index >= filteredColumns.length && <div aria-hidden="true" className="w-1 min-w-1 self-stretch rounded-full bg-primary shadow-[0_0_0_3px_rgba(0,75,202,0.14)]" />}

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
