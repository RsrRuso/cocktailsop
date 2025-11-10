import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, X } from "lucide-react";

interface CreateBusinessIdeaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export const CreateBusinessIdeaDialog = ({ open, onOpenChange, onSuccess }: CreateBusinessIdeaDialogProps) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [headline, setHeadline] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [stage, setStage] = useState("idea");
  const [fundingGoal, setFundingGoal] = useState("");
  const [hashtagInput, setHashtagInput] = useState("");
  const [hashtags, setHashtags] = useState<string[]>([]);

  const categories = ["Technology", "Healthcare", "Finance", "E-commerce", "Education", "Food & Beverage", "Real Estate", "Entertainment", "Other"];
  const stages = ["idea", "prototype", "mvp", "growing", "scaling"];

  const addHashtag = () => {
    if (hashtagInput.trim() && !hashtags.includes(hashtagInput.trim())) {
      setHashtags([...hashtags, hashtagInput.trim().toLowerCase()]);
      setHashtagInput("");
    }
  };

  const removeHashtag = (tag: string) => {
    setHashtags(hashtags.filter(t => t !== tag));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    try {
      const { error } = await supabase.from('business_ideas').insert({
        user_id: user.id,
        title,
        headline,
        description,
        category,
        stage,
        funding_goal: fundingGoal ? parseFloat(fundingGoal) : null,
        hashtags,
      });

      if (error) throw error;

      toast.success("Business idea posted successfully!");
      onOpenChange(false);
      onSuccess?.();
      
      // Reset form
      setTitle("");
      setHeadline("");
      setDescription("");
      setCategory("");
      setStage("idea");
      setFundingGoal("");
      setHashtags([]);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Share Your Business Idea</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., AI-Powered Recipe Generator"
              required
            />
          </div>

          <div>
            <Label htmlFor="headline">Headline *</Label>
            <Input
              id="headline"
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
              placeholder="One-line pitch for your idea"
              required
            />
          </div>

          <div>
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe your business idea, target market, and what makes it unique..."
              className="min-h-[120px]"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="category">Category *</Label>
              <Select value={category} onValueChange={setCategory} required>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="stage">Current Stage *</Label>
              <Select value={stage} onValueChange={setStage} required>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {stages.map((s) => (
                    <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="funding">Funding Goal (Optional)</Label>
            <Input
              id="funding"
              type="number"
              value={fundingGoal}
              onChange={(e) => setFundingGoal(e.target.value)}
              placeholder="e.g., 50000"
            />
          </div>

          <div>
            <Label htmlFor="hashtags">Hashtags (for matching with investors)</Label>
            <div className="flex gap-2">
              <Input
                id="hashtags"
                value={hashtagInput}
                onChange={(e) => setHashtagInput(e.target.value)}
                placeholder="e.g., AI, SaaS, B2B"
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addHashtag())}
              />
              <Button type="button" onClick={addHashtag} variant="outline">
                Add
              </Button>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {hashtags.map((tag) => (
                <div key={tag} className="bg-secondary px-3 py-1 rounded-full text-sm flex items-center gap-2">
                  #{tag}
                  <X className="w-3 h-3 cursor-pointer" onClick={() => removeHashtag(tag)} />
                </div>
              ))}
            </div>
          </div>

          <Button type="submit" disabled={loading} className="w-full">
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Post Business Idea
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
