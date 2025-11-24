import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { Users } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useNavigate } from "react-router-dom";

interface Attendee {
  user_id: string;
  created_at: string;
  profiles: {
    username: string;
    avatar_url: string | null;
    full_name: string;
  };
}

interface UnifiedAttendeesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventId: string;
}

const UnifiedAttendeesDialog = ({ open, onOpenChange, eventId }: UnifiedAttendeesDialogProps) => {
  const navigate = useNavigate();
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open && eventId) {
      fetchAttendees();
    }
  }, [open, eventId]);

  const fetchAttendees = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('event_attendees')
        .select(`
          user_id,
          created_at,
          profiles!inner (username, avatar_url, full_name)
        `)
        .eq('event_id', eventId)
        .order("created_at", { ascending: false });

      if (!error && data) {
        setAttendees(data.map((item: any) => ({
          user_id: item.user_id,
          created_at: item.created_at,
          profiles: item.profiles
        })));
      }
    } catch (err) {
      console.error('Error fetching attendees:', err);
    }
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md sm:max-w-lg max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-3 border-b shrink-0">
          <DialogTitle className="flex items-center gap-2 text-lg sm:text-xl">
            <Users className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
            Event Attendees
          </DialogTitle>
          <DialogDescription className="text-sm sm:text-base">
            {attendees.length} {attendees.length === 1 ? 'person is' : 'people are'} attending this event
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 px-4 sm:px-6 py-2">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
            </div>
          ) : attendees.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p>No attendees yet</p>
            </div>
          ) : (
            <div className="space-y-2 pb-4">
              {attendees.map((attendee) => (
                <div
                  key={attendee.user_id}
                  className="flex items-center gap-3 p-3 sm:p-4 rounded-xl hover:bg-accent/50 active:bg-accent transition-all cursor-pointer group"
                  onClick={() => {
                    navigate(`/user/${attendee.user_id}`);
                    onOpenChange(false);
                  }}
                >
                  <Avatar className="w-12 h-12 sm:w-14 sm:h-14 ring-2 ring-transparent group-hover:ring-primary/20 transition-all">
                    <AvatarImage src={attendee.profiles.avatar_url || undefined} />
                    <AvatarFallback className="text-base sm:text-lg font-semibold bg-primary/10">
                      {attendee.profiles.username[0]?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm sm:text-base truncate">{attendee.profiles.full_name}</p>
                    <p className="text-xs sm:text-sm text-muted-foreground truncate">
                      @{attendee.profiles.username}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0 hidden sm:block">
                    {formatDistanceToNow(new Date(attendee.created_at), { addSuffix: true })}
                  </span>
                  <div className="shrink-0 w-8 h-8 rounded-full bg-green-500/10 flex items-center justify-center">
                    <Users className="w-4 h-4 text-green-600" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default UnifiedAttendeesDialog;
