import type { Metadata } from 'next';
import './globals.css';

// Metadata global de la app.
export const metadata: Metadata = {
  title: 'TaskFlow - Website Redesign Board',
  description: 'Enterprise Kanban Space - 42 Transcendence',
};

// Layout raíz que envuelve todas las rutas.
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <head>
        {/* Preconecta con Google Fonts para reducir latencia. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        {/* Tipografía principal de la interfaz. */}
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        {/* Iconos Material Symbols usados en sidebar, header y tarjetas. */}
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />
      </head>
      {/* El body ocupa toda la altura y usa flex para el layout general. */}
      <body className="h-full bg-[#F4F5F7] text-on-surface font-sans antialiased overflow-hidden flex">
        {children}
      </body>
    </html>
  );
}
