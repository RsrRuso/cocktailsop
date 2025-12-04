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
      className="relative group bg-transparent w-14 h-14 flex items-center justify-center"
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
    >
      {/* Outer glow */}
      <motion.div
        className="absolute inset-0 rounded-full bg-gradient-to-r from-primary/40 via-purple-500/40 to-cyan-400/40 blur-xl"
        animate={{
          scale: [1, 1.4, 1],
          opacity: [0.4, 0.7, 0.4],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      {/* Fractal Container */}
      <div className="relative w-12 h-12">
        {/* Outermost ring - slow spin */}
        <motion.div
          className="absolute inset-0 rounded-full"
          style={{
            background: "conic-gradient(from 0deg, hsl(var(--primary)), hsl(280, 80%, 60%), hsl(190, 90%, 50%), hsl(var(--primary)))",
          }}
          animate={{ rotate: 360 }}
          transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
        />
        
        {/* First gap ring */}
        <div className="absolute inset-[3px] rounded-full bg-background" />
        
        {/* Second ring - reverse spin */}
        <motion.div
          className="absolute inset-[5px] rounded-full"
          style={{
            background: "conic-gradient(from 180deg, hsl(var(--accent)), hsl(330, 80%, 60%), hsl(45, 90%, 55%), hsl(var(--accent)))",
          }}
          animate={{ rotate: -360 }}
          transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
        />
        
        {/* Second gap ring */}
        <div className="absolute inset-[8px] rounded-full bg-background" />
        
        {/* Third ring - faster spin */}
        <motion.div
          className="absolute inset-[10px] rounded-full"
          style={{
            background: "conic-gradient(from 90deg, hsl(var(--primary)), hsl(200, 90%, 60%), hsl(var(--primary)))",
          }}
          animate={{ rotate: 360 }}
          transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
        />
        
        {/* Third gap ring */}
        <div className="absolute inset-[13px] rounded-full bg-background" />
        
        {/* Fourth ring - reverse faster */}
        <motion.div
          className="absolute inset-[15px] rounded-full"
          style={{
            background: "conic-gradient(from 270deg, hsl(280, 80%, 60%), hsl(var(--accent)), hsl(280, 80%, 60%))",
          }}
          animate={{ rotate: -360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        />
        
        {/* Fourth gap ring */}
        <div className="absolute inset-[17px] rounded-full bg-background" />
        
        {/* Core - pulsing */}
        <motion.div
          className="absolute inset-[19px] rounded-full bg-gradient-to-br from-primary via-purple-500 to-cyan-400"
          animate={{
            scale: [1, 1.15, 1],
            opacity: [0.9, 1, 0.9],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        
        {/* Core inner glow */}
        <motion.div
          className="absolute inset-[21px] rounded-full bg-background/80"
          animate={{
            opacity: [0.6, 0.9, 0.6],
          }}
          transition={{
            duration: 1,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        
        {/* Center dot */}
        <motion.div
          className="absolute inset-[22px] rounded-full bg-gradient-to-r from-primary to-accent"
          animate={{
            scale: [1, 1.3, 1],
          }}
          transition={{
            duration: 0.8,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />

        {/* Floating orbital dots */}
        {[0, 1, 2, 3].map((i) => (
          <motion.div
            key={i}
            className="absolute w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_6px_hsl(var(--primary))]"
            style={{
              top: "50%",
              left: "50%",
              marginTop: "-3px",
              marginLeft: "-3px",
            }}
            animate={{
              x: [
                24 * Math.cos((i * Math.PI) / 2),
                24 * Math.cos((i * Math.PI) / 2 + Math.PI / 2),
                24 * Math.cos((i * Math.PI) / 2 + Math.PI),
                24 * Math.cos((i * Math.PI) / 2 + (3 * Math.PI) / 2),
                24 * Math.cos((i * Math.PI) / 2),
              ],
              y: [
                24 * Math.sin((i * Math.PI) / 2),
                24 * Math.sin((i * Math.PI) / 2 + Math.PI / 2),
                24 * Math.sin((i * Math.PI) / 2 + Math.PI),
                24 * Math.sin((i * Math.PI) / 2 + (3 * Math.PI) / 2),
                24 * Math.sin((i * Math.PI) / 2),
              ],
              opacity: [1, 0.6, 1, 0.6, 1],
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: "linear",
              delay: i * 0.2,
            }}
          />
        ))}
      </div>

      {/* Expanding pulse rings */}
      <motion.div
        className="absolute inset-0 rounded-full border-2 border-primary/50"
        animate={{
          scale: [1, 1.6],
          opacity: [0.5, 0],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeOut",
        }}
      />
      <motion.div
        className="absolute inset-0 rounded-full border border-accent/40"
        animate={{
          scale: [1, 2],
          opacity: [0.3, 0],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeOut",
          delay: 0.7,
        }}
      />
    </motion.button>
  );
};
