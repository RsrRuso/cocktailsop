import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { X, Play, Pause, Music } from "lucide-react";
import { Button } from "@/components/ui/button";
import OptimizedAvatar from "./OptimizedAvatar";

interface UserStatus {
  id: string;
  user_id: string;
  status_text: string | null;
  music_url: string | null;
  music_title: string | null;
  created_at: string;
  profiles: {
    username: string;
    avatar_url: string | null;
  };
}

interface StatusViewerProps {
  userId: string;
  onClose: () => void;
}

const StatusViewer = ({ userId, onClose }: StatusViewerProps) => {
  const [status, setStatus] = useState<UserStatus | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    fetchStatus();
    
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [userId]);

  const fetchStatus = async () => {
    const { data } = await supabase
      .from("user_status")
      .select(`
        *,
        profiles:user_id (username, avatar_url)
      `)
      .eq("user_id", userId)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (data) {
      setStatus(data as any);
      if (data.music_url) {
        audioRef.current = new Audio(data.music_url);
        audioRef.current.play();
        setIsPlaying(true);
        
        audioRef.current.onended = () => {
          setIsPlaying(false);
        };
      }
    }
  };

  const toggleMusic = () => {
    if (!audioRef.current) return;
    
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  if (!status) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="relative max-w-md w-full">
        {/* Close Button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="absolute -top-12 right-0 text-white hover:bg-white/20 z-20"
        >
          <X className="w-6 h-6" />
        </Button>

        {/* Status Card */}
        <div className="relative flex flex-col items-center">
          {/* Status Bubble */}
          {status.status_text && (
            <div className="mb-4 px-6 py-3 bg-muted/90 backdrop-blur-sm rounded-3xl shadow-2xl max-w-[280px] overflow-hidden">
              <div className="animate-marquee-slow whitespace-nowrap text-sm font-medium text-foreground">
                {status.status_text}
              </div>
            </div>
          )}

          {/* Avatar */}
          <div className="relative">
            <div className="absolute -inset-2 rounded-full bg-gradient-to-br from-purple-500 via-pink-500 to-rose-500 opacity-75 blur-lg"></div>
            <div className="relative rounded-full bg-gradient-to-br from-purple-400 via-pink-500 to-rose-500 p-1 shadow-2xl">
              <div className="bg-background rounded-full p-1">
                <OptimizedAvatar
                  src={status.profiles.avatar_url}
                  alt={status.profiles.username}
                  className="w-32 h-32"
                />
              </div>
            </div>
          </div>

          {/* Username */}
          <h3 className="mt-4 text-xl font-bold text-white">
            {status.profiles.username}
          </h3>

          {/* Music Player */}
          {status.music_url && (
            <div className="mt-6 w-full bg-muted/50 backdrop-blur-sm rounded-2xl p-4 border border-border/50">
              <div className="flex items-center gap-4">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleMusic}
                  className="text-white hover:bg-white/20 shrink-0"
                >
                  {isPlaying ? (
                    <Pause className="w-6 h-6" />
                  ) : (
                    <Play className="w-6 h-6" />
                  )}
                </Button>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 text-white">
                    <Music className="w-4 h-4 shrink-0" />
                    <span className="text-sm font-medium truncate">{status.music_title}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes marquee-slow {
          0% { transform: translateX(100%); }
          100% { transform: translateX(-100%); }
        }
        .animate-marquee-slow {
          animation: marquee-slow 8s linear infinite;
        }
      `}</style>
    </div>
  );
};

export default StatusViewer;
