export const NOTE_NAMES = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];

export const CHORD_PATTERNS = {
  '': [0, 4, 7],         // Major
  'm': [0, 3, 7],        // Minor
  'dim': [0, 3, 6],      // Diminished
  'aug': [0, 4, 8],      // Augmented
  '7': [0, 4, 7, 10],    // Dominant 7
  'maj7': [0, 4, 7, 11], // Major 7
  'm7': [0, 3, 7, 10],   // Minor 7
  'm7b5': [0, 3, 6, 10], // Half-diminished
  'sus4': [0, 5, 7],     // Sus4
  'sus2': [0, 2, 7],     // Sus2
  '5': [0, 7],           // Power Chord
};
