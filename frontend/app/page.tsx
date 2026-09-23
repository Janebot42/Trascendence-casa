'use client';

import { useCallback, useEffect, useState } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import BoardHeader from '@/components/board/BoardHeader';
import WorkspaceToolbar from '@/components/board/WorkspaceToolbar';
import KanbanBoard from '@/components/board/kanbanBoard/KanbanBoard';
import { ProtectedRoute } from '@/components/auth';
import { BoardColumn, TaskItem } from '@/types/board';
import {
  archiveCard,
  archiveBoard,
  archiveList,
  Board,
  createBoard,
  createCard,
  createLabel,
  createOrganization,
  inviteOrganizationMember,
  updateOrganization,
  archiveOrganization,
  createList,
  attachLabelToCard,
  listBoards,
  listCards,
  listCardLabels,
  deleteLabel,
  detachLabelFromCard,
  listLabels,
  listLists,
  listOrganizations,
  moveCard,
  reorderLists,
  updateBoard,
  updateCard,
  updateList,
} from '@/lib/workspace';

type LoadedWorkspace = { board: Board; columns: BoardColumn[] };

function toTask(card: Awaited<ReturnType<typeof listCards>>[number], labels: Awaited<ReturnType<typeof listLabels>>): TaskItem {
  return {
    id: card.id,
    title: card.title,
    description: card.description ?? undefined,
    priority: card.priority,
    completed: card.completed,
    dueDate: card.dueDate ?? undefined,
    labels,
  };
}

