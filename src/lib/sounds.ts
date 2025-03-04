// Sound utility functions
class SoundManager {
  private audioContext: AudioContext | null = null;
  private soundEnabled = true;
  private audioElements: Record<string, HTMLAudioElement> = {};
  private initialized = false;

  // Sound definitions with local files
  private SOUNDS = {
    TILE_PLACE: '/sounds/tile-place.mp3',
    TURN_NOTIFICATION: '/sounds/turn-notification.mp3',
    WORD_SUBMIT: '/sounds/word-submit.mp3'
  };

  constructor() {
    // Don't create AudioContext until user interaction
    this.initialize = this.initialize.bind(this);
    this.playSound = this.playSound.bind(this);
    this.toggleSound = this.toggleSound.bind(this);
    this.isSoundOn = this.isSoundOn.bind(this);
  }

  // Initialize audio on user interaction
  initialize(): void {
    if (this.initialized) return;
    
    try {
      // Create audio elements for each sound
      Object.entries(this.SOUNDS).forEach(([name, url]) => {
        const audio = new Audio(url);
        audio.preload = 'auto';
        this.audioElements[name] = audio;
        
        // Add event listeners for debugging
        audio.addEventListener('canplaythrough', () => {
          console.log(`Sound ${name} loaded successfully`);
        });
        
        audio.addEventListener('error', (e) => {
          console.warn(`Error loading sound ${name}:`, e);
        });
      });
      
      this.initialized = true;
      console.log('Sound system initialized successfully');
    } catch (error) {
      console.error('Failed to initialize audio system:', error);
    }
  }

  // Play a sound
  playSound(soundName: keyof typeof this.SOUNDS, volume = 0.5): void {
    if (!this.soundEnabled || !this.initialized) return;
    
    try {
      const audio = this.audioElements[soundName];
      if (!audio) {
        console.warn(`Sound ${soundName} not found`);
        return;
      }
      
      // Reset the audio to the beginning if it's already playing
      audio.pause();
      audio.currentTime = 0;
      
      // Set volume and play
      audio.volume = volume;
      
      // Use the play() promise to catch any errors
      const playPromise = audio.play();
      
      if (playPromise !== undefined) {
        playPromise.catch(error => {
          console.warn(`Error playing sound ${soundName}:`, error);
        });
      }
    } catch (error) {
      console.warn(`Failed to play sound ${soundName}:`, error);
    }
  }

  // Toggle sound on/off
  toggleSound(): boolean {
    this.soundEnabled = !this.soundEnabled;
    return this.soundEnabled;
  }

  // Check if sound is enabled
  isSoundOn(): boolean {
    return this.soundEnabled;
  }
}

// Create a singleton instance
const soundManager = new SoundManager();

// Export the methods
export const initAudio = soundManager.initialize;
export const playSound = soundManager.playSound;
export const toggleSound = soundManager.toggleSound;
export const isSoundOn = soundManager.isSoundOn;

// For backward compatibility
export const preloadSounds = async (): Promise<void> => {
  console.log('Sound system ready, will initialize on user interaction');
  return Promise.resolve();
};