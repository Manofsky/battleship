import { WebSocket } from 'ws';

// Add custom properties to WebSocket
export interface ExtendedWebSocket extends WebSocket {
  isAlive?: boolean;
  playerId?: string | number;
}
