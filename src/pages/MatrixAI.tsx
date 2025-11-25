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
  const matrixChars = ['0', '1', 'ア', 'イ', 'ウ', 'エ', 'オ', 'カ', 'キ', 'ク', 'ケ', 'コ', 'サ', 'シ'];

  return (
    <div className="min-h-screen bg-black relative overflow-hidden pb-20">
      {/* Animated grid background */}
      <motion.div 
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(rgba(16,185,129,0.15) 2px, transparent 2px),
            linear-gradient(90deg, rgba(16,185,129,0.15) 2px, transparent 2px)
          `,
          backgroundSize: '60px 60px',
        }}
        animate={{
          opacity: [0.1, 0.2, 0.1],
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
      
      {/* Matrix rain - Multiple layers for depth */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Layer 1 - Fast falling code */}
        {[...Array(50)].map((_, i) => (
          <motion.div
            key={`fast-${i}`}
            className="absolute text-emerald-400 font-mono font-bold"
            style={{
              left: `${(i * 2)}%`,
              top: -50,
              fontSize: `${Math.random() * 8 + 10}px`,
              textShadow: '0 0 10px rgba(16,185,129,0.8)',
            }}
            animate={{
              y: [0, window.innerHeight + 100],
              opacity: [0, 1, 0.8, 0],
            }}
            transition={{
              duration: Math.random() * 2 + 1.5,
              repeat: Infinity,
              delay: Math.random() * 5,
              ease: "linear",
            }}
          >
            {matrixChars[Math.floor(Math.random() * matrixChars.length)]}
          </motion.div>
        ))}
        
        {/* Layer 2 - Slower, bigger code */}
        {[...Array(30)].map((_, i) => (
          <motion.div
            key={`slow-${i}`}
            className="absolute text-emerald-500 font-mono font-bold"
            style={{
              left: `${(i * 3.33)}%`,
              top: -30,
              fontSize: `${Math.random() * 10 + 14}px`,
              textShadow: '0 0 15px rgba(16,185,129,1)',
              opacity: 0.6,
            }}
            animate={{
              y: [0, window.innerHeight + 80],
              opacity: [0, 0.8, 0.6, 0],
            }}
            transition={{
              duration: Math.random() * 4 + 3,
              repeat: Infinity,
              delay: Math.random() * 6,
              ease: "linear",
            }}
          >
            {matrixChars[Math.floor(Math.random() * matrixChars.length)]}
          </motion.div>
        ))}
      </div>
      
      {/* Floating particles - Glowing orbs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {[...Array(60)].map((_, i) => {
          const randomX = Math.random() * 100;
          const randomY = Math.random() * 100;
          const randomDelay = Math.random() * 5;
          const randomDuration = Math.random() * 10 + 8;
          
          return (
            <motion.div
              key={`particle-${i}`}
              className="absolute w-1 h-1 bg-emerald-400 rounded-full"
              style={{
                left: `${randomX}%`,
                top: `${randomY}%`,
                boxShadow: '0 0 10px rgba(16,185,129,0.8), 0 0 20px rgba(16,185,129,0.4)',
              }}
              animate={{
                x: [0, Math.random() * 100 - 50, Math.random() * 80 - 40, 0],
                y: [0, Math.random() * 100 - 50, Math.random() * 80 - 40, 0],
                scale: [1, Math.random() * 2 + 1, 1],
                opacity: [0.3, 1, 0.5, 0.3],
              }}
              transition={{
                duration: randomDuration,
                repeat: Infinity,
                delay: randomDelay,
                ease: "easeInOut",
              }}
            />
          );
        })}
      </div>
      
      {/* Circuit lines - Animated pathways */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-20">
        {[...Array(15)].map((_, i) => (
          <motion.div
            key={`circuit-${i}`}
            className="absolute bg-gradient-to-r from-transparent via-emerald-400 to-transparent"
            style={{
              left: 0,
              top: `${(i * 6.66)}%`,
              width: '100%',
              height: '1px',
            }}
            animate={{
              opacity: [0, 0.8, 0],
              scaleX: [0, 1, 0],
            }}
            transition={{
              duration: Math.random() * 3 + 2,
              repeat: Infinity,
              delay: Math.random() * 4,
              ease: "easeInOut",
            }}
          />
        ))}
      </div>
      
      {/* Glowing nodes - Connection points */}
      <div className="absolute inset-0 pointer-events-none">
        {[...Array(20)].map((_, i) => {
          const randomX = Math.random() * 100;
          const randomY = Math.random() * 100;
          
          return (
            <motion.div
              key={`node-${i}`}
              className="absolute w-2 h-2 rounded-full bg-emerald-400"
              style={{
                left: `${randomX}%`,
                top: `${randomY}%`,
                boxShadow: '0 0 20px rgba(16,185,129,1)',
              }}
              animate={{
                scale: [1, 1.5, 1],
                opacity: [0.5, 1, 0.5],
              }}
              transition={{
                duration: Math.random() * 2 + 2,
                repeat: Infinity,
                delay: Math.random() * 3,
                ease: "easeInOut",
              }}
            />
          );
        })}
      </div>
      
      {/* Pulsing radial waves */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        {[...Array(5)].map((_, i) => (
          <motion.div
            key={`wave-${i}`}
            className="absolute rounded-full border border-emerald-400/30"
            style={{
              width: '100px',
              height: '100px',
            }}
            animate={{
              scale: [1, 15, 1],
              opacity: [0.8, 0, 0.8],
            }}
            transition={{
              duration: 8,
              repeat: Infinity,
              delay: i * 1.6,
              ease: "easeOut",
            }}
          />
        ))}
      </div>
      
      <div className="container mx-auto px-2 sm:px-4 py-2 sm:py-6 max-w-7xl relative z-10">
        {/* Back Button */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(-1)}
            className="mb-3 sm:mb-4 gap-2 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 border border-emerald-500/30 font-mono group"
          >
            <ArrowLeft className="w-3 h-3 sm:w-4 sm:h-4 group-hover:translate-x-[-4px] transition-transform" />
            <span className="text-xs sm:text-sm">&lt; Back</span>
          </Button>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 sm:mb-8 relative"
        >
          {/* Glowing background effect behind title */}
          <motion.div
            className="absolute -inset-4 bg-gradient-to-r from-emerald-500/20 via-emerald-400/20 to-emerald-500/20 blur-3xl rounded-full"
            animate={{
              opacity: [0.3, 0.6, 0.3],
              scale: [0.8, 1.2, 0.8],
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
          
          <div className="flex items-center gap-2 sm:gap-3 mb-2 relative z-10">
            {/* Animated Matrix Brain Icon with particles */}
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
              <Brain className="w-8 h-8 sm:w-10 sm:h-10 text-emerald-400 relative z-10" />
              
              {/* Rotating ring around brain */}
              <motion.div
                className="absolute inset-0 border-2 border-emerald-400/50 rounded-full"
                animate={{
                  rotate: [0, 360],
                  scale: [1, 1.3, 1],
                }}
                transition={{
                  rotate: {
                    duration: 8,
                    repeat: Infinity,
                    ease: "linear",
                  },
                  scale: {
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut",
                  },
                }}
              />
              
              {/* Pulsing glow */}
              <motion.div
                className="absolute inset-0 rounded-full bg-emerald-400/30 blur-xl"
                animate={{
                  scale: [1, 1.8, 1],
                  opacity: [0.3, 0.8, 0.3],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              />
              
              {/* Orbiting particles */}
              {[...Array(6)].map((_, i) => {
                const angle = (i * 60) * (Math.PI / 180);
                return (
                  <motion.div
                    key={`orbit-${i}`}
                    className="absolute w-1 h-1 bg-emerald-400 rounded-full"
                    style={{
                      left: '50%',
                      top: '50%',
                    }}
                    animate={{
                      x: [
                        Math.cos(angle) * 20,
                        Math.cos(angle + Math.PI) * 20,
                      ],
                      y: [
                        Math.sin(angle) * 20,
                        Math.sin(angle + Math.PI) * 20,
                      ],
                      scale: [1, 1.5, 1],
                      opacity: [0.5, 1, 0.5],
                    }}
                    transition={{
                      duration: 3,
                      repeat: Infinity,
                      delay: i * 0.5,
                      ease: "linear",
                    }}
                  />
                );
              })}
            </motion.div>
            
            <div className="flex flex-col">
              <motion.h1 
                className="text-2xl sm:text-3xl lg:text-4xl font-bold text-emerald-400 font-mono tracking-wider"
                animate={{
                  textShadow: [
                    '0 0 10px rgba(16,185,129,0.5)',
                    '0 0 30px rgba(16,185,129,1), 0 0 50px rgba(16,185,129,0.5)',
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
              
              {/* Data stream effect under title */}
              <div className="flex gap-1 mt-1">
                {[...Array(20)].map((_, i) => (
                  <motion.div
                    key={`stream-${i}`}
                    className="w-1 h-0.5 bg-emerald-400/50"
                    animate={{
                      opacity: [0, 1, 0],
                      scaleX: [0, 1, 0],
                    }}
                    transition={{
                      duration: 1.5,
                      repeat: Infinity,
                      delay: i * 0.1,
                      ease: "easeInOut",
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
          
          <motion.p 
            className="text-xs sm:text-sm text-emerald-300/70 font-mono relative z-10"
            animate={{
              opacity: [0.7, 1, 0.7],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          >
            &gt; Collective Intelligence System - Powered by Community Insights
          </motion.p>
          
          {/* System status indicator */}
          <div className="flex items-center gap-2 mt-2">
            <motion.div
              className="w-2 h-2 bg-emerald-400 rounded-full"
              animate={{
                opacity: [1, 0.3, 1],
                boxShadow: [
                  '0 0 5px rgba(16,185,129,0.8)',
                  '0 0 15px rgba(16,185,129,1)',
                  '0 0 5px rgba(16,185,129,0.8)',
                ],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
            <span className="text-xs text-emerald-400 font-mono">SYSTEM ONLINE</span>
          </div>
        </motion.div>

        <Card className="border-emerald-500/30 bg-black/90 backdrop-blur-xl shadow-[0_0_50px_rgba(16,185,129,0.3)] relative overflow-hidden p-2 sm:p-6">
          {/* Animated border glow */}
          <motion.div 
            className="absolute inset-0 rounded-lg pointer-events-none"
            style={{
              background: 'linear-gradient(90deg, transparent, rgba(16,185,129,0.3), transparent)',
            }}
            animate={{
              x: ['-100%', '200%'],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "linear",
            }}
          />
          
          {/* Corner accents */}
          <div className="absolute top-0 left-0 w-20 h-20 border-t-2 border-l-2 border-emerald-400/50 pointer-events-none" />
          <div className="absolute top-0 right-0 w-20 h-20 border-t-2 border-r-2 border-emerald-400/50 pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-20 h-20 border-b-2 border-l-2 border-emerald-400/50 pointer-events-none" />
          <div className="absolute bottom-0 right-0 w-20 h-20 border-b-2 border-r-2 border-emerald-400/50 pointer-events-none" />
          
          {/* Card glow effect */}
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-transparent to-emerald-500/10 pointer-events-none" />
          
          {/* Scanning line effect */}
          <motion.div
            className="absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-emerald-400 to-transparent pointer-events-none"
            animate={{
              top: ['0%', '100%'],
              opacity: [0, 1, 0],
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: "linear",
            }}
          />
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full relative z-10">
            <TabsList className="w-full justify-start border-b-2 border-emerald-500/30 rounded-none h-auto p-0 bg-black/60 backdrop-blur-sm overflow-x-auto flex-nowrap relative gap-1 sm:gap-2">
              {/* Animated underline */}
              <motion.div
                className="absolute bottom-0 h-0.5 bg-emerald-400"
                style={{ width: '100px' }}
                animate={{
                  boxShadow: [
                    '0 0 10px rgba(16,185,129,0.8)',
                    '0 0 20px rgba(16,185,129,1)',
                    '0 0 10px rgba(16,185,129,0.8)',
                  ],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              />
              
              <TabsTrigger
                value="chat"
                className="data-[state=active]:border-b-2 data-[state=active]:border-emerald-400 data-[state=active]:text-emerald-400 data-[state=active]:shadow-[0_0_15px_rgba(16,185,129,0.5)] rounded-none text-xs sm:text-sm whitespace-nowrap text-emerald-300/60 hover:text-emerald-300 transition-all font-mono px-2 sm:px-4 py-2"
              >
                <MessageSquare className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-2" />
                <span className="hidden sm:inline">Chat</span>
                <span className="sm:hidden">Chat</span>
              </TabsTrigger>
              <TabsTrigger
                value="insights"
                className="data-[state=active]:border-b-2 data-[state=active]:border-emerald-400 data-[state=active]:text-emerald-400 data-[state=active]:shadow-[0_0_15px_rgba(16,185,129,0.5)] rounded-none text-xs sm:text-sm whitespace-nowrap text-emerald-300/60 hover:text-emerald-300 transition-all font-mono"
              >
                <Lightbulb className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">Submit Insight</span>
                <span className="sm:hidden">Insight</span>
              </TabsTrigger>
              <TabsTrigger
                value="patterns"
                className="data-[state=active]:border-b-2 data-[state=active]:border-emerald-400 data-[state=active]:text-emerald-400 data-[state=active]:shadow-[0_0_15px_rgba(16,185,129,0.5)] rounded-none text-xs sm:text-sm whitespace-nowrap text-emerald-300/60 hover:text-emerald-300 transition-all font-mono"
              >
                <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                Patterns
              </TabsTrigger>
              <TabsTrigger
                value="roadmap"
                className="data-[state=active]:border-b-2 data-[state=active]:border-emerald-400 data-[state=active]:text-emerald-400 data-[state=active]:shadow-[0_0_15px_rgba(16,185,129,0.5)] rounded-none text-xs sm:text-sm whitespace-nowrap text-emerald-300/60 hover:text-emerald-300 transition-all font-mono"
              >
                <Brain className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">AI Roadmap</span>
                <span className="sm:hidden">Roadmap</span>
              </TabsTrigger>
              {profile?.user_type === "founder" && (
                <TabsTrigger
                  value="admin"
                  className="data-[state=active]:border-b-2 data-[state=active]:border-emerald-400 data-[state=active]:text-emerald-400 data-[state=active]:shadow-[0_0_15px_rgba(16,185,129,0.5)] rounded-none text-xs sm:text-sm whitespace-nowrap text-emerald-300/60 hover:text-emerald-300 transition-all font-mono"
                >
                  <Settings className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                  Admin
                </TabsTrigger>
              )}
            </TabsList>

            <div className="p-3 sm:p-6 relative">
              {/* Content area glow */}
              <div className="absolute inset-0 bg-gradient-to-t from-emerald-500/5 to-transparent pointer-events-none rounded-b-lg" />
              
              <TabsContent value="chat" className="mt-0 relative z-10">
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
