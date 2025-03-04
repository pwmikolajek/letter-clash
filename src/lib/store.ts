import { create } from 'zustand';
import { supabase } from './supabase';
import { generateTileBag, drawTiles, calculateWordScore, LETTER_DISTRIBUTION } from './game-utils';
import { isValidWord } from './dictionary';
import toast from 'react-hot-toast';
import { playSound } from './sounds';

interface GameState {
  gameId: string | null;
  playerId: string | null;
  playerName: string | null;
  board: (string | null)[][];
  rack: string[];
  currentTurn: string | null;
  score: number;
  tileBag: string[];
  players: Player[];
  pendingTiles: PendingTile[];
  livePlacements: LivePlacement[];
  bonusTile: BonusTile | null;
  connectionStatus: 'connected' | 'disconnected';
  showTurnNotification: boolean;
  lastPlayedPositions: Position[];
  timeBonus: number;
  showBlankTileModal: boolean;
  selectedBlankTileIndex: number | null;
  setGameId: (id: string) => void;
  setPlayerId: (id: string) => void;
  setPlayerName: (name: string) => void;
  setBoard: (board: (string | null)[][]) => void;
  setRack: (rack: string[]) => void;
  setCurrentTurn: (playerId: string) => void;
  setScore: (score: number) => void;
  setTileBag: (tiles: string[]) => void;
  setPlayers: (players: Player[]) => void;
  createGame: () => Promise<string>;
  joinGame: (gameId: string) => Promise<void>;
  playTile: (tile: string, position: { x: number; y: number }) => Promise<void>;
  removeTile: (x: number, y: number, letter: string) => Promise<void>;
  submitWord: () => Promise<void>;
  clearPendingTiles: () => void;
  generateBonusTile: () => void;
  reconnectToGame: () => Promise<void>;
  updateLivePlacements: (placements: LivePlacement[]) => Promise<void>;
  closeTurnNotification: () => void;
  addTimeBonus: (bonus: number) => void;
  openBlankTileModal: (index: number) => void;
  closeBlankTileModal: () => void;
  assignLetterToBlankTile: (letter: string) => void;
}

interface Player {
  id: string;
  name: string;
  score: number;
  order_num: number;
  rack?: string[];
  game_id?: string;
}

interface PendingTile {
  x: number;
  y: number;
  letter: string;
}

interface Position {
  x: number;
  y: number;
}

interface LivePlacement {
  x: number;
  y: number;
  letter: string;
  playerId: string;
}

interface BonusTile {
  letter: string;
  multiplier: number;
}

const debug = {
  log: (context: string, message: string, data?: any) => {
    console.log(`[${context}] ${message}`, data ? data : '');
  },
  error: (context: string, message: string, error?: any) => {
    console.error(`[${context}] ${message}`, error ? error : '');
  }
};

let reconnectTimeout: NodeJS.Timeout | null = null;
let channels: { gameChannel: any; playersChannel: any; livePlacementsChannel: any } | null = null;
let reconnectInterval: NodeJS.Timeout | null = null;
let previousTurn: string | null = null;

// Special character to represent blank tile in the rack
export const BLANK_TILE = '_';

