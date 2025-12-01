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
      {/* Neural network icon - no frame */}
      <div className="relative">
        {/* Main neural icon with glow effect */}
        <img 
          src={neuralIcon} 
          alt="Neural Network"
          className="w-12 h-12 relative z-10 rounded-full drop-shadow-[0_0_16px_rgba(59,130,246,1)] shadow-[0_6px_24px_rgba(0,0,0,0.8)] animate-pulse"
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
