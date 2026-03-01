import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Play, Pause, RotateCcw, Plus, Minus, Settings2, Dices, Music, ChevronDown, Check, Languages, Sun, Moon, Piano } from 'lucide-react';
import { useMidi } from './hooks/useMidi';

const MAJORS = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
const MINORS = ['Cm', 'C#m', 'Dm', 'Ebm', 'Em', 'Fm', 'F#m', 'Gm', 'Abm', 'Am', 'Bbm', 'Bm'];

type KeyCategory = 'all' | 'majors' | 'minors';
type Language = 'en' | 'zh';
type Theme = 'light' | 'dark';

const TRANSLATIONS = {
  en: {
    title: 'KEY ROULETTE',
    subtitle: 'Metronome Tool v1.4',
    all: 'All Keys',
    majors: 'Majors',
    minors: 'Minors',
    prepBar: 'Prep Bar',
    nextKey: 'Next Key',
    measure: 'Measure',
    tempo: 'Tempo (BPM)',
    changeEvery: 'Change Every',
    meas: 'MEAS',
    start: 'START',
    stop: 'STOP',
    reset: 'RESET',
    preparing: 'Preparing',
    timeSig: '4/4 Time Signature',
    precision: 'Precision Quartz Timing',
    midi: 'MIDI Input',
    noChord: 'n.c.'
  },
  zh: {
    title: '轮盘调',
    subtitle: '节拍器工具 v1.4',
    all: '所有调性',
    majors: '大调',
    minors: '小调',
    prepBar: '预备小节',
    nextKey: '下个调性',
    measure: '小节',
    tempo: '速度 (BPM)',
    changeEvery: '切换频率',
    meas: '小节',
    start: '开始',
    stop: '停止',
    reset: '重置',
    preparing: '预备中',
    timeSig: '4/4 拍号',
    precision: '石英级精准计时',
    midi: 'MIDI 输入',
    noChord: 'n.c.'
  }
};

