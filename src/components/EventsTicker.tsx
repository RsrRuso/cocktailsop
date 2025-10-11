import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Calendar } from 'lucide-react';

interface Event {
  id: string;
  title: string;
  description: string | null;
  event_date: string | null;
  region: string;
}

interface EventsTickerProps {
  region: string;
}

export const EventsTicker = ({ region }: EventsTickerProps) => {
  const [events, setEvents] = useState<Event[]>([]);

  useEffect(() => {
    const fetchEvents = async () => {
      const { data } = await supabase
        .from('events')
        .select('*')
        .eq('region', region)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(10);

      if (data) setEvents(data);
    };

    fetchEvents();
  }, [region]);

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
            <span key={event.id} className="inline-flex items-center mx-8">
              <span className="font-semibold text-foreground">{event.title}</span>
              {event.event_date && (
                <span className="ml-2 text-sm text-muted-foreground">
                  {new Date(event.event_date).toLocaleDateString()}
                </span>
              )}
              <span className="mx-2 text-primary">•</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};