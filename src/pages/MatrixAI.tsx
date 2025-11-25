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
import { MatrixRain } from "@/components/MatrixRain";
import { Matrix3DBrain } from "@/components/Matrix3DBrain";
import { useAuth } from "@/contexts/AuthContext";
import { motion } from "framer-motion";
import { Suspense } from "react";

export default function MatrixAI() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("chat");

  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      {/* Matrix Rain Background */}
      <MatrixRain />
      
      {/* Main Content */}
      <div className="relative z-10 container mx-auto px-4 py-8 max-w-7xl">
        {/* Back Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(-1)}
          className="mb-4 gap-2 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-950/50 border border-emerald-500/30"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </Button>
        
        {/* Header with 3D Brain */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 flex flex-col md:flex-row items-center gap-8"
        >
          {/* 3D Brain Display */}
          <div className="w-48 h-48 relative">
            <Suspense fallback={
              <div className="w-full h-full flex items-center justify-center">
                <div className="w-16 h-16 rounded-full border-4 border-emerald-500 border-t-transparent animate-spin" />
              </div>
            }>
              <Matrix3DBrain className="w-full h-full" />
            </Suspense>
            
            {/* Decorative corners */}
            <div className="absolute top-0 left-0 w-8 h-8 border-l-2 border-t-2 border-emerald-500/50" />
            <div className="absolute top-0 right-0 w-8 h-8 border-r-2 border-t-2 border-emerald-500/50" />
            <div className="absolute bottom-0 left-0 w-8 h-8 border-l-2 border-b-2 border-emerald-500/50" />
            <div className="absolute bottom-0 right-0 w-8 h-8 border-r-2 border-b-2 border-emerald-500/50" />
          </div>

          {/* Title Section */}
          <div className="flex-1 text-center md:text-left">
            <motion.h1 
              className="text-6xl font-bold font-mono mb-2"
              animate={{
                textShadow: [
                  "0 0 20px #10b981",
                  "0 0 40px #10b981",
                  "0 0 20px #10b981",
                ],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
              }}
              style={{
                color: "#10b981",
                textShadow: "0 0 20px #10b981",
              }}
            >
              MATRIX AI
            </motion.h1>
            <p className="text-emerald-400/80 font-mono text-lg">
              &gt; Collective Intelligence System
            </p>
            <p className="text-emerald-500/60 font-mono text-sm mt-1">
              &gt; Powered by Community Insights
            </p>
            
            {/* Typing effect line */}
            <motion.div
              className="mt-4 font-mono text-emerald-400"
              initial={{ width: 0 }}
              animate={{ width: "auto" }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <span className="inline-block border-r-2 border-emerald-400 pr-1 animate-pulse">
                System.online()
              </span>
            </motion.div>
          </div>
        </motion.div>

        {/* Main Content Card with Matrix Theme */}
        <Card className="border-2 border-emerald-500/30 bg-black/80 backdrop-blur-sm shadow-[0_0_50px_rgba(16,185,129,0.3)]">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="w-full justify-start border-b-2 border-emerald-500/30 rounded-none h-auto p-0 bg-black/50">
              <TabsTrigger
                value="chat"
                className="data-[state=active]:bg-emerald-950/50 data-[state=active]:text-emerald-400 data-[state=active]:border-b-2 data-[state=active]:border-emerald-500 rounded-none text-emerald-500/70 font-mono"
              >
                <MessageSquare className="w-4 h-4 mr-2" />
                AI.chat()
              </TabsTrigger>
              <TabsTrigger
                value="insights"
                className="data-[state=active]:bg-emerald-950/50 data-[state=active]:text-emerald-400 data-[state=active]:border-b-2 data-[state=active]:border-emerald-500 rounded-none text-emerald-500/70 font-mono"
              >
                <Lightbulb className="w-4 h-4 mr-2" />
                submit.insight()
              </TabsTrigger>
              <TabsTrigger
                value="patterns"
                className="data-[state=active]:bg-emerald-950/50 data-[state=active]:text-emerald-400 data-[state=active]:border-b-2 data-[state=active]:border-emerald-500 rounded-none text-emerald-500/70 font-mono"
              >
                <TrendingUp className="w-4 h-4 mr-2" />
                detect.patterns()
              </TabsTrigger>
              <TabsTrigger
                value="roadmap"
                className="data-[state=active]:bg-emerald-950/50 data-[state=active]:text-emerald-400 data-[state=active]:border-b-2 data-[state=active]:border-emerald-500 rounded-none text-emerald-500/70 font-mono"
              >
                <Brain className="w-4 h-4 mr-2" />
                generate.roadmap()
              </TabsTrigger>
              {profile?.user_type === "founder" && (
                <TabsTrigger
                  value="admin"
                  className="data-[state=active]:bg-emerald-950/50 data-[state=active]:text-emerald-400 data-[state=active]:border-b-2 data-[state=active]:border-emerald-500 rounded-none text-emerald-500/70 font-mono"
                >
                  <Settings className="w-4 h-4 mr-2" />
                  admin.controls()
                </TabsTrigger>
              )}
            </TabsList>

            <div className="p-6 bg-black/40">
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
