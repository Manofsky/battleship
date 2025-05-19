import { WebSocketServer, WebSocket } from 'ws';
import { Message } from '../models/types.js';

// WebSocket server management class
export class WebSocketManager {
  private wss: WebSocketServer;
  private clients: Map<WebSocket, string> = new Map(); // Connection between WebSocket and player ID
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

    this.wss.on('connection', (ws: WebSocket) => {
      console.log('Client connected');

      // Handling messages from client
      ws.on('message', (message: string) => {
        try {
          const parsedMessage: Message = JSON.parse(message.toString());
          console.log('Received message:', parsedMessage);
          
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
        this.clients.delete(ws);
        // Player disconnection handling will be implemented here
      });
    });
  }

  // Method for sending a message to a specific client
  public sendMessage(ws: WebSocket, message: Message): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  // Метод для отправки сообщения всем клиентам
  public broadcastMessage(message: Message): void {
    this.wss.clients.forEach((client: WebSocket) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(message));
      }
    });
  }

  // Method for broadcasting a message to all clients in a room
  public broadcastToRoom(roomId: string | number, message: Message): void {
    // Logic for sending messages to all players in a room will be implemented here
    // For now, just broadcast to everyone
    this.broadcastMessage(message);
  }
}
