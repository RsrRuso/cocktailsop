import { memo, useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Send, Paperclip, Smile, X, Mic, Image } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Haptics, ImpactStyle } from "@capacitor/haptics";

interface Message {
  id: string;
  content: string | null;
  profile?: {
    username: string;
  };
}

interface CommunityMessageInputProps {
  onSend: (content: string, replyTo: Message | null) => Promise<boolean>;
  replyTo: Message | null;
  onCancelReply: () => void;
  disabled?: boolean;
  sending?: boolean;
}

function CommunityMessageInputComponent({
  onSend,
  replyTo,
  onCancelReply,
  disabled,
  sending,
}: CommunityMessageInputProps) {
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [isFocused, setIsFocused] = useState(false);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = inputRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = Math.min(textarea.scrollHeight, 120) + "px";
    }
  }, [value]);

  // Focus on reply
  useEffect(() => {
    if (replyTo) {
      inputRef.current?.focus();
    }
  }, [replyTo]);

  const handleSend = useCallback(async () => {
    if (!value.trim() || disabled || sending) return;

    try {
      await Haptics.impact({ style: ImpactStyle.Light });
    } catch {}

    const content = value.trim();
    setValue("");
    
    // Reset height
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
    }

    const success = await onSend(content, replyTo);
    if (!success) {
      setValue(content); // Restore on failure
    }
  }, [value, replyTo, onSend, disabled, sending]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  return (
    <div className="border-t border-white/10 bg-slate-900/80 backdrop-blur-lg">
      {/* Reply Preview */}
      <AnimatePresence>
        {replyTo && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="px-4 py-2 border-b border-white/5 bg-slate-800/50 flex items-center justify-between overflow-hidden"
          >
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-0.5 h-8 bg-blue-500 rounded-full flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-xs font-medium text-blue-400">
                  Reply to {replyTo.profile?.username || "message"}
                </p>
                <p className="text-xs text-white/40 truncate max-w-[250px]">
                  {replyTo.content}
                </p>
              </div>
            </div>
            <Button
              size="icon"
              variant="ghost"
              onClick={onCancelReply}
              className="h-6 w-6 text-white/40 hover:text-white hover:bg-white/10 flex-shrink-0"
            >
              <X className="w-4 h-4" />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input Area */}
      <div className="p-2 sm:p-3">
        <div className={`flex items-end gap-2 bg-white/5 rounded-2xl px-2 py-1 border transition-colors ${
          isFocused ? "border-blue-500/50" : "border-transparent"
        }`}>
          {/* Attachment Button */}
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 text-white/50 hover:text-white hover:bg-white/10 rounded-full flex-shrink-0 self-end mb-0.5"
          >
            <Paperclip className="w-5 h-5" />
          </Button>

          {/* Text Input */}
          <textarea
            ref={inputRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder="Type a message..."
            disabled={disabled}
            rows={1}
            className="flex-1 bg-transparent text-white placeholder:text-white/40 text-sm py-2 resize-none outline-none max-h-[120px] min-h-[36px]"
            style={{ lineHeight: "1.4" }}
          />

          {/* Emoji Button */}
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 text-white/50 hover:text-white hover:bg-white/10 rounded-full flex-shrink-0 self-end mb-0.5"
          >
            <Smile className="w-5 h-5" />
          </Button>

          {/* Send/Mic Button */}
          <Button
            size="icon"
            onClick={handleSend}
            disabled={!value.trim() || disabled || sending}
            className={`h-9 w-9 rounded-full flex-shrink-0 self-end transition-all duration-200 ${
              value.trim()
                ? "bg-blue-600 hover:bg-blue-700 text-white scale-100"
                : "bg-white/10 text-white/50 scale-95"
            }`}
          >
            {value.trim() ? (
              <Send className="w-4 h-4" />
            ) : (
              <Mic className="w-5 h-5" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

export const CommunityMessageInput = memo(CommunityMessageInputComponent);
