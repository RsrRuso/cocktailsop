import React from 'react';
import { useHaptic } from '@/hooks/useHaptic';

interface HapticButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  hapticIntensity?: 'light' | 'medium' | 'heavy';
  children: React.ReactNode;
}

export const HapticButton: React.FC<HapticButtonProps> = ({ 
  hapticIntensity = 'light', 
  onClick, 
  children,
  ...props 
}) => {
  const { lightTap, mediumTap, heavyTap } = useHaptic();

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    // Trigger haptic feedback
    switch (hapticIntensity) {
      case 'light':
        lightTap();
        break;
      case 'medium':
        mediumTap();
        break;
      case 'heavy':
        heavyTap();
        break;
    }

    // Call original onClick handler
    if (onClick) {
      onClick(e);
    }
  };

  return (
    <button onClick={handleClick} {...props}>
      {children}
    </button>
  );
};
