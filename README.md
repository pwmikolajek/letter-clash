# Scrabble Online Game

A real-time multiplayer Scrabble-like word game built with React, TypeScript, and Supabase.

<img width="1245" alt="Game" src="https://github.com/user-attachments/assets/b72cbc9e-483f-4d9f-8d92-934f116c19fa" />
<img width="1354" alt="Login screen" src="https://github.com/user-attachments/assets/5adcb7a4-c00c-43a4-851c-873f85d6a68f" />


## Features

- **Real-time Multiplayer**: Play with up to 4 players simultaneously
- **Live Tile Placements**: See other players' moves in real-time
- **Bonus Tiles**: Special tiles with 2x and 3x multipliers
- **Time Bonus System**: Earn extra points for quick plays
- **Dictionary Validation**: Words are validated against a Scrabble dictionary
- **Responsive Design**: Optimized for desktop and tablet screens
- **Sound Effects**: Immersive audio feedback for game actions

## Tech Stack

- **Frontend**: React, TypeScript, Tailwind CSS
- **State Management**: Zustand
- **Backend**: Supabase (PostgreSQL, Realtime subscriptions)
- **Drag and Drop**: React DnD
- **UI Components**: Custom components with Lucide React icons
- **Notifications**: React Hot Toast

## Game Rules

1. **Setup**: Each player receives 7 random letter tiles
2. **Gameplay**: Players take turns placing tiles on the board to form words
3. **Scoring**: Points are awarded based on:
   - Letter values
   - Board multipliers (Double Letter, Triple Letter, Double Word, Triple Word)
   - Bonus tiles (2x or 3x multipliers)
   - Time bonus (faster plays earn more points)
4. **Winning**: The player with the highest score at the end wins

## Special Tiles

- **Blank Tiles**: Can represent any letter (worth 0 points)
- **Bonus Tiles**: Special tiles that multiply word scores:
  - 2x Bonus: Doubles the score of a word containing this letter
  - 3x Bonus: Triples the score of a word containing this letter

## Development

### Prerequisites

- Node.js (v16+)
- npm or yarn
- Supabase account

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/scrabble-online.git
   cd scrabble-online
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   Create a `.env` file with your Supabase credentials:
   ```
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. Run the development server:
   ```bash
   npm run dev
   ```

### Database Setup

The game requires several tables in Supabase:

- `games`: Stores game state, board configuration, and current player
- `players`: Stores player information, scores, and tile racks
- `moves`: Records each move made in the game
- `live_placements`: Tracks real-time tile placements before submission

Migration files are included in the `supabase/migrations` directory.

## Deployment

The game can be deployed to any static hosting service:

1. Build the project:
   ```bash
   npm run build
   ```

2. Deploy the contents of the `dist` directory to your hosting provider

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Scrabble dictionary from [SOWPODS](https://github.com/redbo/scrabble)
- Game design inspired by the classic Scrabble board game
- Sound effects from [OpenGameArt.org](https://opengameart.org/)
