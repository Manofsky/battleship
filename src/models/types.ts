// Message types
export enum MessageType {
  REG = 'reg',
  UPDATE_WINNERS = 'update_winners',
  CREATE_ROOM = 'create_room',
  ADD_USER_TO_ROOM = 'add_user_to_room',
  CREATE_GAME = 'create_game',
  UPDATE_ROOM = 'update_room',
  ADD_SHIPS = 'add_ships',
  START_GAME = 'start_game',
  ATTACK = 'attack',
  RANDOM_ATTACK = 'randomAttack',
  TURN = 'turn',
  FINISH = 'finish'
}

// Ship types
export type ShipType = 'small' | 'medium' | 'large' | 'huge';

// Attack statuses
export type AttackStatus = 'miss' | 'killed' | 'shot';

// Base message
export interface Message {
  type: string;
  data: any;
  id: number;
}

// Interfaces for requests
export interface RegRequest extends Message {
  type: MessageType.REG;
  data: {
    name: string;
    password: string;
  };
}

export interface CreateRoomRequest extends Message {
  type: MessageType.CREATE_ROOM;
  data: string;
}

export interface AddUserToRoomRequest extends Message {
  type: MessageType.ADD_USER_TO_ROOM;
  data: {
    indexRoom: string | number;
  };
}

export interface AddShipsRequest extends Message {
  type: MessageType.ADD_SHIPS;
  data: {
    gameId: string | number;
    ships: Ship[];
    indexPlayer: string | number;
  };
}

export interface AttackRequest extends Message {
  type: MessageType.ATTACK;
  data: {
    gameId: string | number;
    x: number;
    y: number;
    indexPlayer: string | number;
  };
}

export interface RandomAttackRequest extends Message {
  type: MessageType.RANDOM_ATTACK;
  data: {
    gameId: string | number;
    indexPlayer: string | number;
  };
}

// Interfaces for responses
export interface RegResponse extends Message {
  type: MessageType.REG;
  data: {
    name: string;
    index: string | number;
    error: boolean;
    errorText: string;
  };
}

export interface UpdateWinnersResponse extends Message {
  type: MessageType.UPDATE_WINNERS;
  data: Winner[];
}

export interface CreateGameResponse extends Message {
  type: MessageType.CREATE_GAME;
  data: {
    idGame: string | number;
    idPlayer: string | number;
  };
}

export interface UpdateRoomResponse extends Message {
  type: MessageType.UPDATE_ROOM;
  data: Room[];
}

export interface StartGameResponse extends Message {
  type: MessageType.START_GAME;
  data: {
    ships: Ship[];
    currentPlayerIndex: string | number;
  };
}

export interface AttackResponse extends Message {
  type: MessageType.ATTACK;
  data: {
    position: {
      x: number;
      y: number;
    };
    currentPlayer: string | number;
    status: AttackStatus;
  };
}

export interface TurnResponse extends Message {
  type: MessageType.TURN;
  data: {
    currentPlayer: string | number;
  };
}

export interface FinishResponse extends Message {
  type: MessageType.FINISH;
  data: {
    winPlayer: string | number;
  };
}

// Data models
export interface Position {
  x: number;
  y: number;
}

export interface Ship {
  position: Position;
  direction: boolean; // true - горизонтально, false - вертикально
  length: number;
  type: ShipType;
}

export interface Player {
  name: string;
  index: string | number;
  password: string;
  wins: number;
}

export interface RoomUser {
  name: string;
  index: string | number;
}

export interface Room {
  roomId: string | number;
  roomUsers: RoomUser[];
}

export interface Winner {
  name: string;
  wins: number;
}