export default function Home() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [workspace, setWorkspace] = useState<LoadedWorkspace | null>(null);
  const [organizations, setOrganizations] = useState<Awaited<ReturnType<typeof listOrganizations>>>([]);
  const [boards, setBoards] = useState<Board[]>([]);
  const [selectedBoardId, setSelectedBoardId] = useState('');
  const [labels, setLabels] = useState<Awaited<ReturnType<typeof listLabels>>>([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [isEditBoardOpen, setIsEditBoardOpen] = useState(false);
  const [editBoardName, setEditBoardName] = useState('');
  const [editBoardDescription, setEditBoardDescription] = useState('');
  const [isEditingBoard, setIsEditingBoard] = useState(false);
  const [isCreateBoardOpen, setIsCreateBoardOpen] = useState(false);
  const [newBoardName, setNewBoardName] = useState('');
  const [newBoardDescription, setNewBoardDescription] = useState('');
  const [newBoardVisibility, setNewBoardVisibility] = useState<Board['visibility']>('WORKSPACE');
  const [newOrganizationName, setNewOrganizationName] = useState('Mi espacio de trabajo');
  const [isCreatingBoard, setIsCreatingBoard] = useState(false);
  const [isCreateOrganizationOpen, setIsCreateOrganizationOpen] = useState(false);
  const [isEditOrganizationOpen, setIsEditOrganizationOpen] = useState(false);
  const [editOrganizationName, setEditOrganizationName] = useState('');
  const [editOrganizationSlug, setEditOrganizationSlug] = useState('');
  const [isSavingOrganization, setIsSavingOrganization] = useState(false);
  const [isInviteOrganizationOpen, setIsInviteOrganizationOpen] = useState(false);
  const [inviteUsername, setInviteUsername] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'member'>('member');
  const [isInvitingMember, setIsInvitingMember] = useState(false);
  const [isCreateListOpen, setIsCreateListOpen] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [isCreatingList, setIsCreatingList] = useState(false);
  const [isCreateLabelOpen, setIsCreateLabelOpen] = useState(false);
  const [newLabelName, setNewLabelName] = useState('');
  const [newLabelColor, setNewLabelColor] = useState('#6750A4');
  const [isCreatingLabel, setIsCreatingLabel] = useState(false);

  const reload = useCallback(() => setRefreshKey((value) => value + 1), []);

  useEffect(() => {
    let active = true;
    // Reset the loading state whenever the selected board is reloaded.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsLoading(true);
    setError(null);

    void (async () => {
      try {
        const loadedOrganizations = await listOrganizations();
        if (active) setOrganizations(loadedOrganizations);
        const organization = loadedOrganizations.find((candidate) => candidate.id === organizationId) ?? loadedOrganizations[0];
        if (!organization) {
          if (active) {
            setOrganizationId(null);
            setBoards([]);
            setSelectedBoardId('');
            setLabels([]);
            setWorkspace(null);
          }
          return;
        }
        if (active) setOrganizationId(organization.id);

        const loadedBoards = await listBoards(organization.id);
        if (active) setBoards(loadedBoards);
        const board = loadedBoards.find((candidate) => candidate.id === selectedBoardId) ?? loadedBoards[0];
        if (!board) {
          if (active) {
            setSelectedBoardId('');
            setLabels([]);
            setWorkspace({ board: { id: '', organizationId: organization.id, name: 'Sin tablero', description: null, visibility: 'WORKSPACE' }, columns: [] });
          }
          return;
        }
        if (active && selectedBoardId !== board.id) setSelectedBoardId(board.id);

        const [lists, boardLabels] = await Promise.all([listLists(board.id), listLabels(board.id)]);
        const columns = await Promise.all(lists.map(async (list) => ({
          id: list.id,
          title: list.name,
          tasks: await Promise.all((await listCards(list.id)).map(async (card) => toTask(card, await listCardLabels(card.id)))),
        })));

        if (active) {
          setLabels(boardLabels);
          setWorkspace({ board, columns });
        }
      } catch (cause) {
        if (active) setError(cause instanceof Error ? cause.message : 'No se pudo cargar el tablero');
      } finally {
        if (active) setIsLoading(false);
      }
    })();

    return () => { active = false; };
  }, [refreshKey, selectedBoardId, organizationId]);

  const findTaskColumn = (taskId: string) => workspace?.columns.find((column) => column.tasks.some((task) => task.id === taskId));

  const handleCreateTask = async (columnId: string, title: string, priority: TaskItem['priority']) => {
    await createCard(columnId, { title, priority, completed: false });
    reload();
  };

  const handleSaveTask = async (task: TaskItem, newColumnId: string) => {
    const sourceColumn = findTaskColumn(task.id);
    if (!sourceColumn) return;
    const sourceTask = sourceColumn.tasks.find((candidate) => candidate.id === task.id);
    await updateCard(task.id, {
      title: task.title,
      description: task.description ?? null,
      dueDate: task.dueDate ? new Date(task.dueDate).toISOString() : null,
      priority: task.priority,
      completed: task.completed ?? false,
    });
    if (sourceColumn.id !== newColumnId) await moveCard(task.id, newColumnId);
    const previousLabelIds = new Set(sourceTask?.labels?.map((label) => label.id) ?? []);
    const nextLabelIds = new Set(task.labels?.map((label) => label.id) ?? []);
    await Promise.all([
      ...(task.labels ?? []).filter((label) => !previousLabelIds.has(label.id)).map((label) => attachLabelToCard(task.id, label.id)),
      ...(sourceTask?.labels ?? []).filter((label) => !nextLabelIds.has(label.id)).map((label) => detachLabelFromCard(task.id, label.id)),
    ]);
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

  const handleRenameList = async (listId: string, name: string) => {
    await updateList(listId, name);
    reload();
  };

  const handleArchiveList = async (listId: string) => {
    if (!window.confirm('¿Quieres archivar esta lista y sus tarjetas?')) return;
    await archiveList(listId);
    reload();
  };

  const handleReorderLists = async (listIds: string[]) => {
    if (!workspace?.board.id) return;
    await reorderLists(workspace.board.id, listIds);
    reload();
  };

  const openEditBoard = () => {
    if (!workspace?.board.id) return;
    setEditBoardName(workspace.board.name);
    setEditBoardDescription(workspace.board.description ?? '');
    setIsEditBoardOpen(true);
  };

  const handleEditBoard = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!workspace?.board.id || editBoardName.trim().length < 2) return;
    setIsEditingBoard(true);
    setError(null);
    try {
      await updateBoard(workspace.board.id, { name: editBoardName.trim(), description: editBoardDescription.trim() || null });
      setIsEditBoardOpen(false);
      reload();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo editar el tablero');
    } finally {
      setIsEditingBoard(false);
    }
  };

  const handleArchiveBoard = async () => {
    if (!workspace?.board.id || !window.confirm('¿Quieres archivar este tablero?')) return;
    try {
      await archiveBoard(workspace.board.id);
      setSelectedBoardId('');
      reload();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo archivar el tablero');
    }
  };

  const handleCreateListFromToolbar = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!workspace?.board.id || newListName.trim().length < 1) return;
    setIsCreatingList(true);
    setError(null);
    try {
      await createList(workspace.board.id, newListName.trim());
      setNewListName('');
      setIsCreateListOpen(false);
      reload();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo crear la lista');
    } finally {
      setIsCreatingList(false);
    }
  };

  const handleCreateLabel = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!workspace?.board.id || newLabelName.trim().length < 1) return;
    setIsCreatingLabel(true);
    setError(null);
    try {
      await createLabel(workspace.board.id, { name: newLabelName.trim(), color: newLabelColor });
      setNewLabelName('');
      setNewLabelColor('#6750A4');
      setIsCreateLabelOpen(false);
      reload();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo crear la etiqueta');
    } finally {
      setIsCreatingLabel(false);
    }
  };

  const handleDeleteLabel = async (labelId: string) => {
    if (!window.confirm('¿Quieres borrar esta etiqueta? También se quitará de las tarjetas que la usen.')) return;
    try {
      await deleteLabel(labelId);
      reload();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo borrar la etiqueta');
    }
  };

  const handleCreateOrganization = async (event: React.FormEvent) => {
    event.preventDefault();
    if (newOrganizationName.trim().length < 2) return;
    setIsSavingOrganization(true); setError(null);
    try { const organization = await createOrganization({ name: newOrganizationName.trim() }); setNewOrganizationName('Mi espacio de trabajo'); setIsCreateOrganizationOpen(false); setOrganizationId(organization.id); setSelectedBoardId(''); reload(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudo crear la organización'); }
    finally { setIsSavingOrganization(false); }
  };

  const openEditOrganization = () => {
    const organization = organizations.find((candidate) => candidate.id === organizationId);
    if (!organization) return;
    setEditOrganizationName(organization.name); setEditOrganizationSlug(organization.slug); setIsEditOrganizationOpen(true);
  };

  const handleEditOrganization = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!organizationId || editOrganizationName.trim().length < 2 || editOrganizationSlug.trim().length < 2) return;
    setIsSavingOrganization(true); setError(null);
    try { await updateOrganization(organizationId, { name: editOrganizationName.trim(), slug: editOrganizationSlug.trim() }); setIsEditOrganizationOpen(false); reload(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudo editar la organización'); }
    finally { setIsSavingOrganization(false); }
  };

  const handleDeleteOrganization = async () => {
    const organization = organizations.find((candidate) => candidate.id === organizationId);
    if (!organization || organization.role !== 'owner' || !window.confirm('¿Quieres borrar esta organización y sus tableros?')) return;
    try { await archiveOrganization(organization.id); setOrganizationId(null); setSelectedBoardId(''); reload(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudo borrar la organización'); }
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
        visibility: newBoardVisibility,
      });
      setNewBoardName('');
      setNewBoardDescription('');
      setNewBoardVisibility('WORKSPACE');
      setNewOrganizationName('Mi espacio de trabajo');
      setIsCreateBoardOpen(false);
      reload();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo crear el tablero');
    } finally {
      setIsCreatingBoard(false);
    }
  };

  const handleInviteOrganizationMember = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!organizationId || !inviteUsername.trim()) return;
    setIsInvitingMember(true); setError(null);
    try {
      await inviteOrganizationMember(organizationId, { username: inviteUsername.trim(), role: inviteRole });
      setInviteUsername('');
      setInviteRole('member');
      setIsInviteOrganizationOpen(false);
      alert('Usuario añadido a la organización');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo invitar al usuario');
    } finally { setIsInvitingMember(false); }
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
        <WorkspaceToolbar
          boards={boards}
          organizations={organizations}
          selectedOrganizationId={organizationId ?? ''}
          selectedBoardId={selectedBoardId}
          labels={labels}
          onBoardChange={(boardId) => {
            setSelectedBoardId(boardId);
            setRefreshKey((value) => value + 1);
          }}
          onOrganizationChange={(nextOrganizationId) => {
            setOrganizationId(nextOrganizationId);
            setSelectedBoardId('');
            setRefreshKey((value) => value + 1);
          }}
          onCreateOrganization={() => { setError(null); setIsCreateOrganizationOpen(true); }}
          onEditOrganization={openEditOrganization}
          onDeleteOrganization={handleDeleteOrganization}
          onCreateBoard={() => {
            setError(null);
            setIsCreateBoardOpen(true);
          }}
          onCreateList={() => setIsCreateListOpen(true)}
          onCreateLabel={() => setIsCreateLabelOpen(true)}
          onDeleteLabel={handleDeleteLabel}
          disabled={isLoading}
        />
        <BoardHeader title={workspace?.board.name ?? 'Tablero'} onEdit={workspace?.board.id ? openEditBoard : undefined} onArchive={workspace?.board.id ? handleArchiveBoard : undefined} />
        {isLoading && <div className="p-6 text-on-surface-variant">Cargando tablero...</div>}
        {!isLoading && error && <div className="p-6 text-error">{error}</div>}
        {!isLoading && !error && workspace && workspace.columns.length > 0 && (
          <KanbanBoard
            key={`${workspace.board.id}-${refreshKey}`}
            initialColumns={workspace.columns}
            searchQuery={searchQuery}
            labels={labels}
            onCreateTask={async (columnId, title, priority) => handleCreateTask(columnId, title, priority)}
            onSaveTask={handleSaveTask}
            onDeleteTask={async (taskId) => handleDeleteTask(taskId)}
            onCreateList={handleCreateList}
            onRenameList={handleRenameList}
            onArchiveList={handleArchiveList}
            onReorderLists={handleReorderLists}
            onError={(cause) => setError(cause instanceof Error ? cause.message : 'La operación ha fallado')}
          />
        )}
        {!isLoading && !error && !workspace && <div className="p-6 text-on-surface-variant">No tienes ninguna organización todavía.</div>}
        {!isLoading && !error && workspace && workspace.columns.length === 0 && <div className="p-6 text-on-surface-variant">Este tablero todavía no tiene listas.</div>}
      </main>

      {isCreateOrganizationOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true">
          <form onSubmit={handleCreateOrganization} className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="text-xl font-semibold">Crear organización</h2>
            <label className="mt-6 block text-sm font-medium">Nombre<input value={newOrganizationName} onChange={(event) => setNewOrganizationName(event.target.value)} required minLength={2} maxLength={80} autoFocus disabled={isSavingOrganization} className="mt-2 w-full rounded-xl border border-outline-variant px-4 py-3" /></label>
            <div className="mt-6 flex justify-end gap-3"><button type="button" onClick={() => setIsCreateOrganizationOpen(false)} className="rounded-xl border px-4 py-3">Cancelar</button><button type="submit" disabled={isSavingOrganization} className="rounded-xl bg-primary px-4 py-3 font-semibold text-white">Crear organización</button></div>
          </form>
        </div>
      )}

      {isEditOrganizationOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true">
          <form onSubmit={handleEditOrganization} className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="text-xl font-semibold">Editar organización</h2>
            <label className="mt-6 block text-sm font-medium">Nombre<input value={editOrganizationName} onChange={(event) => setEditOrganizationName(event.target.value)} required minLength={2} maxLength={80} autoFocus disabled={isSavingOrganization} className="mt-2 w-full rounded-xl border border-outline-variant px-4 py-3" /></label>
            <label className="mt-4 block text-sm font-medium">Slug<input value={editOrganizationSlug} onChange={(event) => setEditOrganizationSlug(event.target.value)} required minLength={2} maxLength={80} disabled={isSavingOrganization} className="mt-2 w-full rounded-xl border border-outline-variant px-4 py-3" /></label>
            <div className="mt-6 flex flex-wrap justify-end gap-3"><button type="button" onClick={() => setIsEditOrganizationOpen(false)} className="rounded-xl border px-4 py-3">Cancelar</button><button type="button" onClick={() => setIsInviteOrganizationOpen(true)} disabled={organizations.find((candidate) => candidate.id === organizationId)?.role === 'member'} className="rounded-xl border border-primary px-4 py-3 font-semibold text-primary disabled:opacity-50">Invitar usuario</button><button type="submit" disabled={isSavingOrganization} className="rounded-xl bg-primary px-4 py-3 font-semibold text-white">Guardar cambios</button></div>
          </form>
        </div>
      )}

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
              <fieldset disabled={isCreatingBoard} className="space-y-2"><legend className="text-sm font-medium">Visibilidad</legend><label className="flex cursor-pointer items-start gap-3 rounded-xl border border-outline-variant p-3"><input type="radio" name="new-board-visibility" value="WORKSPACE" checked={newBoardVisibility === 'WORKSPACE'} onChange={() => setNewBoardVisibility('WORKSPACE')} className="mt-1" /><span><span className="block text-sm font-semibold">Toda la organización</span><span className="block text-xs text-on-surface-variant">Todos los miembros podrán verlo y editarlo.</span></span></label><label className="flex cursor-pointer items-start gap-3 rounded-xl border border-outline-variant p-3"><input type="radio" name="new-board-visibility" value="PRIVATE" checked={newBoardVisibility === 'PRIVATE'} onChange={() => setNewBoardVisibility('PRIVATE')} className="mt-1" /><span><span className="block text-sm font-semibold">Privado</span><span className="block text-xs text-on-surface-variant">Solo los miembros del tablero y administradores de la organización tendrán acceso.</span></span></label></fieldset>
              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => setIsCreateBoardOpen(false)} className="rounded-xl border border-outline-variant px-4 py-3 font-semibold text-on-surface-variant">Cancelar</button>
                <button type="submit" disabled={isCreatingBoard} className="rounded-xl bg-primary px-4 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">{isCreatingBoard ? 'Creando...' : 'Crear tablero'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isInviteOrganizationOpen && organizationId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true" aria-labelledby="invite-organization-title">
          <form onSubmit={handleInviteOrganizationMember} className="w-full max-w-md rounded-2xl border border-outline-variant bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between gap-4"><h2 id="invite-organization-title" className="text-xl font-semibold">Invitar usuario</h2><button type="button" onClick={() => setIsInviteOrganizationOpen(false)} aria-label="Cerrar" className="rounded-lg p-1 text-on-surface-variant hover:bg-surface-container-high"><span className="material-symbols-outlined">close</span></button></div>
            <p className="mt-2 text-sm text-on-surface-variant">El usuario debe tener una cuenta registrada con este nombre de usuario.</p>
            <label className="mt-6 block text-sm font-medium">Nombre de usuario<input type="text" value={inviteUsername} onChange={(event) => setInviteUsername(event.target.value)} required autoFocus disabled={isInvitingMember} className="mt-2 w-full rounded-xl border border-outline-variant px-4 py-3" /></label>
            <label className="mt-4 block text-sm font-medium">Rol<select value={inviteRole} onChange={(event) => setInviteRole(event.target.value as 'admin' | 'member')} disabled={isInvitingMember} className="mt-2 w-full rounded-xl border border-outline-variant px-4 py-3"><option value="member">Miembro</option><option value="admin" disabled={organizations.find((candidate) => candidate.id === organizationId)?.role !== 'owner'}>Administrador</option></select></label>
            <div className="mt-6 flex justify-end gap-3"><button type="button" onClick={() => setIsInviteOrganizationOpen(false)} className="rounded-xl border border-outline-variant px-4 py-3">Cancelar</button><button type="submit" disabled={isInvitingMember} className="rounded-xl bg-primary px-4 py-3 font-semibold text-white">{isInvitingMember ? 'Añadiendo...' : 'Añadir usuario'}</button></div>
          </form>
        </div>
      )}

      {isEditBoardOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true" aria-labelledby="edit-board-title">
          <form onSubmit={handleEditBoard} className="w-full max-w-lg rounded-2xl border border-outline-variant bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between gap-4"><h2 id="edit-board-title" className="text-xl font-semibold">Editar tablero</h2><button type="button" onClick={() => setIsEditBoardOpen(false)} aria-label="Cerrar" className="rounded-lg p-1 text-on-surface-variant hover:bg-surface-container-high"><span className="material-symbols-outlined">close</span></button></div>
            <label className="mt-6 block text-sm font-medium">Nombre<input value={editBoardName} onChange={(event) => setEditBoardName(event.target.value)} required minLength={2} maxLength={100} autoFocus disabled={isEditingBoard} className="mt-2 w-full rounded-xl border border-outline-variant px-4 py-3 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50" /></label>
            <label className="mt-4 block text-sm font-medium">Descripción <span className="font-normal text-on-surface-variant">(opcional)</span><textarea value={editBoardDescription} onChange={(event) => setEditBoardDescription(event.target.value)} maxLength={500} rows={3} disabled={isEditingBoard} className="mt-2 w-full resize-none rounded-xl border border-outline-variant px-4 py-3 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50" /></label>
            <div className="mt-6 flex justify-end gap-3"><button type="button" onClick={() => setIsEditBoardOpen(false)} className="rounded-xl border border-outline-variant px-4 py-3 font-semibold text-on-surface-variant">Cancelar</button><button type="submit" disabled={isEditingBoard} className="rounded-xl bg-primary px-4 py-3 font-semibold text-white disabled:opacity-50">{isEditingBoard ? 'Guardando...' : 'Guardar cambios'}</button></div>
          </form>
        </div>
      )}

      {isCreateListOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true" aria-labelledby="create-list-title">
          <form onSubmit={handleCreateListFromToolbar} className="w-full max-w-md rounded-2xl border border-outline-variant bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between gap-4"><h2 id="create-list-title" className="text-xl font-semibold">Crear lista</h2><button type="button" onClick={() => setIsCreateListOpen(false)} aria-label="Cerrar" className="rounded-lg p-1 text-on-surface-variant hover:bg-surface-container-high"><span className="material-symbols-outlined">close</span></button></div>
            <label className="mt-6 block text-sm font-medium">Nombre<input value={newListName} onChange={(event) => setNewListName(event.target.value)} required maxLength={80} autoFocus disabled={isCreatingList} className="mt-2 w-full rounded-xl border border-outline-variant px-4 py-3 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50" /></label>
            <div className="mt-6 flex justify-end gap-3"><button type="button" onClick={() => setIsCreateListOpen(false)} className="rounded-xl border border-outline-variant px-4 py-3 font-semibold text-on-surface-variant">Cancelar</button><button type="submit" disabled={isCreatingList} className="rounded-xl bg-primary px-4 py-3 font-semibold text-white disabled:opacity-50">{isCreatingList ? 'Creando...' : 'Crear lista'}</button></div>
          </form>
        </div>
      )}

      {isCreateLabelOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true" aria-labelledby="create-label-title">
          <form onSubmit={handleCreateLabel} className="w-full max-w-md rounded-2xl border border-outline-variant bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between gap-4"><h2 id="create-label-title" className="text-xl font-semibold">Crear etiqueta</h2><button type="button" onClick={() => setIsCreateLabelOpen(false)} aria-label="Cerrar" className="rounded-lg p-1 text-on-surface-variant hover:bg-surface-container-high"><span className="material-symbols-outlined">close</span></button></div>
            <label className="mt-6 block text-sm font-medium">Nombre<input value={newLabelName} onChange={(event) => setNewLabelName(event.target.value)} required maxLength={40} autoFocus disabled={isCreatingLabel} className="mt-2 w-full rounded-xl border border-outline-variant px-4 py-3 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50" /></label>
            <label className="mt-4 flex items-center justify-between text-sm font-medium">Color<input type="color" value={newLabelColor} onChange={(event) => setNewLabelColor(event.target.value)} disabled={isCreatingLabel} className="h-10 w-16 cursor-pointer rounded border border-outline-variant bg-white p-1" /></label>
            <div className="mt-6 flex justify-end gap-3"><button type="button" onClick={() => setIsCreateLabelOpen(false)} className="rounded-xl border border-outline-variant px-4 py-3 font-semibold text-on-surface-variant">Cancelar</button><button type="submit" disabled={isCreatingLabel} className="rounded-xl bg-primary px-4 py-3 font-semibold text-white disabled:opacity-50">{isCreatingLabel ? 'Creando...' : 'Crear etiqueta'}</button></div>
          </form>
        </div>
      )}
    </ProtectedRoute>
  );
}
