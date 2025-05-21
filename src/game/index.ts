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
    
    // Проверка валидности координат
    if (position.x < 0 || position.x >= 10 || position.y < 0 || position.y >= 10) {
      console.error(`Invalid attack coordinates: x=${position.x}, y=${position.y}`);
      return { status: 'miss', gameOver: false };
    }
    
    // Проверка, не стреляли ли уже в эту клетку
    if (board[position.y][position.x] !== null) {
      console.log(`Cell already attacked: x=${position.x}, y=${position.y}, value=${board[position.y][position.x]}`);
      return { status: board[position.y][position.x] === 1 ? 'shot' : 'miss', gameOver: false };
    }

    // Упрощенная проверка попадания в корабль
    for (const ship of ships) {
      try {
        // Логируем информацию о корабле
        console.log(`Checking ship: position=${JSON.stringify(ship.position)}, direction=${ship.direction}, length=${ship.length}`);
        
        // Проверяем все клетки корабля
        for (let i = 0; i < ship.length; i++) {
          // Инвертированная логика: false = горизонтально (увеличивается X), true = вертикально (увеличивается Y)
          let shipX, shipY;
          if (ship.direction === false) { 
            // Горизонтальный корабль
            shipX = ship.position.x + i;
            shipY = ship.position.y;
          } else {
            // Вертикальный корабль
            shipX = ship.position.x;
            shipY = ship.position.y + i;
          }
          
          console.log(`Ship cell: x=${shipX}, y=${shipY}, attack position: x=${position.x}, y=${position.y}`);
          
          // Попадание в корабль
          if (shipX === position.x && shipY === position.y) {
            // Отмечаем попадание на доске
            board[position.y][position.x] = 1; // 1 - попадание
            
            // Проверяем, потоплен ли корабль
            let sunk = true;
            
            for (let j = 0; j < ship.length; j++) {
              // Инвертированная логика: false = горизонтально (увеличивается X), true = вертикально (увеличивается Y)
              let checkX, checkY;
              if (ship.direction === false) { 
                // Горизонтальный корабль
                checkX = ship.position.x + j;
                checkY = ship.position.y;
              } else {
                // Вертикальный корабль
                checkX = ship.position.x;
                checkY = ship.position.y + j;
              }
              
              console.log(`Checking if sunk - Ship cell: x=${checkX}, y=${checkY}, board value: ${checkX >= 0 && checkX < 10 && checkY >= 0 && checkY < 10 ? board[checkY][checkX] : 'out of bounds'}`);
              
              // Если хотя бы одна клетка корабля не поражена, корабль не потоплен
              if (checkX >= 0 && checkX < 10 && checkY >= 0 && checkY < 10) {
                if (board[checkY][checkX] !== 1) {
                  sunk = false;
                  console.log(`Ship not sunk - unharmed cell at x=${checkX}, y=${checkY}`);
                  break;
                }
              }
            }
            
            if (sunk) {
              // Проверяем, все ли корабли потоплены
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

    // Если нет попадания, отмечаем как промах
    board[position.y][position.x] = 0; // 0 - промах
    
    return { status: 'miss', gameOver: false };
  }
  
  // Get all cells occupied by the ship
  private static getShipCells(ship: Ship): Position[] {
    const cells: Position[] = [];
    const { x, y } = ship.position;
    
    for (let i = 0; i < ship.length; i++) {
      // Инвертированная логика: false = горизонтально (увеличивается X), true = вертикально (увеличивается Y)
      if (ship.direction === false) { // горизонтально
        cells.push({ x: x + i, y });
      } else { // вертикально
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
      // Проверка на выход за границы доски
      if (cell.y < 0 || cell.y >= board.length || cell.x < 0 || cell.x >= board[0].length) {
        console.error(`Invalid ship cell coordinates: x=${cell.x}, y=${cell.y}`);
        return false;
      }
      return board[cell.y][cell.x] === 1; // 1 - hit
    });
  }
  
  // Mark cells around a sunk ship as misses
  private static markAroundSunkShip(ship: Ship, board: (number | null)[][]): void {
    if (!ship) {
      console.error('Cannot mark around undefined ship');
      return;
    }
    
    const shipCells = this.getShipCells(ship);
    if (!shipCells || shipCells.length === 0) {
      console.error('Ship has no cells to mark around');
      return;
    }
    
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
              // Избегаем дублирования клеток
              const alreadyAdded = surroundingCells.some(c => c.x === nx && c.y === ny);
              if (!alreadyAdded) {
                surroundingCells.push({ x: nx, y: ny });
              }
            }
          }
        }
      }
    });
    
    // Mark all surrounding cells as misses (только если они не отмечены как попадания)
    surroundingCells.forEach(cell => {
      // Не перезаписываем клетки с попаданиями (1)
      if (board[cell.y][cell.x] !== 1) {
        board[cell.y][cell.x] = 0; // 0 - miss
      }
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
