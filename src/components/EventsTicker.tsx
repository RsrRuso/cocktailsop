import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Calendar, MessageCircle } from 'lucide-react';
import { EventDetailDialog } from './EventDetailDialog';
import { EventCommentsDialog } from './EventCommentsDialog';
import { EventsListDialog } from './EventsListDialog';

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
  const [listDialogOpen, setListDialogOpen] = useState(false);

  useEffect(() => {
    const fetchEvents = async () => {
      await supabase.rpc('update_expired_events');
      
      const { data } = await supabase
        .from('events')
        .select('id, title, description, event_date, region, user_id, like_count, comment_count, attendee_count')
        .eq('region', region)
        .eq('is_active', true)
        .eq('status', 'upcoming')
        .order('created_at', { ascending: false })
        .limit(10);

      if (data) setEvents(data);
    };

    fetchEvents();

    // Real-time subscription for events in this region only
    const channel = supabase
      .channel(`events-ticker-${region}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'events',
          filter: `region=eq.${region}`
        },
        () => fetchEvents()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
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
    <div className="w-full overflow-hidden bg-black/40 backdrop-blur-sm rounded-lg px-3 py-2 mb-3 border border-white/10">
      <div className="relative overflow-hidden">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setListDialogOpen(true)}
            className="flex-shrink-0 text-[10px] font-medium text-white/60 hover:text-white transition-colors"
          >
            <Calendar className="w-3 h-3" />
          </button>
          <div className="flex-1 overflow-hidden">
            <div className="animate-marquee whitespace-nowrap">
              {events.map((event, idx) => (
                <span key={event.id} className="inline-flex items-center text-[11px]">
                  <button
                    onClick={() => handleEventClick(event)}
                    className="text-white/90 hover:text-white font-medium"
                  >
                    {event.title}
                  </button>
                  <span className="text-white/40 mx-1">•</span>
                  <span className="text-white/50">{event.attendee_count || 0}↑</span>
                  <button
                    onClick={(e) => handleCommentsClick(event, e)}
                    className="ml-1 text-white/40 hover:text-white/70"
                  >
                    💬{event.comment_count || 0}
                  </button>
                  {idx < events.length - 1 && <span className="text-white/20 mx-3">|</span>}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
      
      <EventDetailDialog
        event={selectedEvent}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onEventUpdated={() => {
          // Refresh events when updated/deleted
          const fetchEvents = async () => {
            await supabase.rpc('update_expired_events');
            
            const { data } = await supabase
              .from('events')
              .select('id, title, description, event_date, region, user_id, like_count, comment_count, attendee_count')
              .eq('region', region)
              .eq('is_active', true)
              .eq('status', 'upcoming')
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
        eventDate={selectedEvent?.event_date}
        open={commentsDialogOpen}
        onOpenChange={setCommentsDialogOpen}
      />

      <EventsListDialog
        region={region}
        open={listDialogOpen}
        onOpenChange={setListDialogOpen}
      />
    </div>
  );
};