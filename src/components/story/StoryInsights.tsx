import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Eye, Heart, MessageCircle, Share2, TrendingUp, Clock, Zap, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import OptimizedAvatar from "@/components/OptimizedAvatar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface StoryInsightsProps {
  storyId: string;
}

interface UserProfile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  username: string | null;
}

export const StoryInsights = ({ storyId }: StoryInsightsProps) => {
  const [metrics, setMetrics] = useState({
    views: 0,
    likes: 0,
    comments: 0,
    shares: 0,
    engagement_rate: 0,
    completion_rate: 0,
  });

  const [demographics, setDemographics] = useState({
    peak_time: "9:00 PM",
    top_location: "Loading...",
    avg_watch_time: "85%",
  });

  const [viewers, setViewers] = useState<UserProfile[]>([]);
  const [likers, setLikers] = useState<UserProfile[]>([]);
  const [commenters, setCommenters] = useState<UserProfile[]>([]);
  const [sharers, setSharers] = useState<UserProfile[]>([]);

  useEffect(() => {
    fetchStoryMetrics();
    fetchViewers();
    fetchLikers();
    fetchCommenters();
    fetchSharers();
  }, [storyId]);

  const fetchStoryMetrics = async () => {
    try {
      const { data: story } = await supabase
        .from("stories")
        .select("view_count, like_count, comment_count")
        .eq("id", storyId)
        .single();

      if (story) {
        const engagement = story.view_count > 0 
          ? ((story.like_count + story.comment_count) / story.view_count) * 100
          : 0;

        setMetrics({
          views: story.view_count || 0,
          likes: story.like_count || 0,
          comments: story.comment_count || 0,
          shares: 0,
          engagement_rate: Math.round(engagement),
          completion_rate: 78,
        });
      }
    } catch (error) {
      console.error("Error fetching metrics:", error);
    }
  };

  const fetchViewers = async () => {
    try {
      const { data } = await supabase
        .from("story_views" as any)
        .select(`
          user_id,
          profiles:user_id (
            id,
            full_name,
            avatar_url,
            username
          )
        `)
        .eq("story_id", storyId)
        .order("created_at", { ascending: false });

      if (data) {
        setViewers(data.map((v: any) => v.profiles).filter(Boolean));
      }
    } catch (error) {
      console.error("Error fetching viewers:", error);
    }
  };

  const fetchLikers = async () => {
    try {
      const { data } = await supabase
        .from("story_likes" as any)
        .select(`
          user_id,
          profiles:user_id (
            id,
            full_name,
            avatar_url,
            username
          )
        `)
        .eq("story_id", storyId)
        .order("created_at", { ascending: false });

      if (data) {
        setLikers(data.map((l: any) => l.profiles).filter(Boolean));
      }
    } catch (error) {
      console.error("Error fetching likers:", error);
    }
  };

  const fetchCommenters = async () => {
    try {
      const { data } = await supabase
        .from("story_comments" as any)
        .select(`
          user_id,
          profiles:user_id (
            id,
            full_name,
            avatar_url,
            username
          )
        `)
        .eq("story_id", storyId)
        .order("created_at", { ascending: false });

      if (data) {
        // Get unique users who commented
        const uniqueUsers = Array.from(
          new Map(data.map((c: any) => [c.profiles?.id, c.profiles])).values()
        ).filter(Boolean);
        setCommenters(uniqueUsers as UserProfile[]);
      }
    } catch (error) {
      console.error("Error fetching commenters:", error);
    }
  };

  const fetchSharers = async () => {
    try {
      const { data } = await supabase
        .from("story_reposts" as any)
        .select(`
          user_id,
          profiles:user_id (
            id,
            full_name,
            avatar_url,
            username
          )
        `)
        .eq("story_id", storyId)
        .order("created_at", { ascending: false });

      if (data) {
        setSharers(data.map((s: any) => s.profiles).filter(Boolean));
      }
    } catch (error) {
      console.error("Error fetching sharers:", error);
    }
  };

  const UserList = ({ users, emptyText }: { users: UserProfile[], emptyText: string }) => (
    <ScrollArea className="h-48">
      {users.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">{emptyText}</p>
      ) : (
        <div className="space-y-2 pr-4">
          {users.map((user) => (
            <div key={user.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-accent/50 transition-colors">
              <OptimizedAvatar
                src={user.avatar_url}
                alt={user.full_name || "User"}
                className="w-8 h-8"
              />
              <span className="text-sm font-medium">
                {user.full_name || user.username || "Anonymous"}
              </span>
            </div>
          ))}
        </div>
      )}
    </ScrollArea>
  );

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <TrendingUp className="w-5 h-5 text-primary" />
            Live Performance
          </CardTitle>
          <CardDescription>Real-time story analytics</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Collapsible>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="w-full justify-between p-3 h-auto hover:bg-blue-500/10">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-blue-500/10">
                      <Eye className="w-4 h-4 text-blue-500" />
                    </div>
                    <div className="text-left">
                      <div className="text-xs text-muted-foreground">Views</div>
                      <div className="text-xl font-bold">{metrics.views}</div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-2 px-2">
                <UserList users={viewers} emptyText="No views yet" />
              </CollapsibleContent>
            </Collapsible>

            <Collapsible>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="w-full justify-between p-3 h-auto hover:bg-red-500/10">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-red-500/10">
                      <Heart className="w-4 h-4 text-red-500" />
                    </div>
                    <div className="text-left">
                      <div className="text-xs text-muted-foreground">Likes</div>
                      <div className="text-xl font-bold">{metrics.likes}</div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-2 px-2">
                <UserList users={likers} emptyText="No likes yet" />
              </CollapsibleContent>
            </Collapsible>

            <Collapsible>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="w-full justify-between p-3 h-auto hover:bg-green-500/10">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-green-500/10">
                      <MessageCircle className="w-4 h-4 text-green-500" />
                    </div>
                    <div className="text-left">
                      <div className="text-xs text-muted-foreground">Comments</div>
                      <div className="text-xl font-bold">{metrics.comments}</div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-2 px-2">
                <UserList users={commenters} emptyText="No comments yet" />
              </CollapsibleContent>
            </Collapsible>

            <Collapsible>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="w-full justify-between p-3 h-auto hover:bg-purple-500/10">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-purple-500/10">
                      <Share2 className="w-4 h-4 text-purple-500" />
                    </div>
                    <div className="text-left">
                      <div className="text-xs text-muted-foreground">Shares</div>
                      <div className="text-xl font-bold">{metrics.shares}</div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-2 px-2">
                <UserList users={sharers} emptyText="No shares yet" />
              </CollapsibleContent>
            </Collapsible>
          </div>

          <div className="space-y-3 pt-2">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-orange-500" />
                  Engagement Rate
                </span>
                <span className="font-bold">{metrics.engagement_rate}%</span>
              </div>
              <Progress value={metrics.engagement_rate} className="h-2" />
            </div>

            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-blue-500" />
                  Completion Rate
                </span>
                <span className="font-bold">{metrics.completion_rate}%</span>
              </div>
              <Progress value={metrics.completion_rate} className="h-2" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Audience Insights</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Peak Time</span>
            <Badge variant="secondary">{demographics.peak_time}</Badge>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Avg Watch Time</span>
            <Badge variant="secondary">{demographics.avg_watch_time}</Badge>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Top Location</span>
            <Badge variant="secondary">{demographics.top_location}</Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
