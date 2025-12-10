import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Calendar, MapPin, Users, Heart, MessageCircle, Share2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import TopNav from "@/components/TopNav";
import BottomNav from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { format } from "date-fns";
import UnifiedCommentsDialog from "@/components/unified/UnifiedCommentsDialog";
import UnifiedLikesDialog from "@/components/unified/UnifiedLikesDialog";
import UnifiedAttendeesDialog from "@/components/unified/UnifiedAttendeesDialog";
import { useLike } from "@/hooks/useLike";

const EventDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [event, setEvent] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showComments, setShowComments] = useState(false);
  const [showLikes, setShowLikes] = useState(false);
  const [showAttendees, setShowAttendees] = useState(false);
  const [isAttending, setIsAttending] = useState(false);
  
  const { likedItems, toggleLike } = useLike('event', user?.id);
  const isLiked = id ? likedItems.has(id) : false;

  useEffect(() => {
    if (id) {
      fetchEvent();
      checkAttendance();
    }

    const eventChannel = supabase
      .channel(`event-detail-${id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'events',
          filter: `id=eq.${id}`
        },
        (payload: any) => {
          setEvent((prev: any) => ({
            ...prev,
            like_count: payload.new.like_count,
            comment_count: payload.new.comment_count,
            attendee_count: payload.new.attendee_count
          }));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(eventChannel);
    };
  }, [id]);

  const fetchEvent = async () => {
    const { data, error } = await supabase
      .from("events")
      .select(`
        *,
        profiles (
          id,
          username,
          full_name,
          avatar_url
        )
      `)
      .eq("id", id)
      .single();

    if (error) {
      console.error("Error fetching event:", error);
      toast.error("Event not found");
      navigate("/home");
    } else {
      setEvent(data);
    }
    setIsLoading(false);
  };

  const checkAttendance = async () => {
    if (!user) return;
    
    const { data } = await supabase
      .from("event_attendees")
      .select("id")
      .eq("event_id", id)
      .eq("user_id", user.id)
      .maybeSingle();
    
    setIsAttending(!!data);
  };

  const handleAttendance = async () => {
    if (!user || !id) return;

    if (isAttending) {
      const { error } = await supabase
        .from("event_attendees")
        .delete()
        .eq("event_id", id)
        .eq("user_id", user.id);

      if (error) {
        toast.error("Failed to remove attendance");
      } else {
        setIsAttending(false);
        toast.success("Removed from event");
      }
    } else {
      const { error } = await supabase
        .from("event_attendees")
        .insert({ event_id: id, user_id: user.id });

      if (error) {
        toast.error("Failed to join event");
      } else {
        setIsAttending(true);
        toast.success("Joined event!");
      }
    }
  };

  const handleLike = () => {
    if (id) {
      toggleLike(id);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background pb-20 pt-16">
        <TopNav />
        <div className="max-w-2xl mx-auto px-4 py-6">
          <div className="glass rounded-xl p-6 animate-pulse">
            <div className="h-8 bg-muted rounded-lg mb-4 w-3/4" />
            <div className="h-4 bg-muted rounded-lg mb-2 w-1/2" />
            <div className="h-4 bg-muted rounded-lg mb-4 w-1/3" />
            <div className="h-32 bg-muted rounded-lg" />
          </div>
        </div>
        <BottomNav />
      </div>
    );
  }

  if (!event) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background pb-20 pt-16">
      <TopNav />
      
      <div className="max-w-2xl mx-auto px-4 py-6">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 glass-hover px-4 py-2 rounded-xl mb-4"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Back</span>
        </button>

        <div className="glass rounded-xl p-6 space-y-6">
          {/* Event Header */}
          <div>
            <h1 className="text-2xl font-bold mb-2">{event.title}</h1>
            {event.event_date && (
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <Calendar className="w-4 h-4" />
                <span>{format(new Date(event.event_date), "PPP 'at' p")}</span>
              </div>
            )}
            {event.venue_name && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="w-4 h-4" />
                <span>{event.venue_name}{event.address ? `, ${event.address}` : ''}</span>
              </div>
            )}
          </div>

          {/* Event Description */}
          {event.description && (
            <div className="text-muted-foreground">
              <p>{event.description}</p>
            </div>
          )}

          {/* Attendance Button */}
          <Button
            onClick={handleAttendance}
            className="w-full"
            variant={isAttending ? "outline" : "default"}
          >
            <Users className="w-4 h-4 mr-2" />
            {isAttending ? "Going" : "Join Event"}
          </Button>

          {/* Engagement Stats */}
          <div className="flex items-center gap-6 pt-4 border-t border-border">
            <button
              onClick={() => setShowAttendees(true)}
              className="flex items-center gap-2 text-sm hover:text-primary transition-colors"
            >
              <Users className="w-4 h-4" />
              <span>{event.attendee_count || 0} going</span>
            </button>
            <button
              onClick={() => setShowLikes(true)}
              className="flex items-center gap-2 text-sm hover:text-primary transition-colors"
            >
              <Heart className={`w-4 h-4 ${isLiked ? 'fill-red-500 text-red-500' : ''}`} />
              <span>{event.like_count || 0} likes</span>
            </button>
            <button
              onClick={() => setShowComments(true)}
              className="flex items-center gap-2 text-sm hover:text-primary transition-colors"
            >
              <MessageCircle className="w-4 h-4" />
              <span>{event.comment_count || 0} comments</span>
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button
              onClick={handleLike}
              variant="outline"
              size="sm"
              className="flex-1"
            >
              <Heart className={`w-4 h-4 mr-2 ${isLiked ? 'fill-red-500 text-red-500' : ''}`} />
              {isLiked ? 'Unlike' : 'Like'}
            </Button>
            <Button
              onClick={() => setShowComments(true)}
              variant="outline"
              size="sm"
              className="flex-1"
            >
              <MessageCircle className="w-4 h-4 mr-2" />
              Comment
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
            >
              <Share2 className="w-4 h-4 mr-2" />
              Share
            </Button>
          </div>
        </div>
      </div>

      {showComments && (
        <UnifiedCommentsDialog
          open={showComments}
          onOpenChange={setShowComments}
          contentType="event"
          contentId={event.id}
          onCommentChange={() => {
            fetchEvent();
          }}
        />
      )}

      {showLikes && (
        <UnifiedLikesDialog
          open={showLikes}
          onOpenChange={setShowLikes}
          contentType="event"
          contentId={event.id}
        />
      )}

      {showAttendees && (
        <UnifiedAttendeesDialog
          open={showAttendees}
          onOpenChange={setShowAttendees}
          eventId={event.id}
        />
      )}

      <BottomNav />
    </div>
  );
};

export default EventDetail;
