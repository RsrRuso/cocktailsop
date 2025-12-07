import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  X, Video, VideoOff, Mic, MicOff, 
  Users, Heart, Share2, MessageCircle, 
  RotateCcw, Sparkles, Zap, Settings,
  Gift, Star, Crown, Send, Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import OptimizedAvatar from "@/components/OptimizedAvatar";
import { Haptics, ImpactStyle } from "@capacitor/haptics";
import { Capacitor } from "@capacitor/core";

interface LivestreamComment {
  id: string;
  content: string;
  user_id: string;
  created_at: string;
  is_pinned: boolean;
  reactions: Record<string, string>;
  profiles?: {
    full_name: string | null;
    avatar_url: string | null;
    username: string | null;
  } | null;
}

interface FlyingHeart {
  id: string;
  x: number;
  color: string;
}

interface Livestream {
  id: string;
  user_id: string;
  title: string | null;
  status: string;
  viewer_count: number;
  started_at: string;
  profiles?: {
    full_name: string | null;
    avatar_url: string | null;
    username: string | null;
  } | null;
}

const Livestream = () => {
  const navigate = useNavigate();
  const { id: livestreamId } = useParams<{ id: string }>();
  const { user } = useAuth();
  
  const [isHost, setIsHost] = useState(false);
  const [livestream, setLivestream] = useState<Livestream | null>(null);
  const [comments, setComments] = useState<LivestreamComment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [flyingHearts, setFlyingHearts] = useState<FlyingHeart[]>([]);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isAudioOn, setIsAudioOn] = useState(true);
  const [viewerCount, setViewerCount] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isFrontCamera, setIsFrontCamera] = useState(true);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const commentsEndRef = useRef<HTMLDivElement>(null);
  const heartChannelRef = useRef<any>(null);

  const heartColors = [
    "#FF69B4", "#FF1493", "#FF6B9D", "#E91E63", 
    "#FF4500", "#FF10F0", "#C71585", "#DC143C"
  ];

  // Initialize livestream
  useEffect(() => {
    if (livestreamId) {
      fetchLivestream();
      subscribeToComments();
      subscribeToHearts();
      joinAsViewer();
    } else if (user) {
      createLivestream();
    }

    return () => {
      stopStream();
      leaveAsViewer();
    };
  }, [livestreamId, user]);

  // Start camera for host
  useEffect(() => {
    if (isHost && livestream) {
      startCamera();
    }
  }, [isHost, livestream]);

  // Auto-scroll comments
  useEffect(() => {
    commentsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [comments]);

  const createLivestream = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from("livestreams")
        .insert({
          user_id: user.id,
          title: "Live now!",
          status: "live"
        })
        .select(`
          *,
          profiles:user_id (full_name, avatar_url, username)
        `)
        .single();

      if (error) throw error;
      
      setLivestream(data as unknown as Livestream);
      setIsHost(true);
      setIsLoading(false);
      navigate(`/live/${data.id}`, { replace: true });
    } catch (error) {
      console.error("Error creating livestream:", error);
      toast.error("Failed to start livestream");
      navigate(-1);
    }
  };

  const fetchLivestream = async () => {
    if (!livestreamId) return;

    try {
      const { data, error } = await supabase
        .from("livestreams")
        .select(`
          *,
          profiles:user_id (full_name, avatar_url, username)
        `)
        .eq("id", livestreamId)
        .maybeSingle();

      if (error) throw error;
      
      if (!data || data.status === "ended") {
        toast.error("This livestream has ended");
        navigate(-1);
        return;
      }

      setLivestream(data as unknown as Livestream);
      setIsHost(user?.id === data.user_id);
      setViewerCount(data.viewer_count || 0);
      setIsLoading(false);
      fetchComments();
    } catch (error) {
      console.error("Error fetching livestream:", error);
      navigate(-1);
    }
  };

  const fetchComments = async () => {
    if (!livestreamId) return;

    const { data } = await supabase
      .from("livestream_comments")
      .select(`
        *,
        profiles:user_id (full_name, avatar_url, username)
      `)
      .eq("livestream_id", livestreamId)
      .order("created_at", { ascending: true })
      .limit(100);

    if (data) {
      setComments(data as unknown as LivestreamComment[]);
    }
  };

  const subscribeToComments = () => {
    if (!livestreamId) return;

    const channel = supabase
      .channel(`livestream_comments_${livestreamId}`)
      .on(
        "postgres_changes" as any,
        {
          event: "INSERT",
          schema: "public",
          table: "livestream_comments",
          filter: `livestream_id=eq.${livestreamId}`
        },
        async (payload: any) => {
          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name, avatar_url, username")
            .eq("id", payload.new.user_id)
            .maybeSingle();

          const newComment = {
            ...payload.new,
            profiles: profile
          } as LivestreamComment;

          setComments(prev => [...prev.slice(-99), newComment]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const subscribeToHearts = () => {
    if (!livestreamId) return;

    const channel = supabase
      .channel(`livestream_hearts_${livestreamId}`)
      .on(
        "broadcast" as any,
        { event: "heart" },
        (payload: any) => {
          if (payload.payload.userId !== user?.id) {
            createHeart(payload.payload);
            triggerVibration();
          }
        }
      )
      .subscribe();

    heartChannelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const joinAsViewer = async () => {
    if (!user || !livestreamId) return;

    try {
      await supabase
        .from("livestream_viewers")
        .upsert({
          livestream_id: livestreamId,
          user_id: user.id,
          left_at: null
        }, { onConflict: "livestream_id,user_id" });
    } catch (error) {
      console.error("Error joining as viewer:", error);
    }
  };

  const leaveAsViewer = async () => {
    if (!user || !livestreamId) return;

    try {
      await supabase
        .from("livestream_viewers")
        .update({ left_at: new Date().toISOString() })
        .eq("livestream_id", livestreamId)
        .eq("user_id", user.id);
    } catch (error) {
      console.error("Error leaving as viewer:", error);
    }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: isFrontCamera ? "user" : "environment" },
        audio: true
      });
      
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (error) {
      console.error("Error starting camera:", error);
      toast.error("Failed to access camera");
    }
  };

  const stopStream = async () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    if (isHost && livestream) {
      await supabase
        .from("livestreams")
        .update({ status: "ended", ended_at: new Date().toISOString() })
        .eq("id", livestream.id);
    }
  };

  const toggleCamera = () => {
    if (streamRef.current) {
      const videoTrack = streamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOn(videoTrack.enabled);
      }
    }
  };

  const toggleAudio = () => {
    if (streamRef.current) {
      const audioTrack = streamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioOn(audioTrack.enabled);
      }
    }
  };

  const flipCamera = async () => {
    setIsFrontCamera(prev => !prev);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    await startCamera();
  };

  const triggerVibration = async () => {
    try {
      if (Capacitor.getPlatform() !== "web") {
        await Haptics.impact({ style: ImpactStyle.Light });
      } else if ("vibrate" in navigator) {
        navigator.vibrate(30);
      }
    } catch {}
  };

  const createHeart = useCallback((data?: { x?: number; color?: string }) => {
    const heart: FlyingHeart = {
      id: Math.random().toString(36),
      x: data?.x ?? Math.random() * 80 + 10,
      color: data?.color ?? heartColors[Math.floor(Math.random() * heartColors.length)]
    };

    setFlyingHearts(prev => [...prev, heart]);
    setTimeout(() => {
      setFlyingHearts(prev => prev.filter(h => h.id !== heart.id));
    }, 2500);

    return heart;
  }, []);

  const sendHeart = () => {
    const heart = createHeart();
    triggerVibration();
    
    if (heartChannelRef.current) {
      heartChannelRef.current.send({
        type: "broadcast",
        event: "heart",
        payload: { ...heart, userId: user?.id }
      });
    }
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !user || !livestream || isSubmitting) return;

    setIsSubmitting(true);
    const content = newComment.trim();
    setNewComment("");

    try {
      await supabase
        .from("livestream_comments")
        .insert({
          livestream_id: livestream.id,
          user_id: user.id,
          content
        });
    } catch (error) {
      console.error("Error posting comment:", error);
      toast.error("Failed to send comment");
      setNewComment(content);
    } finally {
      setIsSubmitting(false);
    }
  };

  const endLivestream = async () => {
    await stopStream();
    toast.success("Livestream ended");
    navigate(-1);
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-white" />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black overflow-hidden">
      {/* Video Background */}
      {isHost ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`absolute inset-0 w-full h-full object-cover ${isFrontCamera ? "scale-x-[-1]" : ""}`}
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900 via-black to-pink-900 flex items-center justify-center">
          <div className="text-center">
            <OptimizedAvatar
              src={livestream?.profiles?.avatar_url || ""}
              alt={livestream?.profiles?.full_name || "Host"}
              className="w-32 h-32 mx-auto ring-4 ring-pink-500 animate-pulse"
            />
            <p className="text-white mt-4 text-lg font-semibold">
              {livestream?.profiles?.full_name || "Anonymous"} is live
            </p>
          </div>
        </div>
      )}

      {/* Video Off Overlay */}
      {isHost && !isVideoOn && (
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900 to-black flex items-center justify-center">
          <div className="text-center">
            <VideoOff className="w-16 h-16 text-white/50 mx-auto" />
            <p className="text-white/50 mt-4">Camera is off</p>
          </div>
        </div>
      )}

      {/* Gradient Overlays */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/50 pointer-events-none" />

      {/* Flying Hearts */}
      <AnimatePresence>
        {flyingHearts.map(heart => (
          <motion.div
            key={heart.id}
            initial={{ opacity: 0, y: 0, scale: 0.5 }}
            animate={{
              opacity: [0, 1, 1, 0],
              y: -300,
              x: [0, Math.random() * 30 - 15],
              scale: [0.5, 1.2, 1, 0.8]
            }}
            exit={{ opacity: 0 }}
            transition={{ duration: 2.5, ease: "easeOut" }}
            className="absolute bottom-24 pointer-events-none"
            style={{ left: `${heart.x}%` }}
          >
            <Heart
              className="w-10 h-10"
              fill={heart.color}
              color={heart.color}
              style={{ filter: "drop-shadow(0 0 12px rgba(255,255,255,0.6))" }}
            />
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Header */}
      <div className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between z-20 safe-area-pt">
        <div className="flex items-center gap-3">
          <OptimizedAvatar
            src={livestream?.profiles?.avatar_url || ""}
            alt={livestream?.profiles?.full_name || "Host"}
            className="w-10 h-10 ring-2 ring-pink-500"
          />
          <div>
            <p className="text-white font-semibold text-sm">
              {livestream?.profiles?.full_name || livestream?.profiles?.username || "Anonymous"}
            </p>
            <Badge className="bg-red-500 text-white text-[10px] px-1.5 py-0 h-4 animate-pulse">
              <span className="w-1.5 h-1.5 bg-white rounded-full mr-1 animate-pulse" />
              LIVE
            </Badge>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="bg-black/50 backdrop-blur-sm text-white border-0">
            <Users className="w-3 h-3 mr-1" />
            {viewerCount}
          </Badge>
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/20"
            onClick={() => {
              if (isHost) {
                endLivestream();
              } else {
                navigate(-1);
              }
            }}
          >
            <X className="w-6 h-6" />
          </Button>
        </div>
      </div>

      {/* Comments Section */}
      <div className="absolute bottom-28 left-0 right-20 max-h-[40%] overflow-hidden p-4">
        <div className="space-y-2 overflow-y-auto max-h-full scrollbar-hide">
          <AnimatePresence mode="popLayout">
            {comments.slice(-15).map(comment => (
              <motion.div
                key={comment.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="flex items-start gap-2"
              >
                <OptimizedAvatar
                  src={comment.profiles?.avatar_url || ""}
                  alt={comment.profiles?.full_name || "User"}
                  className="w-7 h-7 flex-shrink-0"
                />
                <div className="bg-black/50 backdrop-blur-sm rounded-2xl px-3 py-1.5 max-w-[85%]">
                  <span className="text-pink-400 font-semibold text-xs">
                    {comment.profiles?.full_name || comment.profiles?.username || "Anonymous"}
                  </span>
                  <p className="text-white text-sm">{comment.content}</p>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          <div ref={commentsEndRef} />
        </div>
      </div>

      {/* Right Side Actions */}
      <div className="absolute right-4 bottom-32 flex flex-col gap-4 z-20">
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={sendHeart}
          className="w-12 h-12 rounded-full bg-gradient-to-br from-pink-500 to-red-500 flex items-center justify-center shadow-lg shadow-pink-500/50"
        >
          <Heart className="w-6 h-6 text-white" fill="white" />
        </motion.button>

        <motion.button
          whileTap={{ scale: 0.9 }}
          className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center"
        >
          <Gift className="w-6 h-6 text-white" />
        </motion.button>

        <motion.button
          whileTap={{ scale: 0.9 }}
          className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center"
        >
          <Share2 className="w-6 h-6 text-white" />
        </motion.button>
      </div>

      {/* Host Controls */}
      {isHost && (
        <div className="absolute top-20 right-4 flex flex-col gap-2 z-20">
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={toggleCamera}
            className={`w-10 h-10 rounded-full flex items-center justify-center ${
              isVideoOn ? "bg-white/20" : "bg-red-500"
            } backdrop-blur-sm`}
          >
            {isVideoOn ? (
              <Video className="w-5 h-5 text-white" />
            ) : (
              <VideoOff className="w-5 h-5 text-white" />
            )}
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={toggleAudio}
            className={`w-10 h-10 rounded-full flex items-center justify-center ${
              isAudioOn ? "bg-white/20" : "bg-red-500"
            } backdrop-blur-sm`}
          >
            {isAudioOn ? (
              <Mic className="w-5 h-5 text-white" />
            ) : (
              <MicOff className="w-5 h-5 text-white" />
            )}
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={flipCamera}
            className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center"
          >
            <RotateCcw className="w-5 h-5 text-white" />
          </motion.button>
        </div>
      )}

      {/* Comment Input */}
      <form
        onSubmit={handleSubmitComment}
        className="absolute bottom-0 left-0 right-0 p-4 pb-8 safe-area-pb z-20"
      >
        <div className="flex items-center gap-2">
          <Input
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Say something..."
            className="flex-1 bg-white/10 backdrop-blur-md border-white/20 text-white placeholder:text-white/50 rounded-full h-12"
            disabled={isSubmitting}
          />
          <Button
            type="submit"
            size="icon"
            disabled={!newComment.trim() || isSubmitting}
            className="h-12 w-12 rounded-full bg-gradient-to-br from-pink-500 to-purple-600"
          >
            {isSubmitting ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default Livestream;
