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

      {/* Matrix rain particles */}
      <div className="absolute inset-0 overflow-hidden rounded-full">
        {[...Array(8)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-0.5 h-2 bg-emerald-400/60"
            style={{
              left: `${(i * 100) / 8}%`,
              top: -10,
            }}
            animate={{
              y: [0, 60, 0],
              opacity: [0, 1, 0],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              delay: i * 0.2,
              ease: "linear",
            }}
          />
        ))}
      </div>

      {/* Brain icon container with breathing */}
      <motion.div
        className="relative w-12 h-12 flex items-center justify-center rounded-full bg-gradient-to-br from-emerald-500/20 to-green-500/20 border-2 border-emerald-500/40 backdrop-blur-sm"
        animate={{
          scale: [1, 1.05, 1],
          borderColor: [
            "rgba(16, 185, 129, 0.4)",
            "rgba(16, 185, 129, 0.8)",
            "rgba(16, 185, 129, 0.4)",
          ],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      >
        {/* Inner pulse */}
        <motion.div
          className="absolute inset-0 rounded-full bg-emerald-500/20"
          animate={{
            scale: [0.8, 1.2, 0.8],
            opacity: [0.5, 0, 0.5],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />

        {/* Brain icon */}
        <motion.div
          animate={{
            rotate: [0, 5, -5, 0],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          <Brain className="w-6 h-6 text-emerald-400 relative z-10" strokeWidth={2.5} />
        </motion.div>

        {/* Glowing dots around brain */}
        {[...Array(4)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-emerald-400 rounded-full"
            style={{
              left: "50%",
              top: "50%",
            }}
            animate={{
              x: [
                0,
                Math.cos((i * Math.PI) / 2) * 20,
                0,
              ],
              y: [
                0,
                Math.sin((i * Math.PI) / 2) * 20,
                0,
              ],
              opacity: [0, 1, 0],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              delay: i * 0.3,
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
