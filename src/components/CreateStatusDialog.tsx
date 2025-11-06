import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Smile } from "lucide-react";

interface CreateStatusDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
}

const popularEmojis = ["😊", "😎", "🔥", "💪", "✨", "🎉", "❤️", "👍", "🌟", "💯"];

const CreateStatusDialog = ({ open, onOpenChange, userId }: CreateStatusDialogProps) => {
  const [statusText, setStatusText] = useState("");
  const [selectedEmoji, setSelectedEmoji] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleCreateStatus = async () => {
    if (!statusText.trim()) {
      toast({
        title: "Status required",
        description: "Please enter a status message",
        variant: "destructive",
      });
      return;
    }

    if (!userId) {
      toast({
        title: "Error",
        description: "Please log in to share a status",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Use upsert to handle duplicate key constraint
      const { error } = await supabase
        .from('user_status')
        .upsert({
          user_id: userId,
          status_text: statusText,
          emoji: selectedEmoji || null,
        }, {
          onConflict: 'user_id'
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
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              className="flex-1"
              onClick={handleCreateStatus}
              disabled={loading}
            >
              Share Status
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CreateStatusDialog;
