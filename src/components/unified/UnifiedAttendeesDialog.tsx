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
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            Event Attendees
          </DialogTitle>
          <DialogDescription>
            {attendees.length} {attendees.length === 1 ? 'person is' : 'people are'} attending this event
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh]">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : attendees.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No attendees yet
            </div>
          ) : (
            <div className="space-y-3">
              {attendees.map((attendee) => (
                <div
                  key={attendee.user_id}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={() => {
                    navigate(`/user/${attendee.user_id}`);
                    onOpenChange(false);
                  }}
                >
                  <Avatar className="w-12 h-12">
                    <AvatarImage src={attendee.profiles.avatar_url || undefined} />
                    <AvatarFallback>{attendee.profiles.username[0]}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{attendee.profiles.full_name}</p>
                    <p className="text-sm text-muted-foreground truncate">
                      @{attendee.profiles.username}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(attendee.created_at), { addSuffix: true })}
                  </span>
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
