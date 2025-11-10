import { useEffect, useState } from "react";

interface BirthdayConfettiProps {
  isActive: boolean;
}

interface Confetti {
  id: number;
  left: number;
  delay: number;
  duration: number;
  color: string;
  rotation: number;
  size: number;
}

const BirthdayConfetti = ({ isActive }: BirthdayConfettiProps) => {
  const [confetti, setConfetti] = useState<Confetti[]>([]);

  useEffect(() => {
    if (isActive) {
      const colors = [
        'hsl(var(--primary))',
        'hsl(var(--accent))',
        '#FFD700',
        '#FF69B4',
        '#00CED1',
        '#FF6347',
        '#9370DB',
        '#32CD32',
        '#FF1493',
        '#00FF7F'
      ];

      const newConfetti = Array.from({ length: 50 }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 3,
        duration: 3 + Math.random() * 2,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * 360,
        size: 8 + Math.random() * 6
      }));

      setConfetti(newConfetti);
    }
  }, [isActive]);

  if (!isActive) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {confetti.map((piece) => (
        <div
          key={piece.id}
          className="absolute animate-confetti-fall"
          style={{
            left: `${piece.left}%`,
            top: '-20px',
            animationDelay: `${piece.delay}s`,
            animationDuration: `${piece.duration}s`,
            '--rotation': `${piece.rotation}deg`,
          } as React.CSSProperties}
        >
          <div
            className="animate-confetti-spin"
            style={{
              width: `${piece.size}px`,
              height: `${piece.size}px`,
              backgroundColor: piece.color,
              animationDuration: `${piece.duration * 0.5}s`,
              borderRadius: Math.random() > 0.5 ? '50%' : '2px',
              boxShadow: `0 0 10px ${piece.color}`,
            }}
          />
        </div>
      ))}
    </div>
  );
};

export default BirthdayConfetti;
