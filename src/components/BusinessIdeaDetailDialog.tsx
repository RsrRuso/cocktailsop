import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { DollarSign, TrendingUp, Users, MessageCircle, Heart, Calendar } from "lucide-react";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";

interface BusinessIdeaDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  idea: any;
  onUpdate?: () => void;
}

export const BusinessIdeaDetailDialog = ({ open, onOpenChange, idea, onUpdate }: BusinessIdeaDetailDialogProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Fetch interests for this idea
  const { data: interests = [] } = useQuery({
    queryKey: ['idea-interests', idea.id],
    queryFn: async () => {
      if (!user || user.id !== idea.user_id) return [];
      
      const { data } = await supabase
        .from('idea_interests')
        .select(`
          *,
          profiles:user_id (
            id,
            username,
            full_name,
            avatar_url
          )
        `)
        .eq('idea_id', idea.id);
      return data || [];
    },
    enabled: !!user && user.id === idea.user_id,
  });

  const handleContact = async () => {
    if (!user) {
      toast.error("Please login to contact");
      return;
    }

    // Check if conversation exists
    const { data: existing } = await supabase
      .from('conversations')
      .select('id')
      .contains('participant_ids', [user.id])
      .contains('participant_ids', [idea.user_id])
      .single();

    if (existing) {
      navigate(`/messages/${existing.id}`);
    } else {
      // Create new conversation
      const { data: newConv } = await supabase
        .from('conversations')
        .insert({
          participant_ids: [user.id, idea.user_id],
        })
        .select()
        .single();

      if (newConv) {
        navigate(`/messages/${newConv.id}`);
      }
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <DialogTitle className="text-2xl mb-2">{idea.title}</DialogTitle>
              <p className="text-muted-foreground">{idea.headline}</p>
            </div>
            <div className="flex gap-2">
              <Badge variant="secondary" className="capitalize">{idea.stage}</Badge>
              <Badge>{idea.category}</Badge>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Author Info */}
          <div className="flex items-center gap-3">
            <Avatar>
              <AvatarImage src={idea.profiles?.avatar_url} />
              <AvatarFallback>{idea.profiles?.username?.[0]?.toUpperCase()}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-normal">{idea.profiles?.full_name || idea.profiles?.username}</p>
              <p className="text-sm text-muted-foreground capitalize">{idea.profiles?.user_type || 'Entrepreneur'}</p>
            </div>
            {user?.id !== idea.user_id && (
              <Button onClick={handleContact} className="ml-auto">
                <MessageCircle className="w-4 h-4 mr-2" />
                Contact
              </Button>
            )}
          </div>

          <Separator />

          {/* Description */}
          <div>
            <h3 className="font-semibold mb-2">About This Idea</h3>
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{idea.description}</p>
          </div>

          {/* Funding Goal */}
          {idea.funding_goal && (
            <div className="bg-secondary/50 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="w-5 h-5 text-primary" />
                <h3 className="font-semibold">Funding Goal</h3>
              </div>
              <p className="text-2xl font-bold">${idea.funding_goal.toLocaleString()}</p>
              {idea.current_funding > 0 && (
                <p className="text-sm text-muted-foreground mt-1">
                  ${idea.current_funding.toLocaleString()} raised so far
                </p>
              )}
            </div>
          )}

          {/* Hashtags */}
          {idea.hashtags?.length > 0 && (
            <div>
              <h3 className="font-semibold mb-2">Tags</h3>
              <div className="flex flex-wrap gap-2">
                {idea.hashtags.map((tag: string, i: number) => (
                  <Badge key={i} variant="outline">#{tag}</Badge>
                ))}
              </div>
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-3 bg-secondary/30 rounded-lg">
              <Users className="w-5 h-5 mx-auto mb-1 text-primary" />
              <p className="text-xl font-bold">{idea.interest_count}</p>
              <p className="text-xs text-muted-foreground">Interested</p>
            </div>
            <div className="text-center p-3 bg-secondary/30 rounded-lg">
              <TrendingUp className="w-5 h-5 mx-auto mb-1 text-primary" />
              <p className="text-xl font-bold">{idea.view_count}</p>
              <p className="text-xs text-muted-foreground">Views</p>
            </div>
            <div className="text-center p-3 bg-secondary/30 rounded-lg">
              <Calendar className="w-5 h-5 mx-auto mb-1 text-primary" />
              <p className="text-xs font-semibold">{format(new Date(idea.created_at), 'MMM d, yyyy')}</p>
              <p className="text-xs text-muted-foreground">Posted</p>
            </div>
          </div>

          {/* Interested Investors (if owner) */}
          {user?.id === idea.user_id && interests.length > 0 && (
            <div>
              <h3 className="font-semibold mb-3">Interested Investors ({interests.length})</h3>
              <div className="space-y-2">
                {interests.map((interest: any) => (
                  <div key={interest.id} className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Avatar className="w-10 h-10">
                        <AvatarImage src={interest.profiles?.avatar_url} />
                        <AvatarFallback>{interest.profiles?.username?.[0]?.toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{interest.profiles?.full_name || interest.profiles?.username}</p>
                        <p className="text-xs text-muted-foreground">
                          Interested on {format(new Date(interest.created_at), 'MMM d')}
                        </p>
                      </div>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => {
                      // Navigate to message this investor
                      navigate(`/messages`);
                      onOpenChange(false);
                    }}>
                      Message
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
