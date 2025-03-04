import React from 'react';
import { useDrag } from 'react-dnd';
import { useGameStore, BLANK_TILE } from '../lib/store';
import { BlankTileModal } from './BlankTileModal';

interface TileProps {
  letter: string;
  index: number;
}

const Tile: React.FC<TileProps> = ({ letter, index }) => {
  const { bonusTile, openBlankTileModal, currentTurn, playerId } = useGameStore();
  const isMyTurn = currentTurn === playerId;
  const isBlankTile = letter === BLANK_TILE;
  
  // Only apply bonus tile styling if it's not a blank tile
  const isBonusTile = !isBlankTile && bonusTile && letter === bonusTile.letter;
  const isBonusBlankTile = bonusTile && bonusTile.multiplier === 0 && letter === bonusTile.letter;
  const is2xTile = bonusTile && bonusTile.multiplier === 2 && letter === bonusTile.letter;
  const is3xTile = bonusTile && bonusTile.multiplier === 3 && letter === bonusTile.letter;

  // Determine which tile image to use
  const getTileImage = () => {
    if (isBlankTile) return '/img/tile-blank.svg';
    if (isBonusBlankTile) return '/img/tile-blank.svg';
    if (is2xTile) return '/img/tile-2x.svg';
    if (is3xTile) return '/img/tile-3x.svg';
    return '/img/tile-normal.svg';
  };

  const handleBlankTileClick = () => {
    if (isBlankTile && isMyTurn) {
      openBlankTileModal(index);
    }
  };

  const [{ isDragging }, drag] = useDrag({
    type: 'tile',
    item: { letter, index },
    canDrag: () => !isBlankTile || (isBlankTile && letter !== BLANK_TILE),
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
  });

  return (
    <div
      ref={drag}
      style={{ 
        opacity: isDragging ? 0.5 : 1,
        filter: 'drop-shadow(0px 4px 15px #000)',
        cursor: isBlankTile && isMyTurn ? 'pointer' : 'move',
      }}
      onClick={handleBlankTileClick}
    >
      <div 
        className="flex items-center justify-center font-bold text-lg"
        style={{ 
          width: '58px',
          height: '50px',
          backgroundImage: `url('${getTileImage()}')`,
          backgroundSize: '100% 100%',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          position: 'relative'
        }}
      >
        {letter !== BLANK_TILE ? letter : isMyTurn ? '?' : ''}
        {isBonusTile && bonusTile.multiplier > 0 && (
          <span className={`absolute -top-2 -right-1 text-[10px] font-bold ${
            bonusTile.multiplier === 3 ? 'bg-[#225722]' : 'bg-purple-600'
          } text-white rounded-full w-4 h-4 flex items-center justify-center`}>
            {bonusTile.multiplier}x
          </span>
        )}
      </div>
    </div>
  );
};

export const Rack: React.FC = () => {
  const { 
    rack, 
    pendingTiles, 
    submitWord, 
    clearPendingTiles, 
    showBlankTileModal,
    closeBlankTileModal,
    assignLetterToBlankTile
  } = useGameStore();

  return (
    <div className="space-y-4 pb-3">
      <div 
        className="rounded-lg flex items-center justify-center relative"
        style={{
          background: `url('/img/rack-bg.jpg')`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          height: "100px",
          boxShadow: "-1px 1px 4px 0px #17100C inset, 0px -2px 1px 0px rgba(206, 181, 157, 0.13) inset, 0px 4px 1px 0px rgba(206, 181, 157, 0.50) inset, 0px 12px 0px 0px #142339, 0px 4px 4px 0px #533928 inset",
          borderRadius: "0.5rem",
          padding: "10px 0"
        }}
      >
        <div className="flex items-center gap-1">
          {rack.map((letter, index) => (
            <Tile key={index} letter={letter} index={index} />
          ))}
        </div>
      </div>
      {pendingTiles.length > 0 && (
        <div className="flex gap-2">
          <button
            onClick={submitWord}
            className="flex-1 bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors"
          >
            Submit Word
          </button>
          <button
            onClick={clearPendingTiles}
            className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors"
          >
            Clear
          </button>
        </div>
      )}
      
      <BlankTileModal 
        isOpen={showBlankTileModal}
        onClose={closeBlankTileModal}
        onSelectLetter={assignLetterToBlankTile}
      />
    </div>
  );
};