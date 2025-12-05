import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Smile, Sparkles, Wand2, RefreshCw, Clock, 
  Heart, Star, Zap, Coffee, Music, Camera,
  Palette, Send, Loader2, TrendingUp
} from "lucide-react";

interface CreateStatusDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId?: string;
}

const emojiCategories = {
  recent: ["😊", "❤️", "🔥", "✨", "💯", "🎉", "👍", "😎"],
  faces: ["😊", "😎", "🤩", "😍", "🥳", "😇", "🤗", "😏", "😈", "👽", "🤖", "👾", "🥹", "😭", "🤯", "😴", "🤑", "🥶", "🤠", "👻", "🤡", "😵‍💫", "🫠", "🫡"],
  emotions: ["❤️", "💖", "💯", "💫", "✨", "⭐", "🌟", "💥", "🔥", "⚡", "💎", "👑", "💕", "💗", "💓", "💘", "💝", "🖤", "🤍", "💜", "💙", "💚", "💛", "🧡"],
  gestures: ["👍", "👊", "🤘", "✌️", "🤙", "👏", "🙌", "💪", "🦾", "🤝", "👐", "🫶", "👋", "🤟", "🤞", "🫰", "🤏", "👌", "🫵", "👆", "✊", "🤛", "🤜", "🙏"],
  activities: ["🎉", "🎊", "🎈", "🎁", "🏆", "🥇", "🎯", "🎮", "🎸", "🎤", "🎧", "🎨", "🎬", "🎭", "🎪", "🎰", "🎲", "🎳", "🏄", "🏋️", "⚽", "🏀", "🎾", "🎱"],
  nature: ["🌈", "🌺", "🌸", "🌼", "🌻", "🦋", "🐝", "🌙", "☀️", "🌊", "🍀", "🌹", "🌴", "🌵", "🍄", "🌾", "🪴", "🌲", "⭐", "🌕", "☁️", "⛈️", "🌪️", "❄️"],
  food: ["🍕", "🍔", "🍟", "🌮", "🍣", "🍰", "🍩", "🍪", "🍦", "🍓", "🥂", "☕", "🍷", "🍸", "🍹", "🧋", "🥤", "🍺", "🥃", "🍾", "🧁", "🎂", "🍫", "🍬"],
  objects: ["📱", "💻", "🎵", "📸", "💡", "🔮", "🎀", "🧸", "🎒", "👓", "🕶️", "👒", "💄", "💍", "👠", "👑", "🎩", "🧢", "📚", "✏️", "🖊️", "📝", "💼", "🔑"],
  symbols: ["💢", "💬", "💭", "🗯️", "💤", "💮", "♨️", "🔰", "⭕", "✅", "❌", "❓", "❗", "💲", "🔱", "⚜️", "🔴", "🟠", "🟡", "🟢", "🔵", "🟣", "⚫", "⚪"],
};

const statusSuggestions = [
  "Feeling creative today ✨",
  "Working hard 💪",
  "Coffee time ☕",
  "Weekend vibes 🎉",
  "Living my best life 🌟",
  "Good vibes only ✌️",
  "Making memories 📸",
  "Chasing dreams 🚀",
];

const moodButtons = [
  { emoji: "😊", label: "Happy", color: "from-yellow-400 to-orange-400" },
  { emoji: "🔥", label: "Motivated", color: "from-orange-400 to-red-400" },
  { emoji: "😴", label: "Tired", color: "from-blue-400 to-purple-400" },
  { emoji: "🎉", label: "Celebrating", color: "from-pink-400 to-purple-400" },
  { emoji: "💭", label: "Thinking", color: "from-gray-400 to-blue-400" },
  { emoji: "❤️", label: "Loving", color: "from-red-400 to-pink-400" },
];

