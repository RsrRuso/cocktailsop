import { useEffect, useState } from "react";

interface BirthdayFireworksProps {
  children: React.ReactNode;
  isBirthday: boolean;
}

const BirthdayFireworks = ({ children, isBirthday }: BirthdayFireworksProps) => {
  const [particles, setParticles] = useState<Array<{ id: number; x: number; y: number; color: string; delay: number }>>([]);

  useEffect(() => {
    if (isBirthday) {
      const colors = ['hsl(var(--primary))', 'hsl(var(--accent))', '#FFD700', '#FF69B4', '#00CED1', '#FF6347'];
      const newParticles = Array.from({ length: 12 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        color: colors[Math.floor(Math.random() * colors.length)],
        delay: Math.random() * 2
      }));
      setParticles(newParticles);
    }
  }, [isBirthday]);

  if (!isBirthday) return <>{children}</>;

  return (
    <div className="relative">
      {children}
      <div className="absolute inset-0 pointer-events-none overflow-visible">
        {particles.map((particle) => (
          <div
            key={particle.id}
            className="absolute w-2 h-2 rounded-full animate-firework"
            style={{
              left: '50%',
              top: '50%',
              backgroundColor: particle.color,
              boxShadow: `0 0 10px ${particle.color}, 0 0 20px ${particle.color}`,
              animationDelay: `${particle.delay}s`,
              '--tx': `${particle.x - 50}px`,
              '--ty': `${particle.y - 50}px`,
            } as React.CSSProperties}
          />
        ))}
      </div>
    </div>
  );
};

export default BirthdayFireworks;
