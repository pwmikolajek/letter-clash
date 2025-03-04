/*
  # Fix live placements table

  This migration checks if the live_placements table exists before creating it,
  and creates policies only if they don't already exist.
*/

-- Check if table exists before creating
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'live_placements') THEN
    CREATE TABLE live_placements (
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
  END IF;
END $$;

-- Create policies only if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT FROM pg_policies WHERE tablename = 'live_placements' AND policyname = 'Public can view live placements') THEN
    CREATE POLICY "Public can view live placements"
      ON live_placements FOR SELECT
      USING (true);
  END IF;

  IF NOT EXISTS (SELECT FROM pg_policies WHERE tablename = 'live_placements' AND policyname = 'Public can create live placements') THEN
    CREATE POLICY "Public can create live placements"
      ON live_placements FOR INSERT
      WITH CHECK (true);
  END IF;

  IF NOT EXISTS (SELECT FROM pg_policies WHERE tablename = 'live_placements' AND policyname = 'Public can update live placements') THEN
    CREATE POLICY "Public can update live placements"
      ON live_placements FOR UPDATE
      USING (true);
  END IF;

  IF NOT EXISTS (SELECT FROM pg_policies WHERE tablename = 'live_placements' AND policyname = 'Public can delete live placements') THEN
    CREATE POLICY "Public can delete live placements"
      ON live_placements FOR DELETE
      USING (true);
  END IF;
END $$;