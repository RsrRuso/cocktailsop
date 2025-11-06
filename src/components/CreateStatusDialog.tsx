import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Sparkles, Wand2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface CreateStatusDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId?: string;
}

const futuristicEmojis = [
  { value: "⚡", label: "⚡ Electric" },
  { value: "🔮", label: "🔮 Mystic" },
  { value: "🌌", label: "🌌 Galaxy" },
  { value: "💎", label: "💎 Crystal" },
  { value: "🚀", label: "🚀 Launch" },
  { value: "🤖", label: "🤖 Tech" },
  { value: "🧬", label: "🧬 DNA" },
  { value: "⚛️", label: "⚛️ Atomic" },
  { value: "🔬", label: "🔬 Science" },
  { value: "💫", label: "💫 Stellar" },
  { value: "🌠", label: "🌠 Cosmic" },
  { value: "🎯", label: "🎯 Target" },
];

const CreateStatusDialog = ({ open, onOpenChange, userId }: CreateStatusDialogProps) => {
  const [statusText, setStatusText] = useState("");
  const [selectedEmoji, setSelectedEmoji] = useState("");
  const [loading, setLoading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
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
    }
  }, [open]);

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
      // Verify auth session before upsert
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session');
      }

      // Use upsert to handle both insert and update
      const { error } = await supabase
        .from('user_status')
        .upsert({
          user_id: session.user.id,
          status_text: statusText,
          emoji: selectedEmoji || null,
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        }, {
          onConflict: 'user_id',
        });

      if (error) throw error;

      toast({
        title: "Status shared!",
        description: "Your status is now visible to everyone",
      });

      setStatusText("");
      setSelectedEmoji("");
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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share Status</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Status Message</label>
            <Input
              placeholder="What's on your mind?"
              value={statusText}
              onChange={(e) => setStatusText(e.target.value)}
              maxLength={100}
              className="bg-background/50 backdrop-blur-sm"
            />
            <p className="text-xs text-muted-foreground mt-1">
              {statusText.length}/100 • Expires in 24 hours
            </p>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              Futuristic Emoji (optional)
            </label>
            <Select value={selectedEmoji} onValueChange={setSelectedEmoji}>
              <SelectTrigger className="w-full bg-background/50 backdrop-blur-sm border-primary/20">
                <SelectValue placeholder="Select an emoji">
                  {selectedEmoji ? (
                    <span className="text-2xl">{selectedEmoji}</span>
                  ) : (
                    "No emoji selected"
                  )}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="bg-background/95 backdrop-blur-sm border-primary/20">
                <SelectItem value=" " className="text-muted-foreground">
                  No emoji
                </SelectItem>
                {futuristicEmojis.map((emoji) => (
                  <SelectItem 
                    key={emoji.value} 
                    value={emoji.value}
                    className="text-lg hover:bg-primary/10 cursor-pointer"
                  >
                    {emoji.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
              disabled={loading || !authChecked}
            >
              Cancel
            </Button>
            <Button
              className="flex-1"
              onClick={handleCreateStatus}
              disabled={loading || !authChecked || !currentUserId}
            >
              {!authChecked ? "Loading..." : "Share Status"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CreateStatusDialog;
