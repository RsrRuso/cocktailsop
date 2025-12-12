import { useState } from "react";
import { Play } from "lucide-react";
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
  const [showViewer, setShowViewer] = useState(false);

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

  const handleStatusClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowViewer(true);
  };

  if (!status) return null;
  
  const hasMusic = !!status.music_track_name;
  const hasText = !!status.status_text;
  
  if (!hasMusic && !hasText) return null;

  // Combined music + status text bubble
  return (
    <>
      <div 
        className={`absolute -top-8 left-1/2 -translate-x-1/4 z-20 pointer-events-auto cursor-pointer animate-fade-in ${className}`}
        onClick={handleStatusClick}
      >
        <div className="relative group">
          {/* Compact black bubble with shimmer */}
          <div className="relative bg-black text-white rounded-full shadow-[0_4px_16px_rgba(0,0,0,0.25)] px-2.5 py-1.5 overflow-hidden min-w-[70px] max-w-[140px]">
            {/* Shimmer effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full animate-[shimmer_2s_infinite]" />
            
            <div className="relative flex items-center gap-1.5">
              {/* Album Art if music */}
              {hasMusic && (
                <div className="w-4 h-4 rounded-sm overflow-hidden flex-shrink-0 ring-1 ring-white/20">
                  {status.music_album_art ? (
                    <img src={status.music_album_art} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-white/20 flex items-center justify-center">
                      <span className="text-[8px]">🎵</span>
                    </div>
                  )}
                </div>
              )}
              
              {/* Emoji if no music */}
              {!hasMusic && status.emoji && (
                <span className="text-sm flex-shrink-0">{status.emoji}</span>
              )}

              {/* Combined text - music + status */}
              <div className="flex-1 min-w-0 overflow-hidden">
                <div className="whitespace-nowrap text-[9px] font-semibold text-white tracking-wide">
                  <div className="animate-marquee inline-block">
                    {hasMusic && hasText ? (
                      <>
                        {status.music_track_name} {status.emoji && <span>{status.emoji}</span>} {status.status_text}
                        <span className="ml-6">{status.music_track_name} {status.emoji && <span>{status.emoji}</span>} {status.status_text}</span>
                      </>
                    ) : hasMusic ? (
                      <>
                        {status.music_track_name}
                        {status.music_track_name!.length > 10 && <span className="ml-6">{status.music_track_name}</span>}
                      </>
                    ) : hasText ? (
                      <>
                        {status.status_text}
                        {status.status_text!.length > 10 && <span className="ml-6">{status.status_text}</span>}
                      </>
                    ) : null}
                  </div>
                </div>
              </div>

              {/* Play Button if music */}
              {hasMusic && (
                <button
                  onClick={handleStatusClick}
                  className="w-4 h-4 rounded-full bg-white flex items-center justify-center flex-shrink-0 hover:scale-110 transition-transform"
                >
                  <Play className="w-2 h-2 text-black ml-px" />
                </button>
              )}
            </div>
          </div>
          
          {/* Connector dots */}
          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-black rounded-full shadow-md" />
          <div className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 translate-x-0.5 w-1.5 h-1.5 bg-black rounded-full shadow-sm" />
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
};

export default UserStatusIndicator;