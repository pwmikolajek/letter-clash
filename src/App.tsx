import React, { useEffect, useState } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { Toaster } from 'react-hot-toast';
import toast from 'react-hot-toast';
import { Board } from './components/Board';
import { Rack } from './components/Rack';
import { useGameStore } from './lib/store';
import { supabase } from './lib/supabase';
import { Users, Copy, RotateCcw, Wifi, WifiOff, RefreshCw, Volume2, VolumeX, Smartphone } from 'lucide-react';
import { initializeDictionary } from './lib/dictionary';
import { TurnNotification } from './components/TurnNotification';
import { preloadSounds, initAudio, toggleSound, isSoundOn } from './lib/sounds';
import { TimeIndicator } from './components/TimeIndicator';
import { generateTileBag, drawTiles } from './lib/game-utils';

function App() {
  const [playerName, setPlayerName] = useState('');
  const [isDictionaryLoaded, setIsDictionaryLoaded] = useState(false);
  const [isJoiningGame, setIsJoiningGame] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [logoAnimationState, setLogoAnimationState] = useState('initial');
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const { 
    gameId,
    players,
    currentTurn,
    connectionStatus,
    createGame,
    joinGame,
    setBoard,
    setCurrentTurn,
    setPlayers,
    setPlayerName: setStoredPlayerName,
    reconnectToGame,
    showTurnNotification,
    closeTurnNotification,
    addTimeBonus,
    setRack,
    generateBonusTile
  } = useGameStore();

  useEffect(() => {
    const loadDictionary = async () => {
      const success = await initializeDictionary();
      setIsDictionaryLoaded(success);
      if (success) {
        toast.success('Dictionary loaded successfully');
      }
    };

    loadDictionary();
    preloadSounds();
    checkGameInUrl();
    
    // Start logo animation after a short delay
    setTimeout(() => {
      setLogoAnimationState('animated');
    }, 300);

    // Add window resize listener
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (connectionStatus === 'disconnected') {
      toast.error('Connection lost. Attempting to reconnect...', {
        id: 'connection-status',
        duration: Infinity
      });
    } else {
      toast.success('Connected to game server', {
        id: 'connection-status',
        duration: 2000
      });
    }
  }, [connectionStatus]);

  const checkGameInUrl = async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const gameIdFromUrl = urlParams.get('game');

    if (gameIdFromUrl) {
      try {
        setIsJoiningGame(true);
        await joinGame(gameIdFromUrl);
        toast.success('Joined game successfully!');
      } catch (error) {
        if (error.message !== 'Player name is required' && error.message !== 'Name already taken') {
          toast.error('Failed to join game');
          console.error(error);
        }
      } finally {
        setIsJoiningGame(false);
      }
    }
  };

  const handleCreateGame = async () => {
    if (!isDictionaryLoaded) {
      toast.error('Please wait for the dictionary to load');
      return;
    }

    try {
      initAudio(); // Initialize audio on user interaction
      const newGameId = await createGame();
      const shareUrl = `${window.location.origin}?game=${newGameId}`;
      await navigator.clipboard.writeText(shareUrl);
      toast.success('Game created! Share link copied to clipboard');
    } catch (error) {
      toast.error('Failed to create game');
      console.error(error);
    }
  };

  const copyGameLink = () => {
    if (!gameId) return;
    const shareUrl = `${window.location.origin}?game=${gameId}`;
    navigator.clipboard.writeText(shareUrl);
    toast.success('Game link copied to clipboard!');
  };

  const handleJoinGame = async () => {
    if (!isDictionaryLoaded) {
      toast.error('Please wait for the dictionary to load');
      return;
    }

    if (!playerName.trim()) {
      toast.error('Please enter your name');
      return;
    }
    
    // Start reverse animation
    setLogoAnimationState('reverse');
    
    // Wait for animation to complete before proceeding
    setTimeout(async () => {
      setStoredPlayerName(playerName);
      initAudio(); // Initialize audio on user interaction
      
      try {
        setIsJoiningGame(true);
        await checkGameInUrl();
      } finally {
        setIsJoiningGame(false);
      }
    }, 600); // Match the animation duration
  };

  const getCurrentPlayerName = () => {
    const currentPlayer = players.find(player => player.id === currentTurn);
    return currentPlayer ? currentPlayer.name : 'Waiting for players';
  };

  const handleRestartGame = async () => {
    if (!gameId) return;
    
    try {
      // Generate new tiles for all players
      const newTileBag = generateTileBag();
      
      // Update the game state
      await supabase
        .from('games')
        .update({ 
          board_state: Array(15).fill(null).map(() => Array(15).fill(null)),
          current_player_id: players[0]?.id || null,
          status: 'active'
        })
        .eq('id', gameId);

      // Update each player with new tiles and reset score
      for (const player of players) {
        const { drawn, remaining } = drawTiles(7, newTileBag);
        
        await supabase
          .from('players')
          .update({ 
            score: 0,
            rack: drawn
          })
          .eq('id', player.id);
        
        // If this is the current player, update their rack in the local state
        if (player.id === useGameStore.getState().playerId) {
          setRack(drawn);
        }
      }

      // Generate a new bonus tile
      generateBonusTile();
      
      toast.success('Game restarted with new tiles!');
    } catch (error) {
      toast.error('Failed to restart game');
      console.error(error);
    }
  };

  const handleManualReconnect = async () => {
    toast.loading('Reconnecting to game...', { id: 'reconnecting' });
    await reconnectToGame();
    toast.dismiss('reconnecting');
  };

  const handleToggleSound = () => {
    const newState = toggleSound();
    setSoundEnabled(newState);
    toast.success(newState ? 'Sound enabled' : 'Sound disabled');
  };

  const handleTimeBonus = (bonus: number) => {
    addTimeBonus(bonus);
  };

  // Sort players by score (highest first)
  const sortedPlayers = [...players].sort((a, b) => b.score - a.score);
  
  // Check if it's the current player's turn
  const isMyTurn = currentTurn === useGameStore.getState().playerId;

  // Mobile view message
  const MobileMessage = () => (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
      <div className="bg-white/10 p-8 rounded-lg shadow-lg max-w-md">
        <Smartphone className="w-16 h-16 text-white mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-white mb-4">Desktop Only Game</h2>
        <p className="text-white/90 mb-6">
          This game is currently only available on larger screens. Please open on a desktop or tablet with a screen width of at least 1060px.
        </p>
        <div className="text-white/70 text-sm">
          <p>Current screen width: {windowWidth}px</p>
          <p>Required width: 1060px</p>
        </div>
      </div>
    </div>
  );

  // Check if screen is too small
  if (windowWidth < 1060) {
    return (
      <div className="min-h-screen relative">
        <div className="absolute inset-0 z-0">
          <div 
            className="absolute inset-0 bg-cover bg-center opacity-80" 
            style={{ backgroundImage: 'url("/img/bg.jpg")' }}
          />
          <div className="absolute inset-0 bg-[#203657]/90"></div>
        </div>
        <div className="relative z-10">
          <MobileMessage />
        </div>
      </div>
    );
  }

  if (!useGameStore.getState().playerName) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center relative">
        {/* Background image */}
        <div 
          className="absolute inset-0 bg-cover bg-center z-0" 
          style={{ backgroundImage: 'url("/img/bg.jpg")' }}
        >
          {/* Overlay to ensure text is readable */}
          <div className="absolute inset-0 bg-black/40"></div>
        </div>
        
        <div className="relative z-10 flex flex-col items-center">
          <img 
            src="/img/logo.png" 
            alt="Scrabble Online"
            className={`h-32 mb-8 transition-all duration-600 ease-elastic ${
              logoAnimationState === 'initial' 
                ? 'opacity-0 scale-75 -translate-y-16 rotate-12' 
                : logoAnimationState === 'animated'
                  ? 'opacity-100 scale-100 translate-y-0 rotate-0'
                  : 'opacity-0 scale-75 -translate-y-16 rotate-12'
            }`}
          />
          <div className="bg-white p-8 rounded-lg shadow-lg w-96">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Enter your name to play
                </label>
                <input
                  type="text"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  placeholder="Your name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  onKeyDown={(e) => e.key === 'Enter' && handleJoinGame()}
                  disabled={isJoiningGame}
                />
              </div>
              <button
                onClick={handleJoinGame}
                className={`w-full bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors ${
                  isJoiningGame ? 'opacity-70 cursor-not-allowed' : ''
                }`}
                disabled={isJoiningGame}
              >
                {isJoiningGame ? 'Joining Game...' : 'Start Playing'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="min-h-screen relative">
        {/* Background image with overlay */}
        <div className="absolute inset-0 z-0">
          <div 
            className="absolute inset-0 bg-cover bg-center opacity-80" 
            style={{ backgroundImage: 'url("/img/bg.jpg")' }}
          />
          <div className="absolute inset-0 bg-[#203657]/90"></div>
        </div>
        
        <div className="relative z-10 flex justify-center w-full h-screen">
          <div className="w-[1060px] p-4 flex flex-col h-screen">
            <div className="bg-white/5 rounded-lg flex-1 flex flex-col">
              <div className="p-4 border-b border-white/10">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-4">
                    <img 
                      src="/img/logo-hotizontal.png" 
                      alt="Scrabble Online"
                      className="h-10"
                    />
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-4 text-white">
                      <button
                        onClick={handleToggleSound}
                        className="bg-white/10 hover:bg-white/20 p-2 rounded-full transition-colors"
                        title={soundEnabled ? 'Mute sounds' : 'Enable sounds'}
                      >
                        {soundEnabled ? (
                          <Volume2 className="w-4 h-4" />
                        ) : (
                          <VolumeX className="w-4 h-4" />
                        )}
                      </button>
                      <div className={`flex items-center gap-1 text-sm ${
                        connectionStatus === 'connected' ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {connectionStatus === 'connected' ? (
                          <>
                            <span>Connected</span>
                            <Wifi className="w-4 h-4" />
                          </>
                        ) : (
                          <>
                            <span>Reconnecting...</span>
                            <WifiOff className="w-4 h-4" />
                            <button 
                              onClick={handleManualReconnect}
                              className="ml-2 bg-red-500/20 hover:bg-red-500/30 p-1 rounded-full"
                              title="Force reconnect"
                            >
                              <RefreshCw className="w-3 h-3" />
                            </button>
                          </>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Users className="w-5 h-5" />
                        <span className="text-sm font-medium">Players: {players.length}/4</span>
                      </div>
                    </div>
                    {!gameId ? (
                      <button
                        onClick={handleCreateGame}
                        className="bg-blue-500 text-white px-3 py-1.5 text-sm rounded-lg hover:bg-blue-600 transition-colors"
                      >
                        Create Game
                      </button>
                    ) : (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={handleRestartGame}
                          className="flex items-center gap-2 bg-green-500 text-white px-3 py-1.5 text-sm rounded-lg hover:bg-green-600 transition-colors"
                        >
                          <RotateCcw className="w-4 h-4" />
                          Restart Game
                        </button>
                        <button
                          onClick={copyGameLink}
                          className="flex items-center gap-2 bg-white/20 text-white px-3 py-1.5 text-sm rounded-lg hover:bg-white/30 transition-colors"
                        >
                          <Copy className="w-4 h-4" />
                          Share Game
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Time indicator bar */}
              <div className="px-4 pt-4">
                <TimeIndicator isMyTurn={isMyTurn} onTimeBonus={handleTimeBonus} />
              </div>

              <div className="p-4 flex-1 flex">
                <div className="flex gap-4 h-full w-full">
                  <div className="bg-white rounded-lg shadow-lg p-4 flex items-center justify-center">
                    <Board />
                  </div>
                  <div className="flex-1 space-y-4 flex flex-col min-w-[280px]">
                    <div className="bg-white/10 p-4 rounded-lg">
                      <h2 className="text-lg font-bold text-white mb-3">Game Info</h2>
                      <div className="space-y-2 text-sm text-white/90">
                        <p>Current Turn: {getCurrentPlayerName()}</p>
                        <p>Your Score: {players.find(p => p.id === useGameStore.getState().playerId)?.score || 0}</p>
                      </div>
                    </div>
                    <div className={`bg-white/10 p-4 rounded-lg flex-1 relative overflow-hidden players-list-container ${isMyTurn ? 'my-turn' : ''}`}>
                      {/* Enhanced pulsating glow effect */}
                      {isMyTurn && (
                        <>
                          <div className="absolute inset-0 bg-green-500/30 animate-pulse-slow"></div>
                          <div className="absolute inset-0 border-4 border-green-500/50 rounded-lg animate-pulse-border"></div>
                        </>
                      )}
                      
                      <h2 className="text-lg font-bold text-white mb-3 relative z-10">Players</h2>
                      <div className="space-y-2 text-sm text-white/90 relative z-10">
                        {sortedPlayers.map((player, index) => (
                          <div key={player.id} className="flex justify-between">
                            <span className={player.id === currentTurn ? 'font-bold text-green-400' : ''}>
                              {index + 1}. {player.name} {player.id === useGameStore.getState().playerId ? '(You)' : ''}
                            </span>
                            <span>{player.score} pts</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <Rack />
                  </div>
                </div>
              </div>
            </div>
          </div>
          <Toaster position="bottom-right" />
          <TurnNotification 
            isOpen={showTurnNotification} 
            onClose={closeTurnNotification}
            playerName={useGameStore.getState().playerName || ''}
          />
        </div>
      </div>
    </DndProvider>
  );
}

export default App;