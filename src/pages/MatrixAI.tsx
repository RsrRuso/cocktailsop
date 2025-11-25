import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Brain, MessageSquare, Lightbulb, TrendingUp, Settings, ArrowLeft } from "lucide-react";
import { MatrixInsightsTab } from "@/components/matrix/MatrixInsightsTab";
import { MatrixChatTab } from "@/components/matrix/MatrixChatTab";
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
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 pb-20">
      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-8 max-w-7xl">
        {/* Back Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(-1)}
          className="mb-3 sm:mb-4 gap-2"
        >
          <ArrowLeft className="w-3 h-3 sm:w-4 sm:h-4" />
          <span className="text-xs sm:text-sm">Back</span>
        </Button>
        
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 sm:mb-8"
        >
          <div className="flex items-center gap-2 sm:gap-3 mb-2">
            <Brain className="w-8 h-8 sm:w-10 sm:h-10 text-primary" />
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              MATRIX AI
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Collective Intelligence System - Powered by Community Insights
          </p>
        </motion.div>

        <Card className="border-primary/20 bg-background/95 backdrop-blur-sm">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="w-full justify-start border-b rounded-none h-auto p-0 bg-transparent overflow-x-auto flex-nowrap">
              <TabsTrigger
                value="chat"
                className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none text-xs sm:text-sm whitespace-nowrap"
              >
                <MessageSquare className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">AI Chat</span>
                <span className="sm:hidden">Chat</span>
              </TabsTrigger>
              <TabsTrigger
                value="insights"
                className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none text-xs sm:text-sm whitespace-nowrap"
              >
                <Lightbulb className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">Submit Insight</span>
                <span className="sm:hidden">Insight</span>
              </TabsTrigger>
              <TabsTrigger
                value="patterns"
                className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none text-xs sm:text-sm whitespace-nowrap"
              >
                <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                Patterns
              </TabsTrigger>
              <TabsTrigger
                value="roadmap"
                className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none text-xs sm:text-sm whitespace-nowrap"
              >
                <Brain className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">AI Roadmap</span>
                <span className="sm:hidden">Roadmap</span>
              </TabsTrigger>
              {profile?.user_type === "founder" && (
                <TabsTrigger
                  value="admin"
                  className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none text-xs sm:text-sm whitespace-nowrap"
                >
                  <Settings className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                  Admin
                </TabsTrigger>
              )}
            </TabsList>

            <div className="p-3 sm:p-6">
              <TabsContent value="chat" className="mt-0">
                <MatrixChatTab />
              </TabsContent>

              <TabsContent value="insights" className="mt-0">
                <MatrixInsightsTab />
              </TabsContent>

              <TabsContent value="patterns" className="mt-0">
                <MatrixPatternsTab />
              </TabsContent>

              <TabsContent value="roadmap" className="mt-0">
                <MatrixRoadmapTab />
              </TabsContent>

              {profile?.user_type === "founder" && (
                <TabsContent value="admin" className="mt-0">
                  <MatrixAdminTab />
                </TabsContent>
              )}
            </div>
          </Tabs>
        </Card>
      </div>
    </div>
  );
}
