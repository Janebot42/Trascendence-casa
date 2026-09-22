'use client';

import type { Board, Label } from '@/lib/workspace';

type WorkspaceToolbarProps = {
  boards: Board[];
  selectedBoardId: string;
  labels: Label[];
  onBoardChange: (boardId: string) => void;
  onCreateBoard: () => void;
  onCreateList: () => void;
  onCreateLabel: () => void;
  disabled?: boolean;
};

export default function WorkspaceToolbar({
  boards,
  selectedBoardId,
  labels,
  onBoardChange,
  onCreateBoard,
  onCreateList,
  onCreateLabel,
  disabled,
}: WorkspaceToolbarProps) {
  return (
    <section className="flex flex-col gap-3 border-b border-outline-variant bg-white px-6 py-3 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex min-w-0 flex-wrap items-center gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <label className="shrink-0 text-xs font-semibold uppercase tracking-wide text-on-surface-variant" htmlFor="board-selector">Tablero</label>
          <select id="board-selector" value={selectedBoardId} onChange={(event) => onBoardChange(event.target.value)} disabled={disabled || boards.length === 0} className="min-w-0 max-w-full rounded-lg border border-outline-variant bg-surface-bright px-3 py-2 text-sm font-semibold text-on-surface focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20">
            {boards.length === 0 && <option value="">Sin tableros</option>}
            {boards.map((board) => <option key={board.id} value={board.id}>{board.name}</option>)}
          </select>
        </div>
        <div className="flex flex-wrap items-center gap-1.5" aria-label="Etiquetas del tablero">
          {labels.length === 0 && <span className="text-xs text-on-surface-variant">Sin etiquetas</span>}
          {labels.map((label) => <span key={label.id} title={label.name} className="inline-flex items-center gap-1.5 rounded-full border border-outline-variant bg-surface-bright px-2.5 py-1 text-xs font-medium text-on-surface"><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: label.color }} />{label.name}</span>)}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={onCreateBoard} className="inline-flex items-center gap-1.5 rounded-lg border border-primary px-3 py-2 text-xs font-semibold text-primary transition-colors hover:bg-primary/5">
          <span className="material-symbols-outlined text-[17px]">dashboard_customize</span>Nuevo tablero
        </button>
        <button type="button" onClick={onCreateList} disabled={!selectedBoardId || disabled} className="inline-flex items-center gap-1.5 rounded-lg border border-outline-variant px-3 py-2 text-xs font-semibold text-on-surface transition-colors hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-50">
          <span className="material-symbols-outlined text-[17px]">view_column</span>Nueva lista
        </button>
        <button type="button" onClick={onCreateLabel} disabled={!selectedBoardId || disabled} className="inline-flex items-center gap-1.5 rounded-lg border border-outline-variant px-3 py-2 text-xs font-semibold text-on-surface transition-colors hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-50">
          <span className="material-symbols-outlined text-[17px]">label</span>Nueva etiqueta
        </button>
      </div>
    </section>
  );
}
