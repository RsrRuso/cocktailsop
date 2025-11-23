import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { ArrowRightLeft, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface Transfer {
  id: string;
  from_store_id: string;
  to_store_id: string;
  quantity: number;
  transfer_date: string;
  user_id: string;
  inventory: {
    items: {
      name: string;
    };
  } | null;
  from_store: {
    name: string;
  } | null;
  to_store: {
    name: string;
  } | null;
}

interface UserProfile {
  id: string;
  full_name: string | null;
  username: string | null;
}

interface TransferWithProfile extends Transfer {
  userProfile?: UserProfile;
}

export const LiveTransactionFeed = ({ userId, workspaceId }: { userId: string; workspaceId?: string | null }) => {
  const [transfers, setTransfers] = useState<TransferWithProfile[]>([]);

  useEffect(() => {
    fetchRecentTransfers();
    setupRealtimeSubscription();
  }, [userId, workspaceId]);

  const fetchRecentTransfers = async () => {
    let query = supabase
      .from("inventory_transfers")
      .select(`
        *,
        inventory:inventory(items(name)),
        from_store:stores!from_store_id(name),
        to_store:stores!to_store_id(name)
      `)
      .eq("user_id", userId)
      .order("transfer_date", { ascending: false })
      .limit(10);

    if (workspaceId) {
      query = query.eq("workspace_id", workspaceId);
    } else {
      query = query.is("workspace_id", null);
    }

    const { data: transfersData, error } = await query;

    if (error) {
      console.error("[LiveTransactionFeed] Error fetching transfers:", error);
      return;
    }

    // Fetch user profiles separately
    const userIds = [...new Set(transfersData?.map(t => t.user_id) || [])];
    const { data: profilesData } = await supabase
      .from("profiles")
      .select("id, full_name, username")
      .in("id", userIds);

    const profilesMap = new Map<string, UserProfile>();
    profilesData?.forEach((profile) => {
      profilesMap.set(profile.id, profile);
    });

    const transfersWithProfiles: TransferWithProfile[] = (transfersData || []).map((transfer) => ({
      ...transfer,
      userProfile: profilesMap.get(transfer.user_id),
    }));

    setTransfers(transfersWithProfiles);
  };

  const setupRealtimeSubscription = () => {
    const channel = supabase
      .channel("live-transfers")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "inventory_transfers",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          console.log("[LiveTransactionFeed] New transfer:", payload);
          fetchRecentTransfers();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const getInitials = (name: string | null, username: string | null) => {
    if (name) {
      return name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    }
    if (username) {
      return username.slice(0, 2).toUpperCase();
    }
    return "??";
  };

  const getDisplayName = (profile?: UserProfile) => {
    if (profile?.full_name) return profile.full_name;
    if (profile?.username) return profile.username;
    return "Unknown User";
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <ArrowRightLeft className="w-5 h-5 text-primary" />
          <CardTitle>Live Transaction Feed</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] pr-4">
          {transfers.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              No recent transfers
            </div>
          ) : (
            <div className="space-y-3">
              {transfers.map((transfer) => (
                <div
                  key={transfer.id}
                  className="p-3 border rounded-lg bg-card hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="font-mono text-xs">
                          {getInitials(transfer.userProfile?.full_name || null, transfer.userProfile?.username || null)}
                        </Badge>
                        <span className="text-sm font-medium">
                          {getDisplayName(transfer.userProfile)}
                        </span>
                      </div>
                      
                      <div className="text-sm">
                        <span className="font-semibold text-foreground">
                          {transfer.inventory?.items?.name || "Unknown Item"}
                        </span>
                        <span className="text-muted-foreground"> × </span>
                        <span className="font-semibold text-primary">{transfer.quantity}</span>
                      </div>

                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="font-medium">{transfer.from_store?.name || "Unknown"}</span>
                        <ArrowRightLeft className="w-3 h-3" />
                        <span className="font-medium">{transfer.to_store?.name || "Unknown"}</span>
                      </div>

                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        {formatDistanceToNow(new Date(transfer.transfer_date), { addSuffix: true })}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
