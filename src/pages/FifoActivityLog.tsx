import { useSearchParams, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { WorkspaceActivityPanel } from "@/components/WorkspaceActivityPanel";

const FifoActivityLog = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const workspaceId = searchParams.get("workspace");

  if (!workspaceId) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <p className="text-muted-foreground">No workspace selected</p>
          <Button onClick={() => navigate("/fifo-pin-access")}>
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="flex items-center gap-3 p-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/fifo-pin-access")}
            className="shrink-0"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold">Activity Log</h1>
        </div>
      </div>

      <div className="p-4">
        <WorkspaceActivityPanel 
          workspaceId={workspaceId} 
          workspaceType="fifo" 
        />
      </div>
    </div>
  );
};

export default FifoActivityLog;
