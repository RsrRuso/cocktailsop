import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { 
  Bug, AlertTriangle, Info, Zap, Eye, CheckCircle2, XCircle, 
  Clock, Sparkles, Terminal, FileCode
} from "lucide-react";
import { motion } from "framer-motion";

export const MatrixBugTestingTab = () => {
  const [loading, setLoading] = useState(false);
  const [bugs, setBugs] = useState<any[]>([]);
  const [scanning, setScanning] = useState(false);

  useEffect(() => {
    loadBugs();
  }, []);

  const loadBugs = async () => {
    try {
      const { data, error } = await supabase
        .from("platform_bugs")
        .select("*")
        .order("detected_at", { ascending: false });

      if (error) throw error;
      setBugs(data || []);
    } catch (error) {
      console.error("Error loading bugs:", error);
    }
  };

  const runBugDetection = async () => {
    try {
      setLoading(true);
      setScanning(true);

      // Simulate collecting logs and metrics
      const logs = "Recent console logs and error traces...";
      const errors = "Error patterns detected...";
      const metrics = "Performance metrics collected...";

      const { data, error } = await supabase.functions.invoke("career-ai-mentor", {
        body: { 
          action: "detect_bugs",
          data: { logs, errors, metrics, user_reports: "" }
        }
      });

      if (error) throw error;
      
      toast.success("Bug detection scan complete!");
      await loadBugs();
    } catch (error) {
      console.error("Error detecting bugs:", error);
      toast.error(error instanceof Error ? error.message : "Failed to scan for bugs");
    } finally {
      setLoading(false);
      setScanning(false);
    }
  };

  const updateBugStatus = async (bugId: string, status: string) => {
    try {
      const updateData: any = { status };
      if (status === "resolved") {
        updateData.resolved_at = new Date().toISOString();
        updateData.resolved_by = (await supabase.auth.getUser()).data.user?.id;
      }

      const { error } = await supabase
        .from("platform_bugs")
        .update(updateData)
        .eq("id", bugId);

      if (error) throw error;
      await loadBugs();
      toast.success(`Bug marked as ${status}!`);
    } catch (error) {
      console.error("Error updating bug:", error);
      toast.error("Failed to update bug status");
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case "critical": return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case "high": return <AlertTriangle className="w-4 h-4 text-orange-500" />;
      case "medium": return <Info className="w-4 h-4 text-yellow-500" />;
      case "low": return <Info className="w-4 h-4 text-blue-500" />;
      default: return <Bug className="w-4 h-4" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical": return "bg-red-500/20 text-red-300 border-red-500/30";
      case "high": return "bg-orange-500/20 text-orange-300 border-orange-500/30";
      case "medium": return "bg-yellow-500/20 text-yellow-300 border-yellow-500/30";
      case "low": return "bg-blue-500/20 text-blue-300 border-blue-500/30";
      default: return "bg-gray-500/20 text-gray-300 border-gray-500/30";
    }
  };

  const getBugTypeIcon = (type: string) => {
    switch (type) {
      case "error": return <XCircle className="w-4 h-4" />;
      case "warning": return <AlertTriangle className="w-4 h-4" />;
      case "performance": return <Zap className="w-4 h-4" />;
      case "ui": return <Eye className="w-4 h-4" />;
      case "logic": return <FileCode className="w-4 h-4" />;
      default: return <Bug className="w-4 h-4" />;
    }
  };

  const reportedBugs = bugs.filter(b => b.status === "reported");
  const resolvedBugs = bugs.filter(b => b.status === "resolved");

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6 p-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Terminal className="w-6 h-6 text-primary" />
            AI Platform Testing
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Self-observing AI system detecting bugs and issues automatically
          </p>
        </div>
        <Button 
          onClick={runBugDetection} 
          disabled={loading}
          className="gap-2 bg-gradient-to-r from-primary to-primary/80"
        >
          {scanning ? (
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}>
              <Sparkles className="w-4 h-4" />
            </motion.div>
          ) : (
            <Bug className="w-4 h-4" />
          )}
          {scanning ? "Scanning..." : "Run AI Bug Detection"}
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4 bg-gradient-to-br from-red-500/10 to-red-500/5 border-red-500/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Open Bugs</p>
              <p className="text-3xl font-bold text-red-400">{reportedBugs.length}</p>
            </div>
            <AlertTriangle className="w-8 h-8 text-red-400" />
          </div>
        </Card>
        <Card className="p-4 bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-500/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Resolved</p>
              <p className="text-3xl font-bold text-green-400">{resolvedBugs.length}</p>
            </div>
            <CheckCircle2 className="w-8 h-8 text-green-400" />
          </div>
        </Card>
        <Card className="p-4 bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Detected</p>
              <p className="text-3xl font-bold text-primary">{bugs.length}</p>
            </div>
            <Bug className="w-8 h-8 text-primary" />
          </div>
        </Card>
      </div>

      {/* Bug List */}
      <div>
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-primary" />
          Detected Issues
        </h3>

        <div className="space-y-4">
          {reportedBugs.map((bug) => (
            <motion.div
              key={bug.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card className="p-4 hover:shadow-lg transition-shadow">
                <div className="flex items-start gap-4">
                  <div className="flex flex-col gap-2">
                    {getBugTypeIcon(bug.bug_type)}
                    {getSeverityIcon(bug.severity)}
                  </div>
                  <div className="flex-1 space-y-3">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h4 className="font-semibold text-base mb-1">{bug.title}</h4>
                        <div className="flex gap-2 flex-wrap">
                          <Badge className={getSeverityColor(bug.severity)}>
                            {bug.severity}
                          </Badge>
                          <Badge variant="outline">{bug.bug_type}</Badge>
                          {bug.location && (
                            <Badge variant="outline" className="gap-1">
                              <FileCode className="w-3 h-3" />
                              {bug.location}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <Badge variant="secondary" className="gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(bug.detected_at).toLocaleDateString()}
                      </Badge>
                    </div>

                    <p className="text-sm text-muted-foreground">{bug.description}</p>

                    {bug.reproduction_steps && bug.reproduction_steps.length > 0 && (
                      <div className="bg-muted/50 rounded-lg p-3">
                        <p className="text-xs font-semibold mb-2">Reproduction Steps:</p>
                        <ol className="text-xs space-y-1 list-decimal list-inside">
                          {bug.reproduction_steps.map((step: string, i: number) => (
                            <li key={i}>{step}</li>
                          ))}
                        </ol>
                      </div>
                    )}

                    {bug.ai_analysis && (
                      <div className="bg-primary/5 rounded-lg p-3 border border-primary/20">
                        <p className="text-xs font-semibold mb-1 flex items-center gap-1">
                          <Sparkles className="w-3 h-3" />
                          AI Analysis & Fix Recommendation:
                        </p>
                        <p className="text-xs text-muted-foreground whitespace-pre-wrap">{bug.ai_analysis}</p>
                      </div>
                    )}

                    <div className="flex gap-2 pt-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateBugStatus(bug.id, "acknowledged")}
                        className="flex-1"
                      >
                        <Eye className="w-3 h-3 mr-1" />
                        Acknowledge
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateBugStatus(bug.id, "in_progress")}
                        className="flex-1"
                      >
                        <Clock className="w-3 h-3 mr-1" />
                        Working On It
                      </Button>
                      <Button
                        size="sm"
                        className="flex-1"
                        onClick={() => updateBugStatus(bug.id, "resolved")}
                      >
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        Mark Resolved
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}

          {reportedBugs.length === 0 && (
            <Card className="p-8 text-center">
              <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-green-400" />
              <p className="text-muted-foreground">
                No active bugs detected! Click "Run AI Bug Detection" to scan the platform.
              </p>
            </Card>
          )}
        </div>
      </div>
    </motion.div>
  );
};