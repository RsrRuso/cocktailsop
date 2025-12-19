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

  // Minimal B&W status bubble
  return (
    <>
      <div 
        className={`absolute -top-6 left-1/2 -translate-x-1/4 z-20 pointer-events-auto cursor-pointer ${className}`}
        onClick={handleStatusClick}
      >
        <div className="relative">
          {/* Minimal pill */}
          <div className="bg-black/70 text-white/90 rounded-full px-2 py-0.5 max-w-[100px]">
            <div className="flex items-center gap-1">
              {/* Small icon */}
              {hasMusic ? (
                <span className="text-[8px]">♪</span>
              ) : status.emoji ? (
                <span className="text-[10px]">{status.emoji}</span>
              ) : null}
              
              {/* Text */}
              <span className="text-[8px] font-medium truncate">
                {hasMusic ? status.music_track_name : status.status_text}
              </span>
              
              {/* Play if music */}
              {hasMusic && (
                <Play className="w-2 h-2 text-white/70 flex-shrink-0" />
              )}
            </div>
          </div>
          
          {/* Small connector */}
          <div className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 bg-black/70 rounded-full" />
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
