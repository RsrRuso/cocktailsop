import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, Volume2, Loader2, Brain } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MatrixVoiceOrbProps {
  isListening: boolean;
  isSpeaking: boolean;
  isProcessing: boolean;
  transcript?: string;
  onToggle: () => void;
  className?: string;
}

export function MatrixVoiceOrb({
  isListening,
  isSpeaking,
  isProcessing,
  transcript,
  onToggle,
  className
}: MatrixVoiceOrbProps) {
  const isActive = isListening || isSpeaking || isProcessing;
  
  return (
    <div className={cn("flex flex-col items-center gap-3", className)}>
      {/* Transcript Display */}
      <AnimatePresence>
        {transcript && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-card/90 backdrop-blur-sm border rounded-lg px-4 py-2 max-w-xs text-center"
          >
            <p className="text-sm text-muted-foreground">{transcript}</p>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Voice Orb Button */}
      <motion.button
        onClick={onToggle}
        disabled={isProcessing}
        className={cn(
          "relative w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300",
          "bg-gradient-to-br shadow-lg",
          isActive 
            ? "from-primary via-primary/80 to-primary/60 shadow-primary/40" 
            : "from-muted via-muted/80 to-muted/60 hover:from-primary hover:via-primary/80 hover:to-primary/60"
        )}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        animate={isActive ? {
          boxShadow: [
            "0 0 20px rgba(var(--primary), 0.3)",
            "0 0 40px rgba(var(--primary), 0.5)",
            "0 0 20px rgba(var(--primary), 0.3)"
          ]
        } : {}}
        transition={{ duration: 1.5, repeat: isActive ? Infinity : 0 }}
      >
        {/* Ripple Effects */}
        {isListening && (
          <>
            <motion.div
              className="absolute inset-0 rounded-full border-2 border-primary"
              animate={{ scale: [1, 1.5], opacity: [0.5, 0] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
            <motion.div
              className="absolute inset-0 rounded-full border-2 border-primary"
              animate={{ scale: [1, 1.5], opacity: [0.5, 0] }}
              transition={{ duration: 1.5, repeat: Infinity, delay: 0.5 }}
            />
          </>
        )}
        
        {/* Speaking Waves */}
        {isSpeaking && (
          <motion.div
            className="absolute inset-0 rounded-full bg-primary/20"
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 0.3, repeat: Infinity }}
          />
        )}
        
        {/* Icon */}
        <div className="relative z-10">
          {isProcessing ? (
            <Loader2 className="w-8 h-8 text-primary-foreground animate-spin" />
          ) : isSpeaking ? (
            <Volume2 className="w-8 h-8 text-primary-foreground animate-pulse" />
          ) : isListening ? (
            <Mic className="w-8 h-8 text-primary-foreground" />
          ) : (
            <Brain className="w-8 h-8 text-foreground" />
          )}
        </div>
      </motion.button>
      
      {/* Status Text */}
      <p className="text-xs text-muted-foreground">
        {isProcessing ? 'Processing...' : 
         isSpeaking ? 'Matrix is speaking...' :
         isListening ? 'Listening... Say "Hey Matrix"' :
         'Tap to activate Matrix'}
      </p>
    </div>
  );
}
