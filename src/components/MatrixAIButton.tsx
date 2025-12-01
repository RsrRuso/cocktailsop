import { Brain, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useHaptic } from "@/hooks/useHaptic";

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
      
      {/* Glass effect container */}
      <div className="relative glass-hover p-2.5 rounded-2xl border border-primary/30 backdrop-blur-xl bg-background/40">
        {/* Brain icon with glow */}
        <div className="relative">
          <Brain className="w-5 h-5 text-primary relative z-10" />
          
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
