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
      {/* Brain icon - 3D green neuron glow with breathing */}
      <div className="relative">
        {/* Breathing neuron glow backdrop */}
        <motion.div
          className="absolute inset-0 rounded-full bg-gradient-radial from-emerald-500/50 via-green-400/40 to-transparent blur-xl"
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
        
        {/* 3D depth layers with green tint */}
        <img 
          src={brainIcon} 
          alt="MATRIX AI Brain"
          className="w-12 h-12 absolute top-[4px] left-[4px] rounded-full opacity-30 blur-[2px] z-0"
          style={{ filter: 'hue-rotate(90deg)' }}
        />
        <img 
          src={brainIcon} 
          alt="MATRIX AI Brain"
          className="w-12 h-12 absolute top-[2px] left-[2px] rounded-full opacity-50 blur-[1px] z-[1]"
          style={{ filter: 'hue-rotate(90deg)' }}
        />
        
        {/* Main brain icon with intense green neuron glow */}
        <motion.img 
          src={brainIcon} 
          alt="MATRIX AI Brain"
          className="w-12 h-12 relative z-10 rounded-full drop-shadow-[0_0_24px_rgba(16,185,129,1)] shadow-[0_8px_32px_rgba(16,185,129,0.9),0_0_48px_rgba(34,197,94,0.7)]"
          animate={{
            scale: [1, 1.15, 1],
            rotateY: [0, 15, 0, -15, 0],
            filter: [
              "brightness(1.2) hue-rotate(90deg) drop-shadow(0 0 24px rgba(16,185,129,1))",
              "brightness(1.5) hue-rotate(90deg) drop-shadow(0 0 36px rgba(34,197,94,1))",
              "brightness(1.2) hue-rotate(90deg) drop-shadow(0 0 24px rgba(16,185,129,1))"
            ]
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          style={{ transformStyle: "preserve-3d" }}
        />
        
        {/* Sparkle effect - green */}
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
          <Sparkles className="w-3 h-3 text-emerald-400" />
        </motion.div>

        {/* Breathing neuron light rings - Multiple layers */}
        <motion.div
          className="absolute inset-0 rounded-full bg-gradient-to-r from-emerald-500/20 to-green-400/20 blur-md"
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
          className="absolute inset-0 rounded-full border-2 border-emerald-500/40"
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
          className="absolute inset-0 rounded-full border-2 border-green-400/40"
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
        
        {/* Outer breathing neuron glow circle */}
        <motion.div
          className="absolute inset-0 rounded-full shadow-[0_0_40px_8px_rgba(16,185,129,0.5)]"
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

      {/* Floating neuron/proton particles effect */}
      <div className="absolute inset-0 overflow-hidden rounded-2xl pointer-events-none">
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full"
            style={{
              left: `${20 + i * 15}%`,
              bottom: 0,
              width: i % 2 === 0 ? '3px' : '2px',
              height: i % 2 === 0 ? '3px' : '2px',
              background: i % 2 === 0 
                ? 'radial-gradient(circle, rgba(16,185,129,0.9) 0%, rgba(16,185,129,0.3) 70%, transparent 100%)'
                : 'radial-gradient(circle, rgba(34,197,94,0.8) 0%, rgba(34,197,94,0.2) 70%, transparent 100%)',
              boxShadow: i % 2 === 0 
                ? '0 0 8px 2px rgba(16,185,129,0.6)' 
                : '0 0 6px 1px rgba(34,197,94,0.5)',
            }}
            animate={{
              y: [-40, -70],
              x: [0, (i % 2 === 0 ? 10 : -10)],
              opacity: [0, 1, 0.8, 0],
              scale: [0, 1.2, 1, 0],
            }}
            transition={{
              duration: 2.5,
              repeat: Infinity,
              delay: i * 0.3,
              ease: "easeOut",
            }}
          />
        ))}
        
        {/* Connection lines between particles (neuron synapses) */}
        {[...Array(3)].map((_, i) => (
          <motion.div
            key={`line-${i}`}
            className="absolute h-px origin-left"
            style={{
              left: `${25 + i * 20}%`,
              bottom: '20px',
              width: '20px',
              background: 'linear-gradient(90deg, rgba(16,185,129,0.4) 0%, rgba(34,197,94,0.2) 50%, transparent 100%)',
            }}
            animate={{
              opacity: [0, 0.6, 0],
              scaleX: [0, 1, 0],
              rotate: [0, 15, 0],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              delay: i * 0.5,
              ease: "easeInOut",
            }}
          />
        ))}
      </div>
    </motion.button>
  );
};
