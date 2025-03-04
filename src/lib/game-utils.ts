// Standard Scrabble letter distribution and points
export const LETTER_DISTRIBUTION = {
  A: { count: 9, points: 1 },
  B: { count: 2, points: 3 },
  C: { count: 2, points: 3 },
  D: { count: 4, points: 2 },
  E: { count: 12, points: 1 },
  F: { count: 2, points: 4 },
  G: { count: 3, points: 2 },
  H: { count: 2, points: 4 },
  I: { count: 9, points: 1 },
  J: { count: 1, points: 8 },
  K: { count: 1, points: 5 },
  L: { count: 4, points: 1 },
  M: { count: 2, points: 3 },
  N: { count: 6, points: 1 },
  O: { count: 8, points: 1 },
  P: { count: 2, points: 3 },
  Q: { count: 1, points: 10 },
  R: { count: 6, points: 1 },
  S: { count: 4, points: 1 },
  T: { count: 6, points: 1 },
  U: { count: 4, points: 1 },
  V: { count: 2, points: 4 },
  W: { count: 2, points: 4 },
  X: { count: 1, points: 8 },
  Y: { count: 2, points: 4 },
  Z: { count: 1, points: 10 },
  _: { count: 2, points: 0 } // Blank tile
};

export function generateTileBag(): string[] {
  const tiles: string[] = [];
  Object.entries(LETTER_DISTRIBUTION).forEach(([letter, { count }]) => {
    for (let i = 0; i < count; i++) {
      tiles.push(letter);
    }
  });
  return shuffleArray(tiles);
}

export function drawTiles(count: number, tileBag: string[]): { drawn: string[], remaining: string[] } {
  const drawn = tileBag.slice(0, count);
  const remaining = tileBag.slice(count);
  return { drawn, remaining };
}

function shuffleArray<T>(array: T[]): T[] {
  const newArray = [...array];
  for (let i = newArray.length -  1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}

export function calculateWordScore(word: string, positions: { x: number, y: number }[]): number {
  let score = 0;
  let wordMultiplier = 1;

  positions.forEach((pos, i) => {
    const letter = word[i].toUpperCase();
    // Blank tiles (represented by '_') are worth 0 points
    let letterScore = letter === '_' ? 0 : LETTER_DISTRIBUTION[letter]?.points || 0;

    // Apply letter multipliers
    if (isTripleLetter(pos.x, pos.y)) letterScore *= 3;
    if (isDoubleLetter(pos.x, pos.y)) letterScore *= 2;

    // Collect word multipliers
    if (isTripleWord(pos.x, pos.y)) wordMultiplier *= 3;
    if (isDoubleWord(pos.x, pos.y)) wordMultiplier *= 2;

    score += letterScore;
  });

  return score * wordMultiplier;
}

function isTripleWord(x: number, y: number): boolean {
  return [[0, 0], [0, 7], [0, 14], [7, 0], [7, 14], [14, 0], [14, 7], [14, 14]]
    .some(([cx, cy]) => cx === x && cy === y);
}

function isDoubleWord(x: number, y: number): boolean {
  return [[1, 1], [2, 2], [3, 3], [4, 4], [13, 13], [12, 12], [11, 11], [10, 10]]
    .some(([cx, cy]) => cx === x && cy === y);
}

function isTripleLetter(x: number, y: number): boolean {
  return [[1, 5], [1, 9], [5, 1], [5, 5], [5, 9], [5, 13], [9, 1], [9, 5], [9, 9], [9, 13], [13, 5], [13, 9]]
    .some(([cx, cy]) => cx === x && cy === y);
}

function isDoubleLetter(x: number, y: number): boolean {
  return [[0, 3], [0, 11], [2, 6], [2, 8], [3, 0], [3, 7], [3, 14], [6, 2], [6, 6], [6, 8], [6, 12], [7, 3], [7, 11], [8, 2], [8, 6], [8, 8], [8, 12], [11, 0], [11, 7], [11, 14], [12, 6], [12, 8], [14, 3], [14, 11]]
    .some(([cx, cy]) => cx === x && cy === y);
}