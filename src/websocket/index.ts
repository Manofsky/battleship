import { WebSocketServer, WebSocket } from 'ws';
import { Message } from '../models/types.js';
import { ExtendedWebSocket } from '../models/websocket.js';
import { config } from '../config.js';

// WebSocket server management class
export class WebSocketManager {
  private wss: WebSocketServer;
  private clients: Map<ExtendedWebSocket, string | number> = new Map(); // Connection between WebSocket and player ID
  private messageHandler?: any; // Will be set externally

  constructor(port: number) {
    this.wss = new WebSocketServer({ port });
    this.init();
  }

  public setMessageHandler(handler: any): void {
    this.messageHandler = handler;
  }

  private init(): void {
    console.log(`WebSocket server started on port ${this.wss.options.port}`);

    this.wss.on('connection', (ws: ExtendedWebSocket) => {
      console.log('Client connected');
      
      // Set up ping/pong for connection health check
      ws.isAlive = true;
      ws.on('pong', () => {
        ws.isAlive = true;
      });

      // Handling messages from client
      ws.on('message', (message: string) => {
        try {
          const parsedMessage: Message = JSON.parse(message.toString());
          console.log(`Received message of type: ${parsedMessage.type}`);
          
          // Processing messages through messageHandler
          if (this.messageHandler) {
            this.messageHandler.handleMessage(ws, parsedMessage);
          } else {
            console.log(`No message handler set for message type: ${parsedMessage.type}`);
          }
        } catch (error) {
          console.error('Error parsing message:', error);
        }
      });

      // Handling client disconnection
      ws.on('close', () => {
        console.log('Client disconnected');
        const playerId = this.clients.get(ws);
        this.clients.delete(ws);
        
        // Notify message handler about disconnection
        if (this.messageHandler && playerId) {
          this.messageHandler.handlePlayerDisconnect(playerId);
        }
      });

      // Handle errors
      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
      });
    });

    // Set up interval to check for dead connections
    const interval = setInterval(() => {
      this.wss.clients.forEach((ws: ExtendedWebSocket) => {
        if (ws.isAlive === false) {
          return ws.terminate();
        }
        
        ws.isAlive = false;
        ws.ping();
      });
    }, config.pingInterval);

    // Clear interval when server closes
    this.wss.on('close', () => {
      clearInterval(interval);
    });
  }

  // Method for sending a message to a specific client
  public sendMessage(ws: ExtendedWebSocket, message: Message): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  // Method for sending a message to all clients
  public broadcastMessage(message: Message): void {
    const jsonMessage = JSON.stringify(message);
    
    // Send to all native WebSocket clients
    this.wss.clients.forEach((client: WebSocket) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(jsonMessage);
      }
    });
  }

  // Method for broadcasting a message to all clients in a room
  public broadcastToRoom(roomId: string | number, message: Message): void {
    // For now, just broadcast to everyone
    // In a real implementation, we would filter clients by room
    this.broadcastMessage(message);
  }
}
