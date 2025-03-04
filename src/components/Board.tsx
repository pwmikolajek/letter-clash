import React, { useEffect } from 'react';
import { useDrop, useDrag } from 'react-dnd';
import { useGameStore } from '../lib/store';
import { playSound } from '../lib/sounds';

const BOARD_SIZE = 15;
const SPECIAL_CELLS = {
  TRIPLE_WORD: [[0, 0], [0, 7], [0, 14], [7, 0], [7, 14], [14, 0], [14, 7], [14, 14]],
  DOUBLE_WORD: [[1, 1], [2, 2], [3, 3], [4, 4], [13, 13], [12, 12], [11, 11], [10, 10]],
  TRIPLE_LETTER: [[1, 5], [1, 9], [5, 1], [5, 5], [5, 9], [5, 13], [9, 1], [9, 5], [9, 9], [9, 13], [13, 5], [13, 9]],
  DOUBLE_LETTER: [[0, 3], [0, 11], [2, 6], [2, 8], [3, 0], [3, 7], [3, 14], [6, 2], [6, 6], [6, 8], [6, 12], [7, 3], [7, 11], [8, 2], [8, 6], [8, 8], [8, 12], [11, 0], [11, 7], [11, 14], [12, 6], [12, 8], [14, 3], [14, 11]]
};

interface CellProps {
  x: number;
  y: number;
  letter?: string;
}

const Cell: React.FC<CellProps> = ({ x, y, letter }) => {
  const { playTile, removeTile, pendingTiles, currentTurn, playerId, bonusTile, livePlacements, lastPlayedPositions } = useGameStore();

  const isPendingTile = letter && pendingTiles.some(tile => tile.x === x && tile.y === y);
  const isMyTurn = currentTurn === playerId;
  const isBonusTile = letter && bonusTile && letter === bonusTile.letter;
  const isBlankTile = isBonusTile && bonusTile.multiplier === 0;
  const is2xTile = isBonusTile && bonusTile.multiplier === 2;
  const is3xTile = isBonusTile && bonusTile.multiplier === 3;
  
  // Check if there's a live placement from another player
  const livePlacement = livePlacements.find(p => p.x === x && p.y === y && p.playerId !== playerId);
  
  // Check if this cell is part of the last played word
  const isLastPlayedPosition = lastPlayedPositions.some(pos => pos.x === x && pos.y === y);

  const [{ isDragging }, drag] = useDrag(() => ({
    type: 'tile',
    item: isPendingTile ? { letter, fromBoard: true, x, y } : null,
    canDrag: () => isPendingTile && isMyTurn,
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
  }), [letter, isPendingTile, isMyTurn, x, y]); // Added x, y to dependencies

  const [{ isOver, canDrop }, drop] = useDrop({
    accept: 'tile',
    canDrop: (item: { letter: string; fromBoard?: boolean; x?: number; y?: number }) => {
      if (!isMyTurn) return false;
      if (!letter) return true;
      if (item.fromBoard && item.x === x && item.y === y) return false;
      return false;
    },
    drop: (item: { letter: string; fromBoard?: boolean; x?: number; y?: number }) => {
      if (item.fromBoard) {
        // Remove from old position
        removeTile(item.x!, item.y!, item.letter);
        // Add to new position
        playTile(item.letter, { x, y });
        // Play tile placement sound
        playSound('TILE_PLACE', 0.4);
      } else {
        playTile(item.letter, { x, y });
        // Play tile placement sound
        playSound('TILE_PLACE', 0.4);
      }
    },
    collect: (monitor) => ({
      isOver: !!monitor.isOver(),
      canDrop: !!monitor.canDrop(),
    }),
  });

  const getCellType = (x: number, y: number) => {
    if (SPECIAL_CELLS.TRIPLE_WORD.some(([cx, cy]) => cx === x && cy === y)) return 'bg-red-200';
    if (SPECIAL_CELLS.DOUBLE_WORD.some(([cx, cy]) => cx === x && cy === y)) return 'bg-pink-200';
    if (SPECIAL_CELLS.TRIPLE_LETTER.some(([cx, cy]) => cx === x && cy === y)) return 'bg-blue-200';
    if (SPECIAL_CELLS.DOUBLE_LETTER.some(([cx, cy]) => cx === x && cy === y)) return 'bg-sky-200';
    return 'bg-white';
  };

  const handleClick = () => {
    if (letter && isPendingTile && isMyTurn) {
      removeTile(x, y, letter);
      // Play tile placement sound when removing
      playSound('TILE_PLACE', 0.3);
    }
  };

  // Get the appropriate tile background for bonus tiles
  const getTileBackground = () => {
    if (isBlankTile) return 'bg-gray-100 text-gray-700';
    if (is2xTile) return 'bg-gradient-to-br from-purple-300 to-purple-400 text-purple-900';
    if (is3xTile) return 'bg-gradient-to-br from-[#c7f0c6] to-[#87E086] text-green-900';
    
    if (isPendingTile) return 'bg-yellow-300 hover:bg-yellow-400';
    if (isLastPlayedPosition) return 'bg-green-200 border-2 border-green-500';
    return 'bg-yellow-100';
  };

  const ref = (el: HTMLDivElement) => {
    drag(drop(el));
  };

  // Reduced cell size (90% of original 1.9rem)
  const cellSize = '1.71rem'; // 1.9rem * 0.9
  const tileSize = '1.53rem'; // 1.7rem * 0.9

  return (
    <div
      ref={ref}
      className={`border border-gray-300 flex items-center justify-center ${getCellType(x, y)} ${
        isOver && canDrop ? 'border-2 border-green-400' : ''
      } ${isOver && !canDrop ? 'border-2 border-red-400' : ''}`}
      style={{ width: cellSize, height: cellSize }}
    >
      {letter && (
        <div 
          onClick={handleClick}
          className={`rounded-sm flex items-center justify-center font-bold text-xs shadow cursor-pointer transition-colors ${
            getTileBackground()
          } ${isDragging ? 'opacity-50' : ''}`}
          style={{ width: tileSize, height: tileSize }}
        >
          {letter}
          {isBonusTile && bonusTile.multiplier > 0 && (
            <span className={`absolute -top-2 -right-2 text-[9px] font-bold ${
              bonusTile.multiplier === 3 ? 'bg-[#225722]' : 'bg-purple-600'
            } text-white rounded-full w-3.5 h-3.5 flex items-center justify-center`}>
              {bonusTile.multiplier}x
            </span>
          )}
        </div>
      )}
      
      {/* Show live placements from other players */}
      {!letter && livePlacement && (
        <div className="rounded-sm flex items-center justify-center font-bold text-xs shadow bg-orange-200 border-2 border-orange-400 animate-pulse"
             style={{ width: tileSize, height: tileSize }}>
          {livePlacement.letter}
        </div>
      )}
    </div>
  );
};

export const Board: React.FC = () => {
  const { board } = useGameStore();

  return (
    <div className="inline-grid grid-cols-15 gap-0.5">
      {Array(BOARD_SIZE)
        .fill(null)
        .map((_, y) =>
          Array(BOARD_SIZE)
            .fill(null)
            .map((_, x) => <Cell key={`${x}-${y}`} x={x} y={y} letter={board[y][x]} />)
        )}
    </div>
  );
};