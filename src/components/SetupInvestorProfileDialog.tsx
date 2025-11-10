import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, X } from "lucide-react";

interface SetupInvestorProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const SetupInvestorProfileDialog = ({ open, onOpenChange }: SetupInvestorProfileDialogProps) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [bio, setBio] = useState("");
  const [investmentRangeMin, setInvestmentRangeMin] = useState("");
  const [investmentRangeMax, setInvestmentRangeMax] = useState("");
  const [portfolioUrl, setPortfolioUrl] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [focusInput, setFocusInput] = useState("");
  const [investmentFocus, setInvestmentFocus] = useState<string[]>([]);
  const [industryInput, setIndustryInput] = useState("");
  const [industries, setIndustries] = useState<string[]>([]);

  const addFocus = () => {
    if (focusInput.trim() && !investmentFocus.includes(focusInput.trim())) {
      setInvestmentFocus([...investmentFocus, focusInput.trim()]);
      setFocusInput("");
    }
  };

  const addIndustry = () => {
    if (industryInput.trim() && !industries.includes(industryInput.trim())) {
      setIndustries([...industries, industryInput.trim()]);
      setIndustryInput("");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    try {
      // Create investor profile
      const { error: profileError } = await supabase.from('investor_profiles').insert({
        user_id: user.id,
        bio,
        investment_range_min: investmentRangeMin ? parseFloat(investmentRangeMin) : null,
        investment_range_max: investmentRangeMax ? parseFloat(investmentRangeMax) : null,
        investment_focus: investmentFocus,
        industries,
        portfolio_url: portfolioUrl || null,
        linkedin_url: linkedinUrl || null,
      });

      if (profileError) throw profileError;

      // Update user type to investor
      const { error: userError } = await supabase
        .from('profiles')
        .update({ user_type: 'investor', interests: investmentFocus })
        .eq('id', user.id);

      if (userError) throw userError;

      toast.success("Investor profile created successfully!");
      onOpenChange(false);
      window.location.reload();
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
          <DialogTitle>Become an Investor</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="bio">Bio *</Label>
            <Textarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell entrepreneurs about yourself and your investment philosophy..."
              className="min-h-[100px]"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="min">Min Investment ($)</Label>
              <Input
                id="min"
                type="number"
                value={investmentRangeMin}
                onChange={(e) => setInvestmentRangeMin(e.target.value)}
                placeholder="e.g., 10000"
              />
            </div>
            <div>
              <Label htmlFor="max">Max Investment ($)</Label>
              <Input
                id="max"
                type="number"
                value={investmentRangeMax}
                onChange={(e) => setInvestmentRangeMax(e.target.value)}
                placeholder="e.g., 100000"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="focus">Investment Focus *</Label>
            <div className="flex gap-2">
              <Input
                id="focus"
                value={focusInput}
                onChange={(e) => setFocusInput(e.target.value)}
                placeholder="e.g., Early Stage, SaaS, AI"
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addFocus())}
              />
              <Button type="button" onClick={addFocus} variant="outline">
                Add
              </Button>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {investmentFocus.map((focus) => (
                <div key={focus} className="bg-secondary px-3 py-1 rounded-full text-sm flex items-center gap-2">
                  {focus}
                  <X className="w-3 h-3 cursor-pointer" onClick={() => setInvestmentFocus(investmentFocus.filter(f => f !== focus))} />
                </div>
              ))}
            </div>
          </div>

          <div>
            <Label htmlFor="industries">Industries of Interest *</Label>
            <div className="flex gap-2">
              <Input
                id="industries"
                value={industryInput}
                onChange={(e) => setIndustryInput(e.target.value)}
                placeholder="e.g., Technology, Healthcare"
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addIndustry())}
              />
              <Button type="button" onClick={addIndustry} variant="outline">
                Add
              </Button>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {industries.map((industry) => (
                <div key={industry} className="bg-secondary px-3 py-1 rounded-full text-sm flex items-center gap-2">
                  {industry}
                  <X className="w-3 h-3 cursor-pointer" onClick={() => setIndustries(industries.filter(i => i !== industry))} />
                </div>
              ))}
            </div>
          </div>

          <div>
            <Label htmlFor="portfolio">Portfolio URL</Label>
            <Input
              id="portfolio"
              type="url"
              value={portfolioUrl}
              onChange={(e) => setPortfolioUrl(e.target.value)}
              placeholder="https://..."
            />
          </div>

          <div>
            <Label htmlFor="linkedin">LinkedIn URL</Label>
            <Input
              id="linkedin"
              type="url"
              value={linkedinUrl}
              onChange={(e) => setLinkedinUrl(e.target.value)}
              placeholder="https://linkedin.com/in/..."
            />
          </div>

          <Button type="submit" disabled={loading} className="w-full">
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Create Investor Profile
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
