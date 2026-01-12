import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Calendar } from 'lucide-react';

interface Event {
  id: string;
  title: string;
  event_date: string | null;
  attendee_count?: number;
  comment_count?: number;
}

interface HeaderTickerProps {
  region: string;
}

export const HeaderTicker = ({ region }: HeaderTickerProps) => {
  const [events, setEvents] = useState<Event[]>([]);

  useEffect(() => {
    const fetchEvents = async () => {
      const { data } = await supabase
        .from('events')
        .select('id, title, event_date, attendee_count, comment_count')
        .eq('region', region)
        .eq('is_active', true)
        .eq('status', 'upcoming')
        .order('created_at', { ascending: false })
        .limit(5);

      if (data) setEvents(data);
    };

    fetchEvents();
  }, [region]);

  if (events.length === 0) return null;

  return (
    <div className="w-full overflow-hidden bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-amber-500/20 rounded-full px-4 py-1.5 border border-amber-500/30">
      <div className="flex items-center gap-2 overflow-hidden">
        <Calendar className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
        <div className="flex-1 overflow-hidden">
          <div className="animate-marquee whitespace-nowrap">
            {events.map((event, idx) => (
              <span key={event.id} className="inline-flex items-center text-xs">
                <span className="text-amber-100 font-medium">{event.title}</span>
                <span className="text-amber-400/50 mx-1.5">•</span>
                <span className="text-amber-300/70">{event.attendee_count || 0} going</span>
                {idx < events.length - 1 && <span className="text-amber-500/30 mx-3">|</span>}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default HeaderTicker;
