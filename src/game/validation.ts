import { Ship, Position } from '../models/types.js';
import { config } from '../config.js';

// Class for validating ship placement and game rules
export class GameValidation {
  // Board size from config
  private static readonly BOARD_SIZE = config.game.boardSize;

  // Validate if a ship is within the board boundaries
  public static isShipWithinBounds(ship: Ship): boolean {
    const { x, y } = ship.position;
    const length = ship.length;
    
    // Check if ship is within board boundaries
    if (ship.direction) { // horizontal
      return x >= 0 && x + length <= this.BOARD_SIZE && y >= 0 && y < this.BOARD_SIZE;
    } else { // vertical
      return x >= 0 && x < this.BOARD_SIZE && y >= 0 && y + length <= this.BOARD_SIZE;
    }
  }

  // Get all cells occupied by a ship
  public static getShipCells(ship: Ship): Position[] {
    const cells: Position[] = [];
    const { x, y } = ship.position;
    
    for (let i = 0; i < ship.length; i++) {
      if (ship.direction) { // horizontal
        cells.push({ x: x + i, y });
      } else { // vertical
        cells.push({ x, y: y + i });
      }
    }
    
    return cells;
  }

  // Check if ships overlap
  public static doShipsOverlap(ships: Ship[]): boolean {
    const occupiedCells: Set<string> = new Set();
    
    for (const ship of ships) {
      const cells = this.getShipCells(ship);
      
      for (const cell of cells) {
        const cellKey = `${cell.x},${cell.y}`;
        
        if (occupiedCells.has(cellKey)) {
          return true; // Ships overlap
        }
        
        occupiedCells.add(cellKey);
      }
    }
    
    return false; // No overlaps
  }

  // Check if ships are adjacent (touching)
  public static areShipsAdjacent(ships: Ship[]): boolean {
    const occupiedCells: Set<string> = new Set();
    const adjacentCells: Set<string> = new Set();
    
    // First, mark all cells occupied by ships
    for (const ship of ships) {
      const cells = this.getShipCells(ship);
      
      for (const cell of cells) {
        occupiedCells.add(`${cell.x},${cell.y}`);
      }
    }
    
    // Then, for each ship, check its adjacent cells
    for (const ship of ships) {
      const cells = this.getShipCells(ship);
      
      for (const cell of cells) {
        // Check all 8 adjacent cells
        for (let dx = -1; dx <= 1; dx++) {
          for (let dy = -1; dy <= 1; dy++) {
            // Skip the cell itself
            if (dx === 0 && dy === 0) continue;
            
            const nx = cell.x + dx;
            const ny = cell.y + dy;
            
            // Skip if out of bounds
            if (nx < 0 || nx >= this.BOARD_SIZE || ny < 0 || ny >= this.BOARD_SIZE) continue;
            
            const adjacentCellKey = `${nx},${ny}`;
            
            // If this adjacent cell is not part of the current ship but is occupied by another ship
            if (!cells.some(c => c.x === nx && c.y === ny) && occupiedCells.has(adjacentCellKey)) {
              return true; // Ships are adjacent
            }
            
            adjacentCells.add(adjacentCellKey);
          }
        }
      }
    }
    
    return false; // No ships are adjacent
  }

  // Validate the number and types of ships
  public static validateShipConfiguration(ships: Ship[]): boolean {
    // Count ships by length
    const shipCountsByLength: Record<number, number> = {};
    
    // Initialize counts
    for (let length = 1; length <= 4; length++) {
      shipCountsByLength[length] = 0;
    }
    
    // Count ships by length
    for (const ship of ships) {
      shipCountsByLength[ship.length]++;
      
      // Validate ship length matches its type
      if (
        (ship.type === 'small' && ship.length !== 1) ||
        (ship.type === 'medium' && ship.length !== 2) ||
        (ship.type === 'large' && ship.length !== 3) ||
        (ship.type === 'huge' && ship.length !== 4)
      ) {
        return false; // Ship length doesn't match its type
      }
    }
    
    // Validate ship counts against config
    for (let length = 1; length <= 4; length++) {
      const expectedCount = config.game.ships[length as keyof typeof config.game.ships] || 0;
      if (shipCountsByLength[length] !== expectedCount) {
        return false;
      }
    }
    
    return true;
  }

  // Validate all ship placement rules
  public static validateShipPlacement(ships: Ship[]): { valid: boolean; error?: string } {
    // Check if all ships are within bounds
    for (const ship of ships) {
      if (!this.isShipWithinBounds(ship)) {
        return { valid: false, error: 'Ship is outside the board boundaries' };
      }
    }
    
    // Check if ships overlap
    if (this.doShipsOverlap(ships)) {
      return { valid: false, error: 'Ships overlap' };
    }
    
    // Check if ships are adjacent
    if (this.areShipsAdjacent(ships)) {
      return { valid: false, error: 'Ships are adjacent' };
    }
    
    // Check ship configuration
    if (!this.validateShipConfiguration(ships)) {
      return { valid: false, error: 'Invalid ship configuration' };
    }
    
    return { valid: true };
  }

  // Validate if a shot is within bounds
  public static isValidShot(x: number, y: number): boolean {
    return x >= 0 && x < this.BOARD_SIZE && y >= 0 && y < this.BOARD_SIZE;
  }
}
