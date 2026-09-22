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
  createBoard,
  createCard,
  createOrganization,
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
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [isCreateBoardOpen, setIsCreateBoardOpen] = useState(false);
  const [newBoardName, setNewBoardName] = useState('');
  const [newBoardDescription, setNewBoardDescription] = useState('');
  const [newOrganizationName, setNewOrganizationName] = useState('Mi espacio de trabajo');
  const [isCreatingBoard, setIsCreatingBoard] = useState(false);

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
        if (active) setOrganizationId(organization.id);

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

  const handleCreateBoard = async (event: React.FormEvent) => {
    event.preventDefault();
    if (newBoardName.trim().length < 2 || (!organizationId && newOrganizationName.trim().length < 2)) return;

    setIsCreatingBoard(true);
    setError(null);
    try {
      const organization = organizationId
        ? null
        : await createOrganization({ name: newOrganizationName.trim() });
      const targetOrganizationId = organizationId ?? organization!.id;
      if (organization) setOrganizationId(organization.id);
      await createBoard(targetOrganizationId, {
        name: newBoardName.trim(),
        description: newBoardDescription.trim() || null,
      });
      setNewBoardName('');
      setNewBoardDescription('');
      setNewOrganizationName('Mi espacio de trabajo');
      setIsCreateBoardOpen(false);
      reload();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo crear el tablero');
    } finally {
      setIsCreatingBoard(false);
    }
  };

  return (
    <ProtectedRoute>
      <Sidebar
        isOpenMobile={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
        onCreateBoard={() => {
          setError(null);
          setIsCreateBoardOpen(true);
        }}
      />
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

      {isCreateBoardOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true" aria-labelledby="create-board-title">
          <div className="w-full max-w-lg rounded-2xl border border-outline-variant bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="create-board-title" className="text-xl font-semibold">Crear tablero</h2>
                <p className="mt-1 text-sm text-on-surface-variant">Empieza un espacio nuevo para organizar el trabajo.</p>
              </div>
              <button type="button" onClick={() => setIsCreateBoardOpen(false)} className="rounded-lg p-1 text-on-surface-variant hover:bg-surface-container-high" aria-label="Cerrar">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            {!organizationId && <p className="mt-4 rounded-lg bg-primary/10 p-3 text-sm text-primary">Todavía no tienes un espacio de trabajo. Se creará junto con este primer tablero.</p>}
            <form onSubmit={handleCreateBoard} className="mt-6 space-y-4">
              {!organizationId && <label className="block text-sm font-medium">Nombre del espacio de trabajo<input value={newOrganizationName} onChange={(event) => setNewOrganizationName(event.target.value)} required minLength={2} maxLength={80} disabled={isCreatingBoard} className="mt-2 w-full rounded-xl border border-outline-variant px-4 py-3 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50" /></label>}
              <label className="block text-sm font-medium">Nombre<input value={newBoardName} onChange={(event) => setNewBoardName(event.target.value)} required minLength={2} maxLength={100} autoFocus disabled={isCreatingBoard} className="mt-2 w-full rounded-xl border border-outline-variant px-4 py-3 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50" /></label>
              <label className="block text-sm font-medium">Descripción <span className="font-normal text-on-surface-variant">(opcional)</span><textarea value={newBoardDescription} onChange={(event) => setNewBoardDescription(event.target.value)} maxLength={500} rows={3} disabled={isCreatingBoard || !organizationId} className="mt-2 w-full resize-none rounded-xl border border-outline-variant px-4 py-3 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50" /></label>
              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => setIsCreateBoardOpen(false)} className="rounded-xl border border-outline-variant px-4 py-3 font-semibold text-on-surface-variant">Cancelar</button>
                <button type="submit" disabled={isCreatingBoard} className="rounded-xl bg-primary px-4 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">{isCreatingBoard ? 'Creando...' : 'Crear tablero'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </ProtectedRoute>
  );
}
