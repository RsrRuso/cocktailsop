import { useHistoryEvents, HistoryEvent } from '@/hooks/useHistoryEvents';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

interface HistoryTimelineProps {
  draftId?: string;
  postId?: string;
}

export function HistoryTimeline({ draftId, postId }: HistoryTimelineProps) {
  const { events, loading, getEventIcon, getEventLabel } = useHistoryEvents({ draftId, postId });

  if (loading) {
    return (
      <div className="space-y-4 p-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex gap-3">
            <Skeleton className="w-8 h-8 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>No history yet</p>
      </div>
    );
  }

  // Group events by date
  const groupedEvents = events.reduce((groups, event) => {
    const date = new Date(event.created_at).toDateString();
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(event);
    return groups;
  }, {} as Record<string, HistoryEvent[]>);

  return (
    <ScrollArea className="h-[400px]">
      <div className="space-y-6 p-4">
        {Object.entries(groupedEvents).map(([date, dayEvents]) => (
          <div key={date}>
            <h4 className="text-xs font-medium text-muted-foreground mb-3">
              {new Date(date).toLocaleDateString('en-US', { 
                weekday: 'long', 
                month: 'short', 
                day: 'numeric' 
              })}
            </h4>
            
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />
              
              <div className="space-y-4">
                {dayEvents.map((event, index) => (
                  <div key={event.id} className="relative flex gap-4 pl-0">
                    {/* Icon */}
                    <div className={cn(
                      'relative z-10 w-8 h-8 rounded-full flex items-center justify-center text-base',
                      'bg-background border border-border shadow-sm'
                    )}>
                      {getEventIcon(event.event_type)}
                    </div>
                    
                    {/* Content */}
                    <div className="flex-1 pb-4">
                      <p className="font-medium text-sm">
                        {getEventLabel(event.event_type)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(event.created_at), { addSuffix: true })}
                      </p>
                      
                      {/* Event details */}
                      {Object.keys(event.event_data).length > 0 && (
                        <div className="mt-2 p-2 bg-muted/50 rounded text-xs">
                          {event.event_type === 'SOFT_EDIT' && event.event_data.changes && (
                            <p>Changed: {Object.keys(event.event_data.changes).join(', ')}</p>
                          )}
                          {event.event_type === 'SCHEDULED' && event.event_data.scheduledAt && (
                            <p>Scheduled for: {new Date(event.event_data.scheduledAt).toLocaleString()}</p>
                          )}
                          {(event.event_type === 'APPROVED' || event.event_type === 'REJECTED') && event.event_data.feedback && (
                            <p>Feedback: {event.event_data.feedback}</p>
                          )}
                          {event.event_type === 'UPLOAD_COMPLETED' && event.event_data.fileName && (
                            <p>File: {event.event_data.fileName}</p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}
