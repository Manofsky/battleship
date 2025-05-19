import { WebSocket } from 'ws';
import { 
  Message, 
  MessageType, 
  RegRequest, 
  CreateRoomRequest, 
  AddUserToRoomRequest,
  AddShipsRequest,
  AttackRequest,
  RandomAttackRequest
} from '../models/types.js';
import { gameStore } from '../models/store.js';
import { WebSocketManager } from '../websocket/index.js';
import { GameManager } from '../game/index.js';
import { GameValidation } from '../game/validation.js';
import { ExtendedWebSocket } from '../models/websocket.js';

// Class for handling client messages
export class MessageHandler {
  private wsManager: WebSocketManager;
  private clientsMap: Map<ExtendedWebSocket, string | number> = new Map();

  constructor(wsManager: WebSocketManager) {
    this.wsManager = wsManager;
  }

  // Method for processing messages
  public handleMessage(ws: ExtendedWebSocket, message: Message): void {
    console.log(`Handling message of type: ${message.type}`);

    switch (message.type) {
      case MessageType.REG:
        this.handleRegistration(ws, message as RegRequest);
        break;
      case MessageType.CREATE_ROOM:
        this.handleCreateRoom(ws, message as CreateRoomRequest);
        break;
      case MessageType.ADD_USER_TO_ROOM:
        this.handleAddUserToRoom(ws, message as AddUserToRoomRequest);
        break;
      case MessageType.ADD_SHIPS:
        this.handleAddShips(ws, message as AddShipsRequest);
        break;
      case MessageType.ATTACK:
        this.handleAttack(ws, message as AttackRequest);
        break;
      case MessageType.RANDOM_ATTACK:
        this.handleRandomAttack(ws, message as RandomAttackRequest);
        break;
      default:
        console.log(`Unhandled message type: ${message.type}`);
    }
  }
  
  // Handle player disconnection
  public handlePlayerDisconnect(playerId: string | number): void {
    console.log(`Player ${playerId} disconnected`);
    
    // Check if player is in a room
    const rooms = gameStore.getAllRooms();
    for (const room of rooms) {
      const playerIndex = room.roomUsers.findIndex(user => user.index === playerId);
      if (playerIndex !== -1) {
        // Remove player from room
        room.roomUsers.splice(playerIndex, 1);
        
        // If room is empty, remove it
        if (room.roomUsers.length === 0) {
          gameStore.removeRoom(room.roomId);
        }
        
        // Send updated room list to all players
        this.sendRoomsUpdate();
        break;
      }
    }
    
    // Check if player is in a game
    const games = gameStore.getAllGames();
    for (const game of games) {
      if (game.player1Id === playerId || game.player2Id === playerId) {
        // Determine winner (the player who didn't disconnect)
        const winnerId = game.player1Id === playerId ? game.player2Id : game.player1Id;
        
        // Set game as finished
        game.gameFinished = true;
        game.winnerId = winnerId;
        
        // Update winner's stats
        gameStore.updatePlayerWins(winnerId);
        
        // Send finish game message
        this.sendFinishGameMessage(game);
        
        // Send updated winners table
        this.sendWinnersUpdate();
        
        // Remove the game
        gameStore.removeGame(game.gameId);
        break;
      }
    }
  }

  // Player registration handling
  private handleRegistration(ws: WebSocket, message: RegRequest): void {
    const { name, password } = message.data;
    
    // Check if player with this name already exists
    let player = gameStore.getPlayerByName(name);
    
    if (player) {
      // If player exists, check password
      if (player.password !== password) {
        // Invalid password
        this.wsManager.sendMessage(ws, {
          type: MessageType.REG,
          data: {
            name,
            index: -1,
            error: true,
            errorText: 'Invalid password'
          },
          id: 0
        });
        return;
      }
    } else {
      // Create new player
      player = gameStore.addPlayer(name, password);
    }
    
    // Associate WebSocket with player ID
    this.clientsMap.set(ws, player.index);
    
    // Send successful response
    this.wsManager.sendMessage(ws, {
      type: MessageType.REG,
      data: {
        name: player.name,
        index: player.index,
        error: false,
        errorText: ''
      },
      id: 0
    });
    
    // Send room list to all players
    this.sendRoomsUpdate();
    
    // Send winners table to all players
    this.sendWinnersUpdate();
  }

  // Room creation handling
  private handleCreateRoom(ws: WebSocket, message: CreateRoomRequest): void {
    const playerId = this.clientsMap.get(ws);
    
    if (!playerId) {
      console.error('Player not registered');
      return;
    }
    
    try {
      // Create new room
      gameStore.createRoom(playerId);
      
      // Send updated room list to all players
      this.sendRoomsUpdate();
    } catch (error) {
      console.error('Error creating room:', error);
    }
  }

