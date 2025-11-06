import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Smile } from "lucide-react";

interface CreateStatusDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId?: string;
}

const popularEmojis = ["😊", "😎", "🔥", "💪", "✨", "🎉", "❤️", "👍", "🌟", "💯"];

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
            />
            <p className="text-xs text-muted-foreground mt-1">
              {statusText.length}/100 • Expires in 24 hours
            </p>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 flex items-center gap-2">
              <Smile className="w-4 h-4" />
              Choose an emoji (optional)
            </label>
            <div className="grid grid-cols-5 gap-2">
              {popularEmojis.map((emoji) => (
                <Button
                  key={emoji}
                  variant={selectedEmoji === emoji ? "default" : "outline"}
                  className="text-2xl h-12"
                  onClick={() => setSelectedEmoji(emoji === selectedEmoji ? "" : emoji)}
                >
                  {emoji}
                </Button>
              ))}
            </div>
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
