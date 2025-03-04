import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { playSound } from '../lib/sounds';

interface TurnNotificationProps {
  isOpen: boolean;
  onClose: () => void;
  playerName: string;
}

export const TurnNotification: React.FC<TurnNotificationProps> = ({ 
  isOpen, 
  onClose,
  playerName
}) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
      // Play notification sound
      playSound('TURN_NOTIFICATION', 0.4);
    }
  }, [isOpen]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => {
      onClose();
    }, 300); // Wait for animation to complete
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 transition-opacity duration-300"
      style={{ opacity: isVisible ? 1 : 0 }}
      onClick={handleClose}
    >
      <div 
        className="bg-white rounded-lg p-6 shadow-xl max-w-md w-full mx-4 transform transition-transform duration-300"
        style={{ transform: isVisible ? 'scale(1)' : 'scale(0.9)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-start mb-4">
          <h3 className="text-xl font-bold text-gray-800">Your Turn!</h3>
          <button 
            onClick={handleClose}
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            <X size={20} />
          </button>
        </div>
        
        <div className="mb-6">
          <p className="text-gray-600">
            It's your turn now, {playerName}! Place your tiles on the board to form words.
          </p>
        </div>
        
        <div className="flex justify-end">
          <button
            onClick={handleClose}
            className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
          >
            Start My Turn
          </button>
        </div>
      </div>
    </div>
  );
};