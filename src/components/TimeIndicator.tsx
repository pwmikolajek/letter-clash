import React, { useEffect, useState, useRef } from 'react';
import { useGameStore } from '../lib/store';
import { playSound } from '../lib/sounds';

interface TimeIndicatorProps {
  isMyTurn: boolean;
  onTimeBonus: (bonus: number) => void;
}

export const TimeIndicator: React.FC<TimeIndicatorProps> = ({ isMyTurn, onTimeBonus }) => {
  const [timeLeft, setTimeLeft] = useState(20);
  const [isActive, setIsActive] = useState(false);
  const [hasPlayedWarningSound, setHasPlayedWarningSound] = useState(false);
  const [hasPlayedTimeUpSound, setHasPlayedTimeUpSound] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const { currentTurn, gameId, playerId } = useGameStore();
  const prevTurnRef = useRef<string | null>(null);
  const prevIsMyTurnRef = useRef<boolean>(false);
  
  // Reset timer when turn changes
  useEffect(() => {
    // Check if the turn has actually changed or if it's a new game turn for the same player
    if (currentTurn !== prevTurnRef.current || (isMyTurn && !prevIsMyTurnRef.current)) {
      prevTurnRef.current = currentTurn;
      prevIsMyTurnRef.current = isMyTurn;
      
      if (isMyTurn) {
        // Reset timer when it becomes my turn
        setTimeLeft(20);
        setIsActive(true);
        setHasPlayedWarningSound(false);
        setHasPlayedTimeUpSound(false);
      } else {
        setIsActive(false);
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      }
    }
  }, [isMyTurn, currentTurn]);

  // Start countdown timer
  useEffect(() => {
    if (isActive) {
      intervalRef.current = setInterval(() => {
        setTimeLeft((prevTime) => {
          // Play warning sound when 5 seconds left
          if (prevTime === 6 && !hasPlayedWarningSound) {
            playSound('TURN_NOTIFICATION', 0.3);
            setHasPlayedWarningSound(true);
          }
          
          // Play ticking sound when 5 seconds or less
          if (prevTime <= 5 && prevTime > 0) {
            playSound('TILE_PLACE', 0.2);
          }
          
          // Play sound when time is up
          if (prevTime === 1 && !hasPlayedTimeUpSound) {
            playSound('WORD_SUBMIT', 0.4);
            setHasPlayedTimeUpSound(true);
          }
          
          return prevTime > 0 ? prevTime - 1 : 0;
        });
      }, 1000);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isActive, hasPlayedWarningSound, hasPlayedTimeUpSound]);

  // Calculate bonus points based on time left
  useEffect(() => {
    if (!isMyTurn && prevIsMyTurnRef.current) {
      // When turn ends, calculate bonus
      const bonus = Math.max(0, timeLeft);
      if (bonus > 0) {
        onTimeBonus(bonus);
      }
      prevIsMyTurnRef.current = false;
    }
  }, [isMyTurn, timeLeft, onTimeBonus]);

  // Calculate progress percentage
  const progressPercentage = (timeLeft / 20) * 100;
  
  // Determine color based on time left
  const getColor = () => {
    if (timeLeft > 10) return 'bg-green-500';
    if (timeLeft > 5) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  // Only show the time indicator when:
  // 1. A game exists (gameId is not null)
  // 2. AND either it's my turn OR there's an active timer for opponent
  if (!gameId || (!isMyTurn && timeLeft === 20)) return null;

  return (
    <div className="w-full mb-2">
      <div className="flex justify-between items-center mb-1">
        <span className="text-xs text-white font-medium">
          {isMyTurn ? 'Time Bonus' : 'Opponent\'s Turn'}
        </span>
        <span className={`text-xs font-bold ${timeLeft <= 5 ? 'text-red-400' : 'text-white'}`}>
          {timeLeft}s {isMyTurn && timeLeft > 0 && `(+${timeLeft} pts)`}
        </span>
      </div>
      <div className="w-full bg-[#203657] rounded-full h-2.5 overflow-hidden">
        <div 
          className={`h-full rounded-full transition-all duration-1000 ease-linear ${getColor()}`} 
          style={{ width: `${progressPercentage}%` }}
        ></div>
      </div>
    </div>
  );
};