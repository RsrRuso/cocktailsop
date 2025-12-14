import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Sparkles, Loader2, Camera, Mic, Volume2, Wrench, X, Zap, Command } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import { MatrixProactiveSuggestions } from "./MatrixProactiveSuggestions";
import { MatrixToolsHelper } from "./MatrixToolsHelper";
import { useMatrixCommandExecutor, ParsedCommand } from "@/hooks/useMatrixCommandExecutor";
import { Badge } from "@/components/ui/badge";
import { MatrixVoiceOrb } from "./MatrixVoiceOrb";
import { useMatrixVoice } from "@/hooks/useMatrixVoice";
interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  imageUrl?: string;
  isCommand?: boolean;
  commandResult?: any;
}

export function MatrixChatTab() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [showTools, setShowTools] = useState(false);
  const [commandMode, setCommandMode] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { executeCommand, handleNavigation } = useMatrixCommandExecutor();
  
  // Voice assistant hook
  const matrixVoice = useMatrixVoice({
    onResponse: (response) => {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: response.text, timestamp: new Date() }
      ]);
    },
    onTranscript: (transcript) => {
      setMessages((prev) => [
        ...prev,
        { role: "user", content: transcript, timestamp: new Date() }
      ]);
    }
  });

  const handleAskMatrix = useCallback((question: string) => {
    setInput(question);
  }, []);

  useEffect(() => {
    loadChatHistory();
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const loadChatHistory = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from("matrix_chat_history")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true })
      .limit(50);

    if (error) {
      console.error("Error loading chat:", error);
      return;
    }

    if (data) {
      setMessages(
        data.map((msg: any) => ({
          role: msg.message_role as "user" | "assistant",
          content: msg.message_content,
          timestamp: new Date(msg.created_at),
        }))
      );
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setSelectedImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Browser Speech Recognition for recording button
  const speechRecognitionRef = useRef<any>(null);
  
  const startRecording = async () => {
    try {
      const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      
      if (!SpeechRecognitionAPI) {
        toast.error("Speech recognition not supported in this browser");
        return;
      }
      
      const recognition = new SpeechRecognitionAPI();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';
      
      recognition.onresult = async (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript && transcript.trim()) {
          setIsRecording(false);
          
          // Add user message immediately
          setMessages((prev) => [
            ...prev,
            { role: "user", content: transcript, timestamp: new Date() },
          ]);
          
          setLoading(true);
          
          try {
            // Check if it's a command
            const looksLikeCommand = /^(add|create|make|show|check|view|assign|schedule|transfer|log|open)/i.test(transcript);
            
            if (commandMode || looksLikeCommand) {
              const wasCommand = await tryExecuteCommand(transcript);
              if (wasCommand) {
                setLoading(false);
                return;
              }
            }
            
            // Fall back to regular chat
            const { data, error } = await supabase.functions.invoke("matrix-chat", {
              body: { message: transcript },
            });

            if (error) throw error;

            setMessages((prev) => [
              ...prev,
              { role: "assistant", content: data.response, timestamp: new Date() },
            ]);

            // Speak the response automatically
            if (data.response) {
              speakText(data.response);
            }
          } catch (error) {
            toast.error("Failed to get Matrix AI response");
            console.error("Voice chat error:", error);
          } finally {
            setLoading(false);
          }
        }
      };
      
      recognition.onerror = (event: any) => {
        console.error("Speech recognition error:", event.error);
        if (event.error !== 'no-speech') {
          toast.error("Failed to recognize speech");
        }
        setIsRecording(false);
      };
      
      recognition.onend = () => {
        setIsRecording(false);
      };
      
      speechRecognitionRef.current = recognition;
      recognition.start();
      setIsRecording(true);
    } catch (error) {
      toast.error("Failed to access microphone");
      console.error("Recording error:", error);
    }
  };

  const stopRecording = () => {
    if (speechRecognitionRef.current && isRecording) {
      speechRecognitionRef.current.stop();
      setIsRecording(false);
    }
  };

  const speakText = (text: string) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      window.speechSynthesis.speak(utterance);
    }
  };

  // Try to execute as command first
  const tryExecuteCommand = async (message: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase.functions.invoke("matrix-command-parser", {
        body: { command: message }
      });

      if (error || !data?.parsedCommand) {
        return false;
      }

      const parsed: ParsedCommand = data.parsedCommand;
      
      // Only execute if confidence is high enough
      if (parsed.confidence < 0.7 || parsed.tool === 'general') {
        return false;
      }

      // Execute the command
      const result = await executeCommand(parsed);
      
      // Add command result to messages
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: result.message,
          timestamp: new Date(),
          isCommand: true,
          commandResult: result
        },
      ]);

      // Speak the result
      speakText(result.message.replace(/[✅❌📦📅🧪📋⚠️📥🔄📊🍸📈]/g, ''));
      
      // Navigate if needed
      if (result.navigateTo) {
        handleNavigation(result);
      }

      return true;
    } catch (error) {
      console.error('Command execution error:', error);
      return false;
    }
  };

  const handleSend = async () => {
    if ((!input.trim() && !selectedImage) || loading) return;

    const userMessage = input.trim();
    const imageUrl = selectedImage;
    
    setMessages((prev) => [
      ...prev,
      { role: "user", content: userMessage || "Analyzing image...", timestamp: new Date(), imageUrl },
    ]);

    setInput("");
    setSelectedImage(null);
    setLoading(true);

    try {
      // If command mode is on or message looks like a command, try executing
      const looksLikeCommand = /^(add|create|make|show|check|view|assign|schedule|transfer|log|open)/i.test(userMessage);
      
      if ((commandMode || looksLikeCommand) && !imageUrl) {
        const wasCommand = await tryExecuteCommand(userMessage);
        if (wasCommand) {
          setLoading(false);
          return;
        }
      }

      // Fall back to regular chat
      const { data, error } = await supabase.functions.invoke("matrix-chat", {
        body: { 
          message: userMessage,
          imageUrl: imageUrl 
        },
      });

      if (error) throw error;

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.response,
          timestamp: new Date(),
        },
      ]);

      // Auto-speak AI response
      if (data.response) {
        speakText(data.response);
      }
    } catch (error: any) {
      toast.error("Failed to get response from MATRIX AI");
      console.error("Chat error:", error);
      setMessages((prev) => prev.slice(0, -1)); // Remove user message on error
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full relative">
      {/* Voice Orb - Floating */}
      <MatrixVoiceOrb
        isListening={matrixVoice.isListening}
        isSpeaking={matrixVoice.isSpeaking}
        isProcessing={matrixVoice.isProcessing}
        transcript={matrixVoice.transcript}
        onToggle={matrixVoice.toggleListening}
      />
      
      {/* Messages Area */}
      <ScrollArea className="flex-1 pr-4 mb-4">
        <div className="space-y-4">
          {/* Proactive Suggestions - Show when no messages */}
          {messages.length === 0 && (
            <>
              <MatrixProactiveSuggestions onAskMatrix={handleAskMatrix} />
              
              <div className="text-center py-8">
                <Sparkles className="w-12 h-12 mx-auto mb-4 text-primary" />
                <h3 className="text-lg font-semibold mb-2">
                  Welcome to MATRIX AI
                </h3>
                <p className="text-muted-foreground text-sm mb-4">
                  Ask me about platform insights, tools, or get guidance
                </p>
                
                {/* Quick Actions */}
                <div className="flex flex-wrap justify-center gap-2 mb-4">
                  {[
                    "How do I track inventory?",
                    "Help me schedule staff",
                    "What's new on the platform?",
                    "Career tips for bartenders"
                  ].map((q) => (
                    <Button
                      key={q}
                      variant="outline"
                      size="sm"
                      className="text-xs"
                      onClick={() => setInput(q)}
                    >
                      {q}
                    </Button>
                  ))}
                </div>
              </div>
            </>
          )}

          {messages.map((msg, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${
                msg.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`max-w-[80%] rounded-lg px-4 py-2 ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : msg.isCommand
                    ? "bg-gradient-to-r from-primary/20 to-primary/10 border border-primary/30"
                    : "bg-muted"
                }`}
              >
                {msg.isCommand && (
                  <div className="flex items-center gap-2 mb-2">
                    <Zap className="w-4 h-4 text-primary" />
                    <Badge variant="secondary" className="text-xs">Command Executed</Badge>
                  </div>
                )}
                {msg.imageUrl && (
                  <img 
                    src={msg.imageUrl} 
                    alt="Uploaded" 
                    className="rounded-lg mb-2 max-w-full h-auto max-h-64 object-cover"
                  />
                )}
                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                <p className="text-xs opacity-60 mt-1">
                  {msg.timestamp.toLocaleTimeString()}
                </p>
                {msg.role === "assistant" && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="mt-1 h-6 px-2"
                    onClick={() => speakText(msg.content)}
                  >
                    <Volume2 className="w-3 h-3" />
                  </Button>
                )}
              </div>
            </motion.div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="bg-muted rounded-lg px-4 py-3">
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
              </div>
            </div>
          )}
          <div ref={scrollRef} />
        </div>
      </ScrollArea>

      {/* Tools Helper Panel */}
      <AnimatePresence>
        {showTools && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t pt-3 mb-2 overflow-hidden"
          >
            <MatrixToolsHelper />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input Area */}
      <div className="border-t pt-4 flex-shrink-0 space-y-2">
        {selectedImage && (
          <div className="relative inline-block">
            <img 
              src={selectedImage} 
              alt="Selected" 
              className="h-20 rounded-lg"
            />
            <Button
              size="sm"
              variant="destructive"
              className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0"
              onClick={() => setSelectedImage(null)}
            >
              ×
            </Button>
          </div>
        )}
        
        {/* Command Mode Toggle */}
        <div className="flex items-center justify-between mb-2">
          <Button
            variant={commandMode ? "default" : "ghost"}
            size="sm"
            className={`text-xs gap-1 ${commandMode ? 'bg-primary' : ''}`}
            onClick={() => setCommandMode(!commandMode)}
          >
            <Command className="w-3 h-3" />
            {commandMode ? 'Command Mode ON' : 'Enable Command Mode'}
          </Button>
          {commandMode && (
            <p className="text-xs text-muted-foreground">
              Say commands like "Add John as bartender" or "Check stock"
            </p>
          )}
        </div>

        <div className="flex gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleImageUpload}
            className="hidden"
          />
          
          <Button
            variant={showTools ? "default" : "outline"}
            size="icon"
            className="h-[60px] w-[60px] shrink-0"
            onClick={() => setShowTools(!showTools)}
          >
            {showTools ? <X className="w-5 h-5" /> : <Wrench className="w-5 h-5" />}
          </Button>
          
          <Button
            variant="outline"
            size="icon"
            className="h-[60px] w-[60px] shrink-0"
            onClick={() => fileInputRef.current?.click()}
            disabled={loading}
          >
            <Camera className="w-5 h-5" />
          </Button>

          <Button
            variant={isRecording ? "destructive" : "outline"}
            size="icon"
            className="h-[60px] w-[60px] shrink-0 relative"
            onClick={isRecording ? stopRecording : startRecording}
            disabled={loading}
          >
            <Mic className={`w-5 h-5 ${isRecording ? 'animate-pulse' : ''}`} />
            {commandMode && !isRecording && (
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-primary rounded-full animate-pulse" />
            )}
          </Button>
          
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder={commandMode ? "Give a command... e.g. 'Add Sarah as senior bartender'" : "Ask MATRIX AI anything..."}
            className={`min-h-[60px] resize-none flex-1 ${commandMode ? 'border-primary' : ''}`}
            disabled={loading}
          />
          
          <Button
            onClick={handleSend}
            disabled={(!input.trim() && !selectedImage) || loading}
            size="icon"
            className="h-[60px] w-[60px] shrink-0 bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : commandMode ? (
              <Zap className="w-5 h-5" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
