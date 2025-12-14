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
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 overflow-hidden flex flex-col">
      <div className="container mx-auto px-3 py-3 max-w-4xl flex-1 flex flex-col overflow-hidden">
        {/* Compact Header */}
        <div className="mb-3 flex-shrink-0">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(-1)}
              className="h-8 px-2 text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>

            <div className="flex items-center gap-2">
              <motion.div 
                className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/80 to-primary/40 backdrop-blur-sm flex items-center justify-center border border-white/10"
                animate={{
                  boxShadow: ['0 0 20px rgba(var(--primary), 0.3)', '0 0 30px rgba(var(--primary), 0.5)', '0 0 20px rgba(var(--primary), 0.3)'],
                }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <Brain className="w-4 h-4 text-primary-foreground" />
              </motion.div>
              <div>
                <h1 className="text-lg font-semibold leading-none">MATRIX</h1>
                <p className="text-[10px] text-muted-foreground">AI Assistant</p>
              </div>
            </div>

            <div className="w-8" /> {/* Spacer for balance */}
          </div>
        </div>

        {/* Main Glass Container */}
        <div className="flex-1 flex flex-col overflow-hidden rounded-2xl bg-card/40 backdrop-blur-xl border border-white/10 shadow-2xl">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full flex-1 flex flex-col overflow-hidden">
            {/* Compact Tab Navigation */}
            <TabsList className="w-full justify-start rounded-none border-b border-white/10 bg-white/5 backdrop-blur-sm h-auto p-1 gap-0.5 overflow-x-auto scrollbar-hide">
              <TabsTrigger
                value="chat"
                className="rounded-lg px-3 py-1.5 text-xs data-[state=active]:bg-primary/20 data-[state=active]:text-primary data-[state=active]:backdrop-blur-sm border-0"
              >
                <MessageSquare className="w-3.5 h-3.5 sm:mr-1.5" />
                <span className="hidden sm:inline">Chat</span>
              </TabsTrigger>
              <TabsTrigger
                value="career"
                className="rounded-lg px-3 py-1.5 text-xs data-[state=active]:bg-primary/20 data-[state=active]:text-primary data-[state=active]:backdrop-blur-sm border-0"
              >
                <Target className="w-3.5 h-3.5 sm:mr-1.5" />
                <span className="hidden sm:inline">Career</span>
              </TabsTrigger>
              <TabsTrigger
                value="bugs"
                className="rounded-lg px-3 py-1.5 text-xs data-[state=active]:bg-primary/20 data-[state=active]:text-primary data-[state=active]:backdrop-blur-sm border-0"
              >
                <Bug className="w-3.5 h-3.5 sm:mr-1.5" />
                <span className="hidden sm:inline">Bugs</span>
              </TabsTrigger>
              <TabsTrigger
                value="music"
                className="rounded-lg px-3 py-1.5 text-xs data-[state=active]:bg-primary/20 data-[state=active]:text-primary data-[state=active]:backdrop-blur-sm border-0"
              >
                <Music className="w-3.5 h-3.5 sm:mr-1.5" />
                <span className="hidden sm:inline">Music</span>
              </TabsTrigger>
              <TabsTrigger
                value="insights"
                className="rounded-lg px-3 py-1.5 text-xs data-[state=active]:bg-primary/20 data-[state=active]:text-primary data-[state=active]:backdrop-blur-sm border-0"
              >
                <Lightbulb className="w-3.5 h-3.5 sm:mr-1.5" />
                <span className="hidden sm:inline">Insights</span>
              </TabsTrigger>
              <TabsTrigger
                value="patterns"
                className="rounded-lg px-3 py-1.5 text-xs data-[state=active]:bg-primary/20 data-[state=active]:text-primary data-[state=active]:backdrop-blur-sm border-0"
              >
                <TrendingUp className="w-3.5 h-3.5 sm:mr-1.5" />
                <span className="hidden sm:inline">Patterns</span>
              </TabsTrigger>
              <TabsTrigger
                value="roadmap"
                className="rounded-lg px-3 py-1.5 text-xs data-[state=active]:bg-primary/20 data-[state=active]:text-primary data-[state=active]:backdrop-blur-sm border-0"
              >
                <Brain className="w-3.5 h-3.5 sm:mr-1.5" />
                <span className="hidden sm:inline">Roadmap</span>
              </TabsTrigger>
              {profile?.user_type === "founder" && (
                <TabsTrigger
                  value="admin"
                  className="rounded-lg px-3 py-1.5 text-xs data-[state=active]:bg-primary/20 data-[state=active]:text-primary data-[state=active]:backdrop-blur-sm border-0"
                >
                  <Settings className="w-3.5 h-3.5 sm:mr-1.5" />
                  <span className="hidden sm:inline">Admin</span>
                </TabsTrigger>
              )}
            </TabsList>

            <div className="p-3 flex-1 overflow-hidden">
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
