import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Mail, Send, Star, Archive, Inbox, Sparkles, Trash2 } from "lucide-react";
import TopNav from "@/components/TopNav";
import BottomNav from "@/components/BottomNav";
import OptimizedAvatar from "@/components/OptimizedAvatar";

interface Email {
  id: string;
  sender_id: string;
  recipient_id: string;
  subject: string;
  body: string;
  read: boolean;
  starred: boolean;
  archived: boolean;
  created_at: string;
  sender?: {
    id: string;
    username: string;
    full_name: string;
    avatar_url: string;
  };
  recipient?: {
    id: string;
    username: string;
    full_name: string;
    avatar_url: string;
  };
}

interface Profile {
  id: string;
  username: string;
  full_name: string;
  avatar_url: string;
}

const Email = () => {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [emails, setEmails] = useState<Email[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [filter, setFilter] = useState<"inbox" | "sent" | "starred" | "archived">("inbox");
  const [showCompose, setShowCompose] = useState(false);
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [recipient, setRecipient] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [aiSuggestion, setAiSuggestion] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }
      setCurrentUser(user);
      
      // Fetch followers as available contacts for internal email
      const { data: followsData } = await supabase
        .from("follows")
        .select("follower_id")
        .eq("following_id", user.id);
      
      if (followsData && followsData.length > 0) {
        const followerIds = followsData.map(f => f.follower_id);
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("id, username, full_name, avatar_url")
          .in("id", followerIds);
        
        if (profilesData) setProfiles(profilesData);
      }
      
      fetchEmails(user.id);
    };
    init();
  }, [filter]);

  const fetchEmails = async (userId: string) => {
    let query = supabase
      .from("internal_emails")
      .select("*")
      .order("created_at", { ascending: false });

    if (filter === "inbox") {
      query = query.eq("recipient_id", userId).eq("archived", false);
    } else if (filter === "sent") {
      query = query.eq("sender_id", userId);
    } else if (filter === "starred") {
      query = query.or(`sender_id.eq.${userId},recipient_id.eq.${userId}`).eq("starred", true);
    } else if (filter === "archived") {
      query = query.eq("recipient_id", userId).eq("archived", true);
    }

    const { data, error } = await query;
    if (error) {
      toast.error("Failed to fetch emails");
      return;
    }
    
    // Fetch sender and recipient profiles separately
    if (data && data.length > 0) {
      const userIds = [...new Set([...data.map(e => e.sender_id), ...data.map(e => e.recipient_id)])];
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("id, username, full_name, avatar_url")
        .in("id", userIds);
      
      const profileMap = new Map(profilesData?.map(p => [p.id, p]) || []);
      
      const enrichedEmails = data.map(email => ({
        ...email,
        sender: profileMap.get(email.sender_id),
        recipient: profileMap.get(email.recipient_id),
      }));
      
      setEmails(enrichedEmails);
    } else {
      setEmails([]);
    }
  };

  const generateAiSuggestion = async () => {
    if (!subject && !body) {
      toast.error("Please enter a subject or start your email");
      return;
    }

    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-email-assistant", {
        body: { subject, body, action: "suggest" }
      });

      if (error) throw error;
      setAiSuggestion(data.suggestion);
      toast.success("AI suggestion generated!");
    } catch (error) {
      toast.error("Failed to generate suggestion");
    } finally {
      setIsGenerating(false);
    }
  };

  const sendEmail = async () => {
    if (!recipient || !subject || !body) {
      toast.error("Please fill all fields");
      return;
    }

    const { error } = await supabase.from("internal_emails").insert({
      sender_id: currentUser.id,
      recipient_id: recipient,
      subject,
      body,
    });

    if (error) {
      toast.error("Failed to send email");
      return;
    }

    toast.success("Email sent!");
    setShowCompose(false);
    setRecipient("");
    setSubject("");
    setBody("");
    setAiSuggestion("");
    fetchEmails(currentUser.id);
  };

  const toggleStar = async (emailId: string, currentStarred: boolean) => {
    await supabase
      .from("internal_emails")
      .update({ starred: !currentStarred })
      .eq("id", emailId);
    fetchEmails(currentUser.id);
  };

  const toggleArchive = async (emailId: string, currentArchived: boolean) => {
    await supabase
      .from("internal_emails")
      .update({ archived: !currentArchived })
      .eq("id", emailId);
    fetchEmails(currentUser.id);
  };

  const markAsRead = async (emailId: string) => {
    await supabase
      .from("internal_emails")
      .update({ read: true })
      .eq("id", emailId);
    fetchEmails(currentUser.id);
  };

  const deleteEmail = async (emailId: string) => {
    await supabase
      .from("internal_emails")
      .delete()
      .eq("id", emailId);
    toast.success("Email deleted");
    setSelectedEmail(null);
    fetchEmails(currentUser.id);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background/95 to-background">
      <TopNav isVisible={true} />
      <div className="container max-w-4xl mx-auto px-2 sm:px-4 pt-20 pb-24">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-foreground via-primary to-foreground bg-clip-text text-transparent">
            Internal Email
          </h1>
          <Button onClick={() => setShowCompose(true)} className="gap-2">
            <Send className="w-4 h-4" />
            Compose
          </Button>
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          <Button
            variant={filter === "inbox" ? "default" : "outline"}
            onClick={() => setFilter("inbox")}
            className="gap-2 whitespace-nowrap"
          >
            <Inbox className="w-4 h-4" />
            Inbox
          </Button>
          <Button
            variant={filter === "sent" ? "default" : "outline"}
            onClick={() => setFilter("sent")}
            className="gap-2 whitespace-nowrap"
          >
            <Send className="w-4 h-4" />
            Sent
          </Button>
          <Button
            variant={filter === "starred" ? "default" : "outline"}
            onClick={() => setFilter("starred")}
            className="gap-2 whitespace-nowrap"
          >
            <Star className="w-4 h-4" />
            Starred
          </Button>
          <Button
            variant={filter === "archived" ? "default" : "outline"}
            onClick={() => setFilter("archived")}
            className="gap-2 whitespace-nowrap"
          >
            <Archive className="w-4 h-4" />
            Archived
          </Button>
        </div>

        {/* Email List */}
        <div className="space-y-2">
          {emails.map((email) => (
            <div
              key={email.id}
              onClick={() => {
                setSelectedEmail(email);
                if (!email.read && email.recipient_id === currentUser?.id) {
                  markAsRead(email.id);
                }
              }}
              className={`glass p-4 rounded-2xl cursor-pointer hover:bg-accent/50 transition-all ${
                !email.read && email.recipient_id === currentUser?.id ? "border-2 border-primary" : ""
              }`}
            >
              <div className="flex items-center gap-3">
                <OptimizedAvatar
                  src={filter === "sent" ? email.recipient?.avatar_url : email.sender?.avatar_url}
                  alt={filter === "sent" ? email.recipient?.username : email.sender?.username}
                  fallback={(filter === "sent" ? email.recipient?.username?.[0] : email.sender?.username?.[0]) || "U"}
                  userId={filter === "sent" ? email.recipient?.id : email.sender?.id}
                  className="w-12 h-12"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold truncate">
                      {filter === "sent" ? email.recipient?.full_name : email.sender?.full_name}
                    </p>
                    {email.starred && <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />}
                  </div>
                  <p className="text-sm font-medium truncate">{email.subject}</p>
                  <p className="text-xs text-muted-foreground truncate">{email.body}</p>
                </div>
                <div className="text-xs text-muted-foreground whitespace-nowrap">
                  {new Date(email.created_at).toLocaleDateString()}
                </div>
              </div>
            </div>
          ))}
          {emails.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <Mail className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No emails found</p>
            </div>
          )}
        </div>
      </div>

      {/* Compose Dialog */}
      <Dialog open={showCompose} onOpenChange={setShowCompose}>
        <DialogContent className="glass max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5" />
              Compose Email
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Recipient</label>
              <Select value={recipient} onValueChange={setRecipient}>
                <SelectTrigger>
                  <SelectValue placeholder="Select recipient" />
                </SelectTrigger>
                <SelectContent>
                  {profiles.map((profile) => (
                    <SelectItem key={profile.id} value={profile.id}>
                      {profile.full_name} (@{profile.username})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Subject</label>
              <Input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Email subject"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Message</label>
              <Textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Write your email..."
                rows={8}
              />
            </div>
            
            {/* AI Suggestion */}
            <Button
              variant="outline"
              onClick={generateAiSuggestion}
              disabled={isGenerating}
              className="w-full gap-2"
            >
              <Sparkles className="w-4 h-4" />
              {isGenerating ? "Generating..." : "Get AI Writing Suggestion"}
            </Button>
            
            {aiSuggestion && (
              <div className="glass p-4 rounded-xl border border-primary/20">
                <p className="text-sm font-medium mb-2 text-primary">AI Suggestion:</p>
                <p className="text-sm">{aiSuggestion}</p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setBody(aiSuggestion)}
                  className="mt-2"
                >
                  Use This
                </Button>
              </div>
            )}

            <div className="flex gap-2">
              <Button onClick={sendEmail} className="flex-1 gap-2">
                <Send className="w-4 h-4" />
                Send Email
              </Button>
              <Button variant="outline" onClick={() => setShowCompose(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Email Dialog */}
      <Dialog open={!!selectedEmail} onOpenChange={() => setSelectedEmail(null)}>
        <DialogContent className="glass max-w-2xl">
          {selectedEmail && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-3">
                  <OptimizedAvatar
                    src={filter === "sent" ? selectedEmail.recipient?.avatar_url : selectedEmail.sender?.avatar_url}
                    alt={filter === "sent" ? selectedEmail.recipient?.username : selectedEmail.sender?.username}
                    fallback={(filter === "sent" ? selectedEmail.recipient?.username?.[0] : selectedEmail.sender?.username?.[0]) || "U"}
                    userId={filter === "sent" ? selectedEmail.recipient?.id : selectedEmail.sender?.id}
                    className="w-10 h-10"
                  />
                  <div className="flex-1">
                    <DialogTitle>{selectedEmail.subject}</DialogTitle>
                    <p className="text-sm text-muted-foreground">
                      From: {selectedEmail.sender?.full_name}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => toggleStar(selectedEmail.id, selectedEmail.starred)}
                    >
                      <Star className={`w-4 h-4 ${selectedEmail.starred ? "fill-yellow-500 text-yellow-500" : ""}`} />
                    </Button>
                    {filter === "inbox" && (
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => toggleArchive(selectedEmail.id, selectedEmail.archived)}
                      >
                        <Archive className="w-4 h-4" />
                      </Button>
                    )}
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => deleteEmail(selectedEmail.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </DialogHeader>
              <div className="mt-4">
                <p className="text-sm whitespace-pre-wrap">{selectedEmail.body}</p>
                <p className="text-xs text-muted-foreground mt-4">
                  {new Date(selectedEmail.created_at).toLocaleString()}
                </p>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <BottomNav />
    </div>
  );
};

export default Email;
