import { useState, useRef, useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

// Extend window for speech recognition types
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

// Wake phrase dictionary with variations
const WAKE_PHRASES = [
  'hey matrix',
  'hi matrix',
  'hello matrix',
  'matrix',
  'are you here babe',
  'hey are you here babe',
  'matrix you there',
  'hey babe',
  'you there matrix',
  'wake up matrix'
];

// Fuzzy match threshold (0-1)
const FUZZY_THRESHOLD = 0.7;

interface MatrixVoiceState {
  isListening: boolean;
  isProcessing: boolean;
  isSpeaking: boolean;
  isWakeMode: boolean;
  transcript: string;
  lastResponse: string;
}

interface UseMatrixVoiceOptions {
  onWake?: () => void;
  onTranscript?: (text: string) => void;
  onResponse?: (response: MatrixResponse) => void;
  autoListen?: boolean;
  toneMode?: 'professional' | 'warm' | 'flirty';
}

export interface MatrixResponse {
  text: string;
  intent?: string;
  data?: any;
  cardType?: 'inventory' | 'document' | 'text';
}

// Levenshtein distance for fuzzy matching
function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

function similarityScore(a: string, b: string): number {
  const distance = levenshteinDistance(a.toLowerCase(), b.toLowerCase());
  const maxLength = Math.max(a.length, b.length);
  return 1 - distance / maxLength;
}

function isWakePhrase(text: string): boolean {
  const normalized = text.toLowerCase().trim();
  
  // Exact match first
  if (WAKE_PHRASES.includes(normalized)) return true;
  
  // Check if text contains a wake phrase
  for (const phrase of WAKE_PHRASES) {
    if (normalized.includes(phrase)) return true;
  }
  
  // Fuzzy match
  for (const phrase of WAKE_PHRASES) {
    if (similarityScore(normalized, phrase) >= FUZZY_THRESHOLD) return true;
  }
  
  return false;
}

// Greeting responses for wake phrases
const WAKE_RESPONSES = {
  professional: [
    "I'm here. What do you need?",
    "Matrix online. How can I assist?",
    "Ready. What's your query?",
    "At your service. What can I help with?"
  ],
  warm: [
    "Hey there! What can I do for you?",
    "I'm here! How can I help?",
    "Ready when you are. What's up?",
    "Right here! What do you need?"
  ],
  flirty: [
    "I'm here, babe. What do you need?",
    "You rang? I'm all yours.",
    "Right here for you. What's on your mind?",
    "Always here when you need me. What's up?"
  ]
};

function getRandomResponse(mode: 'professional' | 'warm' | 'flirty'): string {
  const responses = WAKE_RESPONSES[mode];
  return responses[Math.floor(Math.random() * responses.length)];
}

export function useMatrixVoice(options: UseMatrixVoiceOptions = {}) {
  const { user } = useAuth();
  const { 
    onWake, 
    onTranscript, 
    onResponse, 
    autoListen = true,
    toneMode = 'professional'
  } = options;
  
  const [state, setState] = useState<MatrixVoiceState>({
    isListening: false,
    isProcessing: false,
    isSpeaking: false,
    isWakeMode: true,
    transcript: '',
    lastResponse: ''
  });
  
  const recognitionRef = useRef<any>(null);
  const synthesisRef = useRef<SpeechSynthesisUtterance | null>(null);
  const startTimeRef = useRef<number>(0);
  
  // Initialize speech recognition
  const initRecognition = useCallback(() => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      console.warn('Speech recognition not supported');
      return null;
    }
    
    const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognitionAPI();
    
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    
    return recognition;
  }, []);
  
  // Speak text using Web Speech API
  const speak = useCallback((text: string) => {
    if (!('speechSynthesis' in window)) {
      console.warn('Speech synthesis not supported');
      return;
    }
    
    // Cancel any ongoing speech
    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    
    // Try to get a female voice
    const voices = window.speechSynthesis.getVoices();
    const femaleVoice = voices.find(v => 
      v.name.toLowerCase().includes('female') || 
      v.name.toLowerCase().includes('samantha') ||
      v.name.toLowerCase().includes('victoria') ||
      v.name.toLowerCase().includes('karen')
    );
    if (femaleVoice) {
      utterance.voice = femaleVoice;
    }
    
    utterance.onstart = () => setState(s => ({ ...s, isSpeaking: true }));
    utterance.onend = () => {
      setState(s => ({ ...s, isSpeaking: false }));
      // Resume listening after speaking if auto-listen is on
      if (autoListen && recognitionRef.current) {
        try {
          recognitionRef.current.start();
        } catch (e) {
          // Already running
        }
      }
    };
    
    synthesisRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  }, [autoListen]);
  
  // Log interaction to database
  const logInteraction = useCallback(async (
    intent: string,
    entities: any,
    transcript: string,
    responseSummary: string,
    success: boolean,
    wakePhrase?: string
  ) => {
    if (!user) return;
    
    const responseTimeMs = Date.now() - startTimeRef.current;
    const device = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) 
      ? 'mobile' 
      : 'desktop';
    
    try {
      await supabase.from('matrix_logs').insert({
        user_id: user.id,
        intent,
        entities,
        raw_transcript: transcript,
        response_summary: responseSummary,
        response_time_ms: responseTimeMs,
        device,
        wake_phrase: wakePhrase,
        success
      });
    } catch (e) {
      console.error('Failed to log interaction:', e);
    }
  }, [user]);
  
  // Process voice command through AI
  const processCommand = useCallback(async (command: string) => {
    if (!user || !command.trim()) return;
    
    setState(s => ({ ...s, isProcessing: true }));
    startTimeRef.current = Date.now();
    
    try {
      const { data, error } = await supabase.functions.invoke('matrix-voice-assistant', {
        body: { 
          command,
          userId: user.id,
          toneMode
        }
      });
      
      if (error) throw error;
      
      const response: MatrixResponse = {
        text: data.response || 'I couldn\'t process that request.',
        intent: data.intent,
        data: data.data,
        cardType: data.cardType
      };
      
      setState(s => ({ 
        ...s, 
        isProcessing: false,
        lastResponse: response.text 
      }));
      
      // Speak the response
      speak(response.text);
      
      // Callback
      onResponse?.(response);
      
      // Log success
      await logInteraction(
        data.intent || 'unknown',
        data.entities || {},
        command,
        response.text.substring(0, 200),
        true
      );
      
    } catch (error: any) {
      console.error('Matrix voice error:', error);
      const errorMsg = 'Sorry, I had trouble processing that. Please try again.';
      
      setState(s => ({ ...s, isProcessing: false }));
      speak(errorMsg);
      
      await logInteraction('error', {}, command, error.message, false);
    }
  }, [user, toneMode, speak, onResponse, logInteraction]);
  
  // Handle wake phrase detection and command processing
  const handleTranscript = useCallback((text: string, isFinal: boolean) => {
    setState(s => ({ ...s, transcript: text }));
    onTranscript?.(text);
    
    if (!isFinal) return;
    
    // Check for wake phrase
    if (state.isWakeMode && isWakePhrase(text)) {
      console.log('Wake phrase detected:', text);
      
      // Log wake phrase
      if (user) {
        supabase.from('matrix_wake_phrases').insert({
          user_id: user.id,
          phrase_text: text,
          recognized: true,
          device: /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) ? 'mobile' : 'desktop'
        });
      }
      
      // Respond to wake phrase
      const greeting = getRandomResponse(toneMode);
      speak(greeting);
      
      // Switch to command mode
      setState(s => ({ ...s, isWakeMode: false, transcript: '' }));
      onWake?.();
      
      return;
    }
    
    // If not in wake mode, process as command
    if (!state.isWakeMode && text.trim()) {
      processCommand(text);
      // Reset to wake mode after processing
      setState(s => ({ ...s, isWakeMode: true, transcript: '' }));
    }
  }, [state.isWakeMode, user, toneMode, speak, onWake, onTranscript, processCommand]);
  
  // Start listening
  const startListening = useCallback(() => {
    if (!recognitionRef.current) {
      recognitionRef.current = initRecognition();
    }
    
    if (!recognitionRef.current) {
      toast.error('Speech recognition not supported on this device');
      return;
    }
    
    const recognition = recognitionRef.current;
    
    recognition.onresult = (event) => {
      const current = event.resultIndex;
      const transcript = event.results[current][0].transcript;
      const isFinal = event.results[current].isFinal;
      
      handleTranscript(transcript, isFinal);
    };
    
    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      if (event.error !== 'no-speech' && event.error !== 'aborted') {
        setState(s => ({ ...s, isListening: false }));
      }
    };
    
    recognition.onend = () => {
      // Restart if auto-listen and not speaking
      if (autoListen && !state.isSpeaking) {
        try {
          recognition.start();
        } catch (e) {
          setState(s => ({ ...s, isListening: false }));
        }
      } else {
        setState(s => ({ ...s, isListening: false }));
      }
    };
    
    try {
      recognition.start();
      setState(s => ({ ...s, isListening: true }));
    } catch (e) {
      console.error('Failed to start recognition:', e);
    }
  }, [initRecognition, handleTranscript, autoListen, state.isSpeaking]);
  
  // Stop listening
  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    window.speechSynthesis.cancel();
    setState(s => ({ 
      ...s, 
      isListening: false, 
      isSpeaking: false,
      isWakeMode: true 
    }));
  }, []);
  
  // Toggle listening
  const toggleListening = useCallback(() => {
    if (state.isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [state.isListening, startListening, stopListening]);
  
  // Manual command input (skip wake phrase)
  const sendCommand = useCallback((text: string) => {
    processCommand(text);
  }, [processCommand]);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      window.speechSynthesis.cancel();
    };
  }, []);
  
  return {
    ...state,
    startListening,
    stopListening,
    toggleListening,
    sendCommand,
    speak
  };
}
