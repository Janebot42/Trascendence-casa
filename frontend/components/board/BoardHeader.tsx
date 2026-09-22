'use client';

import { useState } from 'react';

// Título del board con opción de favorito.
function HeaderTitle({ title }: { title: string }){
	const [isStarred, setIsStarred] = useState(false);

	return (
		<div className="flex items-center gap-3">
        <h2 className="text-[32px] font-bold text-on-surface tracking-tight leading-none">
          {title}
        </h2>
        <button
          onClick={() => setIsStarred(!isStarred)}
          className={`transition-colors cursor-pointer ${
            isStarred ? 'text-amber-500' : 'text-outline-variant hover:text-primary'
          }`}
          title="Star board"
        >
          <span
            className="material-symbols-outlined"
            style={{
              fontVariationSettings: isStarred ? "'FILL' 1" : "'FILL' 0",
            }}
          >
            star
          </span>
        </button>
      </div>
	);
} 

// Botón reutilizable para acciones del encabezado.
function HeaderButton({icon, label, onClick}: {icon: string, label: string, onClick: () => void}) {
	return (
		<button onClick={onClick} className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-surface-container hover:bg-surface-container-high text-on-surface font-semibold text-[12px] transition-colors cursor-pointer">
    		<span className="material-symbols-outlined text-[18px]">
    			{icon}
    		</span>
    		{label}
    	</button>
	);
}

// Grupo de acciones rápidas del board.
function HeaderButtonsList({ onEdit, onArchive }: { onEdit?: () => void; onArchive?: () => void }) {
	return (
		<div className="flex items-center gap-3 flex-wrap">
    	    <HeaderButton icon="filter_list" label="Filter" onClick={() => {}} />

			<HeaderButton icon="person_add" label="Share" onClick={() => {}} />
			{onEdit && <HeaderButton icon="edit" label="Edit" onClick={onEdit} />}
			{onArchive && <HeaderButton icon="archive" label="Archive" onClick={onArchive} />}
    	</div>
	);
}

// Encabezado principal del tablero.
export default function BoardHeader({ title = 'Website Redesign', onEdit, onArchive }: { title?: string; onEdit?: () => void; onArchive?: () => void }) {
  return (
    <div className="px-6 py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shrink-0 bg-surface-container-lowest border-b border-outline-variant">
		<HeaderTitle title={title} />

		<HeaderButtonsList onEdit={onEdit} onArchive={onArchive} />
    </div>
  );
}
