import { GameSession, gameStore } from '../models/store.js';
import { AttackStatus, Position, Ship } from '../models/types.js';

// Game logic management class
export class GameManager {
  // Check hit on a ship
  public static checkHit(
    targetPlayerId: string | number,
    position: Position,
    game: GameSession
  ): { status: AttackStatus, gameOver: boolean } {
    const ships = targetPlayerId === game.player1Id ? game.player1Ships : game.player2Ships;
    const board = targetPlayerId === game.player1Id ? game.player1Board : game.player2Board;
    
    if (position.x < 0 || position.x >= 10 || position.y < 0 || position.y >= 10) {
      console.error(`Invalid attack coordinates: x=${position.x}, y=${position.y}`);
      return { status: 'miss', gameOver: false };
    }
    
    if (board[position.y][position.x] !== null) {
      console.log(`Cell already attacked: x=${position.x}, y=${position.y}, value=${board[position.y][position.x]}`);
      return { status: board[position.y][position.x] === 1 ? 'shot' : 'miss', gameOver: false };
    }

    for (const ship of ships) {
      try {
        console.log(`Checking ship: position=${JSON.stringify(ship.position)}, direction=${ship.direction}, length=${ship.length}`);
        
        for (let i = 0; i < ship.length; i++) {
          let shipX, shipY;
          if (ship.direction === false) { 
            shipX = ship.position.x + i;
            shipY = ship.position.y;
          } else {
            shipX = ship.position.x;
            shipY = ship.position.y + i;
          }
          
          console.log(`Ship cell: x=${shipX}, y=${shipY}, attack position: x=${position.x}, y=${position.y}`);
          
          if (shipX === position.x && shipY === position.y) {
            board[position.y][position.x] = 1; // 1 - попадание
            
            let sunk = true;
            
            for (let j = 0; j < ship.length; j++) {
              let checkX, checkY;
              if (ship.direction === false) { 
                checkX = ship.position.x + j;
                checkY = ship.position.y;
              } else {
                checkX = ship.position.x;
                checkY = ship.position.y + j;
              }
              
              console.log(`Checking if sunk - Ship cell: x=${checkX}, y=${checkY}, board value: ${checkX >= 0 && checkX < 10 && checkY >= 0 && checkY < 10 ? board[checkY][checkX] : 'out of bounds'}`);
              
              if (checkX >= 0 && checkX < 10 && checkY >= 0 && checkY < 10) {
                if (board[checkY][checkX] !== 1) {
                  sunk = false;
                  console.log(`Ship not sunk - unharmed cell at x=${checkX}, y=${checkY}`);
                  break;
                }
              }
            }
            
            if (sunk) {
              const allShipsSunk = this.areAllShipsSunk(targetPlayerId, game);
              console.log(`Ship sunk! All ships sunk: ${allShipsSunk}`);
              
              return { status: 'killed', gameOver: allShipsSunk };
            }
            
            return { status: 'shot', gameOver: false };
          }
        }
      } catch (error) {
        console.error(`Error checking hit:`, error);
      }
    }

    board[position.y][position.x] = 0; // 0 - промах
    
    return { status: 'miss', gameOver: false };
  }
  
  // Get all cells occupied by the ship
  private static getShipCells(ship: Ship): Position[] {
    const cells: Position[] = [];
    const { x, y } = ship.position;
    
    for (let i = 0; i < ship.length; i++) {
      if (ship.direction === false) {
        cells.push({ x: x + i, y });
      } else {
        cells.push({ x, y: y + i });
      }
    }
    
    return cells;
  }
  
  // Check if the ship is sunk
  private static isShipSunk(ship: Ship, board: (number | null)[][]): boolean {
    const shipCells = this.getShipCells(ship);
    
    // Check if all ship cells are valid and hit
    return shipCells.every(cell => {
      if (cell.y < 0 || cell.y >= board.length || cell.x < 0 || cell.x >= board[0].length) {
        console.error(`Invalid ship cell coordinates: x=${cell.x}, y=${cell.y}`);
        return false;
      }
      return board[cell.y][cell.x] === 1; // 1 - hit
    });
  }
  
  // Check if all player's ships are sunk
  public static areAllShipsSunk(playerId: string | number, game: GameSession): boolean {
    const ships = playerId === game.player1Id ? game.player1Ships : game.player2Ships;
    const board = playerId === game.player1Id ? game.player1Board : game.player2Board;
    
    return ships.every(ship => this.isShipSunk(ship, board));
  }
  
  // Generate random position for attack
  public static generateRandomAttack(
    targetPlayerId: string | number,
    game: GameSession
  ): Position {
    const board = targetPlayerId === game.player1Id ? game.player1Board : game.player2Board;
    let x, y;
    
    // Find a cell that hasn't been shot at yet
    do {
      x = Math.floor(Math.random() * 10);
      y = Math.floor(Math.random() * 10);
    } while (board[y][x] !== null);
    
    return { x, y };
  }
}
