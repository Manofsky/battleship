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

// Class for handling client messages
export class MessageHandler {
  private wsManager: WebSocketManager;
  private clientsMap: Map<WebSocket, string | number> = new Map();

  constructor(wsManager: WebSocketManager) {
    this.wsManager = wsManager;
  }

  // Method for processing messages
  public handleMessage(ws: WebSocket, message: Message): void {
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

  // Player registration handling
  private handleRegistration(ws: WebSocket, message: RegRequest): void {
    let name, password;
    
    try {
      if (typeof message.data === 'string') {
        const parsedData = JSON.parse(message.data);
        name = parsedData.name;
        password = parsedData.password;
      } else {
        name = message.data.name;
        password = message.data.password;
      }
    } catch (error) {
      console.error('Error parsing message data:', error);
      return;
    }
    
    console.log('Trying to register user. Name:', name);
    
    // Check if player with this name already exists
    let player = gameStore.getPlayerByName(name);
    
    if (player) {
      // If player exists, check password
      if (player.password !== password) {
        // Invalid password
        this.wsManager.sendMessage(ws, {
          type: MessageType.REG,
          data: JSON.stringify({
            name,
            index: -1,
            error: true,
            errorText: 'Invalid password'
          }),
          id: 0
        });
        return;
      }
    } else {
      // Create new player
      player = gameStore.addPlayer(name, password);
    }
    
    console.log('Player registered/logged in. Name:', name, 'ID:', player.index);
    
    // Associate WebSocket with player ID
    this.clientsMap.set(ws, player.index);
    
    // Send successful response
    this.wsManager.sendMessage(ws, {
      type: MessageType.REG,
      data: JSON.stringify({
        name: player.name,
        index: player.index,
        error: false,
        errorText: ''
      }),
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
    
    let indexRoom;
    try {
      if (typeof message.data === 'string') {
        const parsedData = JSON.parse(message.data);
        indexRoom = parsedData.indexRoom;
      } else {
        indexRoom = message.data.indexRoom;
      }
    } catch (error) {
      console.error('Error parsing message data:', error);
      return;
    }

    if (!playerId) {
      console.error('Player not registered');
      return;
    }
    
    try {
      console.log('Trying to add user to room. Room ID:', indexRoom, 'Player ID:', playerId);
      
      try {
        const rooms = gameStore.getAllRooms();
        console.log('Available rooms:', rooms.map(room => room.roomId));
      } catch (e) {
        console.log('Error getting rooms:', e);
      }
      
      try {
        const players = gameStore.getAllPlayers();
        console.log('Available players:', players.map(player => player.index));
      } catch (e) {
        console.log('Error getting players:', e);
      }
      
      const numericRoomId = Number(indexRoom);
      const numericPlayerId = Number(playerId);
      console.log('Converted to numbers - Room ID:', numericRoomId, 'Player ID:', numericPlayerId);
      
      // Add player to room
      const room = gameStore.addUserToRoom(numericRoomId, numericPlayerId);
      
      // If there are 2 players in the room, create a game
      if (room.roomUsers.length === 2) {
        const game = gameStore.createGame(numericRoomId);
        
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
    let gameId, ships, indexPlayer;
    
    try {
      if (typeof message.data === 'string') {
        const parsedData = JSON.parse(message.data);
        gameId = parsedData.gameId;
        ships = parsedData.ships;
        indexPlayer = parsedData.indexPlayer;
      } else {
        gameId = message.data.gameId;
        ships = message.data.ships;
        indexPlayer = message.data.indexPlayer;
      }
    } catch (error) {
      console.error('Error parsing message data:', error);
      return;
    }
    
    try {
      const numericGameId = Number(gameId);
      const numericIndexPlayer = Number(indexPlayer);
      
      const game = gameStore.getGame(numericGameId);
      
      if (!game) {
        console.error('Game not found');
        return;
      }
      
      // Add player's ships
      game.addShips(numericIndexPlayer, ships);
      
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
    let gameId, x, y, indexPlayer;
    
    try {
      if (typeof message.data === 'string') {
        const parsedData = JSON.parse(message.data);
        gameId = parsedData.gameId;
        x = parsedData.x;
        y = parsedData.y;
        indexPlayer = parsedData.indexPlayer;
      } else {
        gameId = message.data.gameId;
        x = message.data.x;
        y = message.data.y;
        indexPlayer = message.data.indexPlayer;
      }
    } catch (error) {
      console.error('Error parsing message data:', error);
      return;
    }
    
    try {
      const numericGameId = Number(gameId);
      const numericIndexPlayer = Number(indexPlayer);
      
      console.log('Trying to attack. Game ID:', numericGameId, 'Player ID:', numericIndexPlayer, 'Position:', x, y);
      
      const game = gameStore.getGame(numericGameId);
      
      if (!game || !game.gameStarted || game.gameFinished) {
        console.error('Game not found or not started or already finished');
        return;
      }
      
      // Check if it's the player's turn
      if (!game.isPlayerTurn(numericIndexPlayer)) {
        console.error('Not player\'s turn');
        return;
      }
      
      // Determine the attack target (opponent)
      const targetPlayerId = numericIndexPlayer === game.player1Id ? game.player2Id : game.player1Id;
      
      // Check the hit
      const result = GameManager.checkHit(targetPlayerId, { x: Number(x), y: Number(y) }, game);
      
      // Send attack result to both players
      this.sendAttackResultMessage(game, { x: Number(x), y: Number(y) }, result.status);
      
      // Check if the game is over (all opponent's ships are sunk)
      if (result.gameOver) {
        // Game is over, current player won
        game.gameFinished = true;
        game.winnerId = numericIndexPlayer;
        
        // Update player's wins
        gameStore.updatePlayerWins(numericIndexPlayer);
        
        // Send game finish message
        this.sendFinishGameMessage(game);
        
        // Send updated winners table
        this.sendWinnersUpdate();
        
        // Remove game
        gameStore.removeGame(numericGameId);
      } else {
        // If miss, switch turn
        if (result.status === 'miss') {
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
    let gameId, indexPlayer;
    
    try {
      if (typeof message.data === 'string') {
        const parsedData = JSON.parse(message.data);
        gameId = parsedData.gameId;
        indexPlayer = parsedData.indexPlayer;
      } else {
        gameId = message.data.gameId;
        indexPlayer = message.data.indexPlayer;
      }
    } catch (error) {
      console.error('Error parsing message data:', error);
      return;
    }
    
    try {
      const numericGameId = Number(gameId);
      const numericIndexPlayer = Number(indexPlayer);
      
      console.log('Trying to make random attack. Game ID:', numericGameId, 'Player ID:', numericIndexPlayer);
      
      const game = gameStore.getGame(numericGameId);
      
      if (!game || !game.gameStarted || game.gameFinished) {
        console.error('Game not found or not started or already finished');
        return;
      }
      
      // Check if it's the player's turn
      if (!game.isPlayerTurn(numericIndexPlayer)) {
        console.error('Not player\'s turn');
        return;
      }
      
      // Determine the attack target (opponent)
      const targetPlayerId = numericIndexPlayer === game.player1Id ? game.player2Id : game.player1Id;
      
      // Generate random position for attack
      const position = GameManager.generateRandomAttack(targetPlayerId, game);
      
      // Check the hit
      const result = GameManager.checkHit(targetPlayerId, position, game);
      
      // Send attack result to both players
      this.sendAttackResultMessage(game, position, result.status);
      
      // Check if the game is over (all opponent's ships are sunk)
      if (result.gameOver) {
        // Game is over, current player won
        game.gameFinished = true;
        game.winnerId = numericIndexPlayer;
        
        // Update player's wins
        gameStore.updatePlayerWins(numericIndexPlayer);
        
        // Send game finish message
        this.sendFinishGameMessage(game);
        
        // Send updated winners table
        this.sendWinnersUpdate();
        
        // Remove game
        gameStore.removeGame(numericGameId);
      } else {
        // If miss, switch turn
        if (result.status === 'miss') {
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
      data: JSON.stringify(rooms),
      id: 0
    });
  }

  // Send updated winners table
  private sendWinnersUpdate(): void {
    const winners = gameStore.getWinners();
    
    this.wsManager.broadcastMessage({
      type: MessageType.UPDATE_WINNERS,
      data: JSON.stringify(winners),
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
        data: JSON.stringify({
          idGame: gameId,
          idPlayer: player1Id
        }),
        id: 0
      });
    }
    
    // Send message to the second player
    if (player2Ws) {
      this.wsManager.sendMessage(player2Ws, {
        type: MessageType.CREATE_GAME,
        data: JSON.stringify({
          idGame: gameId,
          idPlayer: player2Id
        }),
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
        data: JSON.stringify({
          ships: game.player1Ships,
          currentPlayerIndex: game.player1Id
        }),
        id: 0
      });
    }
    
    // Send message to the second player
    if (player2Ws) {
      this.wsManager.sendMessage(player2Ws, {
        type: MessageType.START_GAME,
        data: JSON.stringify({
          ships: game.player2Ships,
          currentPlayerIndex: game.player2Id
        }),
        id: 0
      });
    }
  }

  // Send turn message
  private sendTurnMessage(game: any): void {
    this.wsManager.broadcastMessage({
      type: MessageType.TURN,
      data: JSON.stringify({
        currentPlayer: game.currentPlayerId
      }),
      id: 0
    });
  }

  // Send attack result
  private sendAttackResultMessage(game: any, position: { x: number; y: number }, status: string): void {
    this.wsManager.broadcastMessage({
      type: MessageType.ATTACK,
      data: JSON.stringify({
        position,
        currentPlayer: game.currentPlayerId,
        status
      }),
      id: 0
    });
  }

  // Send game finish message
  private sendFinishGameMessage(game: any): void {
    this.wsManager.broadcastMessage({
      type: MessageType.FINISH,
      data: JSON.stringify({
        winPlayer: game.winnerId
      }),
      id: 0
    });
  }
}
