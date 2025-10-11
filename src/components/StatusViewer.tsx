import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { X, RotateCcw, Music2 } from "lucide-react";
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
        audioRef.current.loop = false;
        audioRef.current.play();
        setIsPlaying(true);
        
        audioRef.current.onended = () => {
          setIsPlaying(false);
        };
      }
    }
  };

  const handleReplay = () => {
    if (!audioRef.current) return;
    
    audioRef.current.currentTime = 0;
    audioRef.current.play();
    setIsPlaying(true);
  };

  if (!status) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex items-center justify-center p-4">
      <div className="relative w-full max-w-sm">
        {/* Close Button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="absolute -top-14 right-0 text-white hover:bg-white/10 rounded-full"
        >
          <X className="w-6 h-6" />
        </Button>

        {/* Main Card */}
        <div className="relative flex flex-col items-center gap-4">
          {/* Avatar with Gradient Ring */}
          <div className="relative">
            <div className="absolute -inset-1.5 rounded-full bg-gradient-to-br from-purple-500 via-pink-500 to-rose-500 opacity-90 blur"></div>
            <div className="relative rounded-full bg-gradient-to-br from-purple-400 via-pink-500 to-rose-500 p-[3px]">
              <div className="bg-black rounded-full p-[3px]">
                <OptimizedAvatar
                  src={status.profiles.avatar_url}
                  alt={status.profiles.username}
                  className="w-28 h-28"
                />
              </div>
            </div>
            
            {/* Status Bubble Above Avatar */}
            {status.status_text && (
              <div className="absolute -top-16 left-1/2 -translate-x-1/2 w-max max-w-[280px]">
                <div className="relative bg-white rounded-3xl px-5 py-3 shadow-2xl overflow-hidden">
                  <div className="overflow-hidden whitespace-nowrap">
                    <div className="inline-block animate-scroll-text">
                      <span className="text-sm font-medium text-black px-4">
                        {status.status_text}
                      </span>
                      <span className="text-sm font-medium text-black px-4">
                        {status.status_text}
                      </span>
                    </div>
                  </div>
                  {/* Triangle pointer */}
                  <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-0 h-0 border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent border-t-white"></div>
                </div>
              </div>
            )}
          </div>

          {/* Username */}
          <h3 className="text-xl font-semibold text-white">
            {status.profiles.username}
          </h3>

          {/* Music Player */}
          {status.music_url && (
            <div className="w-full bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/20">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-400 to-pink-500 flex items-center justify-center shrink-0">
                  <Music2 className="w-6 h-6 text-white" />
                </div>
                
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">
                    {status.music_title || "Unknown Track"}
                  </p>
                  <p className="text-xs text-white/70">
                    {isPlaying ? "Now Playing..." : "Tap to replay"}
                  </p>
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleReplay}
                  className="shrink-0 text-white hover:bg-white/20 rounded-full"
                >
                  <RotateCcw className="w-5 h-5" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes scroll-text {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }
        .animate-scroll-text {
          animation: scroll-text 10s linear infinite;
        }
      `}</style>
    </div>
  );
};

export default StatusViewer;
