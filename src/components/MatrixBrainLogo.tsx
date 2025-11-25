import { Brain } from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";

export function MatrixBrainLogo() {
  const navigate = useNavigate();

  return (
    <motion.div
      onClick={() => navigate("/matrix-ai")}
      className="relative cursor-pointer group"
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
    >
      {/* Outer glow ring - breathing effect */}
      <motion.div
        className="absolute inset-0 rounded-full bg-gradient-to-r from-emerald-500/30 via-green-500/30 to-emerald-500/30 blur-xl"
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

      {/* Matrix rain particles - chaotic movement */}
      <div className="absolute inset-0 overflow-hidden rounded-full">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-0.5 bg-emerald-400"
            style={{
              left: `${Math.random() * 100}%`,
              top: -10,
              height: `${Math.random() * 15 + 5}px`,
              opacity: Math.random() * 0.8 + 0.2,
            }}
            animate={{
              y: [0, 80, 0],
              x: [0, (Math.random() - 0.5) * 20, 0],
              opacity: [0, Math.random() * 0.8 + 0.2, 0],
            }}
            transition={{
              duration: Math.random() * 2 + 1,
              repeat: Infinity,
              delay: Math.random() * 2,
              ease: "linear",
            }}
          />
        ))}
      </div>

      {/* Brain icon container with realistic breathing */}
      <motion.div
        className="relative w-12 h-12 flex items-center justify-center rounded-full bg-gradient-to-br from-emerald-500/20 to-green-500/20 border-2 border-emerald-500/40 backdrop-blur-sm"
        animate={{
          scale: [1, 1.12, 0.98, 1.08, 1],
          borderColor: [
            "rgba(16, 185, 129, 0.4)",
            "rgba(16, 185, 129, 1)",
            "rgba(16, 185, 129, 0.6)",
            "rgba(16, 185, 129, 0.9)",
            "rgba(16, 185, 129, 0.4)",
          ],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: [0.45, 0.05, 0.55, 0.95],
        }}
      >
        {/* Inner pulse - breathing effect */}
        <motion.div
          className="absolute inset-0 rounded-full bg-emerald-500/30"
          animate={{
            scale: [0.7, 1.4, 0.7],
            opacity: [0.7, 0, 0.7],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: [0.45, 0.05, 0.55, 0.95],
          }}
        />

        {/* Brain icon - breathing and subtle rotation */}
        <motion.div
          animate={{
            rotate: [0, 3, -3, 2, -2, 0],
            scale: [1, 1.05, 0.98, 1.03, 1],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: [0.45, 0.05, 0.55, 0.95],
          }}
        >
          <Brain className="w-6 h-6 text-emerald-400 relative z-10 drop-shadow-[0_0_8px_rgba(16,185,129,0.8)]" strokeWidth={2.5} />
        </motion.div>

        {/* Chaotic glowing particles around brain */}
        {[...Array(12)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-emerald-400 rounded-full blur-[0.5px]"
            style={{
              left: "50%",
              top: "50%",
            }}
            animate={{
              x: [
                0,
                Math.cos((i * Math.PI * 2) / 12) * (Math.random() * 15 + 15),
                Math.cos(((i + Math.random() * 3) * Math.PI * 2) / 12) * (Math.random() * 10 + 10),
                0,
              ],
              y: [
                0,
                Math.sin((i * Math.PI * 2) / 12) * (Math.random() * 15 + 15),
                Math.sin(((i + Math.random() * 3) * Math.PI * 2) / 12) * (Math.random() * 10 + 10),
                0,
              ],
              opacity: [0, 1, 0.7, 0],
              scale: [0, 1.5, 1, 0],
            }}
            transition={{
              duration: Math.random() * 2 + 2,
              repeat: Infinity,
              delay: Math.random() * 2,
              ease: "easeInOut",
            }}
          />
        ))}
      </motion.div>

      {/* Matrix text effect on hover */}
      <motion.div
        className="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] font-mono text-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity"
        initial={{ opacity: 0 }}
      >
        <motion.span
          animate={{
            opacity: [0.5, 1, 0.5],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
          }}
        >
          MATRIX AI
        </motion.span>
      </motion.div>
    </motion.div>
  );
}
