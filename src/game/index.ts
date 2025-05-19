import { GameSession, gameStore } from '../models/store.js';
import { AttackStatus, Position, Ship } from '../models/types.js';

// Game logic management class
export class GameManager {
  // Check hit on a ship
  public static checkHit(
    targetPlayerId: string | number,
    position: Position,
    game: GameSession
  ): AttackStatus {
    const ships = targetPlayerId === game.player1Id ? game.player1Ships : game.player2Ships;
    
    // Check for a hit on a ship
    for (let i = 0; i < ships.length; i++) {
      const ship = ships[i];
      const shipCells = this.getShipCells(ship);
      
      // Check if the attack hit one of the ship's cells
      const hitCellIndex = shipCells.findIndex(
        cell => cell.x === position.x && cell.y === position.y
      );
      
      if (hitCellIndex !== -1) {
        // Mark hit on the ship
        const board = targetPlayerId === game.player1Id ? game.player1Board : game.player2Board;
        board[position.y][position.x] = 1; // 1 - hit
        
        // Check if the ship is sunk
        const isShipSunk = this.isShipSunk(ship, board);
        
        if (isShipSunk) {
          // If the ship is sunk, mark all cells around the ship as misses
          this.markAroundSunkShip(ship, board);
          return 'killed';
        }
        
        return 'shot';
      }
    }
    
    // If no hit, mark as miss
    const board = targetPlayerId === game.player1Id ? game.player1Board : game.player2Board;
    board[position.y][position.x] = 0; // 0 - miss
    
    return 'miss';
  }
  
  // Get all cells occupied by the ship
  private static getShipCells(ship: Ship): Position[] {
    const cells: Position[] = [];
    const { x, y } = ship.position;
    
    for (let i = 0; i < ship.length; i++) {
      if (ship.direction) { // horizontally
        cells.push({ x: x + i, y });
      } else { // vertically
        cells.push({ x, y: y + i });
      }
    }
    
    return cells;
  }
  
  // Check if the ship is sunk
  private static isShipSunk(ship: Ship, board: (number | null)[][]): boolean {
    const shipCells = this.getShipCells(ship);
    
    // Check if all ship cells are hit
    return shipCells.every(cell => board[cell.y][cell.x] === 1);
  }
  
  // Mark cells around a sunk ship as misses
  private static markAroundSunkShip(ship: Ship, board: (number | null)[][]): void {
    const shipCells = this.getShipCells(ship);
    
    // Get all cells around the ship
    const surroundingCells: Position[] = [];
    
    shipCells.forEach(cell => {
      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          const nx = cell.x + dx;
          const ny = cell.y + dy;
          
          // Check that the cell is within the board boundaries
          if (nx >= 0 && nx < 10 && ny >= 0 && ny < 10) {
            // Check that the cell is not part of the ship
            const isShipCell = shipCells.some(sc => sc.x === nx && sc.y === ny);
            
            if (!isShipCell) {
              surroundingCells.push({ x: nx, y: ny });
            }
          }
        }
      }
    });
    
    // Mark all surrounding cells as misses
    surroundingCells.forEach(cell => {
      board[cell.y][cell.x] = 0; // 0 - miss
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
