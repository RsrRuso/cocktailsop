import { useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { MeshDistortMaterial, Sphere } from "@react-three/drei";
import * as THREE from "three";

function Brain() {
  const meshRef = useRef<THREE.Mesh>(null);
  const particlesRef = useRef<THREE.Points>(null);

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.3) * 0.2;
      meshRef.current.rotation.y += 0.005;
    }
    if (particlesRef.current) {
      particlesRef.current.rotation.y += 0.001;
    }
  });

  // Create particles around brain
  const particlesCount = 200;
  const positions = new Float32Array(particlesCount * 3);
  
  for (let i = 0; i < particlesCount; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(Math.random() * 2 - 1);
    const radius = 1.5 + Math.random() * 0.5;
    
    positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
    positions[i * 3 + 2] = radius * Math.cos(phi);
  }

  return (
    <group>
      {/* Main brain sphere with organic distortion */}
      <Sphere ref={meshRef} args={[1, 64, 64]}>
        <MeshDistortMaterial
          color="#10b981"
          attach="material"
          distort={0.4}
          speed={2}
          roughness={0.3}
          metalness={0.8}
          emissive="#059669"
          emissiveIntensity={0.5}
        />
      </Sphere>

      {/* Glowing core */}
      <Sphere args={[0.8, 32, 32]}>
        <meshBasicMaterial color="#34d399" transparent opacity={0.3} />
      </Sphere>

      {/* Particle system */}
      <points ref={particlesRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={particlesCount}
            array={positions}
            itemSize={3}
          />
        </bufferGeometry>
        <pointsMaterial
          size={0.02}
          color="#10b981"
          transparent
          opacity={0.6}
          sizeAttenuation
        />
      </points>

      {/* Ambient light for glow */}
      <pointLight position={[0, 0, 0]} intensity={1} color="#10b981" />
      <ambientLight intensity={0.5} />
    </group>
  );
}

interface Matrix3DBrainProps {
  className?: string;
}

export function Matrix3DBrain({ className = "" }: Matrix3DBrainProps) {
  return (
    <div className={className}>
      <Canvas
        camera={{ position: [0, 0, 3], fov: 45 }}
        style={{ width: "100%", height: "100%" }}
      >
        <Brain />
      </Canvas>
    </div>
  );
}
