import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Search, Users, UserPlus, TrendingUp, Zap, MessageCircle, Star } from "lucide-react";
import { motion } from "framer-motion";

interface Channel {
  id: string;
  name: string;
  description: string | null;
  avatar_url: string | null;
  type: string;
  category: string;
  member_count: number;
  is_official: boolean;
  is_pinned: boolean;
}

interface CommunityDiscoverDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  channels: Channel[];
  onJoinChannel: (channel: Channel) => void;
  getChannelIcon: (channel: Channel) => React.ReactNode;
}

const categories = [
  { id: "all", label: "All", icon: Zap },
  { id: "official", label: "Official", icon: Star },
  { id: "general", label: "General", icon: MessageCircle },
  { id: "events", label: "Events", icon: TrendingUp },
  { id: "feedback", label: "Feedback", icon: Users },
];

export default function CommunityDiscoverDialog({
  open,
  onOpenChange,
  channels,
  onJoinChannel,
  getChannelIcon,
}: CommunityDiscoverDialogProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  const filteredChannels = channels.filter((ch) => {
    const matchesSearch = ch.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ch.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "all" ||
      (selectedCategory === "official" ? ch.is_official : ch.category === selectedCategory);
    return matchesSearch && matchesCategory;
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-2xl max-h-[85vh] bg-slate-900 border-white/10 text-white p-0 overflow-hidden rounded-xl flex flex-col">
        <DialogHeader className="p-4 sm:p-6 pb-2 flex-shrink-0">
          <DialogTitle className="text-lg sm:text-2xl font-bold flex items-center gap-2 sm:gap-3">
            <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center flex-shrink-0">
              <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </div>
            Discover Channels
          </DialogTitle>
        </DialogHeader>

        <div className="p-4 sm:p-6 pt-2 space-y-3 sm:space-y-4 flex flex-col flex-1 min-h-0 overflow-hidden">
          {/* Search */}
          <div className="relative flex-shrink-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-white/40" />
            <Input
              placeholder="Search channels..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 sm:pl-11 bg-white/5 border-white/10 text-white placeholder:text-white/40 h-10 sm:h-12 rounded-xl text-sm sm:text-base"
            />
          </div>

          {/* Categories - Horizontal scrollable */}
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide flex-shrink-0 pr-2">
            {categories.map((cat) => {
              const Icon = cat.icon;
              return (
                <Button
                  key={cat.id}
                  variant={selectedCategory === cat.id ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`flex-shrink-0 h-9 px-3 text-xs sm:text-sm ${
                    selectedCategory === cat.id
                      ? "bg-blue-600 hover:bg-blue-700"
                      : "bg-white/5 hover:bg-white/10 text-white/70"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />
                  {cat.label}
                </Button>
              );
            })}
          </div>

          {/* Channel List */}
          <ScrollArea className="flex-1 min-h-0">
            <div className="space-y-2 sm:space-y-3 pr-2 pb-2">
              {filteredChannels.length === 0 ? (
                <div className="text-center py-6 text-white/40">
                  <MessageCircle className="w-8 h-8 sm:w-10 sm:h-10 mx-auto mb-2 sm:mb-3 opacity-50" />
                  <p className="text-sm">No channels found</p>
                </div>
              ) : (
                filteredChannels.map((channel, idx) => (
                  <motion.div
                    key={channel.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
                  >
                    <Avatar className="h-10 w-10 sm:h-14 sm:w-14 flex-shrink-0">
                      {channel.avatar_url ? (
                        <AvatarImage src={channel.avatar_url} />
                      ) : (
                        <AvatarFallback className="bg-gradient-to-br from-blue-500/30 to-purple-500/30 text-blue-400">
                          {getChannelIcon(channel)}
                        </AvatarFallback>
                      )}
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 sm:gap-2 mb-0.5 sm:mb-1">
                        <h3 className="font-semibold text-white text-sm sm:text-base truncate">
                          {channel.name}
                        </h3>
                        {channel.is_official && (
                          <Badge className="bg-blue-500/20 text-blue-400 border-0 text-[10px] sm:text-xs px-1.5 py-0">
                            Official
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs sm:text-sm text-white/50 truncate">
                        {channel.description || "No description"}
                      </p>
                      <div className="flex items-center gap-1.5 sm:gap-2 mt-0.5 sm:mt-1 text-[10px] sm:text-xs text-white/40">
                        <Users className="w-3 h-3" />
                        <span>{channel.member_count} members</span>
                      </div>
                    </div>

                    <Button
                      onClick={() => onJoinChannel(channel)}
                      size="sm"
                      className="bg-blue-600 hover:bg-blue-700 text-white flex-shrink-0 h-8 sm:h-9 px-2.5 sm:px-4 text-xs sm:text-sm"
                    >
                      <UserPlus className="w-3.5 h-3.5 sm:w-4 sm:h-4 sm:mr-2" />
                      <span className="hidden sm:inline">Join</span>
                    </Button>
                  </motion.div>
                ))
              )}
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
