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
        className="absolute inset-0 bg-white/20 blur-xl"
        style={{ clipPath: "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)" }}
        animate={{
          scale: [1, 1.3, 1],
          opacity: [0.3, 0.6, 0.3],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      {/* Fractal Container */}
      <div className="relative w-12 h-12">
        {/* Outermost hexagon - slow spin */}
        <motion.div
          className="absolute inset-0 border-2 border-white/80"
          style={{ clipPath: "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)" }}
          animate={{ rotate: 360 }}
          transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
        />
        
        {/* Second hexagon - reverse spin */}
        <motion.div
          className="absolute inset-[4px] border-2 border-white/60"
          style={{ clipPath: "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)" }}
          animate={{ rotate: -360 }}
          transition={{ duration: 7, repeat: Infinity, ease: "linear" }}
        />
        
        {/* Third hexagon - faster spin */}
        <motion.div
          className="absolute inset-[8px] border-2 border-white/90"
          style={{ clipPath: "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)" }}
          animate={{ rotate: 360 }}
          transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
        />
        
        {/* Fourth hexagon - reverse faster */}
        <motion.div
          className="absolute inset-[12px] border-2 border-white/70"
          style={{ clipPath: "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)" }}
          animate={{ rotate: -360 }}
          transition={{ duration: 2.5, repeat: Infinity, ease: "linear" }}
        />
        
        {/* Inner diamond - pulsing */}
        <motion.div
          className="absolute inset-[16px] bg-white/90"
          style={{ clipPath: "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)" }}
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.8, 1, 0.8],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />

        {/* Corner triangles */}
        {[0, 60, 120, 180, 240, 300].map((angle, i) => (
          <motion.div
            key={i}
            className="absolute w-1.5 h-1.5 bg-white"
            style={{
              top: "50%",
              left: "50%",
              marginTop: "-3px",
              marginLeft: "-3px",
              clipPath: "polygon(50% 0%, 100% 100%, 0% 100%)",
            }}
            animate={{
              x: [
                22 * Math.cos((angle * Math.PI) / 180),
                22 * Math.cos(((angle + 60) * Math.PI) / 180),
                22 * Math.cos(((angle + 120) * Math.PI) / 180),
                22 * Math.cos(((angle + 180) * Math.PI) / 180),
                22 * Math.cos(((angle + 240) * Math.PI) / 180),
                22 * Math.cos(((angle + 300) * Math.PI) / 180),
                22 * Math.cos((angle * Math.PI) / 180),
              ],
              y: [
                22 * Math.sin((angle * Math.PI) / 180),
                22 * Math.sin(((angle + 60) * Math.PI) / 180),
                22 * Math.sin(((angle + 120) * Math.PI) / 180),
                22 * Math.sin(((angle + 180) * Math.PI) / 180),
                22 * Math.sin(((angle + 240) * Math.PI) / 180),
                22 * Math.sin(((angle + 300) * Math.PI) / 180),
                22 * Math.sin((angle * Math.PI) / 180),
              ],
              rotate: [0, 360],
              opacity: [1, 0.5, 1, 0.5, 1, 0.5, 1],
            }}
            transition={{
              duration: 6,
              repeat: Infinity,
              ease: "linear",
              delay: i * 0.15,
            }}
          />
        ))}
      </div>

      {/* Expanding hexagon pulse */}
      <motion.div
        className="absolute inset-0 border border-white/50"
        style={{ clipPath: "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)" }}
        animate={{
          scale: [1, 1.8],
          opacity: [0.5, 0],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeOut",
        }}
      />
    </motion.button>
  );
};