export default function App() {
  const [bpm, setBpm] = useState(120);
  const [isPlaying, setIsPlaying] = useState(false);
  const [measuresToChange, setMeasuresToChange] = useState(4);
  const [usePrepBar, setUsePrepBar] = useState(true);
  const [currentBeat, setCurrentBeat] = useState(0);
  const [currentMeasure, setCurrentMeasure] = useState(1);
  const [currentKey, setCurrentKey] = useState('C');
  const [nextKey, setNextKey] = useState('G');
  const [keyCategory, setKeyCategory] = useState<KeyCategory>('all');
  const [language, setLanguage] = useState<Language>('zh');
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'light';
  });
  const [isCategoryMenuOpen, setIsCategoryMenuOpen] = useState(false);
  const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);
  const [isPrepMeasure, setIsPrepMeasure] = useState(false);
  const [midiEnabled, setMidiEnabled] = useState(false);
  
  const { detectedChord, chordRelation, chordColorClass, chordLedColor } = useMidi(midiEnabled, currentKey, theme);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const timerIDRef = useRef<number | null>(null);
  const nextNoteTimeRef = useRef(0);
  const beatRef = useRef(0);
  const measureRef = useRef(1);
  const bpmRef = useRef(bpm);
  const measuresToChangeRef = useRef(measuresToChange);
  const keyCategoryRef = useRef(keyCategory);
  const currentKeyRef = useRef(currentKey);
  const nextKeyRef = useRef(nextKey);
  const isPrepMeasureRef = useRef(false);

  const lookahead = 25.0;
  const scheduleAheadTime = 0.1;

  const t = TRANSLATIONS[language];

  // Sync refs with state
  useEffect(() => { bpmRef.current = bpm; }, [bpm]);
  useEffect(() => { measuresToChangeRef.current = measuresToChange; }, [measuresToChange]);
  useEffect(() => { keyCategoryRef.current = keyCategory; }, [keyCategory]);
  useEffect(() => { currentKeyRef.current = currentKey; }, [currentKey]);
  useEffect(() => { nextKeyRef.current = nextKey; }, [nextKey]);

  const getKeysByCategory = useCallback((cat: KeyCategory) => {
    if (cat === 'majors') return MAJORS;
    if (cat === 'minors') return MINORS;
    return [...MAJORS, ...MINORS];
  }, []);

  const pickNewNextKey = useCallback((excludeKey: string, cat: KeyCategory) => {
    const keys = getKeysByCategory(cat);
    const filtered = keys.filter(k => k !== excludeKey);
    return filtered[Math.floor(Math.random() * filtered.length)];
  }, [getKeysByCategory]);

  const rotateKey = useCallback(() => {
    const incomingKey = nextKeyRef.current;
    const newNext = pickNewNextKey(incomingKey, keyCategoryRef.current);
    
    setCurrentKey(incomingKey);
    setNextKey(newNext);
    
    currentKeyRef.current = incomingKey;
    nextKeyRef.current = newNext;
  }, [pickNewNextKey]);

  // Handle category change
  useEffect(() => {
    if (!isPlaying) {
      const keys = getKeysByCategory(keyCategory);
      const initialKey = keys[Math.floor(Math.random() * keys.length)];
      const secondKey = pickNewNextKey(initialKey, keyCategory);
      setCurrentKey(initialKey);
      setNextKey(secondKey);
      currentKeyRef.current = initialKey;
      nextKeyRef.current = secondKey;
    } else {
      // If measure counter is not at the last bar, update next key immediately
      // If it's the last bar, rotateKey will handle picking from the new category
      if (currentMeasure < measuresToChange || isPrepMeasure) {
        const newNext = pickNewNextKey(currentKey, keyCategory);
        setNextKey(newNext);
        nextKeyRef.current = newNext;
      }
    }
  }, [keyCategory, pickNewNextKey, isPlaying]);

  // Initial mount setup
  useEffect(() => {
    const keys = getKeysByCategory(keyCategory);
    const initialKey = keys[Math.floor(Math.random() * keys.length)];
    const secondKey = pickNewNextKey(initialKey, keyCategory);
    setCurrentKey(initialKey);
    setNextKey(secondKey);
    currentKeyRef.current = initialKey;
    nextKeyRef.current = secondKey;
  }, []); // Only run once on mount

  const nextNote = () => {
    const secondsPerBeat = 60.0 / bpmRef.current;
    nextNoteTimeRef.current += secondsPerBeat;

    beatRef.current++;
    if (beatRef.current > 4) {
      beatRef.current = 1;
      
      if (isPrepMeasureRef.current) {
        isPrepMeasureRef.current = false;
        setIsPrepMeasure(false);
        measureRef.current = 1;
      } else {
        measureRef.current++;
        if (measureRef.current > measuresToChangeRef.current) {
          measureRef.current = 1;
          rotateKey();
        }
      }
      setCurrentMeasure(measureRef.current);
    }
    setCurrentBeat(beatRef.current);
  };

  const scheduleNote = (beatNumber: number, time: number) => {
    if (!audioContextRef.current) return;

    const osc = audioContextRef.current.createOscillator();
    const envelope = audioContextRef.current.createGain();

    osc.frequency.value = beatNumber === 1 ? (isPrepMeasureRef.current ? 1200 : 880) : 440;
    envelope.gain.value = 1;
    envelope.gain.exponentialRampToValueAtTime(1, time + 0.001);
    envelope.gain.exponentialRampToValueAtTime(0.001, time + 0.1);

    osc.connect(envelope);
    envelope.connect(audioContextRef.current.destination);

    osc.start(time);
    osc.stop(time + 0.1);
  };

  const scheduler = () => {
    while (nextNoteTimeRef.current < (audioContextRef.current?.currentTime || 0) + scheduleAheadTime) {
      scheduleNote(beatRef.current + 1, nextNoteTimeRef.current);
      nextNote();
    }
    timerIDRef.current = window.setTimeout(scheduler, lookahead);
  };

  const togglePlay = () => {
    if (!isPlaying) {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      
      if (audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume();
      }

      beatRef.current = 0;
      if (usePrepBar) {
        measureRef.current = 0;
        isPrepMeasureRef.current = true;
        setIsPrepMeasure(true);
      } else {
        measureRef.current = 1;
        isPrepMeasureRef.current = false;
        setIsPrepMeasure(false);
      }
      
      nextNoteTimeRef.current = audioContextRef.current.currentTime + 0.05;
      setIsPlaying(true);
      scheduler();
    } else {
      if (timerIDRef.current) {
        clearTimeout(timerIDRef.current);
      }
      setIsPlaying(false);
      setCurrentBeat(0);
      setCurrentMeasure(1);
      setIsPrepMeasure(false);
      isPrepMeasureRef.current = false;
    }
  };

  const reset = () => {
    const wasPlaying = isPlaying;
    
    // Stop current timers
    if (timerIDRef.current) {
      clearTimeout(timerIDRef.current);
    }
    
    // Reset internal refs and state
    beatRef.current = 0;
    if (usePrepBar) {
      measureRef.current = 0;
      isPrepMeasureRef.current = true;
      setIsPrepMeasure(true);
    } else {
      measureRef.current = 1;
      isPrepMeasureRef.current = false;
      setIsPrepMeasure(false);
    }
    
    setCurrentBeat(0);
    setCurrentMeasure(measureRef.current);
    
    // Re-pick keys for current category
    const keys = getKeysByCategory(keyCategory);
    const initialKey = keys[Math.floor(Math.random() * keys.length)];
    const secondKey = pickNewNextKey(initialKey, keyCategory);
    
    setCurrentKey(initialKey);
    setNextKey(secondKey);
    currentKeyRef.current = initialKey;
    nextKeyRef.current = secondKey;

    if (wasPlaying) {
      // Restart immediately
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      
      if (audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume();
      }

      nextNoteTimeRef.current = audioContextRef.current.currentTime + 0.05;
      setIsPlaying(true);
      scheduler();
    } else {
      setIsPlaying(false);
    }
  };

  useEffect(() => {
    return () => {
      if (timerIDRef.current) clearTimeout(timerIDRef.current);
    };
  }, []);

  const isLastMeasure = currentMeasure === measuresToChange && !isPrepMeasure;

  return (
    <div className={`min-h-screen flex flex-col items-center justify-start sm:justify-center p-4 sm:p-8 pt-6 sm:pt-8 transition-colors duration-500 ${
      theme === 'dark' ? 'bg-[#0a0a0a] text-white' : 'bg-[#f5f5f5] text-slate-900'
    }`}>
      <div className={`fixed inset-0 opacity-10 pointer-events-none transition-opacity duration-500`} 
           style={{ 
             backgroundImage: `radial-gradient(${theme === 'dark' ? '#ffffff' : '#000000'} 1px, transparent 1px)`, 
             backgroundSize: '40px 40px' 
           }} />

      <main className="relative z-10 w-full max-w-2xl">
        {/* Header Section */}
        <div className={`flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 sm:mb-12 landscape:mb-4 border-b pb-6 transition-colors duration-500 ${
          theme === 'dark' ? 'border-white/10' : 'border-slate-200'
        }`}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-emerald-500 flex items-center justify-center shadow-[0_0_20px_rgba(16,185,129,0.3)] relative shrink-0">
              <Dices className="text-black w-5 h-5 sm:w-6 sm:h-6" />
              <Music className="text-black w-2.5 h-2.5 sm:w-3 sm:h-3 absolute bottom-1 right-1" />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-bold tracking-tight leading-tight">{t.title}</h1>
              <p className={`text-[10px] font-mono uppercase tracking-widest transition-colors duration-500 ${
                theme === 'dark' ? 'text-white/40' : 'text-slate-400'
              }`}>{t.subtitle}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto justify-between sm:justify-end">
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setMidiEnabled(!midiEnabled)}
                className={`p-2 rounded-xl border transition-all duration-300 flex items-center gap-2 ${
                  midiEnabled 
                    ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400' 
                    : theme === 'dark' 
                      ? 'bg-white/5 border-white/10 hover:bg-white/10 text-white/60' 
                      : 'bg-slate-200 border-slate-300 hover:bg-slate-300 text-slate-600'
                }`}
                title={t.midi}
              >
                <Piano className="w-4 h-4" />
                {midiEnabled && <span className="hidden sm:inline text-[10px] font-mono font-bold uppercase tracking-wider">ON</span>}
              </button>

              {/* Theme Switcher */}
              <button 
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className={`p-2 rounded-xl border transition-all duration-300 ${
                  theme === 'dark' 
                    ? 'bg-white/5 border-white/10 hover:bg-white/10 text-white/60' 
                    : 'bg-slate-200 border-slate-300 hover:bg-slate-300 text-slate-600'
                }`}
              >
                {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>

              {/* Language Switcher */}
              <div className="relative">
                <button 
                  onClick={() => setIsLangMenuOpen(!isLangMenuOpen)}
                  className={`p-2 rounded-xl border transition-all duration-300 ${
                    theme === 'dark' 
                      ? 'bg-white/5 border-white/10 hover:bg-white/10 text-white/60' 
                      : 'bg-slate-200 border-slate-300 hover:bg-slate-300 text-slate-600'
                  }`}
                >
                  <Languages className="w-4 h-4" />
                </button>
                <AnimatePresence>
                  {isLangMenuOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className={`absolute right-0 mt-2 w-32 border rounded-xl overflow-hidden shadow-2xl z-50 transition-colors duration-500 ${
                        theme === 'dark' ? 'bg-[#1a1a1a] border-white/10' : 'bg-white border-slate-200'
                      }`}
                    >
                      {[
                        { code: 'en', label: 'English' },
                        { code: 'zh', label: '简体中文' }
                      ].map((lang) => (
                        <button
                          key={lang.code}
                          onClick={() => {
                            setLanguage(lang.code as Language);
                            setIsLangMenuOpen(false);
                          }}
                          className={`w-full text-left px-4 py-3 text-xs font-mono transition-colors ${
                            language === lang.code 
                              ? 'bg-emerald-500 text-black' 
                              : theme === 'dark' ? 'hover:bg-white/5 text-white/80' : 'hover:bg-slate-50 text-slate-700'
                          }`}
                        >
                          {lang.label}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Category Menu */}
            <div className="relative">
              <button 
                onClick={() => setIsCategoryMenuOpen(!isCategoryMenuOpen)}
                className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl border transition-all duration-300 text-xs sm:text-sm font-mono uppercase tracking-wider ${
                  theme === 'dark' 
                    ? 'bg-white/5 border-white/10 hover:bg-white/10 text-white/80' 
                    : 'bg-slate-200 border-slate-300 hover:bg-slate-300 text-slate-700'
                }`}
              >
                <span className="max-w-[80px] sm:max-w-none truncate">
                  {keyCategory === 'all' ? t.all : t[keyCategory]}
                </span>
                <ChevronDown className={`w-3 h-3 sm:w-4 sm:h-4 transition-transform shrink-0 ${isCategoryMenuOpen ? 'rotate-180' : ''}`} />
              </button>
              
              <AnimatePresence>
                {isCategoryMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className={`absolute right-0 mt-2 w-40 border rounded-xl overflow-hidden shadow-2xl z-50 transition-colors duration-500 ${
                      theme === 'dark' ? 'bg-[#1a1a1a] border-white/10' : 'bg-white border-slate-200'
                    }`}
                  >
                    {(['all', 'majors', 'minors'] as KeyCategory[]).map((cat) => (
                      <button
                        key={cat}
                        onClick={() => {
                          setKeyCategory(cat);
                          setIsCategoryMenuOpen(false);
                        }}
                        className={`w-full text-left px-4 py-3 text-xs font-mono uppercase tracking-wider transition-colors ${
                          keyCategory === cat 
                            ? 'bg-emerald-500 text-black' 
                            : theme === 'dark' ? 'hover:bg-white/5 text-white/80' : 'hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        {cat === 'all' ? t.all : t[cat]}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Central Key Display */}
        <div className={`relative w-full aspect-square sm:aspect-video landscape:h-[60vh] landscape:min-h-[320px] flex flex-col items-center justify-center mb-6 sm:mb-12 landscape:mb-6 rounded-3xl border overflow-hidden group transition-all duration-500 ${
          theme === 'dark' ? 'bg-white/5 border-white/10 shadow-2xl' : 'bg-white border-slate-200 shadow-none'
        }`}>
          <div className={`absolute inset-0 bg-gradient-to-b from-transparent transition-colors duration-500 ${
            theme === 'dark' ? 'to-black/20' : 'to-slate-100/50'
          }`} />
          
          {/* Next Key Indicator (Top Right) */}
          <div className="absolute top-4 sm:top-6 right-6 sm:right-8 text-right">
            <p className={`text-[9px] sm:text-[10px] font-mono uppercase tracking-widest mb-0.5 sm:mb-1 transition-colors duration-500 ${
              theme === 'dark' ? 'text-white/30' : 'text-slate-400'
            }`}>{t.nextKey}</p>
            <AnimatePresence mode="wait">
              <motion.p
                key={nextKey}
                initial={{ opacity: 0, x: 10 }}
                animate={{ 
                  opacity: 1, 
                  x: 0,
                  scale: isLastMeasure ? 1.4 : 1,
                  color: isLastMeasure ? '#10b981' : (theme === 'dark' ? 'rgba(16, 185, 129, 0.8)' : 'rgba(16, 185, 129, 1)')
                }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ 
                  scale: { type: "spring", stiffness: 300, damping: 20 },
                  opacity: { duration: measuresToChange === 1 ? 0.1 : 0.2 }
                }}
                className="text-lg sm:text-xl font-bold origin-right"
              >
                {nextKey}
              </motion.p>
            </AnimatePresence>
          </div>

          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <AnimatePresence mode="wait">
              <motion.div
                key={isPrepMeasure ? 'prep-' + currentKey : currentKey}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: measuresToChange === 1 ? 0.1 : 0.2 }}
                className="relative z-10 flex flex-col items-center justify-center select-none landscape:-translate-y-6"
              >
                {isPrepMeasure && (
                  <motion.span 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="absolute -top-10 sm:-top-12 text-emerald-500 text-[10px] sm:text-xs font-mono font-bold uppercase tracking-[0.4em] sm:tracking-[0.5em] whitespace-nowrap"
                  >
                    {t.preparing}
                  </motion.span>
                )}
                <div className="relative">
                  <span className={`text-[100px] sm:text-[180px] landscape:text-[110px] font-bold tracking-tighter leading-none transition-all duration-500 ${
                    isPrepMeasure ? 'opacity-20' : 'opacity-100'
                  } ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                    {currentKey}
                  </span>
                  
                  {/* MIDI Status LED (Top Right of Text) */}
                  {midiEnabled && (
                    <div className="absolute -top-1 -right-4 sm:-right-8">
                      <motion.div
                        animate={{ 
                          backgroundColor: chordLedColor,
                          boxShadow: chordRelation !== 'none' ? `0 0 15px ${chordLedColor}` : 'none',
                          scale: chordRelation !== 'none' ? [1, 1.2, 1] : 1
                        }}
                        transition={{ 
                          scale: { repeat: chordRelation !== 'none' ? Infinity : 0, duration: 2 }
                        }}
                        className="w-3 h-3 sm:w-4 sm:h-4 rounded-full border border-white/10"
                      />
                    </div>
                  )}
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Relocated Measure Display (Bottom Center) */}
          <div className="absolute bottom-14 sm:bottom-16 landscape:bottom-14 flex flex-col items-center gap-0.5 sm:gap-1 pt-4 sm:pt-8">
            <p className={`text-[9px] sm:text-[10px] font-mono uppercase tracking-[0.2em] sm:tracking-[0.3em] transition-colors duration-500 ${
              theme === 'dark' ? 'text-white/30' : 'text-slate-400'
            }`}>{t.measure}</p>
            <div className="flex items-baseline gap-1">
              <span className={`text-xl sm:text-2xl font-mono font-bold transition-colors duration-500 ${
                isPrepMeasure ? 'text-emerald-500' : (theme === 'dark' ? 'text-white/90' : 'text-slate-800')
              }`}>
                {isPrepMeasure ? '0' : currentMeasure}
              </span>
              <span className={`text-xs sm:text-sm font-mono transition-colors duration-500 ${
                theme === 'dark' ? 'text-white/20' : 'text-slate-300'
              }`}>/</span>
              <span className={`text-xs sm:text-sm font-mono transition-colors duration-500 ${
                theme === 'dark' ? 'text-white/40' : 'text-slate-400'
              }`}>{measuresToChange}</span>
            </div>
          </div>

          <div className="absolute bottom-6 sm:bottom-8 landscape:bottom-8 left-0 right-0 flex justify-center gap-3 sm:gap-4 px-8">
            {[1, 2, 3, 4].map((b) => (
              <motion.div
                key={b}
                animate={{
                  scale: currentBeat === b ? 1.2 : 1,
                  backgroundColor: currentBeat === b 
                    ? (b === 1 ? '#10b981' : (theme === 'dark' ? '#ffffff' : '#0f172a')) 
                    : (theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'),
                  boxShadow: currentBeat === b ? `0 0 20px ${b === 1 ? 'rgba(16,185,129,0.5)' : (theme === 'dark' ? 'rgba(255,255,255,0.3)' : 'rgba(15,23,42,0.2)')}` : 'none'
                }}
                className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full transition-colors duration-75"
              />
            ))}
          </div>

          {/* MIDI Chord Display */}
          {midiEnabled && (
            <div className="absolute bottom-4 sm:bottom-6 right-6 sm:right-8 text-right">
              <AnimatePresence mode="wait">
                {detectedChord && (
                  <motion.div
                    key={detectedChord}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    className="flex flex-col items-end"
                  >
                    <span className={`text-xl sm:text-2xl font-mono font-bold tracking-tight ${chordColorClass}`}>
                      {detectedChord === 'n.c.' ? t.noChord : detectedChord}
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* Controls Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* BPM Control */}
          <div className={`p-6 rounded-2xl border transition-all duration-500 ${
            theme === 'dark' ? 'bg-white/5 border-white/10' : 'bg-white border-slate-200'
          }`}>
            <div className="flex items-center justify-between mb-4">
              <span className={`text-xs font-mono uppercase tracking-wider transition-colors duration-500 ${
                theme === 'dark' ? 'text-white/40' : 'text-slate-400'
              }`}>{t.tempo}</span>
              <span className="text-2xl font-mono font-bold text-emerald-500">{bpm}</span>
            </div>
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setBpm(Math.max(40, bpm - 1))}
                className={`p-2 rounded-lg border transition-colors duration-300 ${
                  theme === 'dark' ? 'bg-white/5 hover:bg-white/10 border-white/5 text-white' : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-600'
                }`}
              >
                <Minus className="w-5 h-5" />
              </button>
              <input 
                type="range" 
                min="40" 
                max="240" 
                value={bpm} 
                onChange={(e) => setBpm(parseInt(e.target.value))}
                className={`flex-1 accent-emerald-500 h-1.5 rounded-lg appearance-none cursor-pointer transition-colors duration-500 ${
                  theme === 'dark' ? 'bg-white/10' : 'bg-slate-200'
                }`}
              />
              <button 
                onClick={() => setBpm(Math.min(240, bpm + 1))}
                className={`p-2 rounded-lg border transition-colors duration-300 ${
                  theme === 'dark' ? 'bg-white/5 hover:bg-white/10 border-white/5 text-white' : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-600'
                }`}
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Measures Control */}
          <div className={`p-6 rounded-2xl border transition-all duration-500 ${
            theme === 'dark' ? 'bg-white/5 border-white/10' : 'bg-white border-slate-200'
          }`}>
            <div className="flex items-center justify-between mb-4">
              <span className={`text-xs font-mono uppercase tracking-wider transition-colors duration-500 ${
                theme === 'dark' ? 'text-white/40' : 'text-slate-400'
              }`}>{t.changeEvery}</span>
              <span className={`text-2xl font-mono font-bold transition-colors duration-500 ${
                theme === 'dark' ? 'text-white/80' : 'text-slate-800'
              }`}>{measuresToChange} <span className={`text-xs transition-colors duration-500 ${
                theme === 'dark' ? 'text-white/30' : 'text-slate-400'
              }`}>{t.meas}</span></span>
            </div>
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setMeasuresToChange(Math.max(1, measuresToChange - 1))}
                className={`p-2 rounded-lg border transition-colors duration-300 ${
                  theme === 'dark' ? 'bg-white/5 hover:bg-white/10 border-white/5 text-white' : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-600'
                }`}
              >
                <Minus className="w-5 h-5" />
              </button>
              <input 
                type="range" 
                min="1" 
                max="16" 
                value={measuresToChange} 
                onChange={(e) => setMeasuresToChange(parseInt(e.target.value))}
                className={`flex-1 h-1.5 rounded-lg appearance-none cursor-pointer transition-colors duration-500 ${
                  theme === 'dark' ? 'accent-white/40 bg-white/10' : 'accent-slate-400 bg-slate-200'
                }`}
              />
              <button 
                onClick={() => setMeasuresToChange(Math.min(16, measuresToChange + 1))}
                className={`p-2 rounded-lg border transition-colors duration-300 ${
                  theme === 'dark' ? 'bg-white/5 hover:bg-white/10 border-white/5 text-white' : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-600'
                }`}
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Playback Controls */}
        <div className="mt-8 flex flex-wrap sm:flex-nowrap items-start gap-3 sm:gap-4">
          <button
            onClick={togglePlay}
            className={`flex-[2] sm:flex-1 h-16 rounded-2xl flex items-center justify-center gap-3 font-bold text-lg transition-all active:scale-95 ${
              isPlaying 
                ? (theme === 'dark' ? 'bg-white text-black hover:bg-white/90' : 'bg-slate-800 text-white hover:bg-slate-700')
                : 'bg-emerald-500 text-black hover:bg-emerald-400 shadow-[0_0_30px_rgba(16,185,129,0.2)]'
            }`}
          >
            {isPlaying ? (
              <>
                <Pause className="w-6 h-6 fill-current" />
                {t.stop}
              </>
            ) : (
              <>
                <Play className="w-6 h-6 fill-current" />
                {t.start}
              </>
            )}
          </button>
          
          <div className="flex flex-1 sm:flex-none flex-col items-center gap-2">
            <button
              onClick={reset}
              className={`w-full sm:w-16 h-16 rounded-2xl border flex items-center justify-center transition-all active:rotate-180 duration-500 ${
                theme === 'dark' ? 'bg-white/5 border-white/10 hover:bg-white/10 text-white/60' : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-500'
              }`}
            >
              <RotateCcw className="w-6 h-6" />
            </button>
            <span className={`text-[9px] sm:text-[10px] font-mono uppercase tracking-widest transition-colors duration-500 ${
              theme === 'dark' ? 'text-white/30' : 'text-slate-400'
            }`}>{t.reset}</span>
          </div>
          
          <div className="flex flex-1 sm:flex-none flex-col items-center gap-2">
            <button 
              onClick={() => setUsePrepBar(!usePrepBar)}
              className={`w-full sm:w-16 h-16 rounded-2xl border transition-all flex items-center justify-center ${
                usePrepBar 
                  ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400' 
                  : theme === 'dark' ? 'bg-white/5 border-white/10 text-white/40 hover:bg-white/10' : 'bg-white border-slate-200 text-slate-400 hover:bg-slate-50'
              }`}
            >
              <div className={`w-4 h-4 rounded-sm border flex items-center justify-center transition-colors ${usePrepBar ? 'bg-emerald-500 border-emerald-400' : (theme === 'dark' ? 'border-white/20' : 'border-slate-300')}`}>
                {usePrepBar && <Check className="w-3 h-3 text-black" />}
              </div>
            </button>
            <span className={`text-[9px] sm:text-[10px] font-mono uppercase tracking-widest transition-colors duration-500 ${
              theme === 'dark' ? 'text-white/30' : 'text-slate-400'
            }`}>{t.prepBar}</span>
          </div>
        </div>

        {/* Footer Info */}
        <div className={`mt-12 flex flex-col sm:flex-row items-center justify-between gap-4 text-[9px] sm:text-[10px] font-mono uppercase tracking-[0.2em] transition-colors duration-500 ${
          theme === 'dark' ? 'text-white/20' : 'text-slate-300'
        }`}>
          <div className="flex items-center gap-2">
            <Settings2 className="w-3 h-3" />
            <span>{t.timeSig}</span>
          </div>
          <span>{t.precision}</span>
        </div>
      </main>
    </div>
  );
}
