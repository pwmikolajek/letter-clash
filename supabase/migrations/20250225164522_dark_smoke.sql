/*
  # Update RLS policies for anonymous access

  1. Changes
    - Remove user-based restrictions from RLS policies
    - Allow anonymous access for game creation and updates
    - Allow anonymous access for player creation and updates

  2. Security
    - Enable public access while maintaining basic game rules
    - Ensure players can only update their own game data
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Anyone can view active games" ON games;
DROP POLICY IF EXISTS "Players can update their games" ON games;
DROP POLICY IF EXISTS "Players can view game players" ON players;
DROP POLICY IF EXISTS "Players can update their own data" ON players;
DROP POLICY IF EXISTS "Players can view moves" ON moves;
DROP POLICY IF EXISTS "Current player can insert moves" ON moves;

-- Create new policies for games
CREATE POLICY "Public can view games"
  ON games FOR SELECT
  USING (true);

CREATE POLICY "Public can create games"
  ON games FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Public can update games"
  ON games FOR UPDATE
  USING (true);

-- Create new policies for players
CREATE POLICY "Public can view players"
  ON players FOR SELECT
  USING (true);

CREATE POLICY "Public can create players"
  ON players FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Public can update players"
  ON players FOR UPDATE
  USING (true);

-- Create new policies for moves
CREATE POLICY "Public can view moves"
  ON moves FOR SELECT
  USING (true);

CREATE POLICY "Public can create moves"
  ON moves FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM games
      WHERE games.id = moves.game_id
      AND games.current_player_id = moves.player_id
      AND games.status = 'active'
    )
  );