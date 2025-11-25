import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import matrixBrainImage from "@/assets/matrix-brain.png";

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

      {/* Brain icon container with ultra-realistic breathing */}
      <motion.div
        className="relative w-12 h-12 flex items-center justify-center rounded-full bg-gradient-to-br from-emerald-500/20 to-green-500/20 border-2 border-emerald-500/40 backdrop-blur-sm shadow-[0_0_20px_rgba(16,185,129,0.4)]"
        style={{ 
          perspective: '1000px',
          transformStyle: 'preserve-3d'
        }}
        animate={{
          scale: [1, 1.15, 0.95, 1.12, 0.98, 1.08, 1],
          borderColor: [
            "rgba(16, 185, 129, 0.4)",
            "rgba(16, 185, 129, 1)",
            "rgba(16, 185, 129, 0.5)",
            "rgba(16, 185, 129, 0.9)",
            "rgba(16, 185, 129, 0.6)",
            "rgba(16, 185, 129, 0.95)",
            "rgba(16, 185, 129, 0.4)",
          ],
          boxShadow: [
            "0 0 20px rgba(16, 185, 129, 0.4)",
            "0 0 35px rgba(16, 185, 129, 0.8)",
            "0 0 25px rgba(16, 185, 129, 0.5)",
            "0 0 40px rgba(16, 185, 129, 0.9)",
            "0 0 20px rgba(16, 185, 129, 0.4)",
          ],
        }}
        transition={{
          duration: 3.5,
          repeat: Infinity,
          ease: [0.42, 0, 0.58, 1],
        }}
      >
        {/* Inner pulse - multi-layer breathing effect */}
        <motion.div
          className="absolute inset-0 rounded-full bg-emerald-500/40"
          animate={{
            scale: [0.6, 1.6, 0.8, 1.5, 0.6],
            opacity: [0.8, 0, 0.5, 0.1, 0.8],
          }}
          transition={{
            duration: 3.5,
            repeat: Infinity,
            ease: [0.42, 0, 0.58, 1],
          }}
        />
        <motion.div
          className="absolute inset-0 rounded-full bg-green-500/30"
          animate={{
            scale: [0.8, 1.3, 0.9, 1.4, 0.8],
            opacity: [0.6, 0.1, 0.7, 0, 0.6],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: [0.42, 0, 0.58, 1],
            delay: 0.5,
          }}
        />

        {/* Realistic 3D brain - breathing with complex 3D movement */}
        <motion.div
          className="relative z-10"
          style={{ 
            transformStyle: 'preserve-3d',
            perspective: '1000px'
          }}
          animate={{
            rotateX: [0, 15, -10, 12, -8, 10, 0],
            rotateY: [0, -20, 15, -18, 12, -15, 0],
            rotateZ: [0, 5, -4, 6, -3, 4, 0],
            scale: [1, 1.08, 0.96, 1.05, 0.98, 1.06, 0.99, 1],
            y: [0, -2, 1, -1, 2, -1, 0],
            z: [0, 20, -10, 15, -5, 10, 0],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: [0.42, 0, 0.58, 1],
          }}
        >
          <img 
            src={matrixBrainImage} 
            alt="MATRIX AI Brain" 
            className="w-8 h-8 object-contain"
            style={{ 
              filter: 'brightness(1.2) contrast(1.1) drop-shadow(0 0 12px rgba(16, 185, 129, 1)) drop-shadow(0 4px 8px rgba(0, 0, 0, 0.5))',
              transform: 'translateZ(20px)'
            }}
          />
        </motion.div>

        {/* Ultra chaotic glowing particles around brain */}
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
