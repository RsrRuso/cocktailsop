import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Wand2, Languages, FileText, Zap, ThumbsUp, Briefcase, Minimize2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";

interface AIMessageToolsProps {
  message: string;
  onMessageUpdate: (newMessage: string) => void;
}

export const AIMessageTools = ({ message, onMessageUpdate }: AIMessageToolsProps) => {
  const [loading, setLoading] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const { toast } = useToast();

  const callAI = async (action: string, context?: string) => {
    if (!message.trim()) {
      toast({
        title: "Empty Message",
        description: "Please type a message first",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('neuron-ai-assistant', {
        body: { action, message, context }
      });

      if (error) throw error;

      const result = data.result;
      
      if (action === 'analyze_tone') {
        const analysis = JSON.parse(result);
        toast({
          title: `Tone: ${analysis.tone}`,
          description: `Emotion: ${analysis.emotion}. ${analysis.suggestions?.join(' ') || ''}`,
        });
      } else {
        onMessageUpdate(result);
        toast({
          title: "✨ AI Enhanced",
          description: "Your message has been improved!",
        });
      }
    } catch (error) {
      console.error('AI tool error:', error);
      toast({
        title: "AI Error",
        description: "Couldn't process your request",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setShowMenu(false);
    }
  };

  return (
    <DropdownMenu open={showMenu} onOpenChange={setShowMenu}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-9 px-3 gap-2 glass backdrop-blur-xl hover:bg-primary/10 border border-primary/20 relative overflow-hidden group"
          disabled={loading}
        >
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-primary/20 via-accent/20 to-primary/20"
            animate={{ x: ['-100%', '100%'] }}
            transition={{ repeat: Infinity, duration: 3, ease: 'linear' }}
          />
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Sparkles className="w-4 h-4" />
          )}
          <span className="font-medium relative z-10">AI Tools</span>
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent 
        align="end" 
        className="w-56 glass backdrop-blur-3xl border-primary/30 shadow-2xl"
      >
        <DropdownMenuLabel className="flex items-center gap-2">
          <Wand2 className="w-4 h-4 text-primary" />
          <span>Enhance Message</span>
        </DropdownMenuLabel>
        
        <DropdownMenuItem onClick={() => callAI('improve_message')} className="gap-2 cursor-pointer">
          <Zap className="w-4 h-4 text-primary" />
          <span>Improve Writing</span>
        </DropdownMenuItem>
        
        <DropdownMenuItem onClick={() => callAI('make_casual')} className="gap-2 cursor-pointer">
          <ThumbsUp className="w-4 h-4 text-accent" />
          <span>Make Casual</span>
        </DropdownMenuItem>
        
        <DropdownMenuItem onClick={() => callAI('make_professional')} className="gap-2 cursor-pointer">
          <Briefcase className="w-4 h-4 text-blue-500" />
          <span>Make Professional</span>
        </DropdownMenuItem>
        
        <DropdownMenuItem onClick={() => callAI('make_concise')} className="gap-2 cursor-pointer">
          <Minimize2 className="w-4 h-4 text-orange-500" />
          <span>Make Concise</span>
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuLabel className="flex items-center gap-2">
          <Languages className="w-4 h-4 text-primary" />
          <span>Translate</span>
        </DropdownMenuLabel>
        
        <DropdownMenuItem onClick={() => callAI('translate', 'Spanish')} className="gap-2 cursor-pointer">
          🇪🇸 <span>Spanish</span>
        </DropdownMenuItem>
        
        <DropdownMenuItem onClick={() => callAI('translate', 'French')} className="gap-2 cursor-pointer">
          🇫🇷 <span>French</span>
        </DropdownMenuItem>
        
        <DropdownMenuItem onClick={() => callAI('translate', 'German')} className="gap-2 cursor-pointer">
          🇩🇪 <span>German</span>
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem onClick={() => callAI('analyze_tone')} className="gap-2 cursor-pointer">
          <FileText className="w-4 h-4 text-purple-500" />
          <span>Analyze Tone</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
