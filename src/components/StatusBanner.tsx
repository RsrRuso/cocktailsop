import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Play, Pause, Music } from "lucide-react";
import { Button } from "@/components/ui/button";
import OptimizedAvatar from "./OptimizedAvatar";

interface UserStatus {
  id: string;
  user_id: string;
  status_text: string | null;
  music_url: string | null;
  music_title: string | null;
  profiles: {
    username: string;
    avatar_url: string | null;
  };
}

interface TypingUser {
  user_id: string;
  username: string;
  avatar_url: string | null;
}

const StatusBanner = () => {
  const [statuses, setStatuses] = useState<UserStatus[]>([]);
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const [currentAudio, setCurrentAudio] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    fetchStatuses();

    const statusChannel = supabase
      .channel("user_status_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "user_status",
        },
        () => {
          fetchStatuses();
        }
      )
      .subscribe();

    const presenceChannel = supabase.channel("global-typing");
    
    presenceChannel
      .on("presence", { event: "sync" }, () => {
        const state: any = presenceChannel.presenceState();
        const users: TypingUser[] = [];
        
        Object.values(state).forEach((presence: any) => {
          if (presence[0]?.typing) {
            users.push({
              user_id: presence[0].user_id,
              username: presence[0].username,
              avatar_url: presence[0].avatar_url,
            });
          }
        });
        
        setTypingUsers(users);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(statusChannel);
      supabase.removeChannel(presenceChannel);
    };
  }, []);

  const fetchStatuses = async () => {
    const { data } = await supabase
      .from("user_status")
      .select(`
        *,
        profiles:user_id (username, avatar_url)
      `)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(5);

    if (data) {
      setStatuses(data as any);
    }
  };

  const toggleMusic = (musicUrl: string) => {
    if (currentAudio === musicUrl) {
      audioRef.current?.pause();
      setCurrentAudio(null);
    } else {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      audioRef.current = new Audio(musicUrl);
      audioRef.current.play();
      setCurrentAudio(musicUrl);
      
      audioRef.current.onended = () => {
        setCurrentAudio(null);
      };
    }
  };

  if (statuses.length === 0 && typingUsers.length === 0) {
    return null;
  }

  return (
    <div className="fixed top-16 left-0 right-0 z-40 bg-gradient-to-r from-primary/20 via-primary/10 to-primary/20 border-b overflow-hidden">
      <div className="animate-marquee whitespace-nowrap py-3 flex items-center gap-8">
        {statuses.map((status) => (
          <div key={status.id} className="inline-flex items-center gap-3 px-4">
            <OptimizedAvatar
              src={status.profiles.avatar_url}
              alt={status.profiles.username}
              className="w-8 h-8 ring-2 ring-primary"
            />
            
            {status.music_url ? (
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleMusic(status.music_url!)}
                  className="h-8"
                >
                  {currentAudio === status.music_url ? (
                    <Pause className="w-4 h-4" />
                  ) : (
                    <Play className="w-4 h-4" />
                  )}
                </Button>
                <Music className="w-4 h-4" />
                <span className="font-medium">{status.music_title}</span>
              </div>
            ) : (
              <span className="text-sm font-medium">{status.status_text}</span>
            )}
          </div>
        ))}

        {typingUsers.map((user) => (
          <div key={user.user_id} className="inline-flex items-center gap-3 px-4">
            <OptimizedAvatar
              src={user.avatar_url}
              alt={user.username}
              className="w-8 h-8"
            />
            <span className="text-sm">
              <span className="font-medium">{user.username}</span> is typing
              <span className="animate-pulse">...</span>
            </span>
          </div>
        ))}
      </div>

      <style>{`
        @keyframes marquee {
          0% { transform: translateX(100%); }
          100% { transform: translateX(-100%); }
        }
        .animate-marquee {
          animation: marquee 30s linear infinite;
        }
      `}</style>
    </div>
  );
};

export default StatusBanner;
