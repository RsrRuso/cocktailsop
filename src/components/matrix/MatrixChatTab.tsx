import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Sparkles, Loader2, Camera, Mic, Volume2, Zap, Command } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import { MatrixProactiveSuggestions } from "./MatrixProactiveSuggestions";
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
  const [commandMode, setCommandMode] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  const { executeCommand, handleNavigation } = useMatrixCommandExecutor();
  
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
    inputRef.current?.focus();
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

  const speechRecognitionRef = useRef<any>(null);
  
  const startRecording = async () => {
    try {
      const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      
      if (!SpeechRecognitionAPI) {
        toast.error("Speech recognition not supported");
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
          
          setMessages((prev) => [
            ...prev,
            { role: "user", content: transcript, timestamp: new Date() },
          ]);
          
          setLoading(true);
          
          try {
            const looksLikeCommand = /^(add|create|make|show|check|view|assign|schedule|transfer|log|open)/i.test(transcript);
            
            if (commandMode || looksLikeCommand) {
              const wasCommand = await tryExecuteCommand(transcript);
              if (wasCommand) {
                setLoading(false);
                return;
              }
            }
            
            const { data, error } = await supabase.functions.invoke("matrix-chat", {
              body: { message: transcript },
            });

            if (error) throw error;

            setMessages((prev) => [
              ...prev,
              { role: "assistant", content: data.response, timestamp: new Date() },
            ]);

            if (data.response) {
              speakText(data.response);
            }
          } catch (error) {
            toast.error("Failed to get response");
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

  const tryExecuteCommand = async (message: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase.functions.invoke("matrix-command-parser", {
        body: { command: message }
      });

      if (error || !data?.parsedCommand) {
        return false;
      }

      const parsed: ParsedCommand = data.parsedCommand;
      
      if (parsed.confidence < 0.7 || parsed.tool === 'general') {
        return false;
      }

      const result = await executeCommand(parsed);
      
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

      speakText(result.message.replace(/[✅❌📦📅🧪📋⚠️📥🔄📊🍸📈]/g, ''));
      
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
      const looksLikeCommand = /^(add|create|make|show|check|view|assign|schedule|transfer|log|open)/i.test(userMessage);
      
      if ((commandMode || looksLikeCommand) && !imageUrl) {
        const wasCommand = await tryExecuteCommand(userMessage);
        if (wasCommand) {
          setLoading(false);
          return;
        }
      }

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

      if (data.response) {
        speakText(data.response);
      }
    } catch (error: any) {
      toast.error("Failed to get response");
      console.error("Chat error:", error);
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full relative">
      {/* Voice Orb */}
      <MatrixVoiceOrb
        isListening={matrixVoice.isListening}
        isSpeaking={matrixVoice.isSpeaking}
        isProcessing={matrixVoice.isProcessing}
        transcript={matrixVoice.transcript}
        onToggle={matrixVoice.toggleListening}
      />
      
      {/* Messages Area */}
      <ScrollArea className="flex-1 pr-2 mb-3">
        <div className="space-y-3">
          {/* Welcome State */}
          {messages.length === 0 && (
            <div className="text-center py-6">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 backdrop-blur-sm mb-3"
              >
                <Sparkles className="w-6 h-6 text-primary" />
              </motion.div>
              <h3 className="text-sm font-medium mb-1">Ask me anything</h3>
              <p className="text-xs text-muted-foreground mb-4">
                Inventory, staff, recipes, career tips...
              </p>
              
              {/* Quick Suggestions */}
              <div className="flex flex-wrap justify-center gap-1.5 mb-4">
                {[
                  "Check stock levels",
                  "Schedule tips",
                  "Recipe help",
                  "Career advice"
                ].map((q) => (
                  <button
                    key={q}
                    onClick={() => handleAskMatrix(q)}
                    className="px-2.5 py-1 text-[11px] rounded-full bg-white/5 hover:bg-white/10 border border-white/10 backdrop-blur-sm transition-all"
                  >
                    {q}
                  </button>
                ))}
              </div>
              
              <MatrixProactiveSuggestions onAskMatrix={handleAskMatrix} />
            </div>
          )}

          {/* Messages */}
          {messages.map((msg, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-3 py-2 ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : msg.isCommand
                    ? "bg-primary/10 backdrop-blur-sm border border-primary/20"
                    : "bg-white/5 backdrop-blur-sm border border-white/10"
                }`}
              >
                {msg.isCommand && (
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <Zap className="w-3 h-3 text-primary" />
                    <Badge variant="secondary" className="text-[10px] h-4 px-1.5">Command</Badge>
                  </div>
                )}
                {msg.imageUrl && (
                  <img 
                    src={msg.imageUrl} 
                    alt="Uploaded" 
                    className="rounded-lg mb-2 max-w-full h-auto max-h-40 object-cover"
                  />
                )}
                <p className="text-xs leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-[10px] opacity-50">
                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  {msg.role === "assistant" && (
                    <button
                      onClick={() => speakText(msg.content)}
                      className="p-1 rounded-full hover:bg-white/10 transition-colors"
                    >
                      <Volume2 className="w-3 h-3 opacity-50 hover:opacity-100" />
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          ))}

          {/* Loading */}
          {loading && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex justify-start"
            >
              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl px-4 py-2">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            </motion.div>
          )}
          <div ref={scrollRef} />
        </div>
      </ScrollArea>

      {/* Input Area - Compact Glass Design */}
      <div className="flex-shrink-0 space-y-2">
        {/* Selected Image Preview */}
        <AnimatePresence>
          {selectedImage && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="relative inline-block"
            >
              <img 
                src={selectedImage} 
                alt="Selected" 
                className="h-16 rounded-lg border border-white/10"
              />
              <button
                onClick={() => setSelectedImage(null)}
                className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center text-xs"
              >
                ×
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Command Mode Toggle */}
        <button
          onClick={() => setCommandMode(!commandMode)}
          className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] transition-all ${
            commandMode 
              ? 'bg-primary/20 text-primary border border-primary/30' 
              : 'bg-white/5 text-muted-foreground border border-white/10 hover:bg-white/10'
          }`}
        >
          <Command className="w-3 h-3" />
          {commandMode ? 'Commands ON' : 'Commands'}
        </button>

        {/* Input Row */}
        <div className="flex items-center gap-2 bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-1.5">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleImageUpload}
            className="hidden"
          />
          
          {/* Action Buttons */}
          <div className="flex items-center gap-0.5">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={loading}
              className="p-2 rounded-xl hover:bg-white/10 transition-colors disabled:opacity-50"
            >
              <Camera className="w-4 h-4 text-muted-foreground" />
            </button>
            
            <button
              onClick={isRecording ? stopRecording : startRecording}
              disabled={loading}
              className={`p-2 rounded-xl transition-colors ${
                isRecording 
                  ? 'bg-destructive/20 text-destructive' 
                  : 'hover:bg-white/10 text-muted-foreground'
              }`}
            >
              <Mic className={`w-4 h-4 ${isRecording ? 'animate-pulse' : ''}`} />
            </button>
          </div>
          
          {/* Text Input */}
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder={commandMode ? "Type a command..." : "Ask anything..."}
            className="flex-1 bg-transparent border-0 outline-none text-sm placeholder:text-muted-foreground/50 px-2"
            disabled={loading}
          />
          
          {/* Send Button */}
          <Button
            onClick={handleSend}
            disabled={(!input.trim() && !selectedImage) || loading}
            size="sm"
            className="h-8 w-8 rounded-xl p-0 shrink-0"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : commandMode ? (
              <Zap className="w-4 h-4" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
