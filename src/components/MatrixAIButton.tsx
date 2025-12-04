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
      {/* Outer glow ring */}
      <motion.div
        className="absolute inset-0 rounded-full bg-gradient-to-r from-primary/30 via-accent/30 to-primary/30 blur-xl"
        animate={{
          scale: [1, 1.3, 1],
          opacity: [0.5, 0.8, 0.5],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      {/* 3D Rotating Engine Container */}
      <div className="relative w-12 h-12" style={{ perspective: "200px" }}>
        {/* Inner rotating cube/engine */}
        <motion.div
          className="absolute inset-0"
          style={{ transformStyle: "preserve-3d" }}
          animate={{
            rotateY: [0, 360],
            rotateX: [0, 15, 0, -15, 0],
          }}
          transition={{
            rotateY: { duration: 4, repeat: Infinity, ease: "linear" },
            rotateX: { duration: 2, repeat: Infinity, ease: "easeInOut" },
          }}
        >
          {/* Front face - Infinity symbol */}
          <motion.div
            className="absolute inset-0 flex items-center justify-center"
            style={{ transform: "translateZ(12px)" }}
          >
            <svg viewBox="0 0 48 24" className="w-10 h-5 drop-shadow-[0_0_12px_rgba(59,130,246,0.9)]">
              <motion.path
                d="M12 12c0-3.3-2.7-6-6-6s-6 2.7-6 6 2.7 6 6 6c2.1 0 4-1.1 5.1-2.7L24 12l6.9 3.3c1.1 1.6 3 2.7 5.1 2.7 3.3 0 6-2.7 6-6s-2.7-6-6-6-6 2.7-6 6c0 .9.2 1.8.6 2.5L24 12l-6.6-2.5c.4-.7.6-1.6.6-2.5z"
                fill="none"
                stroke="url(#infinityGradient)"
                strokeWidth="2.5"
                strokeLinecap="round"
                animate={{
                  pathLength: [0, 1, 1],
                  opacity: [0.8, 1, 0.8],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              />
              <defs>
                <linearGradient id="infinityGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="hsl(var(--primary))" />
                  <stop offset="50%" stopColor="hsl(var(--accent))" />
                  <stop offset="100%" stopColor="hsl(var(--primary))" />
                </linearGradient>
              </defs>
            </svg>
          </motion.div>

          {/* Back face */}
          <motion.div
            className="absolute inset-0 flex items-center justify-center"
            style={{ transform: "translateZ(-12px) rotateY(180deg)" }}
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/60 to-accent/60 blur-[1px]" />
          </motion.div>

          {/* Top face */}
          <motion.div
            className="absolute inset-0 flex items-center justify-center"
            style={{ transform: "rotateX(90deg) translateZ(12px)" }}
          >
            <div className="w-8 h-6 rounded bg-gradient-to-b from-primary/50 to-transparent" />
          </motion.div>

          {/* Bottom face */}
          <motion.div
            className="absolute inset-0 flex items-center justify-center"
            style={{ transform: "rotateX(-90deg) translateZ(12px)" }}
          >
            <div className="w-8 h-6 rounded bg-gradient-to-t from-accent/50 to-transparent" />
          </motion.div>
        </motion.div>

        {/* Orbiting particles */}
        {[...Array(3)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-2 h-2 rounded-full bg-primary shadow-[0_0_8px_rgba(59,130,246,0.8)]"
            style={{
              top: "50%",
              left: "50%",
              marginTop: "-4px",
              marginLeft: "-4px",
            }}
            animate={{
              x: [0, 20 * Math.cos((i * 2 * Math.PI) / 3), 0, -20 * Math.cos((i * 2 * Math.PI) / 3), 0],
              y: [0, 20 * Math.sin((i * 2 * Math.PI) / 3), 0, -20 * Math.sin((i * 2 * Math.PI) / 3), 0],
              scale: [1, 1.2, 1, 0.8, 1],
              opacity: [1, 0.8, 1, 0.8, 1],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              delay: i * 0.3,
              ease: "easeInOut",
            }}
          />
        ))}
      </div>

      {/* Pulsing rings */}
      <motion.div
        className="absolute inset-0 rounded-full border border-primary/40"
        animate={{
          scale: [1, 1.5],
          opacity: [0.6, 0],
        }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: "easeOut",
        }}
      />
      <motion.div
        className="absolute inset-0 rounded-full border border-accent/40"
        animate={{
          scale: [1, 1.8],
          opacity: [0.4, 0],
        }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: "easeOut",
          delay: 0.5,
        }}
      />
    </motion.button>
  );
};
