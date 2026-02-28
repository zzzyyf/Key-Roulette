import { useState, useEffect } from 'react';
import { NOTE_NAMES, CHORD_PATTERNS } from '../constants/midi';

export type ChordRelation = 'tonic' | 'diatonic' | 'other' | 'none';

export function useMidi(midiEnabled: boolean, currentKey: string, theme: 'light' | 'dark') {
  const [activeMidiNotes, setActiveMidiNotes] = useState<Set<number>>(new Set());
  const [detectedChord, setDetectedChord] = useState<string | null>(null);

  // MIDI Logic
  useEffect(() => {
    if (!midiEnabled) {
      setActiveMidiNotes(new Set());
      setDetectedChord(null);
      return;
    }

    let midiAccess: WebMidi.MIDIAccess | null = null;

    const onMIDIMessage = (event: WebMidi.MIDIMessageEvent) => {
      const [status, note, velocity] = event.data;
      const type = status & 0xf0;

      if (type === 0x90 && velocity > 0) { // Note On
        setActiveMidiNotes(prev => {
          const next = new Set(prev);
          next.add(note);
          return next;
        });
      } else if (type === 0x80 || (type === 0x90 && velocity === 0)) { // Note Off
        setActiveMidiNotes(prev => {
          const next = new Set(prev);
          next.delete(note);
          return next;
        });
      }
    };

    const setupMIDI = async () => {
      try {
        midiAccess = await navigator.requestMIDIAccess();
        for (const input of midiAccess.inputs.values()) {
          input.onmidimessage = onMIDIMessage;
        }
      } catch (err) {
        console.error('MIDI access denied', err);
      }
    };

    setupMIDI();

    return () => {
      if (midiAccess) {
        for (const input of midiAccess.inputs.values()) {
          input.onmidimessage = null;
        }
      }
    };
  }, [midiEnabled]);

  // Chord Detection Logic
  useEffect(() => {
    if (activeMidiNotes.size < 2) {
      setDetectedChord(activeMidiNotes.size === 0 ? null : 'n.c.');
      return;
    }

    const notes = Array.from(activeMidiNotes) as number[];
    const bassNote = Math.min(...notes);
    const bassPitch = bassNote % 12;
    
    const pitches = notes.map((n: number) => n % 12);
    const uniquePitches = Array.from(new Set(pitches));
    
    // Put bass pitch first in candidates to prefer it as root
    const otherPitches = uniquePitches.filter(p => p !== bassPitch).sort((a: number, b: number) => a - b);
    const rootCandidates = [bassPitch, ...otherPitches];
    
    // For pattern matching, we still need the sorted unique pitch classes
    const pitchClasses = uniquePitches.sort((a: number, b: number) => a - b);
    
    let foundChord: string | null = null;

    // Try each candidate as root
    for (const root of rootCandidates) {
      const normalized = pitchClasses.map((p: number) => (p - root + 12) % 12).sort((a: number, b: number) => a - b);
      
      for (const [suffix, pattern] of Object.entries(CHORD_PATTERNS)) {
        if (pattern.length === normalized.length && pattern.every((v, i) => v === normalized[i])) {
          foundChord = NOTE_NAMES[root] + suffix;
          break;
        }
      }
      if (foundChord) break;
    }

    setDetectedChord(foundChord || 'n.c.');
  }, [activeMidiNotes]);

  const getChordRelation = (chord: string | null, key: string): ChordRelation => {
    if (!chord || chord === 'n.c.') return 'none';

    const isMinorKey = key.endsWith('m');
    const keyRootName = isMinorKey ? key.slice(0, -1) : key;
    const keyRoot = NOTE_NAMES.indexOf(keyRootName);

    // Tonic check
    if (chord === key) return 'tonic';

    // Diatonic check
    const majorIntervals = [0, 2, 4, 5, 7, 9, 11];
    const minorIntervals = [0, 2, 3, 5, 7, 8, 10];
    const intervals = isMinorKey ? minorIntervals : majorIntervals;
    
    const scalePitches = intervals.map(i => (keyRoot + i) % 12);
    
    // Extract chord root and quality
    let chordRootName = '';
    let chordQuality = '';
    if (chord.length > 1 && (chord[1] === '#' || chord[1] === 'b')) {
      chordRootName = chord.slice(0, 2);
      chordQuality = chord.slice(2);
    } else {
      chordRootName = chord.slice(0, 1);
      chordQuality = chord.slice(1);
    }
    const chordRoot = NOTE_NAMES.indexOf(chordRootName);

    // Check if chord root is in scale
    if (!scalePitches.includes(chordRoot)) return 'other';

    // Check if chord notes are in scale
    const pattern = CHORD_PATTERNS[chordQuality as keyof typeof CHORD_PATTERNS];
    if (!pattern) return 'other';

    const chordPitches = pattern.map(p => (chordRoot + p) % 12);
    const isDiatonic = chordPitches.every(p => scalePitches.includes(p));

    return isDiatonic ? 'diatonic' : 'other';
  };

  const chordRelation = getChordRelation(detectedChord, currentKey);
  
  const chordColorClass = 
    chordRelation === 'tonic' ? (theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600') :
    chordRelation === 'diatonic' ? (theme === 'dark' ? 'text-blue-400' : 'text-blue-600') :
    (theme === 'dark' ? 'text-white/20' : 'text-slate-400/60');

  const chordLedColor = 
    chordRelation === 'tonic' ? '#34d399' :
    chordRelation === 'diatonic' ? '#60a5fa' :
    (theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)');

  return {
    detectedChord,
    chordRelation,
    chordColorClass,
    chordLedColor
  };
}
