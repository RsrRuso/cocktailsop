import { useState, useEffect } from 'react';
import { Volume2, VolumeX, Check, Bell, Play, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from '@/components/ui/drawer';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface NotificationSound {
  id: string;
  name: string;
  description: string;
  frequency1: number;
  frequency2: number;
  duration: number;
  icon?: string;
}

export const NOTIFICATION_SOUNDS: NotificationSound[] = [
  { id: 'default', name: 'Default', description: 'Classic two-tone', frequency1: 800, frequency2: 1000, duration: 0.3, icon: '🔔' },
  { id: 'gentle', name: 'Gentle', description: 'Soft ping', frequency1: 440, frequency2: 550, duration: 0.2, icon: '🌸' },
  { id: 'bright', name: 'Bright', description: 'Cheerful alert', frequency1: 1200, frequency2: 1400, duration: 0.25, icon: '✨' },
  { id: 'deep', name: 'Deep', description: 'Low bass tone', frequency1: 200, frequency2: 300, duration: 0.4, icon: '🎵' },
  { id: 'chime', name: 'Chime', description: 'Bell-like ring', frequency1: 1046, frequency2: 1318, duration: 0.35, icon: '🎐' },
  { id: 'pop', name: 'Pop', description: 'Quick bubble', frequency1: 600, frequency2: 900, duration: 0.15, icon: '💫' },
  { id: 'crystal', name: 'Crystal', description: 'High clarity', frequency1: 1500, frequency2: 1800, duration: 0.2, icon: '💎' },
  { id: 'warm', name: 'Warm', description: 'Mellow tone', frequency1: 350, frequency2: 500, duration: 0.35, icon: '🌅' },
  { id: 'alert', name: 'Alert', description: 'Attention grabber', frequency1: 900, frequency2: 1100, duration: 0.4, icon: '⚡' },
  { id: 'whisper', name: 'Whisper', description: 'Subtle soft', frequency1: 500, frequency2: 600, duration: 0.15, icon: '🍃' },
  { id: 'cosmic', name: 'Cosmic', description: 'Space vibes', frequency1: 660, frequency2: 880, duration: 0.3, icon: '🌌' },
  { id: 'drop', name: 'Drop', description: 'Water droplet', frequency1: 1200, frequency2: 800, duration: 0.2, icon: '💧' },
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
      <DrawerContent className="h-[80vh] max-h-[80vh] bg-background/95 backdrop-blur-xl border-t border-border/50">
        <div className="w-12 h-1.5 bg-muted-foreground/30 rounded-full mx-auto mt-3" />
        
        <DrawerHeader className="pb-2 pt-4">
          <DrawerTitle className="text-xl font-bold flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Notification Sounds
          </DrawerTitle>
        </DrawerHeader>
        
        <div className="flex-1 overflow-y-auto px-4 pb-8 space-y-5">
          {/* Master Toggle Card */}
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-br from-primary/10 to-accent/10 rounded-2xl p-4 border border-border/30"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center transition-colors",
                  settings.enabled ? "bg-primary/20" : "bg-muted"
                )}>
                  {settings.enabled ? (
                    <Volume2 className="w-5 h-5 text-primary" />
                  ) : (
                    <VolumeX className="w-5 h-5 text-muted-foreground" />
                  )}
                </div>
                <div>
                  <Label className="text-base font-semibold">Sound Alerts</Label>
                  <p className="text-xs text-muted-foreground">Audio for notifications</p>
                </div>
              </div>
              <Switch
                checked={settings.enabled}
                onCheckedChange={(enabled) => setSettings(prev => ({ ...prev, enabled }))}
                className="data-[state=checked]:bg-primary"
              />
            </div>
          </motion.div>

          {/* Volume Control */}
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className={cn(
              "bg-muted/30 rounded-2xl p-4 space-y-3 border border-border/20 transition-opacity",
              !settings.enabled && "opacity-40 pointer-events-none"
            )}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Volume2 className="w-4 h-4 text-muted-foreground" />
                <Label className="font-medium">Volume</Label>
              </div>
              <span className="text-sm font-bold text-primary tabular-nums">
                {Math.round(settings.volume * 100)}%
              </span>
            </div>
            <Slider
              value={[settings.volume * 100]}
              onValueChange={(value) => setSettings(prev => ({ ...prev, volume: value[0] / 100 }))}
              max={100}
              min={10}
              step={5}
              className="w-full"
            />
          </motion.div>

          {/* Sound Grid */}
          <div className={cn(
            "space-y-3 transition-opacity",
            !settings.enabled && "opacity-40 pointer-events-none"
          )}>
            <Label className="font-semibold text-sm px-1 text-muted-foreground uppercase tracking-wide">
              Choose Sound
            </Label>
            <div className="grid grid-cols-3 gap-2">
              {NOTIFICATION_SOUNDS.map((sound, index) => (
                <motion.button
                  key={sound.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.03 }}
                  onClick={() => handleSelectSound(sound.id)}
                  disabled={!settings.enabled}
                  className={cn(
                    "relative rounded-xl p-3 text-center transition-all duration-200 border",
                    settings.soundId === sound.id 
                      ? "bg-primary/15 border-primary shadow-lg shadow-primary/20" 
                      : "bg-muted/20 border-border/30 hover:bg-muted/40 active:scale-95",
                    playingId === sound.id && "animate-pulse"
                  )}
                >
                  {/* Selected indicator */}
                  {settings.soundId === sound.id && (
                    <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-primary flex items-center justify-center shadow-lg">
                      <Check className="w-3 h-3 text-primary-foreground" />
                    </div>
                  )}
                  
                  <div className="text-2xl mb-1">{sound.icon}</div>
                  <p className="text-xs font-semibold truncate">{sound.name}</p>
                  
                  {/* Play indicator */}
                  {playingId === sound.id && (
                    <div className="absolute inset-0 rounded-xl bg-primary/10 flex items-center justify-center">
                      <div className="flex gap-0.5">
                        {[...Array(3)].map((_, i) => (
                          <motion.div
                            key={i}
                            className="w-1 bg-primary rounded-full"
                            animate={{ height: [8, 16, 8] }}
                            transition={{ duration: 0.4, repeat: Infinity, delay: i * 0.1 }}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </motion.button>
              ))}
            </div>
          </div>

          {/* Test Button */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Button
              onClick={() => {
                const sound = NOTIFICATION_SOUNDS.find(s => s.id === settings.soundId);
                if (sound) handlePreview(sound);
              }}
              disabled={!settings.enabled}
              className="w-full h-12 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary font-semibold border border-primary/30"
              variant="ghost"
            >
              <Play className="w-4 h-4 mr-2" />
              Test Current Sound
            </Button>
          </motion.div>

          {/* Footer info */}
          <p className="text-xs text-muted-foreground text-center px-4">
            Sounds play for likes, comments, messages & more
          </p>
        </div>
      </DrawerContent>
    </Drawer>
  );
};

export default NotificationSoundPicker;
