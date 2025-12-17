import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { 
  Megaphone, 
  Image as ImageIcon, 
  Film, 
  Calendar,
  Target,
  DollarSign,
  Eye,
  MousePointer,
  TrendingUp,
  Sparkles,
  Check
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface PromoteContentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
}

export const PromoteContentDialog = ({ open, onOpenChange, userId }: PromoteContentDialogProps) => {
  const [posts, setPosts] = useState<any[]>([]);
  const [reels, setReels] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [promotions, setPromotions] = useState<any[]>([]);
  const [selectedContent, setSelectedContent] = useState<{ type: string; id: string } | null>(null);
  const [budget, setBudget] = useState(50);
  const [duration, setDuration] = useState(7);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && userId) {
      fetchContent();
      fetchPromotions();
    }
  }, [open, userId]);

  const fetchContent = async () => {
    const [postsRes, reelsRes, eventsRes] = await Promise.all([
      supabase.from('posts').select('id, content, media_urls, like_count').eq('user_id', userId).limit(10),
      supabase.from('reels').select('id, caption, video_url, view_count').eq('user_id', userId).limit(10),
      supabase.from('events').select('id, title, event_date').eq('user_id', userId).limit(10)
    ]);
    
    if (postsRes.data) setPosts(postsRes.data);
    if (reelsRes.data) setReels(reelsRes.data);
    if (eventsRes.data) setEvents(eventsRes.data);
  };

  const fetchPromotions = async () => {
    const { data } = await supabase
      .from('promoted_content')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (data) setPromotions(data);
  };

  const handlePromote = async () => {
    if (!selectedContent) {
      toast.error("Please select content to promote");
      return;
    }

    setLoading(true);
    try {
      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + duration);

      const { error } = await supabase.from('promoted_content').insert({
        user_id: userId,
        post_id: selectedContent.type === 'post' ? selectedContent.id : null,
        reel_id: selectedContent.type === 'reel' ? selectedContent.id : null,
        event_id: selectedContent.type === 'event' ? selectedContent.id : null,
        budget: budget,
        daily_budget: budget / duration,
        start_date: startDate.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0],
        status: 'pending',
        target_audience: {}
      });

      if (error) throw error;
      
      toast.success("Promotion created! It will be reviewed shortly.");
      fetchPromotions();
      setSelectedContent(null);
    } catch (error) {
      toast.error("Failed to create promotion");
    } finally {
      setLoading(false);
    }
  };

  const estimatedReach = Math.round(budget * 68);
  const estimatedClicks = Math.round(budget * 3.4);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 text-white">
              <Megaphone className="w-5 h-5" />
            </div>
            Promote Your Content
          </DialogTitle>
          <DialogDescription>
            Boost your content to reach more people and grow your audience.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-120px)]">
          <Tabs defaultValue="create" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="create">Create Promotion</TabsTrigger>
              <TabsTrigger value="active">Active ({promotions.filter(p => p.status === 'active').length})</TabsTrigger>
            </TabsList>

            <TabsContent value="create" className="space-y-4 mt-4">
              {/* Select Content */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">Select Content to Promote</Label>
                
                <Tabs defaultValue="posts" className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="posts" className="text-xs">
                      <ImageIcon className="w-3 h-3 mr-1" />Posts
                    </TabsTrigger>
                    <TabsTrigger value="reels" className="text-xs">
                      <Film className="w-3 h-3 mr-1" />Reels
                    </TabsTrigger>
                    <TabsTrigger value="events" className="text-xs">
                      <Calendar className="w-3 h-3 mr-1" />Events
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="posts" className="mt-3">
                    <div className="grid grid-cols-3 gap-2">
                      {posts.map(post => (
                        <Card 
                          key={post.id}
                          className={`cursor-pointer overflow-hidden transition-all ${
                            selectedContent?.id === post.id ? 'ring-2 ring-primary' : ''
                          }`}
                          onClick={() => setSelectedContent({ type: 'post', id: post.id })}
                        >
                          <CardContent className="p-0 aspect-square relative">
                            {post.media_urls?.[0] ? (
                              <img src={post.media_urls[0]} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full bg-muted flex items-center justify-center">
                                <ImageIcon className="w-8 h-8 text-muted-foreground" />
                              </div>
                            )}
                            {selectedContent?.id === post.id && (
                              <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                                <Check className="w-8 h-8 text-primary" />
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                      {posts.length === 0 && (
                        <p className="col-span-3 text-center text-muted-foreground text-sm py-4">No posts yet</p>
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="reels" className="mt-3">
                    <div className="grid grid-cols-3 gap-2">
                      {reels.map(reel => (
                        <Card 
                          key={reel.id}
                          className={`cursor-pointer overflow-hidden transition-all ${
                            selectedContent?.id === reel.id ? 'ring-2 ring-primary' : ''
                          }`}
                          onClick={() => setSelectedContent({ type: 'reel', id: reel.id })}
                        >
                          <CardContent className="p-0 aspect-square relative">
                            <video src={reel.video_url} className="w-full h-full object-cover" muted />
                            <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                              <Film className="w-6 h-6 text-white" />
                            </div>
                            {selectedContent?.id === reel.id && (
                              <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                                <Check className="w-8 h-8 text-primary" />
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                      {reels.length === 0 && (
                        <p className="col-span-3 text-center text-muted-foreground text-sm py-4">No reels yet</p>
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="events" className="mt-3">
                    <div className="space-y-2">
                      {events.map(event => (
                        <Card 
                          key={event.id}
                          className={`cursor-pointer transition-all ${
                            selectedContent?.id === event.id ? 'ring-2 ring-primary' : ''
                          }`}
                          onClick={() => setSelectedContent({ type: 'event', id: event.id })}
                        >
                          <CardContent className="p-3 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <Calendar className="w-5 h-5 text-muted-foreground" />
                              <div>
                                <p className="font-medium text-sm">{event.title}</p>
                                <p className="text-xs text-muted-foreground">
                                  {event.event_date ? new Date(event.event_date).toLocaleDateString() : 'No date'}
                                </p>
                              </div>
                            </div>
                            {selectedContent?.id === event.id && (
                              <Check className="w-5 h-5 text-primary" />
                            )}
                          </CardContent>
                        </Card>
                      ))}
                      {events.length === 0 && (
                        <p className="text-center text-muted-foreground text-sm py-4">No events yet</p>
                      )}
                    </div>
                  </TabsContent>
                </Tabs>
              </div>

              {/* Budget & Duration */}
              <div className="space-y-4 pt-4 border-t">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Total Budget</Label>
                    <span className="text-lg font-bold text-primary">${budget}</span>
                  </div>
                  <Slider
                    value={[budget]}
                    onValueChange={([v]) => setBudget(v)}
                    min={10}
                    max={500}
                    step={10}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>$10</span>
                    <span>$500</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Duration</Label>
                    <span className="text-lg font-bold">{duration} days</span>
                  </div>
                  <Slider
                    value={[duration]}
                    onValueChange={([v]) => setDuration(v)}
                    min={1}
                    max={30}
                    step={1}
                    className="w-full"
                  />
                </div>
              </div>

              {/* Estimated Results */}
              <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Sparkles className="w-4 h-4 text-primary" />
                    <span className="font-medium text-sm">Estimated Results</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center gap-2">
                      <Eye className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Reach</p>
                        <p className="font-bold">{estimatedReach.toLocaleString()}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <MousePointer className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Clicks</p>
                        <p className="font-bold">{estimatedClicks.toLocaleString()}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Button 
                onClick={handlePromote} 
                disabled={!selectedContent || loading}
                className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
              >
                {loading ? "Creating..." : `Promote for $${budget}`}
              </Button>
            </TabsContent>

            <TabsContent value="active" className="space-y-3 mt-4">
              {promotions.map(promo => (
                <Card key={promo.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge variant={promo.status === 'active' ? 'default' : 'secondary'}>
                            {promo.status}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {promo.post_id ? 'Post' : promo.reel_id ? 'Reel' : 'Event'}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-sm">
                          <span className="flex items-center gap-1">
                            <DollarSign className="w-3 h-3" />
                            ${promo.spent || 0} / ${promo.budget}
                          </span>
                          <span className="flex items-center gap-1">
                            <Eye className="w-3 h-3" />
                            {promo.impressions || 0}
                          </span>
                          <span className="flex items-center gap-1">
                            <MousePointer className="w-3 h-3" />
                            {promo.clicks || 0}
                          </span>
                        </div>
                      </div>
                      <TrendingUp className="w-5 h-5 text-primary" />
                    </div>
                  </CardContent>
                </Card>
              ))}
              {promotions.length === 0 && (
                <div className="text-center py-8">
                  <Megaphone className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">No promotions yet</p>
                  <p className="text-xs text-muted-foreground">Create your first promotion to reach more people</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
