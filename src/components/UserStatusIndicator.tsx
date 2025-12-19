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

  // Compact status badge under avatar (no overlap)
  return (
    <>
      {/* Status indicator shown as small icon on avatar - no floating bubble */}
      <div 
        className={`absolute -bottom-0.5 left-0 z-10 pointer-events-auto cursor-pointer ${className}`}
        onClick={handleStatusClick}
      >
        {hasMusic ? (
          <div className="w-4 h-4 rounded-full bg-gradient-to-r from-pink-500 to-purple-500 flex items-center justify-center shadow-lg ring-2 ring-background">
            <Play className="w-2 h-2 text-white fill-white" />
          </div>
        ) : (
          <div className="w-4 h-4 rounded-full bg-zinc-800 flex items-center justify-center shadow-lg ring-2 ring-background">
            <span className="text-[8px]">{status.emoji || '💬'}</span>
          </div>
        )}
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
