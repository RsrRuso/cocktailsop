import { useState, useEffect } from 'react';
import { Volume2, VolumeX, Check, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from '@/components/ui/drawer';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface NotificationSound {
  id: string;
  name: string;
  description: string;
  frequency1: number;
  frequency2: number;
  duration: number;
}

const NOTIFICATION_SOUNDS: NotificationSound[] = [
  { id: 'default', name: 'Default', description: 'Classic two-tone', frequency1: 800, frequency2: 1000, duration: 0.3 },
  { id: 'gentle', name: 'Gentle', description: 'Soft ping', frequency1: 440, frequency2: 550, duration: 0.2 },
  { id: 'bright', name: 'Bright', description: 'Cheerful alert', frequency1: 1200, frequency2: 1400, duration: 0.25 },
  { id: 'deep', name: 'Deep', description: 'Low bass tone', frequency1: 200, frequency2: 300, duration: 0.4 },
  { id: 'chime', name: 'Chime', description: 'Bell-like ring', frequency1: 1046, frequency2: 1318, duration: 0.35 },
  { id: 'pop', name: 'Pop', description: 'Quick bubble', frequency1: 600, frequency2: 900, duration: 0.15 },
  { id: 'crystal', name: 'Crystal', description: 'High clarity', frequency1: 1500, frequency2: 1800, duration: 0.2 },
  { id: 'warm', name: 'Warm', description: 'Mellow tone', frequency1: 350, frequency2: 500, duration: 0.35 },
  { id: 'alert', name: 'Alert', description: 'Attention grabber', frequency1: 900, frequency2: 1100, duration: 0.4 },
  { id: 'whisper', name: 'Whisper', description: 'Subtle soft', frequency1: 500, frequency2: 600, duration: 0.15 },
];

const STORAGE_KEY = 'notification_sound_settings';

interface NotificationSettings {
  enabled: boolean;
  soundId: string;
  volume: number;
}

const getStoredSettings = (): NotificationSettings => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {}
  return { enabled: true, soundId: 'default', volume: 0.7 };
};

const saveSettings = (settings: NotificationSettings) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
};

export const getNotificationSettings = getStoredSettings;

export const playSelectedNotificationSound = async (volume?: number) => {
  const settings = getStoredSettings();
  if (!settings.enabled) return;
  
  const sound = NOTIFICATION_SOUNDS.find(s => s.id === settings.soundId) || NOTIFICATION_SOUNDS[0];
  const finalVolume = volume ?? settings.volume;
  
  await playCustomSound(sound, finalVolume);
};

const playCustomSound = async (sound: NotificationSound, volume: number) => {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    if (audioContext.state === 'suspended') {
      await audioContext.resume();
    }
    
    const sampleRate = audioContext.sampleRate;
    const buffer = audioContext.createBuffer(1, sampleRate * sound.duration, sampleRate);
    const data = buffer.getChannelData(0);
    
    for (let i = 0; i < buffer.length; i++) {
      const t = i / sampleRate;
      const tone1 = Math.sin(2 * Math.PI * sound.frequency1 * t) * Math.exp(-t * 10);
      const tone2 = t > 0.05 ? Math.sin(2 * Math.PI * sound.frequency2 * t) * Math.exp(-(t - 0.05) * 8) : 0;
      data[i] = (tone1 + tone2) * 0.3;
    }
    
    const source = audioContext.createBufferSource();
    const gainNode = audioContext.createGain();
    
    source.buffer = buffer;
    gainNode.gain.value = Math.min(Math.max(volume, 0), 1);
    
    source.connect(gainNode);
    gainNode.connect(audioContext.destination);
    source.start(0);
  } catch (error) {
    console.log('Could not play notification sound');
  }
};

interface NotificationSoundPickerProps {
  trigger?: React.ReactNode;
}

