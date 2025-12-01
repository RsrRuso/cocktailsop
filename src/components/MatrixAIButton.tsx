import { Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useHaptic } from "@/hooks/useHaptic";
import neuralIcon from "@/assets/neural-network-icon.png";

export const MatrixAIButton = () => {
  const navigate = useNavigate();
  const { lightTap } = useHaptic();

  return (
    <motion.button
      onClick={() => {
        lightTap();
        navigate("/matrix-ai");
      }}
      className="relative group"
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      {/* Animated gradient background */}
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-primary via-accent to-primary bg-[length:200%_100%] animate-[shimmer_3s_ease-in-out_infinite] opacity-50 blur-md group-hover:opacity-75 transition-opacity" />
      
      {/* Glass effect container with 3D braille effect */}
      <div className="relative glass-hover p-2.5 rounded-2xl border border-primary/30 backdrop-blur-xl bg-background/40 shadow-[0_8px_16px_rgba(0,0,0,0.3),inset_0_2px_4px_rgba(255,255,255,0.1),inset_0_-2px_4px_rgba(0,0,0,0.2)]">
        {/* Braille dots pattern - 3D raised effect */}
        <div className="absolute inset-0 rounded-2xl overflow-hidden opacity-20">
          <div className="absolute top-1 left-1 w-1 h-1 rounded-full bg-primary shadow-[0_1px_2px_rgba(0,0,0,0.3),inset_0_-1px_1px_rgba(255,255,255,0.3)]" />
          <div className="absolute top-1 left-3 w-1 h-1 rounded-full bg-primary shadow-[0_1px_2px_rgba(0,0,0,0.3),inset_0_-1px_1px_rgba(255,255,255,0.3)]" />
          <div className="absolute top-3 left-1 w-1 h-1 rounded-full bg-primary shadow-[0_1px_2px_rgba(0,0,0,0.3),inset_0_-1px_1px_rgba(255,255,255,0.3)]" />
          <div className="absolute top-3 left-3 w-1 h-1 rounded-full bg-primary shadow-[0_1px_2px_rgba(0,0,0,0.3),inset_0_-1px_1px_rgba(255,255,255,0.3)]" />
          <div className="absolute top-5 left-1 w-1 h-1 rounded-full bg-primary shadow-[0_1px_2px_rgba(0,0,0,0.3),inset_0_-1px_1px_rgba(255,255,255,0.3)]" />
          <div className="absolute top-5 left-3 w-1 h-1 rounded-full bg-primary shadow-[0_1px_2px_rgba(0,0,0,0.3),inset_0_-1px_1px_rgba(255,255,255,0.3)]" />
          <div className="absolute top-1 right-1 w-1 h-1 rounded-full bg-accent shadow-[0_1px_2px_rgba(0,0,0,0.3),inset_0_-1px_1px_rgba(255,255,255,0.3)]" />
          <div className="absolute top-1 right-3 w-1 h-1 rounded-full bg-accent shadow-[0_1px_2px_rgba(0,0,0,0.3),inset_0_-1px_1px_rgba(255,255,255,0.3)]" />
          <div className="absolute top-3 right-1 w-1 h-1 rounded-full bg-accent shadow-[0_1px_2px_rgba(0,0,0,0.3),inset_0_-1px_1px_rgba(255,255,255,0.3)]" />
          <div className="absolute top-3 right-3 w-1 h-1 rounded-full bg-accent shadow-[0_1px_2px_rgba(0,0,0,0.3),inset_0_-1px_1px_rgba(255,255,255,0.3)]" />
          <div className="absolute top-5 right-1 w-1 h-1 rounded-full bg-accent shadow-[0_1px_2px_rgba(0,0,0,0.3),inset_0_-1px_1px_rgba(255,255,255,0.3)]" />
          <div className="absolute top-5 right-3 w-1 h-1 rounded-full bg-accent shadow-[0_1px_2px_rgba(0,0,0,0.3),inset_0_-1px_1px_rgba(255,255,255,0.3)]" />
        </div>
        
        {/* Neural network icon */}
        <div className="relative">
          {/* Main neural icon with glow effect */}
          <img 
            src={neuralIcon} 
            alt="Neural Network"
            className="w-6 h-6 relative z-10 drop-shadow-[0_0_8px_rgba(59,130,246,0.8)] animate-pulse"
          />
          
          {/* Sparkle effect */}
          <motion.div
            className="absolute -top-1 -right-1"
            animate={{
              scale: [1, 1.2, 1],
              rotate: [0, 180, 360],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          >
            <Sparkles className="w-3 h-3 text-accent" />
          </motion.div>

          {/* Pulsing glow rings */}
          <motion.div
            className="absolute inset-0 rounded-full border border-primary/30"
            animate={{
              scale: [1, 1.5, 1],
              opacity: [0.5, 0, 0.5],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeOut",
            }}
          />
          <motion.div
            className="absolute inset-0 rounded-full border border-accent/30"
            animate={{
              scale: [1, 1.8, 1],
              opacity: [0.3, 0, 0.3],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeOut",
              delay: 0.5,
            }}
          />
        </div>
      </div>

      {/* Floating particles effect */}
      <div className="absolute inset-0 overflow-hidden rounded-2xl pointer-events-none">
        {[...Array(3)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-primary/50 rounded-full"
            style={{
              left: `${30 + i * 20}%`,
              bottom: 0,
            }}
            animate={{
              y: [-40, -60],
              opacity: [0, 1, 0],
              scale: [0, 1, 0],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              delay: i * 0.4,
              ease: "easeOut",
            }}
          />
        ))}
      </div>
    </motion.button>
  );
};
