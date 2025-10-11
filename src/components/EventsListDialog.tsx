import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { Heart, MessageCircle, Users, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { EventDetailDialog } from './EventDetailDialog';
import { EventCommentsDialog } from './EventCommentsDialog';
import OptimizedAvatar from './OptimizedAvatar';

interface EventLike {
  id: string;
  user_id: string;
  profiles: {
    username: string;
    avatar_url: string | null;
    full_name: string;
  } | null;
}

interface EventLikesDialogProps {
  eventId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const EventLikesDialog = ({ eventId, open, onOpenChange }: EventLikesDialogProps) => {
  const [likes, setLikes] = useState<EventLike[]>([]);

  useEffect(() => {
    if (open && eventId) {
      fetchLikes();
    }
  }, [open, eventId]);

  const fetchLikes = async () => {
    const { data } = await supabase
      .from('event_likes')
      .select('id, user_id, profiles!event_likes_user_id_fkey(username, avatar_url, full_name)')
      .eq('event_id', eventId);

    if (data) setLikes(data as unknown as EventLike[]);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Likes ({likes.length})</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 max-h-[60vh] overflow-y-auto">
          {likes.map((like) => (
            <div key={like.id} className="flex items-center gap-3">
              <OptimizedAvatar
                src={like.profiles?.avatar_url}
                alt={like.profiles?.username || 'User'}
                className="w-10 h-10"
                showStatus={false}
              />
              <div>
                <p className="font-semibold">{like.profiles?.full_name}</p>
                <p className="text-sm text-muted-foreground">@{like.profiles?.username}</p>
              </div>
            </div>
          ))}
          {likes.length === 0 && (
            <p className="text-center text-muted-foreground py-8">No likes yet</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

interface Event {
  id: string;
  title: string;
  description: string | null;
  event_date: string | null;
  region: string;
  user_id: string;
  like_count?: number;
  comment_count?: number;
  attendee_count?: number;
}

interface EventsListDialogProps {
  region: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface Attendee {
  id: string;
  user_id: string;
  profiles: {
    username: string;
    avatar_url: string | null;
    full_name: string;
  } | null;
}

interface AttendeesDialogProps {
  eventId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const AttendeesDialog = ({ eventId, open, onOpenChange }: AttendeesDialogProps) => {
  const [attendees, setAttendees] = useState<Attendee[]>([]);

  useEffect(() => {
    if (open && eventId) {
      fetchAttendees();
    }
  }, [open, eventId]);

  const fetchAttendees = async () => {
    const { data } = await supabase
      .from('event_attendees')
      .select('id, user_id, profiles!event_attendees_user_id_fkey(username, avatar_url, full_name)')
      .eq('event_id', eventId);

    if (data) setAttendees(data as unknown as Attendee[]);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Going ({attendees.length})</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 max-h-[60vh] overflow-y-auto">
          {attendees.map((attendee) => (
            <div key={attendee.id} className="flex items-center gap-3">
              <OptimizedAvatar
                src={attendee.profiles?.avatar_url}
                alt={attendee.profiles?.username || 'User'}
                className="w-10 h-10"
                showStatus={false}
              />
              <div>
                <p className="font-semibold">{attendee.profiles?.full_name}</p>
                <p className="text-sm text-muted-foreground">@{attendee.profiles?.username}</p>
              </div>
            </div>
          ))}
          {attendees.length === 0 && (
            <p className="text-center text-muted-foreground py-8">No one is going yet</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export const EventsListDialog = ({ region, open, onOpenChange }: EventsListDialogProps) => {
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [likesDialogOpen, setLikesDialogOpen] = useState(false);
  const [commentsDialogOpen, setCommentsDialogOpen] = useState(false);
  const [attendeesDialogOpen, setAttendeesDialogOpen] = useState(false);

  useEffect(() => {
    if (open) {
      fetchEvents();
    }
  }, [open, region]);

  const fetchEvents = async () => {
    const { data } = await supabase
      .from('events')
      .select('id, title, description, event_date, region, user_id, like_count, comment_count, attendee_count')
      .eq('region', region)
      .eq('is_active', true)
      .order('event_date', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: false });

    if (data) setEvents(data);
  };

  const handleEventClick = (event: Event) => {
    setSelectedEvent(event);
    setDetailDialogOpen(true);
  };

  const handleLikesClick = (event: Event, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedEvent(event);
    setLikesDialogOpen(true);
  };

  const handleCommentsClick = (event: Event, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedEvent(event);
    setCommentsDialogOpen(true);
  };

  const handleAttendeesClick = (event: Event, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedEvent(event);
    setAttendeesDialogOpen(true);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col p-0">
          <DialogHeader className="p-6 pb-4">
            <DialogTitle className="text-2xl">Upcoming Events - {region}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto px-6 pb-6">
            <div className="space-y-4">
              {events.map((event) => (
                <div
                  key={event.id}
                  onClick={() => handleEventClick(event)}
                  className="p-4 rounded-lg border bg-card hover:bg-accent/50 cursor-pointer transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg mb-1">{event.title}</h3>
                      {event.description && (
                        <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                          {event.description}
                        </p>
                      )}
                      {event.event_date && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                          <Calendar className="w-4 h-4" />
                          {format(new Date(event.event_date), 'PPP p')}
                        </div>
                      )}
                      <div className="flex items-center gap-4 flex-wrap">
                        <button
                          onClick={(e) => handleLikesClick(event, e)}
                          className="flex items-center gap-1.5 text-sm hover:text-primary transition-colors"
                        >
                          <Heart className="w-4 h-4" />
                          <span className="font-medium">{event.like_count || 0}</span>
                          <span className="text-muted-foreground">likes</span>
                        </button>
                        <button
                          onClick={(e) => handleCommentsClick(event, e)}
                          className="flex items-center gap-1.5 text-sm hover:text-primary transition-colors"
                        >
                          <MessageCircle className="w-4 h-4" />
                          <span className="font-medium">{event.comment_count || 0}</span>
                          <span className="text-muted-foreground">comments</span>
                        </button>
                        <button
                          onClick={(e) => handleAttendeesClick(event, e)}
                          className="flex items-center gap-1.5 text-sm hover:text-primary transition-colors"
                        >
                          <Users className="w-4 h-4" />
                          <span className="font-medium">{event.attendee_count || 0}</span>
                          <span className="text-muted-foreground">going</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {events.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No upcoming events in {region}</p>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <EventDetailDialog
        event={selectedEvent}
        open={detailDialogOpen}
        onOpenChange={setDetailDialogOpen}
        onEventUpdated={fetchEvents}
      />

      <EventLikesDialog
        eventId={selectedEvent?.id || ''}
        open={likesDialogOpen}
        onOpenChange={setLikesDialogOpen}
      />

      <EventCommentsDialog
        eventId={selectedEvent?.id || null}
        eventTitle={selectedEvent?.title || ''}
        eventDate={selectedEvent?.event_date}
        open={commentsDialogOpen}
        onOpenChange={setCommentsDialogOpen}
      />

      <AttendeesDialog
        eventId={selectedEvent?.id || ''}
        open={attendeesDialogOpen}
        onOpenChange={setAttendeesDialogOpen}
      />
    </>
  );
};
