import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Matrix3DBrain } from "./Matrix3DBrain";
import { Suspense } from "react";

export function Matrix3DBrainLogo() {
  const navigate = useNavigate();

  return (
    <motion.div
      onClick={() => navigate("/matrix-ai")}
      className="relative cursor-pointer group w-16 h-16"
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

      {/* 3D Brain Container */}
      <div className="relative w-full h-full">
        <Suspense fallback={
          <div className="w-full h-full flex items-center justify-center">
            <div className="w-8 h-8 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
          </div>
        }>
          <Matrix3DBrain className="w-full h-full" />
        </Suspense>
      </div>

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

      {/* Glowing corner accents */}
      <div className="absolute top-0 left-0 w-2 h-2 border-l-2 border-t-2 border-emerald-500/50" />
      <div className="absolute top-0 right-0 w-2 h-2 border-r-2 border-t-2 border-emerald-500/50" />
      <div className="absolute bottom-0 left-0 w-2 h-2 border-l-2 border-b-2 border-emerald-500/50" />
      <div className="absolute bottom-0 right-0 w-2 h-2 border-r-2 border-b-2 border-emerald-500/50" />
    </motion.div>
  );
}
