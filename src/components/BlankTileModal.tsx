import React from 'react';
import { X } from 'lucide-react';

interface BlankTileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectLetter: (letter: string) => void;
}

export const BlankTileModal: React.FC<BlankTileModalProps> = ({ 
  isOpen, 
  onClose,
  onSelectLetter
}) => {
  if (!isOpen) return null;

  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

  return (
    <div 
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-lg p-6 shadow-xl max-w-md w-full mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-start mb-4">
          <h3 className="text-xl font-bold text-gray-800">Choose a Letter</h3>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            <X size={20} />
          </button>
        </div>
        
        <p className="mb-4 text-gray-600">
          Select a letter to assign to your blank tile:
        </p>
        
        <div className="grid grid-cols-6 gap-2 mb-4">
          {letters.map(letter => (
            <button
              key={letter}
              onClick={() => onSelectLetter(letter)}
              className="bg-yellow-100 hover:bg-yellow-200 text-gray-800 font-bold py-2 px-3 rounded-md transition-colors"
            >
              {letter}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};