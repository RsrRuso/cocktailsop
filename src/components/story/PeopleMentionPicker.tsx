import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Search, AtSign, Check, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import OptimizedAvatar from "@/components/OptimizedAvatar";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface Profile {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
}

interface PeopleMentionPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (profiles: Profile[]) => void;
  selectedPeople?: Profile[];
}

export function PeopleMentionPicker({ 
  open, 
  onOpenChange, 
  onSelect, 
  selectedPeople = [] 
}: PeopleMentionPickerProps) {
  const [search, setSearch] = useState("");
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [selected, setSelected] = useState<Profile[]>(selectedPeople);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setSelected(selectedPeople);
  }, [selectedPeople, open]);

  useEffect(() => {
    const fetchProfiles = async () => {
      if (!open) return;
      
      setLoading(true);
      try {
        let query = supabase
          .from("profiles")
          .select("id, username, full_name, avatar_url")
          .limit(20);

        if (search) {
          query = query.or(`username.ilike.%${search}%,full_name.ilike.%${search}%`);
        }

        const { data } = await query;
        if (data) setProfiles(data);
      } catch (error) {
        console.error("Error fetching profiles:", error);
      } finally {
        setLoading(false);
      }
    };

    const debounce = setTimeout(fetchProfiles, 300);
    return () => clearTimeout(debounce);
  }, [search, open]);

  const toggleSelect = (profile: Profile) => {
    setSelected(prev => {
      const isSelected = prev.some(p => p.id === profile.id);
      if (isSelected) {
        return prev.filter(p => p.id !== profile.id);
      }
      return [...prev, profile];
    });
  };

  const handleDone = () => {
    onSelect(selected);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AtSign className="w-5 h-5 text-primary" />
            Tag People
          </DialogTitle>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search people..."
            className="pl-9"
          />
        </div>

        {/* Selected People */}
        {selected.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {selected.map((person) => (
              <Badge 
                key={person.id} 
                variant="secondary"
                className="flex items-center gap-1 pr-1"
              >
                <span>@{person.username || person.full_name}</span>
                <button
                  onClick={() => toggleSelect(person)}
                  className="w-4 h-4 rounded-full hover:bg-destructive/20 flex items-center justify-center"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}

        <div className="flex-1 overflow-y-auto space-y-1 -mx-2 px-2">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-primary" />
            </div>
          ) : profiles.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No people found
            </div>
          ) : (
            profiles.map((profile) => {
              const isSelected = selected.some(p => p.id === profile.id);
              return (
                <button
                  key={profile.id}
                  onClick={() => toggleSelect(profile)}
                  className={cn(
                    "w-full flex items-center gap-3 p-3 rounded-xl hover:bg-accent/50 transition-colors text-left",
                    isSelected && "bg-primary/10 border border-primary/30"
                  )}
                >
                  <OptimizedAvatar
                    src={profile.avatar_url}
                    alt={profile.full_name || "User"}
                    className="w-10 h-10"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{profile.full_name || "User"}</p>
                    <p className="text-sm text-muted-foreground truncate">
                      @{profile.username || "user"}
                    </p>
                  </div>
                  {isSelected && (
                    <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                      <Check className="w-4 h-4 text-primary-foreground" />
                    </div>
                  )}
                </button>
              );
            })
          )}
        </div>

        <Button onClick={handleDone} className="w-full">
          Done {selected.length > 0 && `(${selected.length})`}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
