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
    
    return ship.direction
      ? (x >= 0 && x + length <= this.BOARD_SIZE && y >= 0 && y < this.BOARD_SIZE) // horizontal
      : (x >= 0 && x < this.BOARD_SIZE && y >= 0 && y + length <= this.BOARD_SIZE); // vertical
  }

  // Get all cells occupied by a ship
  public static getShipCells(ship: Ship): Position[] {
    const { x, y } = ship.position;
    return Array.from({ length: ship.length }, (_, i) => 
      ship.direction ? { x: x + i, y } : { x, y: y + i }
    );
  }

  // Check if ships overlap
  public static doShipsOverlap(ships: Ship[]): boolean {
    const occupiedCells = new Set<string>();
    
    for (const ship of ships) {
      for (const cell of this.getShipCells(ship)) {
        const cellKey = `${cell.x},${cell.y}`;
        if (occupiedCells.has(cellKey)) return true; // Ships overlap
        occupiedCells.add(cellKey);
      }
    }
    
    return false; // No overlaps
  }

  // Check if ships are adjacent (touching)
  public static areShipsAdjacent(ships: Ship[]): boolean {
    const occupiedCells: Set<string> = new Set();
    const shipCellsMap: Map<string, Ship> = new Map();
    
    // Mark all cells occupied by ships
    for (const ship of ships) {
      const cells = this.getShipCells(ship);
      for (const cell of cells) {
        const key = `${cell.x},${cell.y}`;
        occupiedCells.add(key);
        shipCellsMap.set(key, ship);
      }
    }
    
    // Check for adjacent ships
    for (const [cellKey, ship] of shipCellsMap.entries()) {
      const [x, y] = cellKey.split(',').map(Number);
      
      // Check all 8 adjacent cells
      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          if (dx === 0 && dy === 0) continue; // Skip the cell itself
          
          const nx = x + dx;
          const ny = y + dy;
          const neighborKey = `${nx},${ny}`;
          
          // If adjacent cell is occupied by another ship
          if (occupiedCells.has(neighborKey) && shipCellsMap.get(neighborKey) !== ship) {
            return true; // Ships are adjacent
          }
        }
      }
    }
    
    return false; // No ships are adjacent
  }

  // Validate the number and types of ships
  public static validateShipConfiguration(ships: Ship[]): boolean {
    // Map to store ship type to expected length
    const shipTypeToLength: Record<string, number> = {
      'small': 1,
      'medium': 2,
      'large': 3,
      'huge': 4
    };
    
    // Count ships by length
    const shipCountsByLength: Record<number, number> = {1: 0, 2: 0, 3: 0, 4: 0};
    
    // Validate each ship and count by length
    for (const ship of ships) {
      // Check if ship type matches its length
      if (ship.length !== shipTypeToLength[ship.type]) return false;
      
      // Count ships by length
      shipCountsByLength[ship.length]++;
    }
    
    // Check if counts match expected configuration
    return Object.entries(config.game.ships).every(([length, count]) => 
      shipCountsByLength[Number(length)] === count
    );
  }

  // Validate all ship placement rules
  public static validateShipPlacement(ships: Ship[]): { valid: boolean; error?: string } {
    // Run all validations with corresponding error messages
    const validations = [
      { check: () => ships.every(ship => this.isShipWithinBounds(ship)), error: 'Ship is outside the board boundaries' },
      { check: () => !this.doShipsOverlap(ships), error: 'Ships overlap' },
      { check: () => !this.areShipsAdjacent(ships), error: 'Ships are adjacent' },
      { check: () => this.validateShipConfiguration(ships), error: 'Invalid ship configuration' }
    ];
    
    // Find first failed validation
    const failedValidation = validations.find(v => !v.check());
    
    // Return result
    return failedValidation
      ? { valid: false, error: failedValidation.error }
      : { valid: true };
  }

  // Validate if a shot is within bounds
  public static isValidShot(x: number, y: number): boolean {
    return x >= 0 && x < this.BOARD_SIZE && y >= 0 && y < this.BOARD_SIZE;
  }
}
