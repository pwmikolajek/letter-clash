/*
  # Add last played positions to games table
  
  1. Changes
     - Add `last_played_positions` column to the `games` table to track the positions of the last played word
     
  2. Purpose
     - This allows highlighting the most recently played word on the board
     - Improves game experience by making it easier to follow gameplay
*/

-- Add last_played_positions column to games table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_name = 'games' AND column_name = 'last_played_positions'
  ) THEN
    ALTER TABLE games ADD COLUMN last_played_positions jsonb DEFAULT '[]';
  END IF;
END $$;