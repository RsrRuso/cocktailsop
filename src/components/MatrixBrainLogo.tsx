import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Canvas } from "@react-three/fiber";
import { useRef } from "react";
import { Group } from "three";
import { useFrame } from "@react-three/fiber";

function Brain3D() {
  const brainRef = useRef<Group>(null);
  
  useFrame((state) => {
    if (brainRef.current) {
      // Organic breathing and rotation
      brainRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.5) * 0.2;
      brainRef.current.rotation.y = state.clock.elapsedTime * 0.4;
      brainRef.current.rotation.z = Math.cos(state.clock.elapsedTime * 0.3) * 0.1;
      const breathe = 1 + Math.sin(state.clock.elapsedTime * 0.8) * 0.15;
      brainRef.current.scale.set(breathe, breathe, breathe);
    }
  });

  return (
    <group ref={brainRef}>
      {/* Left hemisphere */}
      <mesh position={[-0.4, 0, 0]} scale={[0.8, 1, 1]}>
        <sphereGeometry args={[0.7, 16, 16]} />
        <meshStandardMaterial
          color="#10b981"
          emissive="#10b981"
          emissiveIntensity={0.8}
          roughness={0.2}
          metalness={0.9}
        />
      </mesh>
      
      {/* Right hemisphere */}
      <mesh position={[0.4, 0, 0]} scale={[0.8, 1, 1]}>
        <sphereGeometry args={[0.7, 16, 16]} />
        <meshStandardMaterial
          color="#10b981"
          emissive="#10b981"
          emissiveIntensity={0.8}
          roughness={0.2}
          metalness={0.9}
        />
      </mesh>

      {/* Frontal lobe bumps */}
      <mesh position={[0, 0.3, 0.4]} scale={[0.6, 0.4, 0.5]}>
        <sphereGeometry args={[0.5, 12, 12]} />
        <meshStandardMaterial
          color="#059669"
          emissive="#10b981"
          emissiveIntensity={0.7}
          roughness={0.3}
          metalness={0.8}
        />
      </mesh>

      {/* Cerebellum - back lower part */}
      <mesh position={[0, -0.4, -0.3]} scale={[0.5, 0.3, 0.4]}>
        <sphereGeometry args={[0.6, 12, 12]} />
        <meshStandardMaterial
          color="#047857"
          emissive="#10b981"
          emissiveIntensity={0.6}
          roughness={0.3}
          metalness={0.8}
        />
      </mesh>

      {/* Neural connections - glowing synapses */}
      {[...Array(16)].map((_, i) => {
        const angle = (i * Math.PI * 2) / 16;
        const radius = 0.85;
        return (
          <mesh
            key={i}
            position={[
              Math.cos(angle) * radius,
              Math.sin(angle * 2) * 0.4,
              Math.sin(angle) * radius * 0.6,
            ]}
            scale={0.08}
          >
            <sphereGeometry args={[1, 6, 6]} />
            <meshStandardMaterial
              color="#34d399"
              emissive="#34d399"
              emissiveIntensity={2}
            />
          </mesh>
        );
      })}

      {/* Corpus callosum - connection between hemispheres */}
      <mesh position={[0, -0.1, 0]} rotation={[0, 0, Math.PI / 2]} scale={[0.2, 0.8, 0.2]}>
        <cylinderGeometry args={[0.15, 0.15, 1, 8]} />
        <meshStandardMaterial
          color="#059669"
          emissive="#10b981"
          emissiveIntensity={1}
          transparent
          opacity={0.7}
        />
      </mesh>
    </group>
  );
}

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

      {/* Brain icon container without circle - just glow effects */}
      <motion.div
        className="relative w-12 h-12 flex items-center justify-center"
        style={{ 
          perspective: '1000px',
          transformStyle: 'preserve-3d'
        }}
        animate={{
          scale: [1, 1.1, 1],
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

        {/* Real 3D brain with Three.js */}
        <div className="relative z-10 w-12 h-12">
          <Canvas
            camera={{ position: [0, 0, 3.5], fov: 50 }}
            gl={{ alpha: true, antialias: true }}
            style={{ background: 'transparent' }}
          >
            <ambientLight intensity={0.3} />
            <pointLight position={[5, 5, 5]} intensity={2} color="#10b981" />
            <pointLight position={[-5, -3, -3]} intensity={1.5} color="#34d399" />
            <pointLight position={[0, 5, -5]} intensity={1} color="#059669" />
            <Brain3D />
          </Canvas>
        </div>

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
