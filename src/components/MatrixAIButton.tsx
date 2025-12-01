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
      {/* Brain icon - 3D yellow/amber atomic glow */}
      <div className="relative">
        {/* Breathing atomic glow backdrop */}
        <motion.div
          className="absolute inset-0 rounded-full bg-gradient-radial from-amber-500/50 via-yellow-600/40 to-transparent blur-xl"
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
        
        {/* 3D depth layers with yellow tint */}
        <img 
          src={brainIcon} 
          alt="MATRIX AI Brain"
          className="w-12 h-12 absolute top-[4px] left-[4px] rounded-full opacity-30 blur-[2px] z-0"
          style={{ filter: 'sepia(1) saturate(3) hue-rotate(10deg) brightness(0.9)' }}
        />
        <img 
          src={brainIcon} 
          alt="MATRIX AI Brain"
          className="w-12 h-12 absolute top-[2px] left-[2px] rounded-full opacity-50 blur-[1px] z-[1]"
          style={{ filter: 'sepia(1) saturate(3) hue-rotate(10deg) brightness(0.9)' }}
        />
        
        {/* Main brain icon with intense yellow atomic glow */}
        <motion.img 
          src={brainIcon} 
          alt="MATRIX AI Brain"
          className="w-12 h-12 relative z-10 rounded-full drop-shadow-[0_0_24px_rgba(217,119,6,1)] shadow-[0_8px_32px_rgba(217,119,6,0.9),0_0_48px_rgba(245,158,11,0.7)]"
          animate={{
            scale: [1, 1.15, 1],
            rotateY: [0, 15, 0, -15, 0],
            filter: [
              "sepia(1) saturate(3) hue-rotate(10deg) brightness(1) drop-shadow(0 0 24px rgba(217,119,6,1))",
              "sepia(1) saturate(3) hue-rotate(10deg) brightness(1.3) drop-shadow(0 0 36px rgba(245,158,11,1))",
              "sepia(1) saturate(3) hue-rotate(10deg) brightness(1) drop-shadow(0 0 24px rgba(217,119,6,1))"
            ]
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          style={{ transformStyle: "preserve-3d" }}
        />
        
        {/* Sparkle effect - yellow */}
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
          <Sparkles className="w-3 h-3 text-amber-400" />
        </motion.div>

        {/* Breathing atomic light rings - Multiple layers */}
        <motion.div
          className="absolute inset-0 rounded-full bg-gradient-to-r from-amber-500/20 to-yellow-600/20 blur-md"
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
          className="absolute inset-0 rounded-full border-2 border-amber-500/40"
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
          className="absolute inset-0 rounded-full border-2 border-yellow-600/40"
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
        
        {/* Outer breathing atomic glow circle */}
        <motion.div
          className="absolute inset-0 rounded-full shadow-[0_0_40px_8px_rgba(217,119,6,0.5)]"
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

      {/* Orbiting protons and neutrons - Atomic structure */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Orbital ring 1 - Inner orbit */}
        {[...Array(3)].map((_, i) => (
          <motion.div
            key={`orbit1-${i}`}
            className="absolute rounded-full"
            style={{
              width: '4px',
              height: '4px',
              background: 'radial-gradient(circle, rgba(217,119,6,1) 0%, rgba(217,119,6,0.3) 70%, transparent 100%)',
              boxShadow: '0 0 10px 2px rgba(217,119,6,0.7)',
              left: '50%',
              top: '50%',
            }}
            animate={{
              rotate: [i * 120, i * 120 + 360],
              x: [0, 0],
              y: [0, 0],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "linear",
            }}
          >
            <motion.div
              animate={{
                x: [Math.cos((i * 120 * Math.PI) / 180) * 30],
                y: [Math.sin((i * 120 * Math.PI) / 180) * 30],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: "linear",
              }}
            />
          </motion.div>
        ))}
        
        {/* Orbital ring 2 - Middle orbit */}
        {[...Array(4)].map((_, i) => (
          <motion.div
            key={`orbit2-${i}`}
            className="absolute rounded-full"
            style={{
              width: '3px',
              height: '3px',
              background: 'radial-gradient(circle, rgba(245,158,11,0.9) 0%, rgba(245,158,11,0.3) 70%, transparent 100%)',
              boxShadow: '0 0 8px 1px rgba(245,158,11,0.6)',
              left: '50%',
              top: '50%',
            }}
            animate={{
              rotate: [i * 90, i * 90 + 360],
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: "linear",
            }}
          >
            <motion.div
              animate={{
                x: [Math.cos((i * 90 * Math.PI) / 180) * 40],
                y: [Math.sin((i * 90 * Math.PI) / 180) * 40],
              }}
              transition={{
                duration: 4,
                repeat: Infinity,
                ease: "linear",
              }}
            />
          </motion.div>
        ))}
        
        {/* Orbital ring 3 - Outer orbit */}
        {[...Array(5)].map((_, i) => (
          <motion.div
            key={`orbit3-${i}`}
            className="absolute rounded-full"
            style={{
              width: '2px',
              height: '2px',
              background: 'radial-gradient(circle, rgba(251,191,36,0.8) 0%, rgba(251,191,36,0.2) 70%, transparent 100%)',
              boxShadow: '0 0 6px 1px rgba(251,191,36,0.5)',
              left: '50%',
              top: '50%',
            }}
            animate={{
              rotate: [i * 72, i * 72 + 360],
            }}
            transition={{
              duration: 5,
              repeat: Infinity,
              ease: "linear",
            }}
          >
            <motion.div
              animate={{
                x: [Math.cos((i * 72 * Math.PI) / 180) * 50],
                y: [Math.sin((i * 72 * Math.PI) / 180) * 50],
              }}
              transition={{
                duration: 5,
                repeat: Infinity,
                ease: "linear",
              }}
            />
          </motion.div>
        ))}
        
        {/* Orbital path rings (faint guides) */}
        <motion.div
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-amber-500/10"
          style={{ width: '60px', height: '60px' }}
          animate={{ rotate: 360 }}
          transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
        />
        <motion.div
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-yellow-600/10"
          style={{ width: '80px', height: '80px' }}
          animate={{ rotate: -360 }}
          transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
        />
        <motion.div
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-amber-400/10"
          style={{ width: '100px', height: '100px' }}
          animate={{ rotate: 360 }}
          transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
        />
      </div>
    </motion.button>
  );
};
