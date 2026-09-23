'use client';

import type { Board, Label, Organization } from '@/lib/workspace';

type Props = {
  boards: Board[]; organizations: Organization[]; selectedOrganizationId: string; selectedBoardId: string; labels: Label[];
  onBoardChange: (id: string) => void; onOrganizationChange: (id: string) => void;
  onCreateOrganization: () => void; onEditOrganization: () => void; onDeleteOrganization: () => void;
  onCreateBoard: () => void; onCreateList: () => void; onCreateLabel: () => void; onDeleteLabel: (id: string) => void; disabled?: boolean;
};

export default function WorkspaceToolbar({ boards, organizations, selectedOrganizationId, selectedBoardId, labels, onBoardChange, onOrganizationChange, onCreateOrganization, onEditOrganization, onDeleteOrganization, onCreateBoard, onCreateList, onCreateLabel, onDeleteLabel, disabled }: Props) {
  const selectedOrganization = organizations.find((organization) => organization.id === selectedOrganizationId);
  return (
    <section className="flex flex-col gap-3 border-b border-outline-variant bg-white px-6 py-3 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex min-w-0 flex-wrap items-center gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <label className="shrink-0 text-xs font-semibold uppercase tracking-wide text-on-surface-variant" htmlFor="organization-selector">Espacio</label>
          <select id="organization-selector" value={selectedOrganizationId} onChange={(event) => onOrganizationChange(event.target.value)} disabled={disabled || organizations.length === 0} className="min-w-0 max-w-full rounded-lg border border-outline-variant bg-surface-bright px-3 py-2 text-sm font-semibold text-on-surface">
            {organizations.length === 0 && <option value="">Sin espacios</option>}
            {organizations.map((organization) => <option key={organization.id} value={organization.id}>{organization.name}</option>)}
          </select>
          <button type="button" onClick={onCreateOrganization} disabled={disabled} aria-label="Crear organización" className="rounded-lg border border-outline-variant p-2 text-on-surface-variant hover:border-primary hover:text-primary disabled:opacity-50"><span className="material-symbols-outlined text-[17px]">add</span></button>
          {selectedOrganization && <><button type="button" onClick={onEditOrganization} disabled={disabled} aria-label="Editar organización" className="rounded-lg border border-outline-variant p-2 text-on-surface-variant hover:border-primary hover:text-primary disabled:opacity-50"><span className="material-symbols-outlined text-[17px]">edit</span></button><button type="button" onClick={onDeleteOrganization} disabled={disabled || selectedOrganization.role !== 'owner'} aria-label="Borrar organización" className="rounded-lg border border-outline-variant p-2 text-on-surface-variant hover:border-error hover:text-error disabled:opacity-50"><span className="material-symbols-outlined text-[17px]">delete</span></button></>}
        </div>
        <div className="flex min-w-0 items-center gap-3"><label className="shrink-0 text-xs font-semibold uppercase tracking-wide text-on-surface-variant" htmlFor="board-selector">Tablero</label><select id="board-selector" value={selectedBoardId} onChange={(event) => onBoardChange(event.target.value)} disabled={disabled || boards.length === 0} className="min-w-0 max-w-full rounded-lg border border-outline-variant bg-surface-bright px-3 py-2 text-sm font-semibold text-on-surface">{boards.length === 0 && <option value="">Sin tableros</option>}{boards.map((board) => <option key={board.id} value={board.id}>{board.name}</option>)}</select></div>
        <div className="flex flex-wrap items-center gap-1.5" aria-label="Etiquetas del tablero">{labels.length === 0 && <span className="text-xs text-on-surface-variant">Sin etiquetas</span>}{labels.map((label) => <span key={label.id} title={label.name} className="inline-flex items-center gap-1.5 rounded-full border border-outline-variant bg-surface-bright px-2.5 py-1 text-xs font-medium text-on-surface"><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: label.color }} />{label.name}<button type="button" onClick={() => onDeleteLabel(label.id)} aria-label={'Borrar etiqueta ' + label.name} className="ml-0.5 rounded-full text-on-surface-variant hover:text-error"><span className="material-symbols-outlined text-[14px]">close</span></button></span>)}</div>
      </div>
      <div className="flex flex-wrap items-center gap-2"><button type="button" onClick={onCreateBoard} className="inline-flex items-center gap-1.5 rounded-lg border border-primary px-3 py-2 text-xs font-semibold text-primary"><span className="material-symbols-outlined text-[17px]">dashboard_customize</span>Nuevo tablero</button><button type="button" onClick={onCreateList} disabled={!selectedBoardId || disabled} className="inline-flex items-center gap-1.5 rounded-lg border border-outline-variant px-3 py-2 text-xs font-semibold disabled:opacity-50"><span className="material-symbols-outlined text-[17px]">view_column</span>Nueva lista</button><button type="button" onClick={onCreateLabel} disabled={!selectedBoardId || disabled} className="inline-flex items-center gap-1.5 rounded-lg border border-outline-variant px-3 py-2 text-xs font-semibold disabled:opacity-50"><span className="material-symbols-outlined text-[17px]">label</span>Nueva etiqueta</button></div>
    </section>
  );
}

