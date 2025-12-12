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

  // Music status - premium design with glassmorphism
  if (status.music_track_name) {
    const sizeClasses = {
      sm: 'min-w-[85px] max-w-[115px] py-1.5 px-2.5',
      md: 'min-w-[95px] max-w-[125px] py-2 px-3',
      lg: 'min-w-[105px] max-w-[135px] py-2 px-3'
    };
    
    const textClasses = {
      sm: 'text-[8px]',
      md: 'text-[9px]',
      lg: 'text-[10px]'
    };

    return (
      <>
        <div 
          className={`absolute -top-10 left-0 z-20 pointer-events-auto cursor-pointer ${className}`}
          onClick={handleStatusClick}
        >
          <div className="relative">
            {/* Premium glassmorphism music status */}
            <div className={`bg-black/85 backdrop-blur-xl text-white rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.4),0_0_0_1px_rgba(255,255,255,0.1)_inset] ${sizeClasses[size]} overflow-hidden`}>
              {/* Music Row */}
              <div className="flex items-center gap-2">
                {/* Album Art with glow */}
                <div className="relative w-5 h-5 rounded-md flex-shrink-0 overflow-hidden shadow-[0_0_10px_rgba(16,185,129,0.3)]">
                  {status.music_album_art ? (
                    <img src={status.music_album_art} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center">
                      <Music2 className="w-2.5 h-2.5" />
                    </div>
                  )}
                </div>

                {/* Track Info with Marquee */}
                <div className="flex-1 min-w-0 overflow-hidden">
                  <div className={`whitespace-nowrap font-semibold text-white ${textClasses[size]}`}>
                    <div className="animate-marquee inline-block">
                      {status.music_track_name}
                      {status.music_track_name && status.music_track_name.length > 8 && (
                        <span className="ml-4">{status.music_track_name}</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Play Button with gradient */}
                <button
                  onClick={handleStatusClick}
                  className="w-4 h-4 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 hover:from-emerald-300 hover:to-emerald-500 flex items-center justify-center flex-shrink-0 shadow-[0_2px_8px_rgba(16,185,129,0.4)] transition-all"
                >
                  <Play className="w-2 h-2 ml-px" />
                </button>
              </div>

              {/* Text Status Below Music */}
              {status.status_text && (
                <div className="mt-1 pt-1 border-t border-white/10 overflow-hidden">
                  <div className="flex items-center gap-1 justify-center">
                    {status.emoji && <span className="text-[8px]">{status.emoji}</span>}
                    <div className={`whitespace-nowrap text-white/80 ${textClasses[size]}`}>
                      <div className="animate-marquee inline-block">
                        {status.status_text}
                        {status.status_text.length > 10 && (
                          <span className="ml-4">{status.status_text}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            {/* Connector dots */}
            <div className="absolute -bottom-1.5 left-5 w-2.5 h-2.5 bg-black/85 rounded-full shadow-[0_2px_8px_rgba(0,0,0,0.3)]" />
            <div className="absolute -bottom-3 left-6 w-1.5 h-1.5 bg-black/85 rounded-full shadow-[0_2px_6px_rgba(0,0,0,0.25)]" />
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

  // Regular text status - unified design matching StatusRing
  if (status.status_text) {
    const sizeClasses = {
      sm: 'min-w-[60px] max-w-[100px] py-1.5 px-2.5',
      md: 'min-w-[70px] max-w-[110px] py-2 px-3',
      lg: 'min-w-[80px] max-w-[120px] py-2 px-3'
    };
    
    const textClasses = {
      sm: 'text-[9px]',
      md: 'text-[10px]',
      lg: 'text-[11px]'
    };

    return (
      <>
        <div 
          className={`absolute -top-10 left-1/2 -translate-x-1/2 z-20 pointer-events-auto cursor-pointer ${className}`}
          onClick={handleStatusClick}
        >
          <div className="relative">
            {/* Premium glassmorphism status bubble */}
            <div className={`bg-black/85 backdrop-blur-xl rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.4),0_0_0_1px_rgba(255,255,255,0.1)_inset] ${sizeClasses[size]} overflow-hidden`}>
              <div className="flex items-center gap-1.5 justify-center overflow-hidden">
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
            {/* Speech bubble connector dots */}
            <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-2.5 h-2.5 bg-black/85 rounded-full shadow-[0_2px_8px_rgba(0,0,0,0.3)]" />
            <div className="absolute -bottom-3.5 left-1/2 -translate-x-1/2 translate-x-0.5 w-1.5 h-1.5 bg-black/85 rounded-full shadow-[0_2px_6px_rgba(0,0,0,0.25)]" />
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