'use client';

import { useCallback, useEffect, useState } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import BoardHeader from '@/components/board/BoardHeader';
import KanbanBoard from '@/components/board/kanbanBoard/KanbanBoard';
import { ProtectedRoute } from '@/components/auth';
import { BoardColumn, TaskItem } from '@/types/board';
import {
  archiveCard,
  Board,
  createCard,
  createList,
  listBoards,
  listCards,
  listLists,
  listOrganizations,
  moveCard,
  updateCard,
} from '@/lib/workspace';

type LoadedWorkspace = { board: Board; columns: BoardColumn[] };

function toTask(card: Awaited<ReturnType<typeof listCards>>[number]): TaskItem {
  return {
    id: card.id,
    title: card.title,
    description: card.description ?? undefined,
    priority: 'Medium',
    dueDate: card.dueDate ?? undefined,
  };
}

export default function Home() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [workspace, setWorkspace] = useState<LoadedWorkspace | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(() => setRefreshKey((value) => value + 1), []);

  useEffect(() => {
    let active = true;
    // Reset the loading state whenever the selected board is reloaded.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsLoading(true);
    setError(null);

    void (async () => {
      try {
        const organizations = await listOrganizations();
        const organization = organizations[0];
        if (!organization) {
          if (active) setWorkspace(null);
          return;
        }

        const boards = await listBoards(organization.id);
        const board = boards[0];
        if (!board) {
          if (active) setWorkspace({ board: { id: '', organizationId: organization.id, name: 'Sin tablero', description: null }, columns: [] });
          return;
        }

        const lists = await listLists(board.id);
        const columns = await Promise.all(lists.map(async (list) => ({
          id: list.id,
          title: list.name,
          tasks: (await listCards(list.id)).map(toTask),
        })));

        if (active) setWorkspace({ board, columns });
      } catch (cause) {
        if (active) setError(cause instanceof Error ? cause.message : 'No se pudo cargar el tablero');
      } finally {
        if (active) setIsLoading(false);
      }
    })();

    return () => { active = false; };
  }, [refreshKey]);

  const findTaskColumn = (taskId: string) => workspace?.columns.find((column) => column.tasks.some((task) => task.id === taskId));

  const handleCreateTask = async (columnId: string, title: string) => {
    await createCard(columnId, { title });
    reload();
  };

  const handleSaveTask = async (task: TaskItem, newColumnId: string) => {
    const sourceColumn = findTaskColumn(task.id);
    if (!sourceColumn) return;
    await updateCard(task.id, {
      title: task.title,
      description: task.description ?? null,
      dueDate: task.dueDate ? new Date(task.dueDate).toISOString() : null,
    });
    if (sourceColumn.id !== newColumnId) await moveCard(task.id, newColumnId);
    reload();
  };

  const handleDeleteTask = async (taskId: string) => {
    await archiveCard(taskId);
    reload();
  };

  const handleCreateList = async (title: string) => {
    if (!workspace?.board.id) return;
    await createList(workspace.board.id, title);
    reload();
  };

  return (
    <ProtectedRoute>
      <Sidebar isOpenMobile={isMobileSidebarOpen} onCloseMobile={() => setIsMobileSidebarOpen(false)} />
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <Header
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onToggleMobileSidebar={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
        />
        <BoardHeader title={workspace?.board.name ?? 'Tablero'} />
        {isLoading && <div className="p-6 text-on-surface-variant">Cargando tablero...</div>}
        {!isLoading && error && <div className="p-6 text-error">{error}</div>}
        {!isLoading && !error && workspace && workspace.columns.length > 0 && (
          <KanbanBoard
            key={`${workspace.board.id}-${refreshKey}`}
            initialColumns={workspace.columns}
            searchQuery={searchQuery}
            onCreateTask={async (columnId, title) => handleCreateTask(columnId, title)}
            onSaveTask={handleSaveTask}
            onDeleteTask={async (taskId) => handleDeleteTask(taskId)}
            onCreateList={handleCreateList}
            onError={(cause) => setError(cause instanceof Error ? cause.message : 'La operación ha fallado')}
          />
        )}
        {!isLoading && !error && !workspace && <div className="p-6 text-on-surface-variant">No tienes ninguna organización todavía.</div>}
        {!isLoading && !error && workspace && workspace.columns.length === 0 && <div className="p-6 text-on-surface-variant">Este tablero todavía no tiene listas.</div>}
      </main>
    </ProtectedRoute>
  );
}
