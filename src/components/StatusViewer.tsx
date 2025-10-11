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
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/80 to-transparent p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <OptimizedAvatar
              src={status.profiles.avatar_url}
              alt={status.profiles.username}
              className="w-10 h-10 ring-2 ring-white"
            />
            <span className="text-white font-semibold">
              {status.profiles.username}
            </span>
          </div>
          
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-white hover:bg-white/20"
          >
            <X className="w-6 h-6" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-2xl">
          {status.status_text && (
            <div className="relative overflow-hidden bg-gradient-to-r from-primary/20 via-primary/10 to-primary/20 rounded-2xl border border-primary/30 p-8">
              <div className="animate-marquee-slow whitespace-nowrap text-4xl md:text-6xl font-bold text-white">
                {status.status_text}
              </div>
            </div>
          )}

          {status.music_url && (
            <div className="mt-8 flex items-center justify-center gap-4 bg-black/50 backdrop-blur-sm rounded-2xl p-6">
              <Button
                variant="ghost"
                size="lg"
                onClick={toggleMusic}
                className="text-white hover:bg-white/20"
              >
                {isPlaying ? (
                  <Pause className="w-8 h-8" />
                ) : (
                  <Play className="w-8 h-8" />
                )}
              </Button>
              
              <div className="flex-1">
                <div className="flex items-center gap-2 text-white">
                  <Music className="w-5 h-5" />
                  <span className="text-lg font-medium">{status.music_title}</span>
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
          animation: marquee-slow 15s linear infinite;
        }
      `}</style>
    </div>
  );
};

export default StatusViewer;
