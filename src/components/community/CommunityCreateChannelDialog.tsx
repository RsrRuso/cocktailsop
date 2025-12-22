import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Hash, Lock, Megaphone, Users, Loader2 } from "lucide-react";
import { motion } from "framer-motion";

interface CommunityCreateChannelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChannelCreated: () => void;
}

const channelTypes = [
  {
    id: "public",
    name: "Public Channel",
    description: "Anyone can join and see messages",
    icon: Hash,
    color: "from-green-500 to-emerald-500",
  },
  {
    id: "private",
    name: "Private Group",
    description: "Invite-only channel",
    icon: Lock,
    color: "from-purple-500 to-pink-500",
  },
];

const categories = [
  "general",
  "events",
  "feedback",
  "support",
  "social",
  "work",
  "gaming",
  "music",
  "sports",
  "other",
];

export default function CommunityCreateChannelDialog({
  open,
  onOpenChange,
  onChannelCreated,
}: CommunityCreateChannelDialogProps) {
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [channelType, setChannelType] = useState("public");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("general");
  const [isCreating, setIsCreating] = useState(false);

  const handleCreate = async () => {
    if (!name.trim() || !user) return;

    setIsCreating(true);
    try {
      // Create channel
      const { data: channel, error: channelError } = await supabase
        .from("community_channels")
        .insert({
          name: name.trim(),
          description: description.trim() || null,
          type: channelType,
          category,
          created_by: user.id,
          member_count: 1,
        })
        .select()
        .single();

      if (channelError) throw channelError;

      // Add creator as admin
      const { error: memberError } = await supabase
        .from("community_channel_members")
        .insert({
          channel_id: channel.id,
          user_id: user.id,
          role: "admin",
        });

      if (memberError) throw memberError;

      toast.success("Channel created successfully!");
      resetForm();
      onChannelCreated();
    } catch (error: any) {
      console.error("Failed to create channel:", error);
      toast.error("Failed to create channel");
    } finally {
      setIsCreating(false);
    }
  };

  const resetForm = () => {
    setStep(1);
    setChannelType("public");
    setName("");
    setDescription("");
    setCategory("general");
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) resetForm(); onOpenChange(v); }}>
      <DialogContent className="max-w-lg bg-slate-900 border-white/10 text-white overflow-hidden">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
              <Users className="w-5 h-5 text-white" />
            </div>
            Create New Channel
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {step === 1 ? (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-4"
            >
              <p className="text-white/60 text-sm">Choose channel type</p>
              <div className="space-y-3">
                {channelTypes.map((type) => {
                  const Icon = type.icon;
                  return (
                    <motion.div
                      key={type.id}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setChannelType(type.id)}
                      className={`p-4 rounded-xl cursor-pointer transition-all border-2 ${
                        channelType === type.id
                          ? "border-blue-500 bg-blue-500/10"
                          : "border-white/10 bg-white/5 hover:bg-white/10"
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`h-12 w-12 rounded-xl bg-gradient-to-br ${type.color} flex items-center justify-center`}>
                          <Icon className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-white">{type.name}</h3>
                          <p className="text-sm text-white/50">{type.description}</p>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
              <Button
                onClick={() => setStep(2)}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white mt-4"
              >
                Continue
              </Button>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label className="text-white/70">Channel Name</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Weekend Events"
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/40"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-white/70">Description (optional)</Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What's this channel about?"
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/40 resize-none"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-white/70">Category</Label>
                <div className="flex flex-wrap gap-2">
                  {categories.map((cat) => (
                    <Button
                      key={cat}
                      variant={category === cat ? "default" : "ghost"}
                      size="sm"
                      onClick={() => setCategory(cat)}
                      className={`capitalize ${
                        category === cat
                          ? "bg-blue-600 hover:bg-blue-700"
                          : "bg-white/5 hover:bg-white/10 text-white/70"
                      }`}
                    >
                      {cat}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  variant="ghost"
                  onClick={() => setStep(1)}
                  className="flex-1 text-white/70 hover:text-white hover:bg-white/10"
                >
                  Back
                </Button>
                <Button
                  onClick={handleCreate}
                  disabled={!name.trim() || isCreating}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {isCreating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Create Channel"
                  )}
                </Button>
              </div>
            </motion.div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
