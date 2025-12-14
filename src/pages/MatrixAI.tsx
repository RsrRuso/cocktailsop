import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { MessageSquare, Lightbulb, TrendingUp, Settings, ArrowLeft, Brain, Target, Bug, Music } from "lucide-react";
import { MatrixInsightsTab } from "@/components/matrix/MatrixInsightsTab";
import { MatrixChatTab } from "@/components/matrix/MatrixChatTab";
import { MatrixCareerTab } from "@/components/matrix/MatrixCareerTab";
import { MatrixBugTestingTab } from "@/components/matrix/MatrixBugTestingTab";
import { MatrixMusicTab } from "@/components/matrix/MatrixMusicTab";
import { MatrixRoadmapTab } from "@/components/matrix/MatrixRoadmapTab";
import { MatrixPatternsTab } from "@/components/matrix/MatrixPatternsTab";
import { MatrixAdminTab } from "@/components/matrix/MatrixAdminTab";
import { useAuth } from "@/contexts/AuthContext";
import { motion } from "framer-motion";

export default function MatrixAI() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("chat");

  return (
    <div className="h-[100dvh] bg-gradient-to-br from-background via-background to-primary/5 overflow-hidden flex flex-col">
      <div className="flex-1 flex flex-col overflow-hidden px-2 pt-2 pb-safe">
        {/* Mobile-Optimized Header */}
        <div className="mb-2 flex-shrink-0">
          <div className="flex items-center justify-between px-1">
            <button
              onClick={() => navigate(-1)}
              className="h-10 w-10 flex items-center justify-center rounded-full hover:bg-white/10 active:bg-white/20 transition-colors -ml-1"
            >
              <ArrowLeft className="w-5 h-5 text-muted-foreground" />
            </button>

            <div className="flex items-center gap-2">
              <motion.div 
                className="w-7 h-7 rounded-full bg-gradient-to-br from-primary/80 to-primary/40 backdrop-blur-sm flex items-center justify-center border border-white/10"
                animate={{
                  boxShadow: ['0 0 15px rgba(var(--primary), 0.3)', '0 0 25px rgba(var(--primary), 0.5)', '0 0 15px rgba(var(--primary), 0.3)'],
                }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <Brain className="w-3.5 h-3.5 text-primary-foreground" />
              </motion.div>
              <span className="text-base font-semibold">MATRIX</span>
            </div>

            <div className="w-10" />
          </div>
        </div>

        {/* Main Glass Container - Full width on mobile */}
        <div className="flex-1 flex flex-col overflow-hidden rounded-xl bg-card/30 backdrop-blur-xl border border-white/10">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full flex-1 flex flex-col overflow-hidden">
            {/* Scrollable Tab Navigation */}
            <div className="flex-shrink-0 overflow-x-auto scrollbar-hide border-b border-white/10">
              <TabsList className="inline-flex min-w-full justify-start rounded-none bg-transparent h-auto p-1.5 gap-1">
                <TabsTrigger
                  value="chat"
                  className="rounded-full px-4 py-2 text-xs whitespace-nowrap data-[state=active]:bg-primary data-[state=active]:text-primary-foreground border-0 min-h-[36px]"
                >
                  <MessageSquare className="w-4 h-4 mr-1.5" />
                  Chat
                </TabsTrigger>
                <TabsTrigger
                  value="career"
                  className="rounded-full px-4 py-2 text-xs whitespace-nowrap data-[state=active]:bg-primary data-[state=active]:text-primary-foreground border-0 min-h-[36px]"
                >
                  <Target className="w-4 h-4 mr-1.5" />
                  Career
                </TabsTrigger>
                <TabsTrigger
                  value="bugs"
                  className="rounded-full px-4 py-2 text-xs whitespace-nowrap data-[state=active]:bg-primary data-[state=active]:text-primary-foreground border-0 min-h-[36px]"
                >
                  <Bug className="w-4 h-4 mr-1.5" />
                  Bugs
                </TabsTrigger>
                <TabsTrigger
                  value="music"
                  className="rounded-full px-4 py-2 text-xs whitespace-nowrap data-[state=active]:bg-primary data-[state=active]:text-primary-foreground border-0 min-h-[36px]"
                >
                  <Music className="w-4 h-4 mr-1.5" />
                  Music
                </TabsTrigger>
                <TabsTrigger
                  value="insights"
                  className="rounded-full px-4 py-2 text-xs whitespace-nowrap data-[state=active]:bg-primary data-[state=active]:text-primary-foreground border-0 min-h-[36px]"
                >
                  <Lightbulb className="w-4 h-4 mr-1.5" />
                  Insights
                </TabsTrigger>
                <TabsTrigger
                  value="patterns"
                  className="rounded-full px-4 py-2 text-xs whitespace-nowrap data-[state=active]:bg-primary data-[state=active]:text-primary-foreground border-0 min-h-[36px]"
                >
                  <TrendingUp className="w-4 h-4 mr-1.5" />
                  Patterns
                </TabsTrigger>
                <TabsTrigger
                  value="roadmap"
                  className="rounded-full px-4 py-2 text-xs whitespace-nowrap data-[state=active]:bg-primary data-[state=active]:text-primary-foreground border-0 min-h-[36px]"
                >
                  <Brain className="w-4 h-4 mr-1.5" />
                  Roadmap
                </TabsTrigger>
                {profile?.user_type === "founder" && (
                  <TabsTrigger
                    value="admin"
                    className="rounded-full px-4 py-2 text-xs whitespace-nowrap data-[state=active]:bg-primary data-[state=active]:text-primary-foreground border-0 min-h-[36px]"
                  >
                    <Settings className="w-4 h-4 mr-1.5" />
                    Admin
                  </TabsTrigger>
                )}
              </TabsList>
            </div>

            <div className="p-2 flex-1 overflow-hidden">
              <TabsContent value="chat" className="mt-0 h-full">
                <MatrixChatTab />
              </TabsContent>

              <TabsContent value="career" className="mt-0 h-full overflow-y-auto">
                <MatrixCareerTab />
              </TabsContent>

              <TabsContent value="insights" className="mt-0 h-full overflow-y-auto">
                <MatrixInsightsTab />
              </TabsContent>

              <TabsContent value="patterns" className="mt-0 h-full overflow-y-auto">
                <MatrixPatternsTab />
              </TabsContent>

              <TabsContent value="roadmap" className="mt-0 h-full overflow-y-auto">
                <MatrixRoadmapTab />
              </TabsContent>

              <TabsContent value="bugs" className="mt-0 h-full overflow-y-auto">
                <MatrixBugTestingTab />
              </TabsContent>

              <TabsContent value="music" className="mt-0 h-full overflow-y-auto">
                <MatrixMusicTab />
              </TabsContent>

              {profile?.user_type === "founder" && (
                <TabsContent value="admin" className="mt-0 h-full overflow-y-auto">
                  <MatrixAdminTab />
                </TabsContent>
              )}
            </div>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
