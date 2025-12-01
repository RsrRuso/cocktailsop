import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { MessageSquare, Lightbulb, TrendingUp, Settings, ArrowLeft, Brain, Target } from "lucide-react";
import { MatrixInsightsTab } from "@/components/matrix/MatrixInsightsTab";
import { MatrixChatTab } from "@/components/matrix/MatrixChatTab";
import { MatrixCareerTab } from "@/components/matrix/MatrixCareerTab";
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
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Brain className="w-6 h-6 text-primary" />
            </div>
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
