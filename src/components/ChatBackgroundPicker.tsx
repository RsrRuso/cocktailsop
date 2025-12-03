import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Palette, Upload, X, Check, Sparkles, Waves, Stars, Flame, Cloud, Heart, Zap, Moon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface ChatBackgroundPickerProps {
  open: boolean;
  onClose: () => void;
  onSelectBackground: (bg: ChatBackground) => void;
  currentBackground: ChatBackground;
}

export interface ChatBackground {
  type: 'gradient' | '3d' | 'custom';
  value: string;
  name: string;
}

const PRESET_BACKGROUNDS: ChatBackground[] = [
  { type: 'gradient', value: 'from-background via-primary/5 to-accent/10', name: 'Default' },
  { type: 'gradient', value: 'from-slate-900 via-purple-900 to-slate-900', name: 'Galaxy' },
  { type: 'gradient', value: 'from-emerald-900 via-teal-800 to-cyan-900', name: 'Aurora' },
  { type: 'gradient', value: 'from-rose-900 via-pink-800 to-purple-900', name: 'Sunset' },
  { type: 'gradient', value: 'from-blue-900 via-indigo-800 to-violet-900', name: 'Ocean' },
  { type: 'gradient', value: 'from-amber-900 via-orange-800 to-red-900', name: 'Fire' },
  { type: '3d', value: 'particles', name: 'Particles' },
  { type: '3d', value: 'waves', name: 'Waves' },
  { type: '3d', value: 'stars', name: 'Starfield' },
  { type: '3d', value: 'bubbles', name: 'Bubbles' },
  { type: '3d', value: 'aurora', name: '3D Aurora' },
  { type: '3d', value: 'matrix', name: 'Matrix' },
];

const BACKGROUND_ICONS: Record<string, React.ReactNode> = {
  'Default': <Sparkles className="w-4 h-4" />,
  'Galaxy': <Stars className="w-4 h-4" />,
  'Aurora': <Waves className="w-4 h-4" />,
  'Sunset': <Cloud className="w-4 h-4" />,
  'Ocean': <Waves className="w-4 h-4" />,
  'Fire': <Flame className="w-4 h-4" />,
  'Particles': <Sparkles className="w-4 h-4" />,
  'Waves': <Waves className="w-4 h-4" />,
  'Starfield': <Stars className="w-4 h-4" />,
  'Bubbles': <Heart className="w-4 h-4" />,
  '3D Aurora': <Moon className="w-4 h-4" />,
  'Matrix': <Zap className="w-4 h-4" />,
};

