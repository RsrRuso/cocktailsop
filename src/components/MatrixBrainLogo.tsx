import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";

export function MatrixBrainLogo() {
  const navigate = useNavigate();
  
  // Matrix code characters
  const matrixChars = ['0', '1', 'ア', 'イ', 'ウ', 'エ', 'オ', 'カ', 'キ', 'ク'];

  return (
    <motion.div
      onClick={() => navigate("/matrix-ai")}
      className="relative cursor-pointer group"
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
    >
      {/* Outer pulsing rings - Multiple layers */}
      <motion.div
        className="absolute inset-0 rounded-full"
        style={{
          background: "radial-gradient(circle, rgba(16,185,129,0.3) 0%, transparent 70%)",
        }}
        animate={{
          scale: [1, 1.6, 1.3, 1.7, 1],
          opacity: [0.4, 0.9, 0.6, 0.8, 0.4],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
      
      <motion.div
        className="absolute inset-0 rounded-full border-2 border-emerald-500/40"
        animate={{
          scale: [1, 1.8, 1],
          opacity: [0.6, 0, 0.6],
          rotate: [0, 180, 360],
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: "linear",
        }}
      />

      {/* Matrix rain particles - Enhanced with characters */}
      <div className="absolute inset-0 overflow-hidden rounded-full pointer-events-none">
        {[...Array(50)].map((_, i) => {
          const randomX = (Math.random() - 0.5) * 40;
          const randomChar = matrixChars[Math.floor(Math.random() * matrixChars.length)];
          const isText = Math.random() > 0.5;
          
          return (
            <motion.div
              key={i}
              className={`absolute text-emerald-400 font-mono text-xs ${!isText ? 'w-0.5 bg-emerald-400' : ''}`}
              style={{
                left: `${Math.random() * 100}%`,
                top: -15,
                height: isText ? 'auto' : `${Math.random() * 20 + 3}px`,
                textShadow: isText ? '0 0 8px rgba(16,185,129,0.9)' : undefined,
              }}
              animate={{
                y: [0, 90, 0],
                x: [0, randomX, -randomX / 2, 0],
                opacity: [0, Math.random() * 0.9 + 0.3, Math.random() * 0.6, 0],
              }}
              transition={{
                duration: Math.random() * 1.8 + 0.9,
                repeat: Infinity,
                delay: Math.random() * 3,
                ease: "easeInOut",
              }}
            >
              {isText ? randomChar : ''}
            </motion.div>
          );
        })}
      </div>

      {/* Center core with breathing effect */}
      <motion.div
        className="relative w-10 h-10 flex items-center justify-center rounded-full bg-black/40 border-2 border-emerald-500/50 backdrop-blur-sm"
        animate={{
          borderColor: ['rgba(16,185,129,0.5)', 'rgba(16,185,129,1)', 'rgba(16,185,129,0.5)'],
          boxShadow: [
            '0 0 10px rgba(16,185,129,0.5)',
            '0 0 30px rgba(16,185,129,0.9)',
            '0 0 10px rgba(16,185,129,0.5)',
          ],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      >
        {/* Electric particles orbiting the center */}
        {[...Array(40)].map((_, i) => {
          const angle1 = (i * Math.PI * 2) / 40;
          const angle2 = ((i + Math.random() * 10) * Math.PI * 2) / 40;
          const angle3 = ((i - Math.random() * 8) * Math.PI * 2) / 40;
          const radius1 = Math.random() * 25 + 20;
          const radius2 = Math.random() * 18 + 15;
          const radius3 = Math.random() * 30 + 12;
          
          return (
            <motion.div
              key={i}
              className="absolute w-1 h-1 bg-emerald-400 rounded-full shadow-[0_0_6px_rgba(16,185,129,1)]"
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
                  Math.cos(angle1) * (radius1 * 0.6),
                  0,
                ],
                y: [
                  0,
                  Math.sin(angle1) * radius1,
                  Math.sin(angle2) * radius2,
                  Math.sin(angle3) * radius3,
                  Math.sin(angle1) * (radius1 * 0.6),
                  0,
                ],
                opacity: [0, 1, 0.7, 0.5, 0.8, 0],
                scale: [0, 2.5, 1.8, 2, 1.5, 0],
              }}
              transition={{
                duration: Math.random() * 3 + 1.8,
                repeat: Infinity,
                delay: Math.random() * 4,
                ease: "easeInOut",
              }}
            />
          );
        })}
        
        {/* Central glowing core */}
        <motion.div
          className="w-2 h-2 rounded-full bg-emerald-400"
          animate={{
            scale: [1, 1.5, 1],
            opacity: [0.6, 1, 0.6],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          style={{
            boxShadow: '0 0 15px rgba(16,185,129,1)',
          }}
        />
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
