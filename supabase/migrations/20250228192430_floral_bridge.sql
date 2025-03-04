/*
  # Create live placements table

  1. New Tables
    - `live_placements`
      - `id` (uuid, primary key)
      - `game_id` (uuid, foreign key to games)
      - `player_id` (uuid, foreign key to players)
      - `x` (integer)
      - `y` (integer)
      - `letter` (text)
      - `created_at` (timestamp)
  2. Security
    - Enable RLS on `live_placements` table
    - Add policy for public access
*/

CREATE TABLE IF NOT EXISTS live_placements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id uuid REFERENCES games NOT NULL,
  player_id uuid REFERENCES players NOT NULL,
  x integer NOT NULL,
  y integer NOT NULL,
  letter text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(game_id, player_id, x, y)
);

ALTER TABLE live_placements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view live placements"
  ON live_placements FOR SELECT
  USING (true);

CREATE POLICY "Public can create live placements"
  ON live_placements FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Public can update live placements"
  ON live_placements FOR UPDATE
  USING (true);

CREATE POLICY "Public can delete live placements"
  ON live_placements FOR DELETE
  USING (true);