export const ChatBackgroundPicker = ({ open, onClose, onSelectBackground, currentBackground }: ChatBackgroundPickerProps) => {
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be less than 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setUploadedImage(dataUrl);
      onSelectBackground({ type: 'custom', value: dataUrl, name: 'Custom' });
      // Save to localStorage
      localStorage.setItem('chatBackgroundCustom', dataUrl);
      toast.success('Background uploaded!');
    };
    reader.readAsDataURL(file);
  };

  const handleSelectPreset = (bg: ChatBackground) => {
    onSelectBackground(bg);
    localStorage.setItem('chatBackground', JSON.stringify(bg));
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-lg bg-background rounded-t-3xl sm:rounded-3xl p-6 max-h-[80vh] overflow-y-auto"
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                <Palette className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <h2 className="font-bold text-lg">Chat Background</h2>
                <p className="text-xs text-muted-foreground">Personalize your chat</p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full">
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Upload Custom */}
          <div className="mb-6">
            <p className="text-sm font-medium mb-3 text-muted-foreground">Custom Background</p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileUpload}
            />
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              className="w-full h-20 border-dashed border-2 rounded-2xl flex flex-col gap-2 hover:bg-primary/5 hover:border-primary/50 transition-all"
            >
              <Upload className="w-6 h-6 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Upload Image</span>
            </Button>
          </div>

          {/* Gradient Presets */}
          <div className="mb-6">
            <p className="text-sm font-medium mb-3 text-muted-foreground">Gradients</p>
            <div className="grid grid-cols-3 gap-3">
              {PRESET_BACKGROUNDS.filter(bg => bg.type === 'gradient').map((bg) => (
                <motion.button
                  key={bg.name}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleSelectPreset(bg)}
                  className={`relative h-20 rounded-2xl overflow-hidden border-2 transition-all ${
                    currentBackground.name === bg.name 
                      ? 'border-primary ring-2 ring-primary/30' 
                      : 'border-border/50 hover:border-primary/50'
                  }`}
                >
                  <div className={`absolute inset-0 bg-gradient-to-br ${bg.value}`} />
                  <div className="absolute inset-0 flex items-center justify-center">
                    {currentBackground.name === bg.name && (
                      <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                        <Check className="w-4 h-4 text-primary-foreground" />
                      </div>
                    )}
                  </div>
                  <div className="absolute bottom-1 left-0 right-0 text-center">
                    <span className="text-[10px] font-medium text-white/80 bg-black/30 px-2 py-0.5 rounded-full">
                      {bg.name}
                    </span>
                  </div>
                </motion.button>
              ))}
            </div>
          </div>

          {/* 3D Animated Presets */}
          <div>
            <p className="text-sm font-medium mb-3 text-muted-foreground">3D Animated</p>
            <div className="grid grid-cols-3 gap-3">
              {PRESET_BACKGROUNDS.filter(bg => bg.type === '3d').map((bg) => (
                <motion.button
                  key={bg.name}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleSelectPreset(bg)}
                  className={`relative h-20 rounded-2xl overflow-hidden border-2 transition-all ${
                    currentBackground.name === bg.name 
                      ? 'border-primary ring-2 ring-primary/30' 
                      : 'border-border/50 hover:border-primary/50'
                  }`}
                >
                  {/* Preview animation */}
                  <div className="absolute inset-0 bg-gradient-to-br from-slate-900 to-slate-800">
                    {bg.value === 'particles' && (
                      <>
                        {[...Array(8)].map((_, i) => (
                          <div
                            key={i}
                            className="absolute w-1 h-1 bg-primary/60 rounded-full animate-pulse"
                            style={{
                              left: `${Math.random() * 100}%`,
                              top: `${Math.random() * 100}%`,
                              animationDelay: `${i * 0.2}s`
                            }}
                          />
                        ))}
                      </>
                    )}
                    {bg.value === 'waves' && (
                      <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-blue-500/30 to-transparent animate-pulse" />
                    )}
                    {bg.value === 'stars' && (
                      <>
                        {[...Array(12)].map((_, i) => (
                          <div
                            key={i}
                            className="absolute w-0.5 h-0.5 bg-white rounded-full animate-pulse"
                            style={{
                              left: `${Math.random() * 100}%`,
                              top: `${Math.random() * 100}%`,
                              animationDelay: `${i * 0.15}s`
                            }}
                          />
                        ))}
                      </>
                    )}
                    {bg.value === 'bubbles' && (
                      <>
                        {[...Array(5)].map((_, i) => (
                          <div
                            key={i}
                            className="absolute w-3 h-3 border border-cyan-400/40 rounded-full animate-bounce"
                            style={{
                              left: `${20 + i * 15}%`,
                              bottom: `${10 + i * 5}%`,
                              animationDelay: `${i * 0.3}s`
                            }}
                          />
                        ))}
                      </>
                    )}
                    {bg.value === 'aurora' && (
                      <div className="absolute inset-0 bg-gradient-to-r from-green-500/20 via-purple-500/20 to-pink-500/20 animate-pulse" />
                    )}
                    {bg.value === 'matrix' && (
                      <div className="absolute inset-0 overflow-hidden opacity-40">
                        {[...Array(6)].map((_, i) => (
                          <div
                            key={i}
                            className="absolute text-[8px] text-green-400 font-mono animate-pulse"
                            style={{
                              left: `${i * 18}%`,
                              top: `${Math.random() * 80}%`,
                              animationDelay: `${i * 0.1}s`
                            }}
                          >
                            01
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
                    <div className="text-white/80">
                      {BACKGROUND_ICONS[bg.name]}
                    </div>
                    {currentBackground.name === bg.name && (
                      <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                        <Check className="w-3 h-3 text-primary-foreground" />
                      </div>
                    )}
                  </div>
                  <div className="absolute bottom-1 left-0 right-0 text-center">
                    <span className="text-[10px] font-medium text-white/80 bg-black/30 px-2 py-0.5 rounded-full">
                      {bg.name}
                    </span>
                  </div>
                </motion.button>
              ))}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

// 3D Background Component
export const Chat3DBackground = ({ background }: { background: ChatBackground }) => {
  if (background.type === 'custom') {
    return (
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-30"
        style={{ backgroundImage: `url(${background.value})` }}
      />
    );
  }

  if (background.type === 'gradient') {
    return (
      <>
        <div className={`absolute inset-0 bg-gradient-to-br ${background.value}`} />
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-10 left-10 w-32 h-32 bg-primary/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-20 right-10 w-40 h-40 bg-accent/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        </div>
      </>
    );
  }

  // 3D Animated backgrounds
  switch (background.value) {
    case 'particles':
      return (
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-purple-900/50 to-slate-900 overflow-hidden">
          {[...Array(30)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 bg-primary/60 rounded-full"
              initial={{ 
                x: Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 400),
                y: Math.random() * (typeof window !== 'undefined' ? window.innerHeight : 800)
              }}
              animate={{
                y: [null, -20, 20],
                opacity: [0.3, 1, 0.3],
              }}
              transition={{
                duration: 3 + Math.random() * 2,
                repeat: Infinity,
                delay: Math.random() * 2,
              }}
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
              }}
            />
          ))}
        </div>
      );
    
    case 'waves':
      return (
        <div className="absolute inset-0 bg-gradient-to-br from-blue-950 via-cyan-900/50 to-blue-950 overflow-hidden">
          {[...Array(4)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute left-0 right-0 h-32 bg-gradient-to-t from-cyan-500/20 to-transparent rounded-full blur-xl"
              style={{ bottom: `${i * 20}%` }}
              animate={{
                x: [-50, 50, -50],
                scaleY: [1, 1.2, 1],
              }}
              transition={{
                duration: 4 + i,
                repeat: Infinity,
                ease: "easeInOut",
                delay: i * 0.5,
              }}
            />
          ))}
        </div>
      );

    case 'stars':
      return (
        <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-950 overflow-hidden">
          {[...Array(50)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute bg-white rounded-full"
              style={{
                width: Math.random() > 0.9 ? '3px' : Math.random() > 0.7 ? '2px' : '1px',
                height: Math.random() > 0.9 ? '3px' : Math.random() > 0.7 ? '2px' : '1px',
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
              }}
              animate={{
                opacity: [0.2, 1, 0.2],
                scale: [1, 1.5, 1],
              }}
              transition={{
                duration: 2 + Math.random() * 2,
                repeat: Infinity,
                delay: Math.random() * 3,
              }}
            />
          ))}
        </div>
      );

    case 'bubbles':
      return (
        <div className="absolute inset-0 bg-gradient-to-br from-teal-950 via-cyan-900/50 to-teal-950 overflow-hidden">
          {[...Array(15)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute border border-cyan-400/30 rounded-full"
              style={{
                width: 20 + Math.random() * 40,
                height: 20 + Math.random() * 40,
                left: `${Math.random() * 100}%`,
              }}
              initial={{ y: '100vh', opacity: 0 }}
              animate={{
                y: '-100vh',
                opacity: [0, 0.6, 0],
              }}
              transition={{
                duration: 8 + Math.random() * 4,
                repeat: Infinity,
                delay: Math.random() * 5,
                ease: "linear",
              }}
            />
          ))}
        </div>
      );

    case 'aurora':
      return (
        <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 overflow-hidden">
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-green-500/20 via-purple-500/20 to-pink-500/20 blur-3xl"
            animate={{
              x: [-100, 100, -100],
              opacity: [0.3, 0.6, 0.3],
            }}
            transition={{
              duration: 8,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
          <motion.div
            className="absolute inset-0 bg-gradient-to-l from-cyan-500/20 via-blue-500/20 to-violet-500/20 blur-3xl"
            animate={{
              x: [100, -100, 100],
              opacity: [0.2, 0.5, 0.2],
            }}
            transition={{
              duration: 10,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 1,
            }}
          />
        </div>
      );

    case 'matrix':
      return (
        <div className="absolute inset-0 bg-black overflow-hidden">
          {[...Array(20)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute text-green-500/60 font-mono text-sm whitespace-pre"
              style={{ left: `${i * 5}%` }}
              initial={{ y: '-100%' }}
              animate={{ y: '100vh' }}
              transition={{
                duration: 5 + Math.random() * 5,
                repeat: Infinity,
                delay: Math.random() * 3,
                ease: "linear",
              }}
            >
              {Array(20).fill(0).map(() => Math.random() > 0.5 ? '1' : '0').join('\n')}
            </motion.div>
          ))}
        </div>
      );

    default:
      return null;
  }
};

export const getStoredBackground = (): ChatBackground => {
  try {
    const stored = localStorage.getItem('chatBackground');
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {}
  return { type: 'gradient', value: 'from-background via-primary/5 to-accent/10', name: 'Default' };
};
