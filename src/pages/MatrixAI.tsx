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
    <div className="h-screen bg-background overflow-hidden flex flex-col">
      <div className="container mx-auto px-3 py-3 max-w-5xl flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="mb-4 flex-shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(-1)}
            className="mb-3"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>

          <div className="flex items-center gap-3 mb-2">
            <motion.div 
              className="w-10 h-10 rounded-full bg-gradient-to-br from-primary via-primary/80 to-primary/60 flex items-center justify-center relative shadow-[0_8px_16px_rgba(0,0,0,0.3),0_0_0_1px_rgba(255,255,255,0.1)] hover:shadow-[0_12px_24px_rgba(0,0,0,0.4),0_0_0_1px_rgba(255,255,255,0.2)] transition-all duration-300"
              style={{
                transform: 'perspective(100px) rotateX(5deg)',
                transformStyle: 'preserve-3d'
              }}
              whileHover={{ 
                scale: 1.05,
                rotateY: 5,
                transition: { duration: 0.3 }
              }}
              animate={{
                rotateY: [0, 5, 0, -5, 0],
                transition: { duration: 4, repeat: Infinity, ease: "easeInOut" }
              }}
            >
              <div className="absolute inset-0 rounded-full bg-gradient-to-t from-black/20 to-transparent" style={{ transform: 'translateZ(-1px)' }} />
              <Brain className="w-6 h-6 text-white relative z-10" style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' }} />
            </motion.div>
            <div>
              <h1 className="text-2xl font-bold">MATRIX AI</h1>
              <p className="text-sm text-muted-foreground">
                Collective Intelligence System
              </p>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="bg-card border rounded-lg shadow-sm flex-1 flex flex-col overflow-hidden">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full flex-1 flex flex-col overflow-hidden">
            <TabsList className="w-full justify-start rounded-none border-b bg-transparent h-auto p-0">
              <TabsTrigger
                value="chat"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3"
              >
                <MessageSquare className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Chat</span>
              </TabsTrigger>
              <TabsTrigger
                value="career"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3"
              >
                <Target className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Career</span>
              </TabsTrigger>
              <TabsTrigger
                value="bugs"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3"
              >
                <Bug className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Bug Testing</span>
              </TabsTrigger>
              <TabsTrigger
                value="music"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3"
              >
                <Music className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Music</span>
              </TabsTrigger>
              <TabsTrigger
                value="insights"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3"
              >
                <Lightbulb className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Insights</span>
              </TabsTrigger>
              <TabsTrigger
                value="patterns"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3"
              >
                <TrendingUp className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Patterns</span>
              </TabsTrigger>
              <TabsTrigger
                value="roadmap"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3"
              >
                <Brain className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Roadmap</span>
              </TabsTrigger>
              {profile?.user_type === "founder" && (
                <TabsTrigger
                  value="admin"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3"
                >
                  <Settings className="w-4 h-4 mr-2" />
                  <span className="hidden sm:inline">Admin</span>
                </TabsTrigger>
              )}
            </TabsList>

            <div className="p-4 flex-1 overflow-hidden">
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
