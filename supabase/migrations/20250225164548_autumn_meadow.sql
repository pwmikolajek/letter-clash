/*
  # Update players table for name-based system

  1. Changes
    - Remove user_id column (no longer using authentication)
    - Add name column for player names
    - Update foreign key constraints

  2. Security
    - Maintain existing RLS policies
    - Keep game integrity checks
*/

-- Modify players table
ALTER TABLE players
  DROP CONSTRAINT players_user_id_fkey,
  DROP COLUMN user_id,
  ADD COLUMN name text NOT NULL;

-- Update unique constraint
ALTER TABLE players
  DROP CONSTRAINT IF EXISTS players_game_id_user_id_key,
  ADD CONSTRAINT players_game_id_name_key UNIQUE (game_id, name);