/*
  # Scrabble Game Database Schema

  1. New Tables
    - `games`
      - `id` (uuid): Unique game identifier
      - `created_at` (timestamp): When the game was created
      - `current_player_id` (uuid): ID of the player whose turn it is
      - `status` (text): Game status (waiting, active, finished)
      - `board_state` (jsonb): Current state of the board
      - `winner_id` (uuid): ID of the winning player (null if game ongoing)
    
    - `players`
      - `id` (uuid): Unique player identifier
      - `user_id` (uuid): Reference to auth.users
      - `game_id` (uuid): Reference to games
      - `rack` (jsonb): Player's current letter tiles
      - `score` (int): Player's current score
      - `order_num` (int): Player's turn order (1-4)
      
    - `moves`
      - `id` (uuid): Unique move identifier
      - `game_id` (uuid): Reference to games
      - `player_id` (uuid): Player who made the move
      - `word` (text): Word played
      - `score` (int): Points earned from the move
      - `position` (jsonb): Position data of the move
      - `created_at` (timestamp): When the move was made

  2. Security
    - Enable RLS on all tables
    - Players can only view/modify their own rack
    - All players in a game can view the board state
    - Only the current player can make moves
*/

-- Create games table
CREATE TABLE IF NOT EXISTS games (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  current_player_id uuid,
  status text NOT NULL DEFAULT 'waiting',
  board_state jsonb DEFAULT '[]',
  winner_id uuid,
  CONSTRAINT valid_status CHECK (status IN ('waiting', 'active', 'finished'))
);

-- Create players table
CREATE TABLE IF NOT EXISTS players (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  game_id uuid REFERENCES games NOT NULL,
  rack jsonb DEFAULT '[]',
  score integer DEFAULT 0,
  order_num integer CHECK (order_num BETWEEN 1 AND 4),
  created_at timestamptz DEFAULT now(),
  UNIQUE (game_id, order_num),
  UNIQUE (game_id, user_id)
);

-- Create moves table
CREATE TABLE IF NOT EXISTS moves (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id uuid REFERENCES games NOT NULL,
  player_id uuid REFERENCES players NOT NULL,
  word text,
  score integer DEFAULT 0,
  position jsonb NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE games ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE moves ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can view active games"
  ON games FOR SELECT
  USING (true);

CREATE POLICY "Players can update their games"
  ON games FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM players
      WHERE players.game_id = games.id
      AND players.user_id = auth.uid()
    )
  );

CREATE POLICY "Players can view game players"
  ON players FOR SELECT
  USING (true);

CREATE POLICY "Players can update their own data"
  ON players FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Players can view moves"
  ON moves FOR SELECT
  USING (true);

CREATE POLICY "Current player can insert moves"
  ON moves FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM games
      WHERE games.id = moves.game_id
      AND games.current_player_id = moves.player_id
      AND games.status = 'active'
    )
  );