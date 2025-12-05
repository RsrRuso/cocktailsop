import { useState, useRef, useEffect } from "react";
import { Music2, Play, Pause } from "lucide-react";
import { useUserStatus } from "@/hooks/useUserStatus";

interface UserStatusIndicatorProps {
  userId: string | null | undefined;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const UserStatusIndicator = ({ userId, size = 'sm', className = '' }: UserStatusIndicatorProps) => {
  const { data: status } = useUserStatus(userId);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (status?.music_preview_url) {
      audioRef.current = new Audio(status.music_preview_url);
      audioRef.current.volume = 0.3;
      audioRef.current.addEventListener('ended', () => setIsPlaying(false));
    }
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [status?.music_preview_url]);

  const togglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  if (!status) return null;

  // Music status
  if (status.music_track_name) {
    const sizeClasses = {
      sm: 'min-w-[80px] max-w-[100px] py-1 px-1.5',
      md: 'min-w-[100px] max-w-[140px] py-1.5 px-2',
      lg: 'min-w-[140px] max-w-[180px] py-2 px-3'
    };
    
    const textClasses = {
      sm: 'text-[8px]',
      md: 'text-[9px]',
      lg: 'text-[10px]'
    };

    return (
      <div className={`absolute -top-8 left-1/2 -translate-x-1/2 z-20 pointer-events-auto ${className}`}>
        <div className="relative">
          <div className={`bg-gradient-to-r from-emerald-500/90 to-teal-500/90 backdrop-blur-sm text-white rounded-xl shadow-lg shadow-emerald-500/20 ${sizeClasses[size]}`}>
            <div className="flex items-center gap-1">
              {/* Album Art */}
              <div className="relative w-5 h-5 rounded flex-shrink-0 overflow-hidden">
                {status.music_album_art ? (
                  <img src={status.music_album_art} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-white/20 flex items-center justify-center">
                    <Music2 className="w-2.5 h-2.5" />
                  </div>
                )}
                {isPlaying && (
                  <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                    <div className="flex gap-px">
                      <div className="w-0.5 h-2 bg-white animate-pulse" />
                      <div className="w-0.5 h-2 bg-white animate-pulse" style={{ animationDelay: '150ms' }} />
                    </div>
                  </div>
                )}
              </div>

              {/* Track Info */}
              <div className="flex-1 min-w-0 overflow-hidden">
                <div className={`whitespace-nowrap truncate font-medium ${textClasses[size]}`}>
                  {status.music_track_name}
                </div>
              </div>

              {/* Play Button */}
              {status.music_preview_url && (
                <button
                  onClick={togglePlay}
                  className="w-4 h-4 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center flex-shrink-0"
                >
                  {isPlaying ? (
                    <Pause className="w-2 h-2" />
                  ) : (
                    <Play className="w-2 h-2 ml-px" />
                  )}
                </button>
              )}
            </div>
          </div>
          
          {/* Connector */}
          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full" />
        </div>
      </div>
    );
  }

  // Regular text status
  if (status.status_text) {
    const sizeClasses = {
      sm: 'min-w-[60px] max-w-[80px] py-0.5 px-1.5',
      md: 'min-w-[80px] max-w-[100px] py-1 px-2',
      lg: 'min-w-[100px] max-w-[120px] py-1.5 px-2.5'
    };
    
    const textClasses = {
      sm: 'text-[7px]',
      md: 'text-[8px]',
      lg: 'text-[9px]'
    };

    return (
      <div className={`absolute -top-6 left-1/2 -translate-x-1/2 z-20 pointer-events-none ${className}`}>
        <div className="relative">
          <div className={`bg-muted/95 backdrop-blur-sm text-muted-foreground rounded-full shadow-md ${sizeClasses[size]}`}>
            <div className="flex items-center gap-0.5 justify-center">
              {status.emoji && <span className={textClasses[size]}>{status.emoji}</span>}
              <span className={`truncate ${textClasses[size]}`}>{status.status_text}</span>
            </div>
          </div>
          <div className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 bg-muted/95 rounded-full" />
        </div>
      </div>
    );
  }

  return null;
};

export default UserStatusIndicator;