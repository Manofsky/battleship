import { httpServer } from './http_server/index.js';
import { WebSocketManager } from './websocket/index.js';
import { MessageHandler } from './utils/messageHandler.js';

const HTTP_PORT = 8181;
const WS_PORT = 3000;

// Start HTTP server for static files
console.log(`Starting static HTTP server on port ${HTTP_PORT}`);
httpServer.listen(HTTP_PORT);

// Start WebSocket server
const wsManager = new WebSocketManager(WS_PORT);

// Create message handler
const messageHandler = new MessageHandler(wsManager);

// Set message handler for WebSocket manager
wsManager.setMessageHandler(messageHandler);

// Handle termination signals
process.on('SIGINT', () => {
  console.log('Shutting down servers...');
  httpServer.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});

console.log('Battleship server started successfully!');
console.log(`HTTP server: http://localhost:${HTTP_PORT}`);
console.log(`WebSocket server: ws://localhost:${WS_PORT}`);
