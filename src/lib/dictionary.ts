import { toast } from 'react-hot-toast';

let dictionary: Set<string> | null = null;
let isLoading = false;
let loadAttempts = 0;
const MAX_LOAD_ATTEMPTS = 3;

// Simplified Scrabble dictionary for testing
const COMMON_WORDS = `BLOG
FOX
DOOR
DOORS
CAT
DOG
HOUSE
COMPUTER
GAME
PLAY
WORD
SCRABBLE
TILE
SCORE
BONUS
BOARD
PLAYER
TURN
LETTER
POINT`.split('\n');

export async function initializeDictionary() {
  if (isLoading) return false;
  if (dictionary) return true;

  isLoading = true;
  loadAttempts++;
  
  try {
    console.log('Loading dictionary...');
    
    // Always set the common words first to ensure basic gameplay works
    dictionary = new Set(COMMON_WORDS);
    console.log(`Basic dictionary loaded with ${dictionary.size} words`);
    
    // Load the full dictionary
    try {
      const response = await fetch('https://raw.githubusercontent.com/redbo/scrabble/master/dictionary.txt');
      if (!response.ok) {
        throw new Error(`Failed to fetch dictionary: ${response.status}`);
      }
      
      const text = await response.text();
      const words = text.split('\n')
        .map(word => word.trim().toUpperCase())
        .filter(word => word.length > 0);
      
      dictionary = new Set([...COMMON_WORDS, ...words]);
      console.log(`Full dictionary loaded with ${dictionary.size} words`);
      toast.success('Full dictionary loaded successfully');
    } catch (error) {
      console.warn('Failed to load full dictionary, falling back to common words:', error);
      
      // If we've tried multiple times and failed, notify the user
      if (loadAttempts >= MAX_LOAD_ATTEMPTS) {
        toast.error('Unable to load full dictionary. Using basic word list instead.');
      } else {
        toast.warning('Using basic word list while trying to load full dictionary...');
      }
    }

    return true;
  } catch (error) {
    console.error('Failed to initialize dictionary:', error);
    toast.error('Failed to load word dictionary');
    return false;
  } finally {
    isLoading = false;
  }
}

export function isValidWord(word: string): boolean {
  if (!dictionary) {
    toast.error('Dictionary not loaded. Please wait...');
    return false; // Block gameplay if dictionary isn't loaded
  }
  const upperWord = word.toUpperCase();
  const isValid = dictionary.has(upperWord);
  console.log(`Checking word: ${upperWord}, Valid: ${isValid}`);
  return isValid;
}

// Add a function to check if a word exists in the dictionary
export function wordExists(word: string): boolean {
  if (!dictionary) return false;
  return dictionary.has(word.toUpperCase());
}