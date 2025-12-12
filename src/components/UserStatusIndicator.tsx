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

  // Music status - compact white design
  if (status.music_track_name) {
    return (
      <>
        <div 
          className={`absolute -top-7 left-0 z-20 pointer-events-auto cursor-pointer ${className}`}
          onClick={handleStatusClick}
        >
          <div className="relative">
            {/* Compact white music bubble */}
            <div className="bg-white text-gray-800 rounded-full shadow-[0_2px_12px_rgba(0,0,0,0.15)] px-2 py-1 overflow-hidden border border-gray-100 min-w-[70px] max-w-[100px]">
              <div className="flex items-center gap-1.5">
                {/* Album Art */}
                <div className="w-4 h-4 rounded-sm overflow-hidden flex-shrink-0">
                  {status.music_album_art ? (
                    <img src={status.music_album_art} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-emerald-500 flex items-center justify-center">
                      <Music2 className="w-2 h-2 text-white" />
                    </div>
                  )}
                </div>

                {/* Track Info */}
                <div className="flex-1 min-w-0 overflow-hidden">
                  <div className="whitespace-nowrap text-[9px] font-semibold text-gray-800">
                    <div className="animate-marquee inline-block">
                      {status.music_track_name}
                      {status.music_track_name.length > 6 && (
                        <span className="ml-3">{status.music_track_name}</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Play Button */}
                <button
                  onClick={handleStatusClick}
                  className="w-3.5 h-3.5 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0"
                >
                  <Play className="w-2 h-2 text-white ml-px" />
                </button>
              </div>
            </div>
            
            {/* Connector */}
            <div className="absolute -bottom-1 left-3 w-2 h-2 bg-white rounded-full shadow-sm border border-gray-100" />
            <div className="absolute -bottom-2.5 left-4 w-1.5 h-1.5 bg-white rounded-full shadow-sm border border-gray-100" />
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

  // Regular text status - compact white design
  if (status.status_text) {
    return (
      <>
        <div 
          className={`absolute -top-7 left-1/2 -translate-x-1/2 z-20 pointer-events-auto cursor-pointer ${className}`}
          onClick={handleStatusClick}
        >
          <div className="relative">
            {/* Compact white status bubble */}
            <div className="bg-white text-gray-800 rounded-full shadow-[0_2px_12px_rgba(0,0,0,0.15)] px-2.5 py-1 overflow-hidden border border-gray-100 min-w-[50px] max-w-[100px]">
              <div className="flex items-center gap-1 justify-center overflow-hidden">
                {status.emoji && <span className="text-xs flex-shrink-0">{status.emoji}</span>}
                <div className="overflow-hidden flex-1 min-w-0">
                  <div className="whitespace-nowrap text-[10px] font-semibold text-gray-800">
                    <div className="animate-marquee inline-block">
                      {status.status_text}
                      {status.status_text.length > 8 && (
                        <span className="ml-4">{status.status_text}</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Connector */}
            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-white rounded-full shadow-sm border border-gray-100" />
            <div className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 translate-x-0.5 w-1.5 h-1.5 bg-white rounded-full shadow-sm border border-gray-100" />
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