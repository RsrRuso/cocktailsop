import { useState, useRef, useEffect } from "react";
import { Music2, Play, Pause } from "lucide-react";
import { useUserStatus } from "@/hooks/useUserStatus";
import StatusViewerDialog from "./StatusViewerDialog";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface UserStatusIndicatorProps {
  userId: string | null | undefined;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const UserStatusIndicator = ({ userId, size = 'sm', className = '' }: UserStatusIndicatorProps) => {
  const { data: status } = useUserStatus(userId);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showViewer, setShowViewer] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Fetch user profile for the dialog
  const { data: userProfile } = useQuery({
    queryKey: ['profile', userId],
    queryFn: async () => {
      if (!userId) return null;
      const { data } = await supabase
        .from('profiles')
        .select('username, avatar_url')
        .eq('id', userId)
        .single();
      return data;
    },
    enabled: !!userId,
  });

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

  const handleStatusClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowViewer(true);
  };

  if (!status) return null;

  // Music status
  if (status.music_track_name) {
    const sizeClasses = {
      sm: 'min-w-[80px] max-w-[120px] py-1 px-1.5',
      md: 'min-w-[100px] max-w-[160px] py-1.5 px-2',
      lg: 'min-w-[140px] max-w-[200px] py-2 px-3'
    };
    
    const textClasses = {
      sm: 'text-[8px]',
      md: 'text-[9px]',
      lg: 'text-[10px]'
    };

    return (
      <>
        <div 
          className={`absolute -top-8 left-1/2 -translate-x-1/2 z-20 pointer-events-auto cursor-pointer ${className}`}
          onClick={handleStatusClick}
        >
          <div className="relative">
            <div className={`bg-gradient-to-r from-emerald-500/90 to-teal-500/90 backdrop-blur-sm text-white rounded-xl shadow-lg shadow-emerald-500/20 ${sizeClasses[size]} overflow-hidden`}>
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

                {/* Track Info with Marquee */}
                <div className="flex-1 min-w-0 overflow-hidden">
                  <div className={`whitespace-nowrap font-medium ${textClasses[size]}`}>
                    <div className="animate-marquee inline-block">
                      {status.music_track_name}
                      {status.music_track_name && status.music_track_name.length > 10 && (
                        <span className="ml-8">{status.music_track_name}</span>
                      )}
                    </div>
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
        <StatusViewerDialog
          open={showViewer}
          onOpenChange={setShowViewer}
          status={status}
          userProfile={userProfile}
        />
      </>
    );
  }

  // Regular text status with marquee
  if (status.status_text) {
    const sizeClasses = {
      sm: 'min-w-[60px] max-w-[100px] py-0.5 px-1.5',
      md: 'min-w-[80px] max-w-[120px] py-1 px-2',
      lg: 'min-w-[100px] max-w-[140px] py-1.5 px-2.5'
    };
    
    const textClasses = {
      sm: 'text-[7px]',
      md: 'text-[8px]',
      lg: 'text-[9px]'
    };

    return (
      <>
        <div 
          className={`absolute -top-6 left-1/2 -translate-x-1/2 z-20 pointer-events-auto cursor-pointer ${className}`}
          onClick={handleStatusClick}
        >
          <div className="relative">
            <div className={`bg-muted/95 backdrop-blur-sm text-muted-foreground rounded-full shadow-md ${sizeClasses[size]} overflow-hidden`}>
              <div className="flex items-center gap-0.5 justify-center overflow-hidden">
                {status.emoji && <span className={`${textClasses[size]} flex-shrink-0`}>{status.emoji}</span>}
                <div className="overflow-hidden flex-1 min-w-0">
                  <div className={`whitespace-nowrap ${textClasses[size]}`}>
                    <div className="animate-marquee inline-block">
                      {status.status_text}
                      {status.status_text.length > 12 && (
                        <span className="ml-6">{status.status_text}</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 bg-muted/95 rounded-full" />
          </div>
        </div>
        <StatusViewerDialog
          open={showViewer}
          onOpenChange={setShowViewer}
          status={status}
          userProfile={userProfile}
        />
      </>
    );
  }

  return null;
};

export default UserStatusIndicator;