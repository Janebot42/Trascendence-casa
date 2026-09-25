'use client';

import { useEffect } from 'react';

type BoardEvent = { type?: string; actorUserId?: string };

export function useBoardRealtime(boardId: string | undefined, userId: string | undefined, onRemoteChange: () => void) {
  useEffect(() => {
    if (!boardId || !userId) return;

    let active = true;
    let reconnectTimer: ReturnType<typeof setTimeout> | undefined;
    let attempts = 0;
    let hasConnected = false;
    let socket: WebSocket | undefined;

    const connect = () => {
      if (!active) return;
      const url = new URL('/realtime', window.location.href);
      if (window.location.port === '3001') url.port = '3000';
      url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
      url.searchParams.set('boardId', boardId);
      socket = new WebSocket(url);

      socket.onopen = () => {
        attempts = 0;
        if (hasConnected) onRemoteChange();
        hasConnected = true;
      };
      socket.onmessage = (message) => {
        try {
          const event = JSON.parse(String(message.data)) as BoardEvent;
          if (event.type !== 'realtime.ready' && event.actorUserId !== userId) onRemoteChange();
        } catch {
          // Ignore malformed or non-JSON frames.
        }
      };
      socket.onclose = (event) => {
        if (!active || event.code === 4401 || event.code === 4403) return;
        attempts += 1;
        reconnectTimer = setTimeout(connect, Math.min(1000 * 2 ** (attempts - 1), 10000));
      };
      socket.onerror = () => socket?.close();
    };

    connect();
    return () => {
      active = false;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      socket?.close();
    };
  }, [boardId, userId, onRemoteChange]);
}
