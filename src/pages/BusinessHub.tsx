import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import TopNav from "@/components/TopNav";
import BottomNav from "@/components/BottomNav";
import { Plus, Search, TrendingUp, Users, DollarSign, Eye, Heart } from "lucide-react";
import { CreateBusinessIdeaDialog } from "@/components/CreateBusinessIdeaDialog";
import { BusinessIdeaDetailDialog } from "@/components/BusinessIdeaDetailDialog";
import { SetupInvestorProfileDialog } from "@/components/SetupInvestorProfileDialog";
import { toast } from "sonner";

const BusinessHub = () => {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [investorSetupOpen, setInvestorSetupOpen] = useState(false);
  const [selectedIdea, setSelectedIdea] = useState<any>(null);

  // Fetch business ideas
  const { data: ideas = [], refetch: refetchIdeas } = useQuery({
    queryKey: ['business-ideas', searchQuery, selectedCategory],
    queryFn: async () => {
      let query = supabase
        .from('business_ideas')
        .select(`
          *,
          profiles:user_id (
            id,
            username,
            full_name,
            avatar_url,
            user_type
          )
        `)
        .order('created_at', { ascending: false });

      if (selectedCategory !== 'all') {
        query = query.eq('category', selectedCategory);
      }

      if (searchQuery) {
        query = query.or(`title.ilike.%${searchQuery}%,headline.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  // Fetch user's investor profile
  const { data: investorProfile } = useQuery({
    queryKey: ['investor-profile', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase
        .from('investor_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();
      return data;
    },
    enabled: !!user,
  });

  // Fetch user's interests
  const { data: myInterests = [] } = useQuery({
    queryKey: ['my-interests', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from('idea_interests')
        .select('idea_id')
        .eq('user_id', user.id);
      return data?.map(i => i.idea_id) || [];
    },
    enabled: !!user,
  });

  const handleInterest = async (ideaId: string) => {
    if (!user) {
      toast.error("Please login to show interest");
      return;
    }

    const isInterested = myInterests.includes(ideaId);

    if (isInterested) {
      await supabase
        .from('idea_interests')
        .delete()
        .eq('idea_id', ideaId)
        .eq('user_id', user.id);
      toast.success("Interest removed");
    } else {
      await supabase
        .from('idea_interests')
        .insert({ idea_id: ideaId, user_id: user.id });
      toast.success("Interest shown! You can now connect with the idea owner.");
    }
    refetchIdeas();
  };

  const categories = ["all", "Technology", "Healthcare", "Finance", "E-commerce", "Education", "Food & Beverage", "Real Estate", "Entertainment", "Other"];

  return (
    <div className="min-h-screen bg-background pb-20">
      <TopNav />
      
      <div className="container mx-auto px-4 pt-20 pb-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Business Hub
            </h1>
            <p className="text-muted-foreground">Connect investors with innovative ideas</p>
          </div>
          <div className="flex gap-2">
            {!investorProfile && (
              <Button onClick={() => setInvestorSetupOpen(true)} variant="outline">
                <Users className="w-4 h-4 mr-2" />
                Become Investor
              </Button>
            )}
            <Button onClick={() => setCreateDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Post Idea
            </Button>
          </div>
        </div>

        {/* Search and filters */}
        <div className="mb-6 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search ideas by title, hashtags, or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="flex gap-2 overflow-x-auto pb-2">
            {categories.map((cat) => (
              <Button
                key={cat}
                variant={selectedCategory === cat ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory(cat)}
                className="capitalize whitespace-nowrap"
              >
                {cat}
              </Button>
            ))}
          </div>
        </div>

        {/* Ideas Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {ideas.map((idea) => (
            <Card key={idea.id} className="hover:shadow-lg transition-all cursor-pointer group">
              <CardHeader>
                <div className="flex items-start justify-between mb-2">
                  <Badge variant="secondary" className="capitalize">{idea.stage}</Badge>
                  <Badge>{idea.category}</Badge>
                </div>
                <CardTitle className="line-clamp-2 group-hover:text-primary transition-colors">
                  {idea.title}
                </CardTitle>
                <p className="text-sm text-muted-foreground line-clamp-1">{idea.headline}</p>
              </CardHeader>

              <CardContent>
                <p className="text-sm line-clamp-3 mb-4">{idea.description}</p>
                
                <div className="flex flex-wrap gap-1 mb-4">
                  {idea.hashtags?.slice(0, 3).map((tag: string, i: number) => (
                    <Badge key={i} variant="outline" className="text-xs">
                      #{tag}
                    </Badge>
                  ))}
                </div>

                {idea.funding_goal && (
                  <div className="flex items-center gap-2 text-sm">
                    <DollarSign className="w-4 h-4 text-primary" />
                    <span className="font-semibold">Goal: ${idea.funding_goal.toLocaleString()}</span>
                  </div>
                )}

                <div className="flex items-center gap-4 mt-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Eye className="w-4 h-4" />
                    {idea.view_count}
                  </div>
                  <div className="flex items-center gap-1">
                    <Heart className="w-4 h-4" />
                    {idea.interest_count}
                  </div>
                </div>
              </CardContent>

              <CardFooter className="flex gap-2">
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => {
                    setSelectedIdea(idea);
                    setDetailDialogOpen(true);
                  }}
                >
                  View Details
                </Button>
                <Button
                  variant={myInterests.includes(idea.id) ? "secondary" : "default"}
                  onClick={() => handleInterest(idea.id)}
                >
                  <Heart className={`w-4 h-4 ${myInterests.includes(idea.id) ? 'fill-current' : ''}`} />
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>

        {ideas.length === 0 && (
          <div className="text-center py-12">
            <TrendingUp className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No ideas found</h3>
            <p className="text-muted-foreground">Be the first to share your innovative idea!</p>
          </div>
        )}
      </div>

      <BottomNav />

      <CreateBusinessIdeaDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSuccess={refetchIdeas}
      />

      {selectedIdea && (
        <BusinessIdeaDetailDialog
          open={detailDialogOpen}
          onOpenChange={setDetailDialogOpen}
          idea={selectedIdea}
          onUpdate={refetchIdeas}
        />
      )}

      <SetupInvestorProfileDialog
        open={investorSetupOpen}
        onOpenChange={setInvestorSetupOpen}
      />
    </div>
  );
};

export default BusinessHub;
