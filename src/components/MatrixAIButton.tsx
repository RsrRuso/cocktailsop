import { Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useHaptic } from "@/hooks/useHaptic";
import { useState, useEffect, useRef } from "react";
import brainIcon from "@/assets/brain-icon.png";

export const MatrixAIButton = () => {
  const navigate = useNavigate();
  const { lightTap } = useHaptic();
  const [eyePosition, setEyePosition] = useState({ x: 0, y: 0 });
  const videoRef = useRef<HTMLVideoElement>(null);
  const [faceDetectionActive, setFaceDetectionActive] = useState(false);

  useEffect(() => {
    let animationFrame: number;
    let stream: MediaStream;

    const initFaceTracking = async () => {
      try {
        // Request camera access
        stream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: 'user', width: 320, height: 240 } 
        });
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
          setFaceDetectionActive(true);

          // Simple face tracking using video dimensions and center detection
          const trackFace = () => {
            if (videoRef.current && videoRef.current.readyState === 4) {
              // For simplicity, we'll use mouse position as a proxy
              // In production, you'd integrate MediaPipe Face Detection here
              const handleMouseMove = (e: MouseEvent) => {
                const buttonRect = document.querySelector('.matrix-ai-button')?.getBoundingClientRect();
                if (buttonRect) {
                  const centerX = buttonRect.left + buttonRect.width / 2;
                  const centerY = buttonRect.top + buttonRect.height / 2;
                  
                  const deltaX = (e.clientX - centerX) / 200;
                  const deltaY = (e.clientY - centerY) / 200;
                  
                  setEyePosition({ 
                    x: Math.max(-8, Math.min(8, deltaX * 8)),
                    y: Math.max(-8, Math.min(8, deltaY * 8))
                  });
                }
              };
              
              window.addEventListener('mousemove', handleMouseMove);
              return () => window.removeEventListener('mousemove', handleMouseMove);
            }
            animationFrame = requestAnimationFrame(trackFace);
          };
          
          trackFace();
        }
      } catch (err) {
        console.log('Camera access denied or unavailable');
      }
    };

    initFaceTracking();

    return () => {
      if (animationFrame) cancelAnimationFrame(animationFrame);
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  return (
    <>
      {/* Hidden video element for face tracking */}
      <video ref={videoRef} style={{ display: 'none' }} playsInline muted />
      
      <motion.button
        onClick={() => {
          lightTap();
          navigate("/matrix-ai");
        }}
        className="relative group bg-transparent matrix-ai-button"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        {/* Brain icon - 3D bright breathing with round light and eyes */}
        <div className="relative">
        {/* Breathing light glow backdrop */}
        <motion.div
          className="absolute inset-0 rounded-full bg-gradient-radial from-primary/40 via-accent/30 to-transparent blur-xl"
          animate={{
            scale: [1.2, 1.8, 1.2],
            opacity: [0.6, 0.9, 0.6],
          }}
          transition={{
            duration: 2.5,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        
        {/* 3D depth layers */}
        <img 
          src={brainIcon} 
          alt="MATRIX AI Brain"
          className="w-12 h-12 absolute top-[4px] left-[4px] rounded-full opacity-30 blur-[2px] z-0"
        />
        <img 
          src={brainIcon} 
          alt="MATRIX AI Brain"
          className="w-12 h-12 absolute top-[2px] left-[2px] rounded-full opacity-50 blur-[1px] z-[1]"
        />
        
        {/* Main brain icon with intense glow, breathing, and rotation */}
        <motion.div className="relative w-12 h-12 z-10">
          <motion.img 
            src={brainIcon} 
            alt="MATRIX AI Brain"
            className="w-12 h-12 rounded-full drop-shadow-[0_0_24px_rgba(59,130,246,1)] shadow-[0_8px_32px_rgba(59,130,246,0.9),0_0_48px_rgba(147,51,234,0.7)]"
            animate={{
              scale: [1, 1.15, 1],
              rotateY: [0, 15, 0, -15, 0],
              filter: [
                "brightness(1.2) drop-shadow(0 0 24px rgba(59,130,246,1))",
                "brightness(1.5) drop-shadow(0 0 36px rgba(147,51,234,1))",
                "brightness(1.2) drop-shadow(0 0 24px rgba(59,130,246,1))"
              ]
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            style={{ transformStyle: "preserve-3d" }}
          />
          
          {/* Tracking Eyes */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            {/* Left Eye */}
            <motion.div 
              className="absolute w-2 h-2.5 bg-white rounded-full shadow-lg"
              style={{ 
                left: '30%',
                top: '45%',
                x: eyePosition.x,
                y: eyePosition.y,
              }}
              animate={{
                scale: [1, 1.1, 1],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            >
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-1 h-1 bg-primary rounded-full" />
              </div>
            </motion.div>
            
            {/* Right Eye */}
            <motion.div 
              className="absolute w-2 h-2.5 bg-white rounded-full shadow-lg"
              style={{ 
                right: '30%',
                top: '45%',
                x: eyePosition.x,
                y: eyePosition.y,
              }}
              animate={{
                scale: [1, 1.1, 1],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            >
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-1 h-1 bg-primary rounded-full" />
              </div>
            </motion.div>
          </div>
        </motion.div>
        
        {/* Sparkle effect */}
        <motion.div
          className="absolute -top-1 -right-1"
          animate={{
            scale: [1, 1.2, 1],
            rotate: [0, 180, 360],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          <Sparkles className="w-3 h-3 text-accent" />
        </motion.div>

        {/* Breathing round light rings - Multiple layers */}
        <motion.div
          className="absolute inset-0 rounded-full bg-gradient-to-r from-primary/20 to-accent/20 blur-md"
          animate={{
            scale: [1, 1.4, 1],
            opacity: [0.7, 0.3, 0.7],
          }}
          transition={{
            duration: 2.5,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        <motion.div
          className="absolute inset-0 rounded-full border-2 border-primary/40"
          animate={{
            scale: [1, 1.6, 1],
            opacity: [0.6, 0, 0.6],
          }}
          transition={{
            duration: 2.5,
            repeat: Infinity,
            ease: "easeOut",
          }}
        />
        <motion.div
          className="absolute inset-0 rounded-full border-2 border-accent/40"
          animate={{
            scale: [1, 2, 1],
            opacity: [0.4, 0, 0.4],
          }}
          transition={{
            duration: 2.5,
            repeat: Infinity,
            ease: "easeOut",
            delay: 0.6,
          }}
        />
        
        {/* Outer breathing glow circle */}
        <motion.div
          className="absolute inset-0 rounded-full shadow-[0_0_40px_8px_rgba(59,130,246,0.5)]"
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.8, 0.4, 0.8],
          }}
          transition={{
            duration: 2.5,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      </div>

      {/* Floating particles effect */}
      <div className="absolute inset-0 overflow-hidden rounded-2xl pointer-events-none">
        {[...Array(3)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-primary/50 rounded-full"
            style={{
              left: `${30 + i * 20}%`,
              bottom: 0,
            }}
            animate={{
              y: [-40, -60],
              opacity: [0, 1, 0],
              scale: [0, 1, 0],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              delay: i * 0.4,
              ease: "easeOut",
            }}
          />
        ))}
      </div>
    </motion.button>
    </>
  );
};
