import { useState, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { 
  Mic, MicOff, Send, Bot, User, Loader2, 
  Volume2, VolumeX, Wine, Package, AlertTriangle,
  TrendingUp, Sparkles
} from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  dataCard?: {
    type: 'inventory' | 'alert' | 'insight';
    data: any;
  };
}

interface MatrixAIVoiceProps {
  outletId: string;
  outletName: string;
}

export function MatrixAIVoice({ outletId, outletName }: MatrixAIVoiceProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: `Hello! I'm LUMX, your LAB Ops AI assistant for ${outletName}. Ask me about inventory levels, staff performance, variance alerts, or anything about your venue operations.`,
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const recognitionRef = useRef<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Text-to-Speech using Browser Speech API
  const speak = useCallback((text: string) => {
    if (!voiceEnabled || !('speechSynthesis' in window)) return;
    
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;
    
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    
    window.speechSynthesis.speak(utterance);
  }, [voiceEnabled]);

  // Speech-to-Text
  const startListening = useCallback(() => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      toast({ title: 'Speech recognition not supported', variant: 'destructive' });
      return;
    }

    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    recognitionRef.current = new SpeechRecognition();
    recognitionRef.current.continuous = false;
    recognitionRef.current.interimResults = false;
    recognitionRef.current.lang = 'en-US';

    recognitionRef.current.onstart = () => setIsListening(true);
    recognitionRef.current.onend = () => setIsListening(false);
    recognitionRef.current.onerror = () => setIsListening(false);
    
    recognitionRef.current.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInput(transcript);
      // Auto-send after voice input
      handleSend(transcript);
    };

    recognitionRef.current.start();
  }, []);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsListening(false);
  }, []);

  // Fetch context data for AI
  const fetchContextData = async () => {
    const [bottles, sales, staff] = await Promise.all([
      supabase.from('lab_ops_bottles').select('id, spirit_type, current_level_ml, bottle_size_ml').eq('outlet_id', outletId).limit(50),
      supabase.from('lab_ops_sales').select('spirit_type, total_ml_sold').eq('outlet_id', outletId).limit(20),
      supabase.from('lab_ops_staff').select('id, name, is_active').eq('outlet_id', outletId).limit(20)
    ]);

    return {
      bottles: bottles.data || [],
      sales: sales.data || [],
      staff: staff.data || []
    };
  };

  const handleSend = async (textOverride?: string) => {
    const messageText = textOverride || input;
    if (!messageText.trim() || isLoading) return;

    const userMessage: Message = {
      role: 'user',
      content: messageText,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Fetch live context
      const contextData = await fetchContextData();
      
      const systemPrompt = `You are LUMX, an AI assistant for LAB Ops - a restaurant/bar management system. 
You have access to real-time data for ${outletName}:

INVENTORY: ${JSON.stringify(contextData.inventory.slice(0, 10))}
BOTTLES: ${JSON.stringify(contextData.bottles.slice(0, 10))}
RECENT SALES: ${JSON.stringify(contextData.sales.slice(0, 5))}
STAFF: ${JSON.stringify(contextData.staff.slice(0, 5))}

Be helpful, concise, and provide actionable insights. When discussing inventory or consumption, give specific numbers and locations. Keep responses to 2-3 sentences unless asked for detail.`;

      const { data, error } = await supabase.functions.invoke('matrix-ai-chat', {
        body: {
          messages: [
            { role: 'system', content: systemPrompt },
            ...messages.map(m => ({ role: m.role, content: m.content })),
            { role: 'user', content: messageText }
          ]
        }
      });

      if (error) throw error;

      const assistantContent = data?.content || data?.message || 'I apologize, I could not process that request.';
      
      const assistantMessage: Message = {
        role: 'assistant',
        content: assistantContent,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);
      
      // Speak the response
      speak(assistantContent);

    } catch (error) {
      console.error('Matrix AI error:', error);
      const errorMessage: Message = {
        role: 'assistant',
        content: 'I encountered an error processing your request. Please try again.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const quickQueries = [
    { label: 'Low stock', query: 'What items are running low in inventory?' },
    { label: 'Top sellers', query: 'What are the top selling items today?' },
    { label: 'Variance', query: 'Show me any variance alerts' },
    { label: 'Staff on duty', query: 'Who is working right now?' }
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Bot className="w-6 h-6 text-primary" />
            {isSpeaking && (
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            )}
          </div>
          <div>
            <h2 className="font-semibold">LUMX Voice Assistant</h2>
            <p className="text-xs text-muted-foreground">Natural language operations</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setVoiceEnabled(!voiceEnabled)}
        >
          {voiceEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
        </Button>
      </div>

      {/* Quick Queries */}
      <div className="flex flex-wrap gap-2">
        {quickQueries.map((q, i) => (
          <Button
            key={i}
            variant="outline"
            size="sm"
            className="text-xs"
            onClick={() => handleSend(q.query)}
            disabled={isLoading}
          >
            <Sparkles className="w-3 h-3 mr-1" />
            {q.label}
          </Button>
        ))}
      </div>

      {/* Chat Messages */}
      <Card className="bg-black/40 backdrop-blur-xl border-white/10">
        <CardContent className="p-0">
          <ScrollArea className="h-[350px] p-4" ref={scrollRef}>
            <div className="space-y-4">
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {msg.role === 'assistant' && (
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                      <Bot className="w-4 h-4 text-primary" />
                    </div>
                  )}
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                      msg.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-white/10'
                    }`}
                  >
                    <p className="text-sm">{msg.content}</p>
                    <p className="text-[10px] opacity-50 mt-1">
                      {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  {msg.role === 'user' && (
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                      <User className="w-4 h-4" />
                    </div>
                  )}
                </div>
              ))}
              {isLoading && (
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                    <Bot className="w-4 h-4 text-primary" />
                  </div>
                  <div className="bg-white/10 rounded-2xl px-4 py-3">
                    <Loader2 className="w-4 h-4 animate-spin" />
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Input Area */}
      <div className="flex gap-2">
        <Button
          variant={isListening ? 'destructive' : 'outline'}
          size="icon"
          className="rounded-full flex-shrink-0"
          onClick={isListening ? stopListening : startListening}
        >
          {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
        </Button>
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask LUMX anything..."
          className="rounded-full bg-white/5 border-white/10"
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          disabled={isLoading}
        />
        <Button
          size="icon"
          className="rounded-full flex-shrink-0"
          onClick={() => handleSend()}
          disabled={isLoading || !input.trim()}
        >
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