export const useGameStore = create<GameState>((set, get) => ({
  gameId: null,
  playerId: null,
  playerName: null,
  board: Array(15).fill(null).map(() => Array(15).fill(null)),
  rack: [],
  currentTurn: null,
  score: 0,
  tileBag: [],
  players: [],
  pendingTiles: [],
  livePlacements: [],
  bonusTile: null,
  connectionStatus: 'connected',
  showTurnNotification: false,
  lastPlayedPositions: [],
  timeBonus: 0,
  showBlankTileModal: false,
  selectedBlankTileIndex: null,
  setGameId: (id) => set({ gameId: id }),
  setPlayerId: (id) => set({ playerId: id }),
  setPlayerName: (name) => set({ playerName: name }),
  setBoard: (board) => set({ board }),
  setRack: (rack) => set({ rack }),
  setCurrentTurn: (playerId) => {
    const { playerId: currentPlayerId } = get();
    const isMyTurn = playerId === currentPlayerId;
    
    // Check if this is a new turn for the current player
    if (isMyTurn && previousTurn !== playerId) {
      set({ showTurnNotification: true });
    }
    
    previousTurn = playerId;
    set({ currentTurn: playerId, timeBonus: 0 });
  },
  setScore: (score) => set({ score }),
  setTileBag: (tiles) => set({ tileBag: tiles }),
  setPlayers: (players) => {
    debug.log('setPlayers', 'Updating players list', players);
    set({ players });
  },
  closeTurnNotification: () => set({ showTurnNotification: false }),
  addTimeBonus: (bonus) => set({ timeBonus: bonus }),
  openBlankTileModal: (index) => set({ showBlankTileModal: true, selectedBlankTileIndex: index }),
  closeBlankTileModal: () => set({ showBlankTileModal: false, selectedBlankTileIndex: null }),
  
  assignLetterToBlankTile: (letter) => {
    const { rack, selectedBlankTileIndex } = get();
    if (selectedBlankTileIndex === null) return;
    
    const newRack = [...rack];
    newRack[selectedBlankTileIndex] = letter;
    
    set({ 
      rack: newRack, 
      showBlankTileModal: false, 
      selectedBlankTileIndex: null 
    });
    
    playSound('TILE_PLACE', 0.4);
  },

  generateBonusTile: () => {
    const letters = Object.keys(LETTER_DISTRIBUTION).filter(letter => letter !== BLANK_TILE);
    const randomLetter = letters[Math.floor(Math.random() * letters.length)];
    
    // 15% chance for blank tile, 55% chance for 2x, 30% chance for 3x
    const randomValue = Math.random();
    let multiplier = 0; // 0 means blank tile
    
    if (randomValue < 0.15) {
      multiplier = 0; // Blank tile (15% chance)
    } else if (randomValue < 0.70) {
      multiplier = 2; // 2x multiplier (55% chance)
    } else {
      multiplier = 3; // 3x multiplier (30% chance)
    }
    
    set({ bonusTile: { letter: randomLetter, multiplier } });
  },

  updateLivePlacements: async (placements: LivePlacement[]) => {
    const { gameId, playerId } = get();
    if (!gameId || !playerId) return;

    try {
      // First, delete all existing placements for this player
      await supabase
        .from('live_placements')
        .delete()
        .eq('game_id', gameId)
        .eq('player_id', playerId);
      
      // Then insert the new placements, but only if there are any
      if (placements.length > 0) {
        // Create a unique set of placements to avoid duplicates
        const uniquePlacements = new Map<string, LivePlacement>();
        
        placements.forEach(placement => {
          const key = `${placement.x}-${placement.y}`;
          uniquePlacements.set(key, placement);
        });
        
        const placementsToInsert = Array.from(uniquePlacements.values());
        
        // Only proceed with insert if we have placements
        if (placementsToInsert.length > 0) {
          try {
            // Use upsert instead of insert to handle potential duplicates
            await supabase
              .from('live_placements')
              .upsert(
                placementsToInsert.map(p => ({
                  game_id: gameId,
                  player_id: p.playerId,
                  x: p.x,
                  y: p.y,
                  letter: p.letter
                })),
                { onConflict: 'game_id,player_id,x,y' }
              );
          } catch (insertError) {
            debug.error('updateLivePlacements', 'Failed to insert live placements', insertError);
            // This is a non-critical error, so we don't need to show it to the user
          }
        }
      }
    } catch (error) {
      debug.error('updateLivePlacements', 'Failed to update live placements', error);
      // Don't show error toast to user as this is non-critical functionality
    }
  },

  reconnectToGame: async () => {
    const { gameId, playerName } = get();
    if (!gameId || !playerName) return;

    debug.log('reconnectToGame', `Attempting to reconnect to game ${gameId}`);
    
    try {
      const { data: game, error: gameError } = await supabase
        .from('games')
        .select('*, players(*)')
        .eq('id', gameId)
        .single();

      if (gameError || !game) {
        debug.error('reconnectToGame', 'Failed to fetch game', gameError);
        return;
      }

      debug.log('reconnectToGame', 'Successfully reconnected to game', game);
      
      set({
        board: game.board_state || Array(15).fill(null).map(() => Array(15).fill(null)),
        currentTurn: game.current_player_id,
        players: game.players,
        connectionStatus: 'connected'
      });

      // Re-establish subscriptions
      setupSubscriptions(gameId);
      
      toast.success('Reconnected to game!', {
        id: 'connection-status',
        duration: 2000
      });
    } catch (error) {
      debug.error('reconnectToGame', 'Failed to reconnect', error);
      set({ connectionStatus: 'disconnected' });
    }
  },

  createGame: async () => {
    const { playerName } = get();
    if (!playerName) throw new Error('Player name is required');

    debug.log('createGame', 'Creating new game for player', playerName);

    const tileBag = generateTileBag();
    const { drawn: initialRack, remaining } = drawTiles(7, tileBag);

    // Replace one random tile with a blank tile (25% chance)
    if (Math.random() < 0.25) {
      const randomIndex = Math.floor(Math.random() * initialRack.length);
      initialRack[randomIndex] = BLANK_TILE;
    }

    const { data: game, error: gameError } = await supabase
      .from('games')
      .insert([{ 
        status: 'waiting', 
        board_state: Array(15).fill(null).map(() => Array(15).fill(null))
      }])
      .select()
      .single();

    if (gameError || !game) {
      debug.error('createGame', 'Failed to create game', gameError);
      throw gameError;
    }

    debug.log('createGame', 'Game created successfully', game);

    const { data: player, error: playerError } = await supabase
      .from('players')
      .insert([{
        name: playerName,
        game_id: game.id,
        rack: initialRack,
        order_num: 1
      }])
      .select()
      .single();

    if (playerError || !player) {
      debug.error('createGame', 'Failed to create player', playerError);
      throw playerError;
    }

    debug.log('createGame', 'Player created successfully', player);

    set({
      gameId: game.id,
      playerId: player.id,
      rack: initialRack,
      tileBag: remaining,
      players: [player],
      currentTurn: player.id,
      showTurnNotification: true
    });

    get().generateBonusTile();
    setupSubscriptions(game.id);
    return game.id;
  },

  joinGame: async (gameId: string) => {
    const { playerName } = get();
    if (!playerName) throw new Error('Player name is required');

    debug.log('joinGame', `Joining game ${gameId} as ${playerName}`);

    const { data: game, error: gameError } = await supabase
      .from('games')
      .select('*, players(*)')
      .eq('id', gameId)
      .single();

    if (gameError || !game) {
      debug.error('joinGame', 'Failed to fetch game', gameError);
      throw gameError;
    }

    debug.log('joinGame', 'Found game', game);

    const playerCount = game.players.length;
    if (playerCount >= 4) throw new Error('Game is full');

    // Check if a player with the same name already exists in this game
    const existingPlayer = game.players.find(p => p.name === playerName);
    if (existingPlayer) {
      // If the player already exists, check if it's the same session
      const existingPlayerId = get().playerId;
      if (existingPlayerId && existingPlayerId === existingPlayer.id) {
        // This is the same player reconnecting, just update the state
        debug.log('joinGame', 'Player already in game, reconnecting', existingPlayer);
        
        const isMyTurn = game.current_player_id === existingPlayer.id;
        
        set({
          gameId,
          playerId: existingPlayer.id,
          board: game.board_state || Array(15).fill(null).map(() => Array(15).fill(null)),
          currentTurn: game.current_player_id,
          players: game.players,
          showTurnNotification: isMyTurn
        });
        
        setupSubscriptions(gameId);
        return;
      } else {
        // Different player with the same name
        toast.error(`A player named "${playerName}" is already in this game. Please choose a different name.`);
        throw new Error('Name already taken');
      }
    }

    const tileBag = generateTileBag();
    const { drawn: initialRack, remaining } = drawTiles(7, tileBag);

    // Replace one random tile with a blank tile (25% chance)
    if (Math.random() < 0.25) {
      const randomIndex = Math.floor(Math.random() * initialRack.length);
      initialRack[randomIndex] = BLANK_TILE;
    }

    const { data: player, error: playerError } = await supabase
      .from('players')
      .insert([{
        name: playerName,
        game_id: gameId,
        rack: initialRack,
        order_num: playerCount + 1
      }])
      .select()
      .single();

    if (playerError || !player) {
      debug.error('joinGame', 'Failed to create player', playerError);
      
      // Check if the error is due to duplicate name
      if (playerError.code === '23505' && playerError.message.includes('players_game_id_name_key')) {
        toast.error(`A player named "${playerName}" is already in this game. Please choose a different name.`);
        throw new Error('Name already taken');
      }
      
      throw playerError;
    }

    debug.log('joinGame', 'Player joined successfully', player);

    const firstPlayerId = game.players[0]?.id;
    if (playerCount + 1 === 4) {
      await supabase
        .from('games')
        .update({ 
          status: 'active',
          current_player_id: firstPlayerId
        })
        .eq('id', gameId);
      
      debug.log('joinGame', 'Game started with all players');
    }

    const isMyTurn = (game.current_player_id || firstPlayerId) === player.id;

    set({
      gameId,
      playerId: player.id,
      board: game.board_state || Array(15).fill(null).map(() => Array(15).fill(null)),
      rack: initialRack,
      tileBag: remaining,
      currentTurn: game.current_player_id || firstPlayerId,
      players: [...game.players, player],
      showTurnNotification: isMyTurn
    });

    get().generateBonusTile();
    setupSubscriptions(gameId);
  },

  playTile: async (tile: string, position: { x: number; y: number }) => {
    const { gameId, playerId, board, rack, currentTurn, pendingTiles } = get();
    if (!gameId || !playerId || currentTurn !== playerId) return;

    debug.log('playTile', `Playing tile ${tile} at position`, position);

    const newBoard = board.map(row => [...row]);
    newBoard[position.y][position.x] = tile;

    const newRack = [...rack];
    const tileIndex = newRack.indexOf(tile);
    if (tileIndex !== -1) {
      newRack.splice(tileIndex, 1);
    }

    const newPendingTiles = [...pendingTiles, { x: position.x, y: position.y, letter: tile }];

    set({ 
      board: newBoard,
      rack: newRack,
      pendingTiles: newPendingTiles
    });

    // Update live placements for other players to see
    await get().updateLivePlacements(
      newPendingTiles.map(tile => ({
        x: tile.x,
        y: tile.y,
        letter: tile.letter,
        playerId
      }))
    );
  },

  removeTile: async (x: number, y: number, letter: string) => {
    const { board, rack, pendingTiles, currentTurn, playerId } = get();
    if (currentTurn !== playerId) return;

    debug.log('removeTile', `Removing tile ${letter} from position`, { x, y });

    const isPending = pendingTiles.some(tile => tile.x === x && tile.y === y);
    if (!isPending) return;

    const newBoard = board.map(row => [...row]);
    newBoard[y][x] = null;

    const newRack = [...rack, letter];
    const newPendingTiles = pendingTiles.filter(tile => !(tile.x === x && tile.y === y));

    set({ 
      board: newBoard,
      rack: newRack,
      pendingTiles: newPendingTiles
    });

    // Update live placements for other players to see
    await get().updateLivePlacements(
      newPendingTiles.map(tile => ({
        x: tile.x,
        y: tile.y,
        letter: tile.letter,
        playerId
      }))
    );
  },

  submitWord: async () => {
    const { gameId, playerId, pendingTiles, board, players, score, currentTurn, bonusTile, timeBonus } = get();
    if (!gameId || !playerId || pendingTiles.length === 0 || currentTurn !== playerId) return;

    debug.log('submitWord', 'Submitting word', pendingTiles);

    // Sort tiles by position (first by row, then by column)
    const sortedTiles = [...pendingTiles].sort((a, b) => {
      if (a.y === b.y) return a.x - b.x;
      return a.y - b.y;
    });

    // Check if tiles are in a line
    const isHorizontal = sortedTiles.every(tile => tile.y === sortedTiles[0].y);
    const isVertical = sortedTiles.every(tile => tile.x === sortedTiles[0].x);
    
    if (!isHorizontal && !isVertical) {
      toast.error('Tiles must be placed in a straight line');
      return;
    }

    // Get all connected words
    const words: { word: string; positions: { x: number; y: number }[] }[] = [];

    if (isHorizontal) {
      // Get the main horizontal word
      const y = sortedTiles[0].y;
      let startX = sortedTiles[0].x;
      let endX = sortedTiles[sortedTiles.length - 1].x;

      // Extend start to include any connected letters to the left
      while (startX > 0 && board[y][startX - 1] !== null) {
        startX--;
      }

      // Extend end to include any connected letters to the right
      while (endX < 14 && board[y][endX + 1] !== null) {
        endX++;
      }

      // Collect the full word
      const positions: { x: number; y: number }[] = [];
      const letters: string[] = [];
      for (let x = startX; x <= endX; x++) {
        const letter = board[y][x];
        if (letter) {
          letters.push(letter);
          positions.push({ x, y });
        }
      }
      words.push({ word: letters.join(''), positions });

      // Check for vertical words formed by each new tile
      sortedTiles.forEach(tile => {
        let startY = tile.y;
        let endY = tile.y;

        // Extend up
        while (startY > 0 && board[startY - 1][tile.x] !== null) {
          startY--;
        }

        // Extend down
        while (endY < 14 && board[endY + 1][tile.x] !== null) {
          endY++;
        }

        if (startY !== endY) {
          const vertPositions: { x: number; y: number }[] = [];
          const vertLetters: string[] = [];
          for (let y = startY; y <= endY; y++) {
            const letter = board[y][tile.x];
            if (letter) {
              vertLetters.push(letter);
              vertPositions.push({ x: tile.x, y });
            }
          }
          words.push({ word: vertLetters.join(''), positions: vertPositions });
        }
      });
    } else {
      // Get the main vertical word
      const x = sortedTiles[0].x;
      let startY = sortedTiles[0].y;
      let endY = sortedTiles[sortedTiles.length - 1].y;

      // Extend start to include any connected letters above
      while (startY > 0 && board[startY - 1][x] !== null) {
        startY--;
      }

      // Extend end to include any connected letters below
      while (endY < 14 && board[endY + 1][x] !== null) {
        endY++;
      }

      // Collect the full word
      const positions: { x: number; y: number }[] = [];
      const letters: string[] = [];
      for (let y = startY; y <= endY; y++) {
        const letter = board[y][x];
        if (letter) {
          letters.push(letter);
          positions.push({ x, y });
        }
      }
      words.push({ word: letters.join(''), positions });

      // Check for horizontal words formed by each new tile
      sortedTiles.forEach(tile => {
        let startX = tile.x;
        let endX = tile.x;

        // Extend left
        while (startX > 0 && board[tile.y][startX - 1] !== null) {
          startX--;
        }

        // Extend right
        while (endX < 14 && board[tile.y][endX + 1] !== null) {
          endX++;
        }

        if (startX !== endX) {
          const horPositions: { x: number; y: number }[] = [];
          const horLetters: string[] = [];
          for (let x = startX; x <= endX; x++) {
            const letter = board[tile.y][x];
            if (letter) {
              horLetters.push(letter);
              horPositions.push({ x, y: tile.y });
            }
          }
          words.push({ word: horLetters.join(''), positions: horPositions });
        }
      });
    }

    // Validate all words
    for (const { word } of words) {
      if (!isValidWord(word)) {
        toast.error(`"${word}" is not a valid word`);
        return;
      }
    }

    // Calculate total score for all words
    let totalScore = 0;
    for (const { word, positions } of words) {
      let wordScore = calculateWordScore(word, positions);
      
      // Apply bonus tile multiplier if used
      if (bonusTile && bonusTile.multiplier > 0 && word.includes(bonusTile.letter)) {
        wordScore *= bonusTile.multiplier;
        toast.success(`Bonus tile ${bonusTile.letter} used! Score multiplied by ${bonusTile.multiplier}x`);
      }
      
      totalScore += wordScore;
    }

    // Add time bonus if available
    if (timeBonus > 0) {
      totalScore += timeBonus;
      toast.success(`Time bonus: +${timeBonus} points!`);
    }

    try {
      const currentPlayerIndex = players.findIndex(p => p.id === currentTurn);
      const nextPlayerIndex = (currentPlayerIndex + 1) % players.length;
      const nextPlayerId = players[nextPlayerIndex].id;

      const { drawn, remaining } = drawTiles(pendingTiles.length, get().tileBag);
      
      // Replace one drawn tile with a blank tile (10% chance)
      if (Math.random() < 0.1 && drawn.length > 0) {
        const randomIndex = Math.floor(Math.random() * drawn.length);
        drawn[randomIndex] = BLANK_TILE;
      }
      
      const newRack = [...get().rack, ...drawn];

      debug.log('submitWord', 'Updating game state', {
        words,
        score: totalScore,
        nextPlayer: nextPlayerId,
        newRack
      });

      // Play word submit sound
      playSound('WORD_SUBMIT', 0.5);

      // Clear live placements when submitting word
      await supabase
        .from('live_placements')
        .delete()
        .eq('player_id', playerId)
        .eq('game_id', gameId);

      // Store the positions of the last played word (main word only)
      const lastPlayedPositions = words[0].positions;

      await Promise.all([
        supabase
          .from('games')
          .update({ 
            board_state: board,
            current_player_id: nextPlayerId,
            last_played_positions: lastPlayedPositions
          })
          .eq('id', gameId),
        supabase
          .from('players')
          .update({ 
            score: score + totalScore,
            rack: newRack
          })
          .eq('id', playerId)
      ]);

      const newPlayers = players.map(player => 
        player.id === playerId 
          ? { ...player, score: player.score + totalScore }
          : player
      );

      set({ 
        players: newPlayers,
        score: score + totalScore,
        pendingTiles: [],
        currentTurn: nextPlayerId,
        rack: newRack,
        tileBag: remaining,
        livePlacements: [],
        lastPlayedPositions,
        timeBonus: 0
      });

      // Generate new bonus tile for next turn
      get().generateBonusTile();

      const timeBonusText = timeBonus > 0 ? ` (+${timeBonus} time bonus)` : '';
      toast.success(`Word${words.length > 1 ? 's' : ''} played for ${totalScore}${timeBonusText} points!`);
    } catch (error) {
      debug.error('submitWord', 'Failed to submit word', error);
      set({ pendingTiles: [] });
    }
  },

  clearPendingTiles: () => {
    const { board, rack, pendingTiles, currentTurn, playerId, gameId } = get();
    if (currentTurn !== playerId) return;
    
    debug.log('clearPendingTiles', 'Clearing pending tiles', pendingTiles);

    const newBoard = board.map(row => [...row]);
    const newRack = [...rack];
    
    pendingTiles.forEach(tile => {
      newBoard[tile.y][tile.x] = null;
      newRack.push(tile.letter);
    });

    // Clear live placements when clearing tiles
    if (gameId && playerId) {
      supabase
        .from('live_placements')
        .delete()
        .eq('player_id', playerId)
        .eq('game_id', gameId)
        .then(() => {
          debug.log('clearPendingTiles', 'Cleared live placements');
        })
        .catch(error => {
          debug.error('clearPendingTiles', 'Failed to clear live placements', error);
        });
    }

    set({
      board: newBoard,
      rack: newRack,
      pendingTiles: [],
      livePlacements: []
    });
  }
}));

