import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import TopNav from "@/components/TopNav";
import BottomNav from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Send, Plus, Hash, Users, MessageCircle, Search } from "lucide-react";
import { format } from "date-fns";

interface Channel {
  id: string;
  name: string;
  type: string;
  description: string | null;
  unread_count?: number;
}

interface Message {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  profiles: {
    username: string;
    avatar_url: string | null;
  };
}

export default function Chat() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [newChannelName, setNewChannelName] = useState("");
  const [newChannelType, setNewChannelType] = useState("group");
  const [newChannelDesc, setNewChannelDesc] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    fetchChannels();
  }, [user, navigate]);

  useEffect(() => {
    if (selectedChannel) {
      fetchMessages();
      markChannelAsRead();
      
      const channel = supabase
        .channel(`messages:${selectedChannel.id}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "chat_messages",
            filter: `channel_id=eq.${selectedChannel.id}`,
          },
          (payload) => {
            fetchMessages();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [selectedChannel]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const fetchChannels = async () => {
    const { data: memberChannels } = await supabase
      .from("chat_members")
      .select("channel_id")
      .eq("user_id", user?.id);

    if (!memberChannels) return;

    const channelIds = memberChannels.map((m) => m.channel_id);
    
    const { data, error } = await supabase
      .from("chat_channels")
      .select("*")
      .in("id", channelIds)
      .order("updated_at", { ascending: false });

    if (error) {
      toast.error("Failed to load channels");
      return;
    }

    setChannels(data || []);
    if (!selectedChannel && data && data.length > 0) {
      setSelectedChannel(data[0]);
    }
  };

  const fetchMessages = async () => {
    if (!selectedChannel) return;

    const { data, error } = await supabase
      .from("chat_messages")
      .select("*")
      .eq("channel_id", selectedChannel.id)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Failed to load messages:", error);
      return;
    }

    // Fetch profiles separately
    const messagesWithProfiles = await Promise.all(
      (data || []).map(async (msg) => {
        const { data: profile } = await supabase
          .from("profiles")
          .select("username, avatar_url")
          .eq("id", msg.user_id)
          .single();
        
        return {
          ...msg,
          profiles: profile || { username: "Unknown", avatar_url: null }
        };
      })
    );

    setMessages(messagesWithProfiles);
  };

  const markChannelAsRead = async () => {
    if (!selectedChannel || !user) return;

    await supabase
      .from("chat_members")
      .update({ last_read_at: new Date().toISOString() })
      .eq("channel_id", selectedChannel.id)
      .eq("user_id", user.id);
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedChannel || !user) return;

    const { error } = await supabase.from("chat_messages").insert({
      channel_id: selectedChannel.id,
      user_id: user.id,
      content: newMessage.trim(),
    });

    if (error) {
      toast.error("Failed to send message");
      return;
    }

    setNewMessage("");
  };

  const handleCreateChannel = async () => {
    if (!newChannelName.trim() || !user) return;

    const { data: channel, error } = await supabase
      .from("chat_channels")
      .insert({
        name: newChannelName.trim(),
        description: newChannelDesc.trim() || null,
        type: newChannelType,
        created_by: user.id,
      })
      .select()
      .single();

    if (error || !channel) {
      toast.error("Failed to create channel");
      return;
    }

    await supabase.from("chat_members").insert({
      channel_id: channel.id,
      user_id: user.id,
      role: "admin",
    });

    toast.success("Channel created successfully");
    setNewChannelName("");
    setNewChannelDesc("");
    setNewChannelType("group");
    setCreateDialogOpen(false);
    fetchChannels();
  };

  const filteredChannels = channels.filter((ch) =>
    ch.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background">
      <TopNav />

      <div className="container mx-auto pt-20 pb-20 px-4">
        <div className="grid grid-cols-12 gap-4 h-[calc(100vh-160px)]">
          {/* Channels Sidebar */}
          <Card className="col-span-12 md:col-span-4 lg:col-span-3">
            <CardContent className="p-4 h-full flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">Channels</h2>
                <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <Plus className="w-4 h-4" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create New Channel</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label>Channel Name</Label>
                        <Input
                          value={newChannelName}
                          onChange={(e) => setNewChannelName(e.target.value)}
                          placeholder="general, team-updates..."
                        />
                      </div>
                      <div>
                        <Label>Type</Label>
                        <Select value={newChannelType} onValueChange={setNewChannelType}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="group">Group</SelectItem>
                            <SelectItem value="private">Private</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Description</Label>
                        <Textarea
                          value={newChannelDesc}
                          onChange={(e) => setNewChannelDesc(e.target.value)}
                          placeholder="What's this channel about?"
                        />
                      </div>
                      <Button onClick={handleCreateChannel} className="w-full">
                        Create Channel
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search channels..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              <ScrollArea className="flex-1">
                <div className="space-y-2">
                  {filteredChannels.map((channel) => (
                    <Button
                      key={channel.id}
                      variant={selectedChannel?.id === channel.id ? "secondary" : "ghost"}
                      className="w-full justify-start"
                      onClick={() => setSelectedChannel(channel)}
                    >
                      {channel.type === "private" ? (
                        <Hash className="w-4 h-4 mr-2" />
                      ) : (
                        <MessageCircle className="w-4 h-4 mr-2" />
                      )}
                      {channel.name}
                      {channel.unread_count && channel.unread_count > 0 && (
                        <Badge variant="destructive" className="ml-auto">
                          {channel.unread_count}
                        </Badge>
                      )}
                    </Button>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Chat Area */}
          <Card className="col-span-12 md:col-span-8 lg:col-span-9">
            <CardContent className="p-0 h-full flex flex-col">
              {selectedChannel ? (
                <>
                  {/* Channel Header */}
                  <div className="p-4 border-b">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-bold text-lg"># {selectedChannel.name}</h3>
                        {selectedChannel.description && (
                          <p className="text-sm text-muted-foreground">
                            {selectedChannel.description}
                          </p>
                        )}
                      </div>
                      <Button variant="ghost" size="sm">
                        <Users className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Messages */}
                  <ScrollArea className="flex-1 p-4">
                    <div className="space-y-4">
                      {messages.map((message) => (
                        <div key={message.id} className="flex gap-3">
                          <Avatar className="w-10 h-10">
                            <AvatarImage src={message.profiles?.avatar_url || ""} />
                            <AvatarFallback>
                              {message.profiles?.username?.[0]?.toUpperCase() || "U"}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-semibold">
                                {message.profiles?.username || "Unknown"}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {format(new Date(message.created_at), "HH:mm")}
                              </span>
                            </div>
                            <p className="text-sm">{message.content}</p>
                          </div>
                        </div>
                      ))}
                      <div ref={messagesEndRef} />
                    </div>
                  </ScrollArea>

                  {/* Message Input */}
                  <div className="p-4 border-t">
                    <div className="flex gap-2">
                      <Input
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            handleSendMessage();
                          }
                        }}
                        placeholder={`Message #${selectedChannel.name}`}
                        className="flex-1"
                      />
                      <Button onClick={handleSendMessage} size="icon">
                        <Send className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  Select a channel to start chatting
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
