import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { motion, AnimatePresence } from "framer-motion";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export function MatrixChatTab() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadChatHistory();
    
    // Subscribe to new messages
    const channel = supabase
      .channel('matrix_chat')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'matrix_chat_history'
      }, () => {
        loadChatHistory();
      })
      .subscribe();
      
    return () => {
      supabase.removeChannel(channel);
    };
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

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput("");
    setMessages((prev) => [
      ...prev,
      { role: "user", content: userMessage, timestamp: new Date() },
    ]);

    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("matrix-chat", {
        body: { message: userMessage },
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
    } catch (error: any) {
      toast.error("Failed to get response from MATRIX AI");
      console.error("Chat error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Chat messages area - scrollable */}
      <ScrollArea className="flex-1 pr-1 sm:pr-2 mb-3">
        <div className="space-y-2 sm:space-y-3">
          <AnimatePresence>
            {messages.length === 0 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-6 sm:py-8"
              >
                <Sparkles className="w-8 h-8 sm:w-10 sm:h-10 mx-auto mb-2 sm:mb-3 text-primary" />
                <h3 className="text-sm sm:text-base font-semibold mb-1">
                  Welcome to MATRIX AI
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Ask me about platform insights, roadmap features, or get guidance
                </p>
              </motion.div>
            )}

            {messages.map((msg, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex ${
                  msg.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[85%] sm:max-w-[75%] rounded-xl sm:rounded-2xl px-2 py-1.5 sm:px-3 sm:py-2 ${
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  }`}
                >
                  <p className="text-[11px] sm:text-sm whitespace-pre-wrap">{msg.content}</p>
                  <p className="text-[9px] sm:text-xs opacity-60 mt-0.5">
                    {msg.timestamp.toLocaleTimeString()}
                  </p>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {loading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex justify-start"
            >
              <div className="bg-muted rounded-xl sm:rounded-2xl px-3 py-2">
                <div className="flex gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" />
                  <div className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce delay-100" />
                  <div className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce delay-200" />
                </div>
              </div>
            </motion.div>
          )}
          <div ref={scrollRef} />
        </div>
      </ScrollArea>

      {/* Input area - fixed at bottom */}
      <div className="flex gap-1.5 sm:gap-2 flex-shrink-0 border-t border-emerald-500/30 pt-2">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder="Ask MATRIX AI..."
          className="min-h-[40px] sm:min-h-[50px] resize-none text-[11px] sm:text-sm bg-background/60 backdrop-blur-sm border-emerald-500/30"
          disabled={loading}
        />
        <Button
          onClick={handleSend}
          disabled={!input.trim() || loading}
          size="icon"
          className="h-[40px] w-[40px] sm:h-[50px] sm:w-[50px] shrink-0"
        >
          <Send className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </Button>
      </div>
    </div>
  );
}
