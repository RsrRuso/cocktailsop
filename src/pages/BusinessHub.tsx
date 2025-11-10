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
import { Plus, Search, TrendingUp, Users, DollarSign, Eye, Heart, Sparkles, Target, BarChart3, PieChart, LineChart, Activity } from "lucide-react";
import { CreateBusinessIdeaDialog } from "@/components/CreateBusinessIdeaDialog";
import { BusinessIdeaDetailDialog } from "@/components/BusinessIdeaDetailDialog";
import { SetupInvestorProfileDialog } from "@/components/SetupInvestorProfileDialog";
import { useBusinessIdeaMatching, getMatchLevel } from "@/hooks/useBusinessIdeaMatching";
import { toast } from "sonner";
import { LineChart as RechartsLineChart, Line, BarChart as RechartsBarChart, Bar, PieChart as RechartsPieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area } from 'recharts';

const BusinessHub = () => {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [investorSetupOpen, setInvestorSetupOpen] = useState(false);
  const [selectedIdea, setSelectedIdea] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("ideas");

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

  // Fetch analytics data
  const { data: analyticsData = [] } = useQuery({
    queryKey: ['business-analytics', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from('business_analytics')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: true })
        .limit(30);
      return data || [];
    },
    enabled: !!user,
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

  // Apply matching algorithm for investors
  const matchedIdeas = useBusinessIdeaMatching(ideas, investorProfile);

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

  // Process analytics data for charts
  const processedAnalytics = analyticsData.reduce((acc: any, item) => {
    const date = new Date(item.date).toLocaleDateString();
    if (!acc[date]) {
      acc[date] = { date, views: 0, interests: 0 };
    }
    if (item.metric_type === 'views') {
      acc[date].views += item.metric_value;
    } else if (item.metric_type === 'interests') {
      acc[date].interests += item.metric_value;
    }
    return acc;
  }, {});

  const chartData = Object.values(processedAnalytics);

  // Category distribution
  const categoryData = ideas.reduce((acc: any, idea) => {
    const cat = idea.category || 'Other';
    acc[cat] = (acc[cat] || 0) + 1;
    return acc;
  }, {});

  const pieData = Object.entries(categoryData).map(([name, value]) => ({ name, value }));

  // Stage distribution
  const stageData = ideas.reduce((acc: any, idea) => {
    const stage = idea.stage || 'Idea';
    acc[stage] = (acc[stage] || 0) + 1;
    return acc;
  }, {});

  const barData = Object.entries(stageData).map(([stage, count]) => ({ stage, count }));

  const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', '#8884d8', '#82ca9d', '#ffc658', '#ff8042'];

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

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="ideas">
              <Target className="w-4 h-4 mr-2" />
              Ideas
            </TabsTrigger>
            <TabsTrigger value="analytics">
              <BarChart3 className="w-4 h-4 mr-2" />
              Analytics
            </TabsTrigger>
            <TabsTrigger value="insights">
              <Activity className="w-4 h-4 mr-2" />
              Insights
            </TabsTrigger>
          </TabsList>

          <TabsContent value="ideas" className="space-y-6">
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

            {/* Recommended Ideas for Investors */}
            {investorProfile && matchedIdeas.some(idea => idea.matchScore > 0) && (
              <div className="mb-8">
                <div className="flex items-center gap-2 mb-4">
                  <Sparkles className="w-5 h-5 text-primary" />
                  <h2 className="text-xl font-bold">Recommended For You</h2>
                  <Badge variant="secondary" className="ml-2">AI Matched</Badge>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {matchedIdeas
                    .filter(idea => idea.matchScore >= 30)
                    .slice(0, 6)
                    .map((idea) => {
                      const matchInfo = getMatchLevel(idea.matchScore);
                      return (
                        <Card key={idea.id} className="hover:shadow-lg transition-all cursor-pointer group relative overflow-hidden">
                          {/* Match indicator banner */}
                          <div className="absolute top-0 right-0 bg-gradient-to-l from-primary/20 to-transparent px-6 py-1 rounded-bl-lg">
                            <div className="flex items-center gap-1">
                              <Target className="w-3 h-3 text-primary" />
                              <span className={`text-xs font-semibold ${matchInfo.color}`}>
                                {idea.matchScore}% Match
                              </span>
                            </div>
                          </div>

                          <CardHeader className="pt-8">
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
                            
                            {/* Match reasons */}
                            {idea.matchReasons.length > 0 && (
                              <div className="mb-4 p-3 bg-primary/5 rounded-lg border border-primary/10">
                                <p className="text-xs font-semibold text-primary mb-1">Why this matches:</p>
                                <ul className="text-xs space-y-1">
                                  {idea.matchReasons.map((reason, i) => (
                                    <li key={i} className="flex items-center gap-1">
                                      <span className="w-1 h-1 bg-primary rounded-full"></span>
                                      {reason}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            
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
                      );
                    })}
                </div>
              </div>
            )}

            {/* All Ideas Section */}
            <div>
              <h2 className="text-xl font-bold mb-4">
                {investorProfile && matchedIdeas.some(idea => idea.matchScore > 0) ? "All Business Ideas" : "Business Ideas"}
              </h2>
              
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
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Views and Interests Trend */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <LineChart className="w-5 h-5" />
                    Views & Interests Trend
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Area type="monotone" dataKey="views" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.6} />
                      <Area type="monotone" dataKey="interests" stroke="hsl(var(--accent))" fill="hsl(var(--accent))" fillOpacity={0.6} />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Category Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <PieChart className="w-5 h-5" />
                    Ideas by Category
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <RechartsPieChart>
                      <Pie data={pieData} cx="50%" cy="50%" labelLine={false} label={(entry) => entry.name} outerRadius={100} fill="#8884d8" dataKey="value">
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Stage Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5" />
                    Ideas by Stage
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <RechartsBarChart data={barData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="stage" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="count" fill="hsl(var(--primary))" />
                    </RechartsBarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Key Metrics */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="w-5 h-5" />
                    Key Metrics
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 rounded-lg bg-primary/5">
                      <div>
                        <p className="text-sm text-muted-foreground">Total Ideas</p>
                        <p className="text-2xl font-bold">{ideas.length}</p>
                      </div>
                      <TrendingUp className="w-8 h-8 text-primary" />
                    </div>
                    <div className="flex items-center justify-between p-4 rounded-lg bg-accent/5">
                      <div>
                        <p className="text-sm text-muted-foreground">Total Views</p>
                        <p className="text-2xl font-bold">{ideas.reduce((sum, idea) => sum + idea.view_count, 0)}</p>
                      </div>
                      <Eye className="w-8 h-8 text-accent" />
                    </div>
                    <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/5">
                      <div>
                        <p className="text-sm text-muted-foreground">Total Interests</p>
                        <p className="text-2xl font-bold">{ideas.reduce((sum, idea) => sum + idea.interest_count, 0)}</p>
                      </div>
                      <Heart className="w-8 h-8 text-secondary" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="insights" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Top Categories</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {Object.entries(categoryData).sort(([,a], [,b]) => (b as number) - (a as number)).slice(0, 5).map(([cat, count]) => (
                      <div key={cat} className="flex items-center justify-between">
                        <span className="text-sm">{cat}</span>
                        <Badge>{count as number}</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Most Viewed Ideas</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {ideas.sort((a, b) => b.view_count - a.view_count).slice(0, 5).map((idea) => (
                      <div key={idea.id} className="flex items-center justify-between">
                        <span className="text-sm truncate flex-1">{idea.title}</span>
                        <Badge variant="outline">{idea.view_count}</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Most Interested Ideas</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {ideas.sort((a, b) => b.interest_count - a.interest_count).slice(0, 5).map((idea) => (
                      <div key={idea.id} className="flex items-center justify-between">
                        <span className="text-sm truncate flex-1">{idea.title}</span>
                        <Badge variant="outline">{idea.interest_count}</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
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