const CreateStatusDialog = ({ open, onOpenChange, userId }: CreateStatusDialogProps) => {
  const [statusText, setStatusText] = useState("");
  const [selectedEmoji, setSelectedEmoji] = useState("");
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [activeTab, setActiveTab] = useState("recent");
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    const fetchCurrentUser = async () => {
      setAuthChecked(false);
      const { data: { session } } = await supabase.auth.getSession();
      setCurrentUserId(session?.user?.id || null);
      setAuthChecked(true);
    };
    if (open) {
      fetchCurrentUser();
      setAiSuggestions([]);
    }
  }, [open]);

  const generateAISuggestions = async () => {
    setAiLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-status-suggestions', {
        body: { currentText: statusText }
      });
      
      if (error) throw error;
      
      if (data?.suggestions) {
        setAiSuggestions(data.suggestions);
      } else {
        // Fallback suggestions
        setAiSuggestions([
          "✨ Living in the moment",
          "🚀 Ready for new adventures",
          "💫 Grateful for today",
          "🌟 Making magic happen",
        ]);
      }
    } catch (error) {
      console.error('AI suggestions error:', error);
      // Use fallback suggestions
      setAiSuggestions([
        "✨ Living in the moment",
        "🚀 Ready for new adventures", 
        "💫 Grateful for today",
        "🌟 Making magic happen",
      ]);
    } finally {
      setAiLoading(false);
    }
  };

  const improveWithAI = async () => {
    if (!statusText.trim()) {
      toast({
        title: "Enter some text first",
        description: "Type something to improve with AI",
      });
      return;
    }
    
    setAiLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('neuron-ai-assistant', {
        body: { 
          action: 'improve_message',
          message: statusText,
          context: 'status update for social media'
        }
      });
      
      if (error) throw error;
      
      if (data?.result) {
        setStatusText(data.result);
        toast({
          title: "Status improved! ✨",
          description: "Your status has been enhanced with AI",
        });
      }
    } catch (error) {
      console.error('AI improve error:', error);
      toast({
        title: "AI unavailable",
        description: "Using your original text",
        variant: "destructive",
      });
    } finally {
      setAiLoading(false);
    }
  };

  const handleMoodSelect = (mood: typeof moodButtons[0]) => {
    setSelectedEmoji(mood.emoji);
    if (!statusText) {
      setStatusText(`Feeling ${mood.label.toLowerCase()} ${mood.emoji}`);
    }
  };

  const handleCreateStatus = async () => {
    if (!statusText.trim()) {
      toast({
        title: "Status required",
        description: "Please enter a status message",
        variant: "destructive",
      });
      return;
    }

    if (!authChecked || !currentUserId) {
      toast({
        title: "Authentication required",
        description: "Please wait for authentication or log in",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session');
      }

      // Fetch existing status to preserve music data
      const { data: existingStatus } = await supabase
        .from('user_status')
        .select('music_track_id, music_track_name, music_artist, music_album_art, music_preview_url, music_spotify_url')
        .eq('user_id', session.user.id)
        .maybeSingle();

      const { error } = await supabase
        .from('user_status')
        .upsert({
          user_id: session.user.id,
          status_text: statusText,
          emoji: selectedEmoji || null,
          // Preserve existing music data
          music_track_id: existingStatus?.music_track_id || null,
          music_track_name: existingStatus?.music_track_name || null,
          music_artist: existingStatus?.music_artist || null,
          music_album_art: existingStatus?.music_album_art || null,
          music_preview_url: existingStatus?.music_preview_url || null,
          music_spotify_url: existingStatus?.music_spotify_url || null,
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        }, {
          onConflict: 'user_id',
        });

      if (error) throw error;

      toast({
        title: "Status shared! 🎉",
        description: "Your status is now visible to everyone",
      });

      setStatusText("");
      setSelectedEmoji("");
      setAiSuggestions([]);
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error creating status:', error);
      toast({
        title: "Error",
        description: error?.message || "Failed to share status",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="pb-2">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <div className="p-2 rounded-full bg-gradient-to-br from-primary/20 to-accent/20">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            Share Your Status
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          {/* Quick Mood Selection */}
          <div>
            <label className="text-sm font-medium mb-2 flex items-center gap-2">
              <Heart className="w-4 h-4 text-primary" />
              How are you feeling?
            </label>
            <div className="grid grid-cols-3 gap-2">
              {moodButtons.map((mood) => (
                <motion.button
                  key={mood.label}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleMoodSelect(mood)}
                  className={`p-3 rounded-xl transition-all duration-200 flex flex-col items-center gap-1 ${
                    selectedEmoji === mood.emoji
                      ? `bg-gradient-to-br ${mood.color} text-white shadow-lg`
                      : "bg-secondary/50 hover:bg-secondary"
                  }`}
                >
                  <span className="text-2xl">{mood.emoji}</span>
                  <span className="text-xs font-medium">{mood.label}</span>
                </motion.button>
              ))}
            </div>
          </div>

          {/* Status Input with AI */}
          <div>
            <label className="text-sm font-medium mb-2 flex items-center gap-2">
              <Zap className="w-4 h-4 text-yellow-500" />
              Your Status
            </label>
            <div className="relative">
              <Textarea
                placeholder="What's on your mind? ✨"
                value={statusText}
                onChange={(e) => setStatusText(e.target.value)}
                maxLength={150}
                className="min-h-[100px] pr-10 resize-none text-base"
              />
              {selectedEmoji && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute top-2 right-2 text-3xl"
                >
                  {selectedEmoji}
                </motion.div>
              )}
            </div>
            <div className="flex items-center justify-between mt-2">
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {statusText.length}/150 • Expires in 24h
              </p>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={improveWithAI}
                  disabled={aiLoading || !statusText.trim()}
                  className="text-xs h-7 px-2"
                >
                  {aiLoading ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Wand2 className="w-3 h-3" />
                  )}
                  <span className="ml-1">Improve</span>
                </Button>
              </div>
            </div>
          </div>

          {/* AI Suggestions */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-500" />
                AI Suggestions
              </label>
              <Button
                variant="ghost"
                size="sm"
                onClick={generateAISuggestions}
                disabled={aiLoading}
                className="text-xs h-7 px-2"
              >
                {aiLoading ? (
                  <Loader2 className="w-3 h-3 animate-spin mr-1" />
                ) : (
                  <RefreshCw className="w-3 h-3 mr-1" />
                )}
                Generate
              </Button>
            </div>
            <AnimatePresence mode="wait">
              {aiSuggestions.length > 0 ? (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="grid grid-cols-1 gap-2"
                >
                  {aiSuggestions.map((suggestion, index) => (
                    <motion.button
                      key={index}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      onClick={() => setStatusText(suggestion)}
                      className="p-2 text-left text-sm rounded-lg bg-gradient-to-r from-primary/10 to-accent/10 hover:from-primary/20 hover:to-accent/20 transition-all duration-200 border border-primary/20"
                    >
                      {suggestion}
                    </motion.button>
                  ))}
                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-wrap gap-2"
                >
                  {statusSuggestions.slice(0, 4).map((suggestion, index) => (
                    <button
                      key={index}
                      onClick={() => setStatusText(suggestion)}
                      className="px-3 py-1.5 text-xs rounded-full bg-secondary/50 hover:bg-secondary transition-colors"
                    >
                      {suggestion}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Emoji Picker */}
          <div>
            <label className="text-sm font-medium mb-2 flex items-center gap-2">
              <Smile className="w-4 h-4 text-orange-500" />
              Add Emoji
            </label>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="w-full grid grid-cols-5 h-auto p-1 bg-secondary/50">
                <TabsTrigger value="recent" className="text-xs py-1.5">⏱️</TabsTrigger>
                <TabsTrigger value="faces" className="text-xs py-1.5">😊</TabsTrigger>
                <TabsTrigger value="emotions" className="text-xs py-1.5">❤️</TabsTrigger>
                <TabsTrigger value="gestures" className="text-xs py-1.5">👍</TabsTrigger>
                <TabsTrigger value="activities" className="text-xs py-1.5">🎉</TabsTrigger>
              </TabsList>
              <ScrollArea className="h-[140px] mt-2">
                {Object.entries(emojiCategories).map(([category, emojis]) => (
                  <TabsContent key={category} value={category} className="m-0">
                    <div className="grid grid-cols-8 gap-1">
                      {emojis.map((emoji, index) => (
                        <motion.button
                          key={`${emoji}-${index}`}
                          whileHover={{ scale: 1.2 }}
                          whileTap={{ scale: 0.9 }}
                          type="button"
                          className={`text-2xl h-10 w-10 rounded-lg transition-all duration-200 ${
                            selectedEmoji === emoji 
                              ? "bg-primary/30 ring-2 ring-primary shadow-lg" 
                              : "hover:bg-secondary"
                          }`}
                          onClick={() => setSelectedEmoji(emoji === selectedEmoji ? "" : emoji)}
                        >
                          {emoji}
                        </motion.button>
                      ))}
                    </div>
                  </TabsContent>
                ))}
              </ScrollArea>
            </Tabs>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-4 border-t">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => onOpenChange(false)}
            disabled={loading || !authChecked}
          >
            Cancel
          </Button>
          <Button
            className="flex-1 bg-gradient-to-r from-primary to-accent hover:opacity-90"
            onClick={handleCreateStatus}
            disabled={loading || !authChecked || !currentUserId || !statusText.trim()}
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <Send className="w-4 h-4 mr-2" />
            )}
            {!authChecked ? "Loading..." : "Share Status"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CreateStatusDialog;