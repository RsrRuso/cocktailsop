let audioContext: AudioContext | null = null;
let notificationSound: AudioBuffer | null = null;

const initAudioContext = () => {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return audioContext;
};

// Create a pleasant notification sound using Web Audio API
const createNotificationSound = async (): Promise<AudioBuffer> => {
  const context = initAudioContext();
  const sampleRate = context.sampleRate;
  const duration = 0.3;
  const buffer = context.createBuffer(1, sampleRate * duration, sampleRate);
  const data = buffer.getChannelData(0);

  // Create a pleasant two-tone sound
  for (let i = 0; i < buffer.length; i++) {
    const t = i / sampleRate;
    
    // First tone (800Hz) with envelope
    const tone1 = Math.sin(2 * Math.PI * 800 * t) * Math.exp(-t * 10);
    
    // Second tone (1000Hz) delayed slightly
    const tone2 = t > 0.05 ? Math.sin(2 * Math.PI * 1000 * t) * Math.exp(-(t - 0.05) * 8) : 0;
    
    // Combine tones with envelope
    data[i] = (tone1 + tone2) * 0.3;
  }

  return buffer;
};

export const playNotificationSound = async (volume: number = 0.9) => {
  // Check if custom notification settings exist
  try {
    const stored = localStorage.getItem('notification_sound_settings');
    if (stored) {
      const settings = JSON.parse(stored);
      if (!settings.enabled) return;
      
      // Use custom sound settings
      const { playSelectedNotificationSound } = await import('@/components/NotificationSoundPicker');
      await playSelectedNotificationSound(volume);
      return;
    }
  } catch {}
  
  // Fallback to default behavior
  try {
    const audio = new Audio('/notification.wav');
    audio.volume = Math.min(Math.max(volume, 0), 1);
    await audio.play();
  } catch (error) {
    try {
      const context = initAudioContext();
      
      if (context.state === 'suspended') {
        await context.resume();
      }

      if (!notificationSound) {
        notificationSound = await createNotificationSound();
      }

      const source = context.createBufferSource();
      const gainNode = context.createGain();
      
      source.buffer = notificationSound;
      gainNode.gain.value = Math.min(Math.max(volume, 0), 1);
      
      source.connect(gainNode);
      gainNode.connect(context.destination);
      source.start(0);
    } catch (fallbackError) {
      // Could not play notification sound
    }
  }
};

// Alternative: Play from audio file if available
export const playNotificationSoundFromFile = (audioUrl: string = '/notification.wav', volume: number = 0.5) => {
  try {
    const audio = new Audio(audioUrl);
    audio.volume = Math.min(Math.max(volume, 0), 1);
    audio.play().catch(() => {});
  } catch (error) {
    // Could not play notification sound from file
  }
};
