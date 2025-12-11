import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { getAbbreviatedName } from "@/lib/profileUtils";

interface Profile {
  id: string;
  username: string;
  full_name: string;
  avatar_url: string | null;
  professional_title: string | null;
}

interface FollowingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
}

const FollowingDialog = ({ open, onOpenChange, userId }: FollowingDialogProps) => {
  const navigate = useNavigate();
  const [following, setFollowing] = useState<Profile[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      fetchFollowing();
    }
  }, [open, userId]);

  const fetchFollowing = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("follows")
      .select(`
        following_id,
        profiles!follows_following_id_fkey (
          id,
          username,
          full_name,
          avatar_url,
          professional_title
        )
      `)
      .eq("follower_id", userId);

    if (data) {
      const followingProfiles = data
        .map((f: any) => f.profiles)
        .filter(Boolean);
      setFollowing(followingProfiles);
    }
    setLoading(false);
  };

  const filteredFollowing = following.filter(user =>
    user.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass max-w-md">
        <DialogHeader>
          <DialogTitle>Following</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search following..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="max-h-[400px] overflow-y-auto space-y-2">
            {loading ? (
              <p className="text-center text-muted-foreground py-8">Loading...</p>
            ) : filteredFollowing.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">Not following anyone yet</p>
            ) : (
              filteredFollowing.map((user) => (
                <div
                  key={user.id}
                  className="glass-hover rounded-xl p-3 flex items-center justify-between group cursor-pointer"
                  onClick={() => {
                    navigate(`/user/${user.id}`);
                    onOpenChange(false);
                  }}
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="w-12 h-12 ring-1 ring-border">
                      <AvatarImage src={user.avatar_url || undefined} />
                      <AvatarFallback>{user.username?.[0]?.toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-normal text-sm">{getAbbreviatedName(user.full_name)}</p>
                      <p className="text-sm text-muted-foreground">@{user.username}</p>
                      {user.professional_title && (
                        <p className="text-xs text-primary capitalize">
                          {user.professional_title.replace(/_/g, " ")}
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

export default FollowingDialog;
