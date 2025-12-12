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

  // Music status - premium design with animated effects
  if (status.music_track_name) {
    const sizeClasses = {
      sm: 'min-w-[90px] max-w-[130px] py-2 px-3',
      md: 'min-w-[100px] max-w-[140px] py-2.5 px-3.5',
      lg: 'min-w-[110px] max-w-[150px] py-2.5 px-4'
    };
    
    const textClasses = {
      sm: 'text-[9px]',
      md: 'text-[10px]',
      lg: 'text-[11px]'
    };

    return (
      <>
        <div 
          className={`absolute -top-12 left-0 z-20 pointer-events-auto cursor-pointer ${className}`}
          onClick={handleStatusClick}
        >
          <div className="relative group">
            {/* Outer glow effect - emerald for music */}
            <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500/40 via-teal-500/40 to-cyan-500/40 rounded-3xl blur-lg opacity-80 group-hover:opacity-100 transition-opacity animate-pulse" />
            
            {/* Animated gradient border */}
            <div className="absolute -inset-[1px] bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 rounded-2xl opacity-70" />
            
            {/* Main content */}
            <div className={`relative bg-gradient-to-br from-gray-900/95 via-gray-800/95 to-gray-900/95 backdrop-blur-2xl text-white rounded-2xl ${sizeClasses[size]} overflow-hidden`}>
              {/* Shimmer effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full animate-[shimmer_2s_infinite]" />
              
              {/* Inner glow */}
              <div className="absolute inset-0 bg-gradient-to-t from-emerald-500/15 to-transparent" />
              
              {/* Music Row */}
              <div className="relative flex items-center gap-2.5">
                {/* Album Art with animated ring */}
                <div className="relative">
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-400 to-cyan-400 rounded-lg animate-[spin_3s_linear_infinite] opacity-60" />
                  <div className="relative w-6 h-6 rounded-md overflow-hidden">
                    {status.music_album_art ? (
                      <img src={status.music_album_art} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center">
                        <Music2 className="w-3 h-3" />
                      </div>
                    )}
                  </div>
                </div>

                {/* Track Info with Marquee */}
                <div className="flex-1 min-w-0 overflow-hidden">
                  <div className={`whitespace-nowrap font-bold text-white tracking-wide ${textClasses[size]}`}>
                    <div className="animate-marquee inline-block">
                      {status.music_track_name}
                      {status.music_track_name && status.music_track_name.length > 8 && (
                        <span className="ml-6">{status.music_track_name}</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Play Button with pulsing effect */}
                <button
                  onClick={handleStatusClick}
                  className="relative w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 group/play"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-full animate-pulse opacity-50" />
                  <div className="relative w-full h-full bg-gradient-to-br from-emerald-400 to-teal-500 rounded-full flex items-center justify-center shadow-[0_0_12px_rgba(16,185,129,0.6)] group-hover/play:shadow-[0_0_20px_rgba(16,185,129,0.8)] transition-shadow">
                    <Play className="w-2.5 h-2.5 ml-0.5" />
                  </div>
                </button>
              </div>

              {/* Text Status Below Music */}
              {status.status_text && (
                <div className="relative mt-1.5 pt-1.5 border-t border-white/10 overflow-hidden">
                  <div className="flex items-center gap-1.5 justify-center">
                    {status.emoji && <span className="text-[9px] drop-shadow-[0_0_6px_rgba(255,255,255,0.4)]">{status.emoji}</span>}
                    <div className={`whitespace-nowrap text-white/90 font-medium ${textClasses[size]}`}>
                      <div className="animate-marquee inline-block">
                        {status.status_text}
                        {status.status_text.length > 10 && (
                          <span className="ml-6">{status.status_text}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            {/* Premium connector dots */}
            <div className="absolute -bottom-2 left-6 w-3 h-3 bg-gradient-to-br from-gray-800 to-gray-900 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.4),0_2px_8px_rgba(0,0,0,0.5)] border border-emerald-500/30" />
            <div className="absolute -bottom-4 left-7 w-2 h-2 bg-gradient-to-br from-gray-800 to-gray-900 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.3),0_2px_6px_rgba(0,0,0,0.4)] border border-emerald-500/20" />
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

  // Regular text status - unified premium design
  if (status.status_text) {
    const sizeClasses = {
      sm: 'min-w-[70px] max-w-[120px] py-2 px-3',
      md: 'min-w-[80px] max-w-[130px] py-2.5 px-3.5',
      lg: 'min-w-[90px] max-w-[140px] py-2.5 px-4'
    };
    
    const textClasses = {
      sm: 'text-[10px]',
      md: 'text-[11px]',
      lg: 'text-[12px]'
    };

    return (
      <>
        <div 
          className={`absolute -top-12 left-1/2 -translate-x-1/2 z-20 pointer-events-auto cursor-pointer ${className}`}
          onClick={handleStatusClick}
        >
          <div className="relative group">
            {/* Outer glow effect - violet/fuchsia for text status */}
            <div className="absolute -inset-1 bg-gradient-to-r from-violet-500/30 via-fuchsia-500/30 to-pink-500/30 rounded-3xl blur-lg opacity-75 group-hover:opacity-100 transition-opacity animate-pulse" />
            
            {/* Animated gradient border */}
            <div className="absolute -inset-[1px] bg-gradient-to-r from-violet-500 via-fuchsia-500 to-pink-500 rounded-2xl opacity-60" />
            
            {/* Main content */}
            <div className={`relative bg-gradient-to-br from-gray-900/95 via-gray-800/95 to-gray-900/95 backdrop-blur-2xl rounded-2xl ${sizeClasses[size]} overflow-hidden`}>
              {/* Shimmer effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full animate-[shimmer_2s_infinite]" />
              
              {/* Inner glow */}
              <div className="absolute inset-0 bg-gradient-to-t from-violet-500/10 to-transparent" />
              
              <div className="relative flex items-center gap-2 justify-center overflow-hidden">
                {status.emoji && (
                  <span className={`${textClasses[size]} flex-shrink-0 text-base drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]`}>
                    {status.emoji}
                  </span>
                )}
                <div className="overflow-hidden flex-1 min-w-0">
                  <div className={`whitespace-nowrap ${textClasses[size]} font-bold text-white tracking-wide`}>
                    <div className="animate-marquee inline-block">
                      {status.status_text}
                      {status.status_text.length > 10 && (
                        <span className="ml-8">{status.status_text}</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Premium connector dots */}
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-3 h-3 bg-gradient-to-br from-gray-800 to-gray-900 rounded-full shadow-[0_0_10px_rgba(139,92,246,0.4),0_2px_8px_rgba(0,0,0,0.5)] border border-violet-500/30" />
            <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 translate-x-1 w-2 h-2 bg-gradient-to-br from-gray-800 to-gray-900 rounded-full shadow-[0_0_8px_rgba(139,92,246,0.3),0_2px_6px_rgba(0,0,0,0.4)] border border-violet-500/20" />
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