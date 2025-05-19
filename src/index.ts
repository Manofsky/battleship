import { httpServer } from './http_server/index.js';
import { WebSocketManager } from './websocket/index.js';
import { MessageHandler } from './utils/messageHandler.js';
import { config } from './config.js';

// Get port from environment variable or use default from config
const WS_PORT = config.port;
const HTTP_PORT = WS_PORT + 1; // HTTP server runs on WebSocket port + 1

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
