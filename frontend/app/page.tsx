'use client';

import React, { useState } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import BoardHeader from '@/components/board/BoardHeader';
import KanbanBoard from '@/components/board/kanbanBoard/KanbanBoard';
import { initialColumns } from '@/data/mockBoardData';
import { ProtectedRoute } from '@/components/auth';

// Página principal del tablero Kanban.
export default function Home() {
  // Estado compartido de búsqueda.
  const [searchQuery, setSearchQuery] = useState('');
  // Estado del sidebar responsive en mobile.
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Acción simple de ejemplo para crear una tarea.
  const handleOpenNewTaskModal = () => {
    const title = prompt('Enter new task title:');
    if (!title || !title.trim()) return;

    // En esta versión solo se muestra una alerta de confirmación.
    alert(`Task "${title}" created!`);
  };

  return (
    <ProtectedRoute>
      {/* Navegación lateral. */}
      <Sidebar
        isOpenMobile={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
      />

      {/* Contenedor principal del contenido. */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Header reutilizable con búsqueda y acciones. */}
        <Header
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onToggleMobileSidebar={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
          onOpenNewTaskModal={handleOpenNewTaskModal}
        />

        {/* Encabezado del board actual. */}
        <BoardHeader />

        {/* Tablero con columnas y filtrado por texto. */}
        <KanbanBoard
          initialColumns={initialColumns}
          searchQuery={searchQuery}
        />
      </main>
    </ProtectedRoute>
  );
}
