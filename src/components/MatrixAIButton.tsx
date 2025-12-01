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
      className="relative group bg-transparent"
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      {/* Neural network icon - 3D bright breathing */}
      <div className="relative">
        {/* 3D depth layers */}
        <img 
          src={neuralIcon} 
          alt="Neural Network"
          className="w-12 h-12 absolute top-[4px] left-[4px] rounded-full opacity-30 blur-[2px] z-0"
        />
        <img 
          src={neuralIcon} 
          alt="Neural Network"
          className="w-12 h-12 absolute top-[2px] left-[2px] rounded-full opacity-50 blur-[1px] z-[1]"
        />
        
        {/* Main neural icon with intense glow and breathing */}
        <motion.img 
          src={neuralIcon} 
          alt="Neural Network"
          className="w-12 h-12 relative z-10 rounded-full drop-shadow-[0_0_24px_rgba(59,130,246,1)] shadow-[0_8px_32px_rgba(59,130,246,0.9),0_0_48px_rgba(147,51,234,0.7)]"
          animate={{
            scale: [1, 1.15, 1],
            filter: [
              "brightness(1.2) drop-shadow(0 0 24px rgba(59,130,246,1))",
              "brightness(1.5) drop-shadow(0 0 36px rgba(147,51,234,1))",
              "brightness(1.2) drop-shadow(0 0 24px rgba(59,130,246,1))"
            ]
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut",
          }}
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
