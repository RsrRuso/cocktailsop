import { Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useHaptic } from "@/hooks/useHaptic";
import brainIcon from "@/assets/brain-icon.png";

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
      {/* Brain icon - 3D bright breathing with round light and rotation */}
      <div className="relative">
        {/* Breathing light glow backdrop */}
        <motion.div
          className="absolute inset-0 rounded-full bg-gradient-radial from-primary/40 via-accent/30 to-transparent blur-xl"
          animate={{
            scale: [1.2, 1.8, 1.2],
            opacity: [0.6, 0.9, 0.6],
          }}
          transition={{
            duration: 2.5,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        
        {/* 3D depth layers */}
        <img 
          src={brainIcon} 
          alt="MATRIX AI Brain"
          className="w-12 h-12 absolute top-[4px] left-[4px] rounded-full opacity-30 blur-[2px] z-0"
        />
        <img 
          src={brainIcon} 
          alt="MATRIX AI Brain"
          className="w-12 h-12 absolute top-[2px] left-[2px] rounded-full opacity-50 blur-[1px] z-[1]"
        />
        
        {/* Main brain icon with intense glow, breathing, and rotation */}
        <motion.img 
          src={brainIcon} 
          alt="MATRIX AI Brain"
          className="w-12 h-12 relative z-10 rounded-full drop-shadow-[0_0_24px_rgba(59,130,246,1)] shadow-[0_8px_32px_rgba(59,130,246,0.9),0_0_48px_rgba(147,51,234,0.7)]"
          animate={{
            scale: [1, 1.15, 1],
            rotateY: [0, 360],
            filter: [
              "brightness(1.2) drop-shadow(0 0 24px rgba(59,130,246,1))",
              "brightness(1.5) drop-shadow(0 0 36px rgba(147,51,234,1))",
              "brightness(1.2) drop-shadow(0 0 24px rgba(59,130,246,1))"
            ]
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "linear",
          }}
          style={{ transformStyle: "preserve-3d" }}
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

        {/* Breathing round light rings - Multiple layers */}
        <motion.div
          className="absolute inset-0 rounded-full bg-gradient-to-r from-primary/20 to-accent/20 blur-md"
          animate={{
            scale: [1, 1.4, 1],
            opacity: [0.7, 0.3, 0.7],
          }}
          transition={{
            duration: 2.5,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        <motion.div
          className="absolute inset-0 rounded-full border-2 border-primary/40"
          animate={{
            scale: [1, 1.6, 1],
            opacity: [0.6, 0, 0.6],
          }}
          transition={{
            duration: 2.5,
            repeat: Infinity,
            ease: "easeOut",
          }}
        />
        <motion.div
          className="absolute inset-0 rounded-full border-2 border-accent/40"
          animate={{
            scale: [1, 2, 1],
            opacity: [0.4, 0, 0.4],
          }}
          transition={{
            duration: 2.5,
            repeat: Infinity,
            ease: "easeOut",
            delay: 0.6,
          }}
        />
        
        {/* Outer breathing glow circle */}
        <motion.div
          className="absolute inset-0 rounded-full shadow-[0_0_40px_8px_rgba(59,130,246,0.5)]"
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.8, 0.4, 0.8],
          }}
          transition={{
            duration: 2.5,
            repeat: Infinity,
            ease: "easeInOut",
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
