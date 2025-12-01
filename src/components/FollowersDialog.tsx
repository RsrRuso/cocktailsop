import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

interface Profile {
  id: string;
  username: string;
  full_name: string;
  avatar_url: string | null;
  professional_title: string | null;
}

interface FollowersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
}

const FollowersDialog = ({ open, onOpenChange, userId }: FollowersDialogProps) => {
  const navigate = useNavigate();
  const [followers, setFollowers] = useState<Profile[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      fetchFollowers();
    }
  }, [open, userId]);

  const fetchFollowers = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("follows")
      .select(`
        follower_id,
        profiles!follows_follower_id_fkey (
          id,
          username,
          full_name,
          avatar_url,
          professional_title
        )
      `)
      .eq("following_id", userId);

    if (data) {
      const followerProfiles = data
        .map((f: any) => f.profiles)
        .filter(Boolean);
      setFollowers(followerProfiles);
    }
    setLoading(false);
  };

  const filteredFollowers = followers.filter(follower =>
    follower.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    follower.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass max-w-md">
        <DialogHeader>
          <DialogTitle>Followers</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search followers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="max-h-[400px] overflow-y-auto space-y-2">
            {loading ? (
              <p className="text-center text-muted-foreground py-8">Loading...</p>
            ) : filteredFollowers.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No followers yet</p>
            ) : (
              filteredFollowers.map((follower) => (
                <div
                  key={follower.id}
                  className="glass-hover rounded-xl p-3 flex items-center justify-between group cursor-pointer"
                  onClick={() => {
                    navigate(`/user/${follower.id}`);
                    onOpenChange(false);
                  }}
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="w-12 h-12 ring-1 ring-border">
                      <AvatarImage src={follower.avatar_url || undefined} />
                      <AvatarFallback>{follower.username?.[0]?.toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{follower.full_name}</p>
                      <p className="text-sm text-muted-foreground">@{follower.username}</p>
                      {follower.professional_title && (
                        <p className="text-xs text-primary capitalize">
                          {follower.professional_title.replace(/_/g, " ")}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FollowersDialog;
