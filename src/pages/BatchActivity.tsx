import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Activity, Users } from "lucide-react";
import TopNav from "@/components/TopNav";
import BottomNav from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { ActivityTrackingPanel } from "@/components/batch-calculator/ActivityTrackingPanel";
import { useMixologistGroups } from "@/hooks/useMixologistGroups";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const BatchActivity = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialGroupId = searchParams.get("groupId");
  
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(initialGroupId);
  const { groups } = useMixologistGroups();

  useEffect(() => {
    if (initialGroupId) {
      setSelectedGroupId(initialGroupId);
    }
  }, [initialGroupId]);

  return (
    <div className="min-h-screen bg-background pb-20">
      <TopNav />
      
      <main className="container max-w-4xl mx-auto px-4 pt-20 pb-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/batch-calculator")}
            className="shrink-0"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-xl font-bold flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary" />
              Batch Activity Tracking
            </h1>
            <p className="text-sm text-muted-foreground">
              Monitor production metrics and team activity
            </p>
          </div>
        </div>

        {/* Group Selector */}
        {groups && groups.length > 0 && (
          <div className="mb-6 p-4 rounded-xl bg-card/50 border border-border/50">
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">Filter by Group</span>
            </div>
            <Select
              value={selectedGroupId || "personal"}
              onValueChange={(value) => setSelectedGroupId(value === "personal" ? null : value)}
            >
              <SelectTrigger className="bg-background/50">
                <SelectValue placeholder="Select group" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="personal">
                  Personal Activity
                </SelectItem>
                {groups.map((group) => (
                  <SelectItem key={group.id} value={group.id}>
                    {group.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Activity Panel */}
        <ActivityTrackingPanel groupId={selectedGroupId} />
      </main>

      <BottomNav />
    </div>
  );
};

export default BatchActivity;