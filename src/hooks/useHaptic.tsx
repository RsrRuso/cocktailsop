import { useCallback } from 'react';

export const useHaptic = () => {
  const vibrate = useCallback((duration: number = 10) => {
    // Check if vibration API is supported
    if ('vibrate' in navigator) {
      navigator.vibrate(duration);
    }
  }, []);

  const vibratePattern = useCallback((pattern: number[]) => {
    if ('vibrate' in navigator) {
      navigator.vibrate(pattern);
    }
  }, []);

  const lightTap = useCallback(() => vibrate(10), [vibrate]);
  const mediumTap = useCallback(() => vibrate(20), [vibrate]);
  const heavyTap = useCallback(() => vibrate(30), [vibrate]);
  const doubleTap = useCallback(() => vibratePattern([10, 50, 10]), [vibratePattern]);

  return {
    vibrate,
    vibratePattern,
    lightTap,
    mediumTap,
    heavyTap,
    doubleTap
  };
};
