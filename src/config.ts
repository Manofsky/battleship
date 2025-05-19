// Configuration for the application
export const config = {
  // Default WebSocket port, can be overridden by PORT environment variable
  port: process.env.PORT ? parseInt(process.env.PORT) : 3000,
  
  // Ping interval in milliseconds for WebSocket connection health check
  pingInterval: 30000,
  
  // Game configuration
  game: {
    // Board size
    boardSize: 10,
    
    // Ship configuration (number of ships of each size)
    ships: {
      4: 1, // One ship of size 4
      3: 2, // Two ships of size 3
      2: 3, // Three ships of size 2
      1: 4  // Four ships of size 1
    }
  }
};