export const NotificationSoundPicker = ({ trigger }: NotificationSoundPickerProps) => {
  const [open, setOpen] = useState(false);
  const [settings, setSettings] = useState<NotificationSettings>(getStoredSettings);
  const [playingId, setPlayingId] = useState<string | null>(null);

  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  const handlePreview = async (sound: NotificationSound) => {
    setPlayingId(sound.id);
    await playCustomSound(sound, settings.volume);
    setTimeout(() => setPlayingId(null), sound.duration * 1000 + 100);
  };

  const handleSelectSound = async (soundId: string) => {
    setSettings(prev => ({ ...prev, soundId }));
    const sound = NOTIFICATION_SOUNDS.find(s => s.id === soundId);
    if (sound) {
      await playCustomSound(sound, settings.volume);
    }
  };

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="icon" className="glass rounded-full">
            <Bell className="w-4 h-4" />
          </Button>
        )}
      </DrawerTrigger>
      <DrawerContent className="h-[85vh] max-h-[85vh]">
        <DrawerHeader className="pb-2">
          <DrawerTitle className="text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Notification Sounds
          </DrawerTitle>
        </DrawerHeader>
        
        <div className="flex-1 overflow-y-auto px-4 pb-8 space-y-6">
          {/* Enable/Disable Toggle */}
          <div className="glass rounded-2xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {settings.enabled ? (
                <Volume2 className="w-5 h-5 text-primary" />
              ) : (
                <VolumeX className="w-5 h-5 text-muted-foreground" />
              )}
              <div>
                <Label className="text-base font-semibold">Sound Notifications</Label>
                <p className="text-sm text-muted-foreground">Play sound for new messages</p>
              </div>
            </div>
            <Switch
              checked={settings.enabled}
              onCheckedChange={(enabled) => setSettings(prev => ({ ...prev, enabled }))}
            />
          </div>

          {/* Volume Slider */}
          <div className={cn("glass rounded-2xl p-4 space-y-4", !settings.enabled && "opacity-50 pointer-events-none")}>
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold">Volume</Label>
              <span className="text-sm text-muted-foreground font-medium">{Math.round(settings.volume * 100)}%</span>
            </div>
            <Slider
              value={[settings.volume * 100]}
              onValueChange={(value) => setSettings(prev => ({ ...prev, volume: value[0] / 100 }))}
              max={100}
              min={10}
              step={5}
              className="w-full"
            />
          </div>

          {/* Sound Selection */}
          <div className={cn("space-y-3", !settings.enabled && "opacity-50 pointer-events-none")}>
            <Label className="text-base font-semibold px-1">Choose Sound</Label>
            <div className="grid grid-cols-2 gap-3">
              {NOTIFICATION_SOUNDS.map((sound) => (
                <button
                  key={sound.id}
                  onClick={() => handleSelectSound(sound.id)}
                  disabled={!settings.enabled}
                  className={cn(
                    "glass rounded-xl p-4 text-left transition-all duration-200 relative overflow-hidden group",
                    settings.soundId === sound.id 
                      ? "ring-2 ring-primary bg-primary/10 shadow-lg shadow-primary/20" 
                      : "hover:bg-primary/5 hover:scale-[1.02]",
                    playingId === sound.id && "animate-pulse"
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate">{sound.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{sound.description}</p>
                    </div>
                    {settings.soundId === sound.id && (
                      <div className="shrink-0 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                        <Check className="w-3 h-3 text-primary-foreground" />
                      </div>
                    )}
                  </div>
                  
                  {/* Preview button */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePreview(sound);
                    }}
                    disabled={!settings.enabled}
                    className="mt-2 w-full h-8 text-xs glass hover:bg-primary/20"
                  >
                    <Volume2 className="w-3 h-3 mr-1.5" />
                    Preview
                  </Button>
                </button>
              ))}
            </div>
          </div>

          {/* Info */}
          <p className="text-xs text-muted-foreground text-center px-4">
            Notification sounds will play when you receive new messages
          </p>
        </div>
      </DrawerContent>
    </Drawer>
  );
};

export default NotificationSoundPicker;
