import { Player, Room, Ship } from './types.js';

// Class for storing game data in memory
export class GameStore {
  private players: Map<string | number, Player> = new Map();
  private rooms: Map<string | number, Room> = new Map();
  private games: Map<string | number, GameSession> = new Map();
  
  private playerIdCounter: number = 1;
  private roomIdCounter: number = 1;
  private gameIdCounter: number = 1;

  // Methods for working with players
  public addPlayer(name: string, password: string): Player {
    const playerId = this.playerIdCounter++;
    const player: Player = {
      name,
      index: playerId,
      password,
      wins: 0
    };
    
    this.players.set(playerId, player);
    return player;
  }

  public getPlayer(id: string | number): Player | undefined {
    return this.players.get(id);
  }

  public getPlayerByName(name: string): Player | undefined {
    for (const player of this.players.values()) {
      if (player.name === name) {
        return player;
      }
    }
    return undefined;
  }

  public validatePlayer(name: string, password: string): Player | undefined {
    const player = this.getPlayerByName(name);
    if (player && player.password === password) {
      return player;
    }
    return undefined;
  }

  public getAllPlayers(): Player[] {
    return Array.from(this.players.values());
  }

  public updatePlayerWins(playerId: string | number): void {
    const player = this.players.get(playerId);
    if (player) {
      player.wins += 1;
      this.players.set(playerId, player);
    }
  }

  // Methods for working with rooms
  public createRoom(creatorId: string | number): Room {
    const roomId = this.roomIdCounter++;
    const creator = this.players.get(creatorId);
    
    if (!creator) {
      throw new Error('Player not found');
    }
    
    const room: Room = {
      roomId,
      roomUsers: [{ name: creator.name, index: creator.index }]
    };
    
    this.rooms.set(roomId, room);
    return room;
  }

  public addUserToRoom(roomId: string | number, playerId: string | number): Room {
    const room = this.rooms.get(roomId);
    const player = this.players.get(playerId);
    
    if (!room || !player) {
      throw new Error('Room or player not found');
    }
    
    room.roomUsers.push({ name: player.name, index: player.index });
    this.rooms.set(roomId, room);
    return room;
  }

  public getRoom(roomId: string | number): Room | undefined {
    return this.rooms.get(roomId);
  }

  public getAllRooms(): Room[] {
    return Array.from(this.rooms.values());
  }

  public removeRoom(roomId: string | number): void {
    this.rooms.delete(roomId);
  }

  // Methods for working with games
  public createGame(roomId: string | number): GameSession {
    const room = this.rooms.get(roomId);
    
    if (!room || room.roomUsers.length !== 2) {
      throw new Error('Invalid room for game creation');
    }
    
    const gameId = this.gameIdCounter++;
    const game = new GameSession(gameId, room.roomUsers[0].index, room.roomUsers[1].index);
    
    this.games.set(gameId, game);
    this.removeRoom(roomId); // The room is no longer available for connection
    
    return game;
  }

  public getGame(gameId: string | number): GameSession | undefined {
    return this.games.get(gameId);
  }

  public removeGame(gameId: string | number): void {
    this.games.delete(gameId);
  }

  public getWinners(): { name: string; wins: number }[] {
    return Array.from(this.players.values())
      .filter(player => player.wins > 0)
      .map(player => ({ name: player.name, wins: player.wins }))
      .sort((a, b) => b.wins - a.wins);
  }
}

// Class for storing game session data
export class GameSession {
  public gameId: string | number;
  public player1Id: string | number;
  public player2Id: string | number;
  public currentPlayerId: string | number;
  public player1Ships: Ship[] = [];
  public player2Ships: Ship[] = [];
  public player1Board: (number | null)[][] = Array(10).fill(null).map(() => Array(10).fill(null));
  public player2Board: (number | null)[][] = Array(10).fill(null).map(() => Array(10).fill(null));
  public gameStarted: boolean = false;
  public gameFinished: boolean = false;
  public winnerId: string | number | null = null;

  constructor(gameId: string | number, player1Id: string | number, player2Id: string | number) {
    this.gameId = gameId;
    this.player1Id = player1Id;
    this.player2Id = player2Id;
    this.currentPlayerId = player1Id; // The first player moves first
  }

  public addShips(playerId: string | number, ships: Ship[]): void {
    if (playerId === this.player1Id) {
      this.player1Ships = ships;
    } else if (playerId === this.player2Id) {
      this.player2Ships = ships;
    } else {
      throw new Error('Player not in this game');
    }

    // If both players have placed their ships, the game can start
    if (this.player1Ships.length > 0 && this.player2Ships.length > 0) {
      this.gameStarted = true;
    }
  }

  public isPlayerTurn(playerId: string | number): boolean {
    return this.currentPlayerId === playerId;
  }

  public switchTurn(): void {
    this.currentPlayerId = this.currentPlayerId === this.player1Id ? this.player2Id : this.player1Id;
  }
}

// Create a singleton for storing data
export const gameStore = new GameStore();
