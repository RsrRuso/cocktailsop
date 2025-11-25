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
  
  // Matrix code characters for background
  const matrixChars = ['0', '1', 'ア', 'イ', 'ウ', 'エ', 'オ', 'カ', 'キ', 'ク'];

  return (
    <div className="min-h-screen bg-black relative overflow-hidden pb-20">
      {/* Matrix rain background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-20">
        {[...Array(30)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute text-emerald-400 font-mono text-sm"
            style={{
              left: `${(i * 3.33)}%`,
              top: -20,
            }}
            animate={{
              y: [0, window.innerHeight + 100],
              opacity: [0, 0.8, 0],
            }}
            transition={{
              duration: Math.random() * 3 + 2,
              repeat: Infinity,
              delay: Math.random() * 5,
              ease: "linear",
            }}
          >
            {matrixChars[Math.floor(Math.random() * matrixChars.length)]}
          </motion.div>
        ))}
      </div>
      
      {/* Glowing grid overlay */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-10"
        style={{
          backgroundImage: `
            linear-gradient(rgba(16,185,129,0.3) 1px, transparent 1px),
            linear-gradient(90deg, rgba(16,185,129,0.3) 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px',
        }}
      />
      
      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-8 max-w-7xl relative z-10">
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
          className="mb-4 sm:mb-8 relative"
        >
          <div className="flex items-center gap-2 sm:gap-3 mb-2">
            {/* Animated Matrix Brain Icon */}
            <motion.div
              className="relative"
              animate={{
                scale: [1, 1.1, 1],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            >
              <Brain className="w-8 h-8 sm:w-10 sm:h-10 text-emerald-400" />
              <motion.div
                className="absolute inset-0 rounded-full bg-emerald-400/30 blur-xl"
                animate={{
                  scale: [1, 1.5, 1],
                  opacity: [0.3, 0.6, 0.3],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              />
            </motion.div>
            
            <motion.h1 
              className="text-2xl sm:text-3xl lg:text-4xl font-bold text-emerald-400 font-mono tracking-wider"
              animate={{
                textShadow: [
                  '0 0 10px rgba(16,185,129,0.5)',
                  '0 0 20px rgba(16,185,129,0.8)',
                  '0 0 10px rgba(16,185,129,0.5)',
                ],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            >
              MATRIX AI
            </motion.h1>
          </div>
          <p className="text-xs sm:text-sm text-emerald-300/70 font-mono">
            &gt; Collective Intelligence System - Powered by Community Insights
          </p>
        </motion.div>

        <Card className="border-emerald-500/30 bg-black/80 backdrop-blur-sm shadow-[0_0_30px_rgba(16,185,129,0.2)] relative overflow-hidden">
          {/* Card glow effect */}
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-transparent to-emerald-500/10 pointer-events-none" />
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full relative z-10">
            <TabsList className="w-full justify-start border-b border-emerald-500/30 rounded-none h-auto p-0 bg-black/50 backdrop-blur-sm overflow-x-auto flex-nowrap">
              <TabsTrigger
                value="chat"
                className="data-[state=active]:border-b-2 data-[state=active]:border-emerald-400 data-[state=active]:text-emerald-400 rounded-none text-xs sm:text-sm whitespace-nowrap text-emerald-300/60 hover:text-emerald-300"
              >
                <MessageSquare className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">AI Chat</span>
                <span className="sm:hidden">Chat</span>
              </TabsTrigger>
              <TabsTrigger
                value="insights"
                className="data-[state=active]:border-b-2 data-[state=active]:border-emerald-400 data-[state=active]:text-emerald-400 rounded-none text-xs sm:text-sm whitespace-nowrap text-emerald-300/60 hover:text-emerald-300"
              >
                <Lightbulb className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">Submit Insight</span>
                <span className="sm:hidden">Insight</span>
              </TabsTrigger>
              <TabsTrigger
                value="patterns"
                className="data-[state=active]:border-b-2 data-[state=active]:border-emerald-400 data-[state=active]:text-emerald-400 rounded-none text-xs sm:text-sm whitespace-nowrap text-emerald-300/60 hover:text-emerald-300"
              >
                <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                Patterns
              </TabsTrigger>
              <TabsTrigger
                value="roadmap"
                className="data-[state=active]:border-b-2 data-[state=active]:border-emerald-400 data-[state=active]:text-emerald-400 rounded-none text-xs sm:text-sm whitespace-nowrap text-emerald-300/60 hover:text-emerald-300"
              >
                <Brain className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">AI Roadmap</span>
                <span className="sm:hidden">Roadmap</span>
              </TabsTrigger>
              {profile?.user_type === "founder" && (
                <TabsTrigger
                  value="admin"
                  className="data-[state=active]:border-b-2 data-[state=active]:border-emerald-400 data-[state=active]:text-emerald-400 rounded-none text-xs sm:text-sm whitespace-nowrap text-emerald-300/60 hover:text-emerald-300"
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