function setupSubscriptions(gameId: string) {
  debug.log('setupSubscriptions', `Setting up subscriptions for game ${gameId}`);

  // Clear any existing subscriptions and intervals
  if (channels) {
    channels.gameChannel.unsubscribe();
    channels.playersChannel.unsubscribe();
    if (channels.livePlacementsChannel) {
      channels.livePlacementsChannel.unsubscribe();
    }
  }
  if (reconnectTimeout) {
    clearTimeout(reconnectTimeout);
  }
  if (reconnectInterval) {
    clearInterval(reconnectInterval);
  }

  // Set up automatic reconnection check
  reconnectInterval = setInterval(() => {
    const { connectionStatus, gameId } = useGameStore.getState();
    if (connectionStatus === 'disconnected' && gameId) {
      debug.log('reconnectInterval', 'Attempting to reconnect...');
      useGameStore.getState().reconnectToGame();
    }
  }, 5000); // Check every 5 seconds

  const gameChannel = supabase
    .channel(`game:${gameId}`)
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'games',
      filter: `id=eq.${gameId}`
    }, (payload) => {
      debug.log('gameSubscription', 'Received game update', payload);
      const newGameState = payload.new;
      const { playerId } = useGameStore.getState();
      const isMyTurn = newGameState.current_player_id === playerId;
      
      useGameStore.setState({
        board: newGameState.board_state,
        currentTurn: newGameState.current_player_id,
        connectionStatus: 'connected',
        showTurnNotification: isMyTurn && previousTurn !== newGameState.current_player_id,
        lastPlayedPositions: newGameState.last_played_positions || []
      });
      
      previousTurn = newGameState.current_player_id;
    })
    .subscribe((status, err) => {
      if (status === 'SUBSCRIBED') {
        debug.log('gameSubscription', 'Successfully subscribed to game channel');
        useGameStore.setState({ connectionStatus: 'connected' });
      } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
        debug.error('gameSubscription', `Channel error or closed: ${status}`, err);
        useGameStore.setState({ connectionStatus: 'disconnected' });
      }
    });

  const playersChannel = supabase
    .channel(`game:${gameId}:players`)
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'players',
      filter: `game_id=eq.${gameId}`
    }, async (payload) => {
      debug.log('playersSubscription', 'Received players update', payload);
      const { data } = await supabase
        .from('players')
        .select('*')
        .eq('game_id', gameId)
        .order('order_num');
      
      if (data) {
        debug.log('playersSubscription', 'Updated players list', data);
        useGameStore.setState({ players: data });
      }
    })
    .subscribe((status, err) => {
      if (status === 'SUBSCRIBED') {
        debug.log('playersSubscription', 'Successfully subscribed to players channel');
      } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
        debug.error('playersSubscription', `Channel error or closed: ${status}`, err);
      }
    });

  // Subscribe to live placements
  const livePlacementsChannel = supabase
    .channel(`game:${gameId}:live_placements`)
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'live_placements',
      filter: `game_id=eq.${gameId}`
    }, async (payload) => {
      debug.log('livePlacementsSubscription', 'Received live placements update', payload);
      
      const { data } = await supabase
        .from('live_placements')
        .select('*')
        .eq('game_id', gameId);
      
      if (data) {
        const livePlacements = data.map(p => ({
          x: p.x,
          y: p.y,
          letter: p.letter,
          playerId: p.player_id
        }));
        
        debug.log('livePlacementsSubscription', 'Updated live placements', livePlacements);
        useGameStore.setState({ livePlacements });
      }
    })
    .subscribe((status, err) => {
      if (status === 'SUBSCRIBED') {
        debug.log('livePlacementsSubscription', 'Successfully subscribed to live placements channel');
      } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
        debug.error('livePlacementsSubscription', `Channel error or closed: ${status}`, err);
      }
    });

  channels = { gameChannel, playersChannel, livePlacementsChannel };
}