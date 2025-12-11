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

  // Music status - bigger with text status below
  if (status.music_track_name) {
    const sizeClasses = {
      sm: 'min-w-[100px] max-w-[140px] py-1 px-2',
      md: 'min-w-[120px] max-w-[160px] py-1.5 px-2.5',
      lg: 'min-w-[140px] max-w-[180px] py-2 px-3'
    };
    
    const textClasses = {
      sm: 'text-[9px]',
      md: 'text-[10px]',
      lg: 'text-[11px]'
    };

    return (
      <>
        <div 
          className={`absolute -top-8 left-1/2 -translate-x-1/2 z-20 pointer-events-auto cursor-pointer ${className}`}
          onClick={handleStatusClick}
        >
          <div className="relative">
            <div className={`bg-black/90 backdrop-blur-md text-white rounded-2xl shadow-lg ${sizeClasses[size]} overflow-hidden`}>
              {/* Music Row */}
              <div className="flex items-center gap-1.5">
                {/* Album Art */}
                <div className="relative w-6 h-6 rounded-md flex-shrink-0 overflow-hidden">
                  {status.music_album_art ? (
                    <img src={status.music_album_art} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-emerald-500/40 flex items-center justify-center">
                      <Music2 className="w-3 h-3" />
                    </div>
                  )}
                </div>

                {/* Track Info with Marquee */}
                <div className="flex-1 min-w-0 overflow-hidden">
                  <div className={`whitespace-nowrap font-semibold text-white ${textClasses[size]}`}>
                    <div className="animate-marquee inline-block">
                      {status.music_track_name}
                      {status.music_track_name && status.music_track_name.length > 10 && (
                        <span className="ml-6">{status.music_track_name}</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Play Button */}
                <button
                  onClick={handleStatusClick}
                  className="w-5 h-5 rounded-full bg-emerald-500/70 hover:bg-emerald-500 flex items-center justify-center flex-shrink-0 transition-colors"
                >
                  <Play className="w-2.5 h-2.5 ml-0.5" />
                </button>
              </div>

              {/* Text Status Below Music */}
              {status.status_text && (
                <div className="mt-1 pt-1 border-t border-white/20 overflow-hidden">
                  <div className="flex items-center gap-1 justify-center">
                    {status.emoji && <span className="text-[10px]">{status.emoji}</span>}
                    <div className={`whitespace-nowrap font-medium text-white/90 ${textClasses[size]}`}>
                      <div className="animate-marquee inline-block">
                        {status.status_text}
                        {status.status_text.length > 12 && (
                          <span className="ml-6">{status.status_text}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            {/* Connector */}
            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-black/90 rounded-full" />
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

  // Regular text status with marquee - smaller dark background with bright text
  if (status.status_text) {
    const sizeClasses = {
      sm: 'min-w-[50px] max-w-[90px] py-0.5 px-1.5',
      md: 'min-w-[60px] max-w-[100px] py-0.5 px-2',
      lg: 'min-w-[70px] max-w-[110px] py-1 px-2'
    };
    
    const textClasses = {
      sm: 'text-[8px]',
      md: 'text-[9px]',
      lg: 'text-[10px]'
    };

    return (
      <>
        <div 
          className={`absolute -top-4 left-1/2 -translate-x-1/2 z-20 pointer-events-auto cursor-pointer ${className}`}
          onClick={handleStatusClick}
        >
          <div className="relative">
            <div className={`bg-black/80 backdrop-blur-sm rounded-full shadow-md ${sizeClasses[size]} overflow-hidden`}>
              <div className="flex items-center gap-0.5 justify-center overflow-hidden">
                {status.emoji && <span className={`${textClasses[size]} flex-shrink-0`}>{status.emoji}</span>}
                <div className="overflow-hidden flex-1 min-w-0">
                  <div className={`whitespace-nowrap ${textClasses[size]} font-semibold text-white`}>
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
            <div className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 bg-black/80 rounded-full" />
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