  // Adding player to room handling
  private handleAddUserToRoom(ws: WebSocket, message: AddUserToRoomRequest): void {
    const playerId = this.clientsMap.get(ws);
    const { indexRoom } = message.data;
    
    if (!playerId) {
      console.error('Player not registered');
      return;
    }
    
    try {
      // Add player to room
      const room = gameStore.addUserToRoom(indexRoom, playerId);
      
      // If there are 2 players in the room, create a game
      if (room.roomUsers.length === 2) {
        const game = gameStore.createGame(indexRoom);
        
        // Send game creation message to both players
        this.sendCreateGameMessage(game.gameId, game.player1Id, game.player2Id);
      }
      
      // Send updated room list to all players
      this.sendRoomsUpdate();
    } catch (error) {
      console.error('Error adding user to room:', error);
    }
  }

  // Ship placement handling
  private handleAddShips(ws: WebSocket, message: AddShipsRequest): void {
    const { gameId, ships, indexPlayer } = message.data;
    
    try {
      const game = gameStore.getGame(gameId);
      
      if (!game) {
        console.error('Game not found');
        return;
      }
      
      // Validate ship placement
      const { valid, error } = GameValidation.validateShipPlacement(ships);
      
      if (!valid) {
        // Send error message to the player
        this.wsManager.sendMessage(ws, {
          type: MessageType.REG, // Using REG type for error messages
          data: {
            name: '',
            index: indexPlayer,
            error: true,
            errorText: `Invalid ship placement: ${error}`
          },
          id: 0
        });
        return;
      }
      
      // Add player's ships
      game.addShips(indexPlayer, ships);
      
      // Send game start message if both players have placed their ships
      if (game.gameStarted) {
        this.sendStartGameMessages(game);
        
        // Send turn message
        this.sendTurnMessage(game);
      }
    } catch (error) {
      console.error('Error adding ships:', error);
    }
  }

  // Attack handling
  private handleAttack(ws: WebSocket, message: AttackRequest): void {
    const { gameId, x, y, indexPlayer } = message.data;
    
    try {
      const game = gameStore.getGame(gameId);
      
      if (!game || !game.gameStarted || game.gameFinished) {
        console.error('Game not found or not started or already finished');
        return;
      }
      
      // Check if it's the player's turn
      if (!game.isPlayerTurn(indexPlayer)) {
        // Send error message to the player
        this.wsManager.sendMessage(ws, {
          type: MessageType.REG,
          data: {
            name: '',
            index: indexPlayer,
            error: true,
            errorText: 'Not your turn'
          },
          id: 0
        });
        return;
      }
      
      // Validate shot coordinates
      if (!GameValidation.isValidShot(x, y)) {
        // Send error message to the player
        this.wsManager.sendMessage(ws, {
          type: MessageType.REG,
          data: {
            name: '',
            index: indexPlayer,
            error: true,
            errorText: 'Invalid shot coordinates'
          },
          id: 0
        });
        return;
      }
      
      // Determine the attack target (opponent)
      const targetPlayerId = indexPlayer === game.player1Id ? game.player2Id : game.player1Id;
      
      // Check if the cell was already shot
      const board = targetPlayerId === game.player1Id ? game.player1Board : game.player2Board;
      if (board[y][x] !== null) {
        // Send error message to the player
        this.wsManager.sendMessage(ws, {
          type: MessageType.REG,
          data: {
            name: '',
            index: indexPlayer,
            error: true,
            errorText: 'This cell was already shot'
          },
          id: 0
        });
        return;
      }
      
      // Check the hit
      const status = GameManager.checkHit(targetPlayerId, { x, y }, game);
      
      // Send attack result to both players
      this.sendAttackResultMessage(game, { x, y }, status);
      
      // Check if all opponent's ships are sunk
      if (status === 'killed' && GameManager.areAllShipsSunk(targetPlayerId, game)) {
        // Game is over, current player won
        game.gameFinished = true;
        game.winnerId = indexPlayer;
        
        // Update player's wins
        gameStore.updatePlayerWins(indexPlayer);
        
        // Send game finish message
        this.sendFinishGameMessage(game);
        
        // Send updated winners table
        this.sendWinnersUpdate();
        
        // Remove game
        gameStore.removeGame(gameId);
      } else {
        // If miss, switch turn
        if (status === 'miss') {
          game.switchTurn();
        }
        
        // Send turn message
        this.sendTurnMessage(game);
      }
    } catch (error) {
      console.error('Error processing attack:', error);
    }
  }

