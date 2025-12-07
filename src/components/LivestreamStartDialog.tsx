import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Video, Sparkles, Users, Mic, Camera, X, Zap, ArrowRight, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface LivestreamStartDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const LivestreamStartDialog = ({ open, onOpenChange }: LivestreamStartDialogProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [enableAI, setEnableAI] = useState(true);
  const [isStarting, setIsStarting] = useState(false);

  const handleStartLive = async () => {
    if (!user) {
      toast.error("Please sign in to go live");
      return;
    }

    setIsStarting(true);
    try {
      const { data, error } = await supabase
        .from("livestreams")
        .insert({
          user_id: user.id,
          title: title.trim() || "Live now!",
          description: description.trim() || null,
          status: "live"
        })
        .select()
        .single();

      if (error) throw error;

      toast.success("You're now live!");
      onOpenChange(false);
      navigate(`/live/${data.id}`);
    } catch (error) {
      console.error("Error starting livestream:", error);
      toast.error("Failed to start livestream");
    } finally {
      setIsStarting(false);
    }
  };

  const aiFeatures = [
    { icon: Sparkles, label: "AI Captions", desc: "Real-time caption generation" },
    { icon: Mic, label: "AI Moderation", desc: "Auto-filter inappropriate content" },
    { icon: Zap, label: "Smart Replies", desc: "AI-suggested comment responses" },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-gradient-to-br from-background via-background to-pink-950/20 border-pink-500/30">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <div className="p-2 rounded-xl bg-gradient-to-br from-red-500 to-pink-600">
              <Video className="w-5 h-5 text-white" />
            </div>
            Go Live
            <Badge className="bg-red-500 text-white text-[10px] animate-pulse">
              BETA
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          {/* Title Input */}
          <div className="space-y-2">
            <Label>Stream Title</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What's your stream about?"
              className="bg-secondary/50 border-border/50"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label>Description (optional)</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Tell viewers what to expect..."
              rows={2}
              className="bg-secondary/50 border-border/50 resize-none"
            />
          </div>

          {/* AI Features Toggle */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-400" />
                <span className="font-semibold text-sm">AI Features</span>
              </div>
              <Switch checked={enableAI} onCheckedChange={setEnableAI} />
            </div>
            
            {enableAI && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="space-y-2"
              >
                {aiFeatures.map((feature, i) => (
                  <motion.div
                    key={feature.label}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="flex items-center gap-2 text-xs text-muted-foreground"
                  >
                    <feature.icon className="w-3 h-3 text-purple-400" />
                    <span className="font-medium">{feature.label}</span>
                    <span className="opacity-70">• {feature.desc}</span>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </div>

          {/* Preview Info */}
          <div className="flex items-center gap-3 p-3 rounded-xl bg-secondary/30 border border-border/50">
            <div className="p-2 rounded-lg bg-gradient-to-br from-pink-500/20 to-purple-500/20">
              <Camera className="w-4 h-4 text-pink-400" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">Camera & Microphone</p>
              <p className="text-xs text-muted-foreground">
                Will request permissions when you go live
              </p>
            </div>
          </div>

          {/* Start Button */}
          <Button
            onClick={handleStartLive}
            disabled={isStarting}
            className="w-full h-12 bg-gradient-to-r from-red-500 via-pink-500 to-purple-600 hover:from-red-600 hover:via-pink-600 hover:to-purple-700 text-white font-semibold text-base"
          >
            {isStarting ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Starting...
              </>
            ) : (
              <>
                <Video className="w-5 h-5 mr-2" />
                Go Live Now
                <ArrowRight className="w-5 h-5 ml-2" />
              </>
            )}
          </Button>

          <p className="text-center text-xs text-muted-foreground">
            By going live, you agree to our community guidelines
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default LivestreamStartDialog;
