import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Calendar, MessageCircle } from 'lucide-react';
import { EventDetailDialog } from './EventDetailDialog';
import { EventCommentsDialog } from './EventCommentsDialog';

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

interface EventsTickerProps {
  region: string;
}

export const EventsTicker = ({ region }: EventsTickerProps) => {
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [commentsDialogOpen, setCommentsDialogOpen] = useState(false);

  useEffect(() => {
    const fetchEvents = async () => {
      const { data } = await supabase
        .from('events')
        .select('id, title, description, event_date, region, user_id, like_count, comment_count, attendee_count')
        .eq('region', region)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(10);

      if (data) setEvents(data);
    };

    fetchEvents();
  }, [region]);

  const handleEventClick = (event: Event) => {
    setSelectedEvent(event);
    setDialogOpen(true);
  };

  const handleCommentsClick = (event: Event, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedEvent(event);
    setCommentsDialogOpen(true);
  };

  if (events.length === 0) return null;

  return (
    <div className="w-full overflow-hidden bg-gradient-to-r from-primary/10 via-accent/10 to-primary/10 rounded-2xl p-4 mb-4 border border-primary/20">
      <div className="flex items-center gap-2 mb-2">
        <Calendar className="w-4 h-4 text-primary" />
        <span className="text-xs font-semibold text-primary uppercase tracking-wide">
          Upcoming Events
        </span>
      </div>
      <div className="relative overflow-hidden">
        <div className="animate-marquee whitespace-nowrap">
          {events.map((event) => (
            <button
              key={event.id}
              onClick={() => handleEventClick(event)}
              className="inline-flex items-center mx-8 hover:opacity-80 transition-opacity cursor-pointer"
            >
              <span className="font-semibold text-foreground hover:underline">{event.title}</span>
              {event.event_date && (
                <span className="ml-2 text-sm text-muted-foreground">
                  {new Date(event.event_date).toLocaleDateString()}
                </span>
              )}
              <span className="ml-2 text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">
                {event.attendee_count || 0} going
              </span>
              <button
                onClick={(e) => handleCommentsClick(event, e)}
                className="ml-2 inline-flex items-center gap-1 text-xs bg-accent/20 text-accent-foreground px-2 py-0.5 rounded-full hover:bg-accent/30 transition-colors"
              >
                <MessageCircle className="w-3 h-3" />
                {event.comment_count || 0}
              </button>
              <span className="mx-2 text-primary">•</span>
            </button>
          ))}
        </div>
      </div>
      
      <EventDetailDialog
        event={selectedEvent}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onEventUpdated={() => {
          // Refresh events when updated/deleted
          const fetchEvents = async () => {
            const { data } = await supabase
              .from('events')
              .select('id, title, description, event_date, region, user_id, like_count, comment_count, attendee_count')
              .eq('region', region)
              .eq('is_active', true)
              .order('created_at', { ascending: false })
              .limit(10);

            if (data) setEvents(data);
          };
          fetchEvents();
        }}
      />

      <EventCommentsDialog
        eventId={selectedEvent?.id || null}
        eventTitle={selectedEvent?.title || ''}
        open={commentsDialogOpen}
        onOpenChange={setCommentsDialogOpen}
      />
    </div>
  );
};