  // Random attack handling
  private handleRandomAttack(ws: WebSocket, message: RandomAttackRequest): void {
    const { gameId, indexPlayer } = message.data;
    
    try {
      const game = gameStore.getGame(gameId);
      
      if (!game || !game.gameStarted || game.gameFinished) {
        console.error('Game not found or not started or already finished');
        return;
      }
      
      // Check if it's the player's turn
      if (!game.isPlayerTurn(indexPlayer)) {
        // Send error message to the player
        this.wsManager.sendMessage(ws, {
          type: MessageType.REG,
          data: {
            name: '',
            index: indexPlayer,
            error: true,
            errorText: 'Not your turn'
          },
          id: 0
        });
        return;
      }
      
      // Determine the attack target (opponent)
      const targetPlayerId = indexPlayer === game.player1Id ? game.player2Id : game.player1Id;
      
      // Check if there are any cells left to attack
      const board = targetPlayerId === game.player1Id ? game.player1Board : game.player2Board;
      const hasAvailableCells = board.some(row => row.some(cell => cell === null));
      
      if (!hasAvailableCells) {
        // Send error message to the player
        this.wsManager.sendMessage(ws, {
          type: MessageType.REG,
          data: {
            name: '',
            index: indexPlayer,
            error: true,
            errorText: 'No available cells to attack'
          },
          id: 0
        });
        return;
      }
      
      // Generate random position for attack
      const position = GameManager.generateRandomAttack(targetPlayerId, game);
      
      // Check the hit
      const status = GameManager.checkHit(targetPlayerId, position, game);
      
      // Send attack result to both players
      this.sendAttackResultMessage(game, position, status);
      
      // Check if all opponent's ships are sunk
      if (status === 'killed' && GameManager.areAllShipsSunk(targetPlayerId, game)) {
        // Game is over, current player won
        game.gameFinished = true;
        game.winnerId = indexPlayer;
        
        // Update player's wins
        gameStore.updatePlayerWins(indexPlayer);
        
        // Send game finish message
        this.sendFinishGameMessage(game);
        
        // Send updated winners table
        this.sendWinnersUpdate();
        
        // Remove game
        gameStore.removeGame(gameId);
      } else {
        // If miss, switch turn
        if (status === 'miss') {
          game.switchTurn();
        }
        
        // Send turn message
        this.sendTurnMessage(game);
      }
    } catch (error) {
      console.error('Error processing random attack:', error);
    }
  }

  // Helper methods for sending messages

  // Send updated room list
  private sendRoomsUpdate(): void {
    const rooms = gameStore.getAllRooms();
    
    this.wsManager.broadcastMessage({
      type: MessageType.UPDATE_ROOM,
      data: rooms,
      id: 0
    });
  }

  // Send updated winners table
  private sendWinnersUpdate(): void {
    const winners = gameStore.getWinners();
    
    this.wsManager.broadcastMessage({
      type: MessageType.UPDATE_WINNERS,
      data: winners,
      id: 0
    });
  }

  // Send game creation message
  private sendCreateGameMessage(gameId: string | number, player1Id: string | number, player2Id: string | number): void {
    // Find WebSocket for each player
    let player1Ws: WebSocket | undefined;
    let player2Ws: WebSocket | undefined;
    
    for (const [ws, playerId] of this.clientsMap.entries()) {
      if (playerId === player1Id) {
        player1Ws = ws;
      } else if (playerId === player2Id) {
        player2Ws = ws;
      }
    }
    
    // Send message to the first player
    if (player1Ws) {
      this.wsManager.sendMessage(player1Ws, {
        type: MessageType.CREATE_GAME,
        data: {
          idGame: gameId,
          idPlayer: player1Id
        },
        id: 0
      });
    }
    
    // Send message to the second player
    if (player2Ws) {
      this.wsManager.sendMessage(player2Ws, {
        type: MessageType.CREATE_GAME,
        data: {
          idGame: gameId,
          idPlayer: player2Id
        },
        id: 0
      });
    }
  }

  // Send start game messages
  private sendStartGameMessages(game: any): void {
    // Find WebSocket for each player
    let player1Ws: WebSocket | undefined;
    let player2Ws: WebSocket | undefined;
    
    for (const [ws, playerId] of this.clientsMap.entries()) {
      if (playerId === game.player1Id) {
        player1Ws = ws;
      } else if (playerId === game.player2Id) {
        player2Ws = ws;
      }
    }
    
    // Send message to the first player
    if (player1Ws) {
      this.wsManager.sendMessage(player1Ws, {
        type: MessageType.START_GAME,
        data: {
          ships: game.player1Ships,
          currentPlayerIndex: game.player1Id
        },
        id: 0
      });
    }
    
    // Send message to the second player
    if (player2Ws) {
      this.wsManager.sendMessage(player2Ws, {
        type: MessageType.START_GAME,
        data: {
          ships: game.player2Ships,
          currentPlayerIndex: game.player2Id
        },
        id: 0
      });
    }
  }

  // Send turn message
  private sendTurnMessage(game: any): void {
    this.wsManager.broadcastMessage({
      type: MessageType.TURN,
      data: {
        currentPlayer: game.currentPlayerId
      },
      id: 0
    });
  }

  // Send attack result
  private sendAttackResultMessage(game: any, position: { x: number; y: number }, status: string): void {
    this.wsManager.broadcastMessage({
      type: MessageType.ATTACK,
      data: {
        position,
        currentPlayer: game.currentPlayerId,
        status
      },
      id: 0
    });
  }

  // Send game finish message
  private sendFinishGameMessage(game: any): void {
    this.wsManager.broadcastMessage({
      type: MessageType.FINISH,
      data: {
        winPlayer: game.winnerId
      },
      id: 0
    });
  }
}
