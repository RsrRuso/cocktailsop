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
      {/* Outer glow ring - realistic breathing */}
      <motion.div
        className="absolute inset-0 rounded-full bg-gradient-to-r from-emerald-500/30 via-green-500/30 to-emerald-500/30 blur-xl"
        animate={{
          scale: [1, 1.4, 1.2, 1.5, 1],
          opacity: [0.3, 0.8, 0.5, 0.7, 0.3],
          rotate: [0, 360],
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: [0.42, 0, 0.58, 1],
        }}
      />

      {/* Matrix rain particles - ultra chaotic movement */}
      <div className="absolute inset-0 overflow-hidden rounded-full">
        {[...Array(35)].map((_, i) => {
          const randomX = (Math.random() - 0.5) * 40;
          const randomRotate = Math.random() * 360;
          return (
            <motion.div
              key={i}
              className="absolute w-0.5 bg-emerald-400 shadow-[0_0_6px_rgba(16,185,129,0.8)]"
              style={{
                left: `${Math.random() * 100}%`,
                top: -15,
                height: `${Math.random() * 20 + 3}px`,
              }}
              animate={{
                y: [0, 90, 0],
                x: [0, randomX, -randomX / 2, 0],
                opacity: [0, Math.random() * 0.9 + 0.1, Math.random() * 0.6, 0],
                rotate: [0, randomRotate, -randomRotate / 2, 0],
              }}
              transition={{
                duration: Math.random() * 1.5 + 0.8,
                repeat: Infinity,
                delay: Math.random() * 2.5,
                ease: "easeInOut",
              }}
            />
          );
        })}
      </div>

      {/* Small circular breathing space with chaotic particles */}
      <motion.div
        className="relative w-10 h-10 flex items-center justify-center rounded-full bg-transparent border border-emerald-500/30"
      >
        {/* Ultra chaotic glowing particles */}
        {[...Array(25)].map((_, i) => {
          const angle1 = (i * Math.PI * 2) / 25;
          const angle2 = ((i + Math.random() * 8) * Math.PI * 2) / 25;
          const angle3 = ((i - Math.random() * 6) * Math.PI * 2) / 25;
          const radius1 = Math.random() * 20 + 18;
          const radius2 = Math.random() * 15 + 12;
          const radius3 = Math.random() * 25 + 10;
          
          return (
            <motion.div
              key={i}
              className="absolute w-1 h-1 bg-emerald-400 rounded-full blur-[0.5px] shadow-[0_0_4px_rgba(16,185,129,1)]"
              style={{
                left: "50%",
                top: "50%",
              }}
              animate={{
                x: [
                  0,
                  Math.cos(angle1) * radius1,
                  Math.cos(angle2) * radius2,
                  Math.cos(angle3) * radius3,
                  Math.cos(angle1) * (radius1 * 0.7),
                  0,
                ],
                y: [
                  0,
                  Math.sin(angle1) * radius1,
                  Math.sin(angle2) * radius2,
                  Math.sin(angle3) * radius3,
                  Math.sin(angle1) * (radius1 * 0.7),
                  0,
                ],
                opacity: [0, 1, 0.8, 0.6, 0.9, 0],
                scale: [0, 2, 1.5, 1.8, 1.2, 0],
              }}
              transition={{
                duration: Math.random() * 2.5 + 1.5,
                repeat: Infinity,
                delay: Math.random() * 3,
                ease: [0.42, 0, 0.58, 1],
              }}
            />
          );
        })}
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
