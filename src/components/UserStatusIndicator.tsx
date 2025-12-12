import { useState } from "react";
import { Music2, Play } from "lucide-react";
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

  // Music status - compact black & white with animation
  if (status.music_track_name) {
    return (
      <>
        <div 
          className={`absolute -top-8 left-0 z-20 pointer-events-auto cursor-pointer animate-fade-in ${className}`}
          onClick={handleStatusClick}
        >
          <div className="relative group">
            {/* Compact black music bubble with shimmer */}
            <div className="relative bg-black text-white rounded-full shadow-[0_4px_16px_rgba(0,0,0,0.25)] px-2.5 py-1.5 overflow-hidden min-w-[80px] max-w-[110px]">
              {/* Shimmer effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full animate-[shimmer_2s_infinite]" />
              
              <div className="relative flex items-center gap-1.5">
                {/* Album Art */}
                <div className="w-4 h-4 rounded-sm overflow-hidden flex-shrink-0 ring-1 ring-white/20">
                  {status.music_album_art ? (
                    <img src={status.music_album_art} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-white/20 flex items-center justify-center">
                      <Music2 className="w-2.5 h-2.5 text-white" />
                    </div>
                  )}
                </div>

                {/* Track Info */}
                <div className="flex-1 min-w-0 overflow-hidden">
                  <div className="whitespace-nowrap text-[9px] font-semibold text-white tracking-wide">
                    <div className="animate-marquee inline-block">
                      {status.music_track_name}
                      {status.music_track_name.length > 8 && (
                        <span className="ml-4">{status.music_track_name}</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Play Button */}
                <button
                  onClick={handleStatusClick}
                  className="w-4 h-4 rounded-full bg-white flex items-center justify-center flex-shrink-0 hover:scale-110 transition-transform"
                >
                  <Play className="w-2 h-2 text-black ml-px" />
                </button>
              </div>
            </div>
            
            {/* Connector dots */}
            <div className="absolute -bottom-1 left-4 w-2 h-2 bg-black rounded-full shadow-md" />
            <div className="absolute -bottom-2.5 left-5 w-1.5 h-1.5 bg-black rounded-full shadow-sm" />
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

  // Regular text status - compact black & white with animation
  if (status.status_text) {
    return (
      <>
        <div 
          className={`absolute -top-8 left-1/2 -translate-x-1/2 z-20 pointer-events-auto cursor-pointer animate-fade-in ${className}`}
          onClick={handleStatusClick}
        >
          <div className="relative group">
            {/* Compact black status bubble with shimmer */}
            <div className="relative bg-black text-white rounded-full shadow-[0_4px_16px_rgba(0,0,0,0.25)] px-3 py-1.5 overflow-hidden min-w-[60px] max-w-[110px]">
              {/* Shimmer effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full animate-[shimmer_2s_infinite]" />
              
              <div className="relative flex items-center gap-1.5 justify-center overflow-hidden">
                {status.emoji && <span className="text-sm flex-shrink-0">{status.emoji}</span>}
                <div className="overflow-hidden flex-1 min-w-0">
                  <div className="whitespace-nowrap text-[10px] font-semibold text-white tracking-wide">
                    <div className="animate-marquee inline-block">
                      {status.status_text}
                      {status.status_text.length > 10 && (
                        <span className="ml-6">{status.status_text}</span>
                      )}
                    </div>
                  </div>
                </div>
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
  }

  return null;
};

export default UserStatusIndicator;