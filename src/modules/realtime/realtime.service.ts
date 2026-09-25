import type { WebSocket } from 'ws';
import type { RealtimeEvent } from './realtime.types.js';

/** In-process fanout for a single backend instance. */
export class RealtimeService {
  private readonly connections = new Map<string, Set<WebSocket>>();

  subscribe(boardId: string, socket: WebSocket): () => void {
    const boardConnections = this.connections.get(boardId) ?? new Set<WebSocket>();
    boardConnections.add(socket);
    this.connections.set(boardId, boardConnections);
    socket.send(JSON.stringify({ type: 'realtime.ready', boardId }));

    const unsubscribe = () => {
      boardConnections.delete(socket);
      if (boardConnections.size === 0) this.connections.delete(boardId);
    };
    socket.once('close', unsubscribe);
    socket.once('error', unsubscribe);
    return unsubscribe;
  }

  publish(input: Omit<RealtimeEvent, 'occurredAt'>): void {
    const payload = JSON.stringify({ ...input, occurredAt: new Date().toISOString() } satisfies RealtimeEvent);
    const boardConnections = this.connections.get(input.boardId);
    if (!boardConnections) return;
    for (const socket of boardConnections) {
      if (socket.readyState !== socket.OPEN) {
        boardConnections.delete(socket);
        continue;
      }
      try {
        socket.send(payload);
      } catch {
        boardConnections.delete(socket);
      }
    }
    if (boardConnections.size === 0) this.connections.delete(input.boardId);
  }
}
