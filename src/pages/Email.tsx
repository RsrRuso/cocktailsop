import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Mail, Send, Star, Archive, Inbox, Sparkles, Trash2, Copy, FileText, Save } from "lucide-react";
import TopNav from "@/components/TopNav";
import BottomNav from "@/components/BottomNav";
import OptimizedAvatar from "@/components/OptimizedAvatar";
import { Skeleton } from "@/components/ui/skeleton";

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
  internal_email?: string;
}

// Cache for profiles to avoid refetching
const profileCache = new Map<string, Profile>();

// Helper to decode HTML entities if content was escaped
const decodeHtmlEntities = (html: string): string => {
  const textarea = document.createElement('textarea');
  textarea.innerHTML = html;
  return textarea.value;
};

// Helper to strip HTML tags for preview
const stripHtml = (html: string): string => {
  const decoded = decodeHtmlEntities(html);
  return decoded.replace(/<[^>]*>/g, '').trim();
};
const Email = () => {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [emails, setEmails] = useState<Email[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [filter, setFilter] = useState<"inbox" | "sent" | "starred" | "archived" | "drafts">("inbox");
  const [showCompose, setShowCompose] = useState(false);
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [recipient, setRecipient] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [aiSuggestion, setAiSuggestion] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize user and profiles only once
  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }
      setCurrentUser(user);
      
      // Parallel fetch: current profile + followers
      const [profileResult, followsResult] = await Promise.all([
        supabase.from("profiles").select("id, username, full_name, avatar_url").eq("id", user.id).single(),
        supabase.from("follows").select("follower_id").eq("following_id", user.id)
      ]);
      
      const allProfiles: Profile[] = [];
      
      if (profileResult.data) {
        const profile = { ...profileResult.data, internal_email: `${profileResult.data.username}@sv.internal` };
        allProfiles.push(profile);
        profileCache.set(profile.id, profile);
      }
      
      if (followsResult.data && followsResult.data.length > 0) {
        const followerIds = followsResult.data.map(f => f.follower_id);
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("id, username, full_name, avatar_url")
          .in("id", followerIds);
        
        if (profilesData) {
          profilesData.forEach(p => {
            const profile = { ...p, internal_email: `${p.username}@sv.internal` };
            allProfiles.push(profile);
            profileCache.set(profile.id, profile);
          });
        }
      }
      
      setProfiles(allProfiles);
      setIsInitialized(true);
      fetchEmails(user.id, "inbox");
    };
    init();
  }, [navigate]);

  // Fetch emails when filter changes (after initialization)
  useEffect(() => {
    if (isInitialized && currentUser) {
      fetchEmails(currentUser.id, filter);
    }
  }, [filter, isInitialized, currentUser]);

  const fetchEmails = useCallback(async (userId: string, currentFilter: string) => {
    setIsLoading(true);
    
    let query = supabase
      .from("internal_emails")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50); // Limit for faster loading

    if (currentFilter === "inbox") {
      query = query.eq("recipient_id", userId).eq("archived", false).eq("is_draft", false);
    } else if (currentFilter === "sent") {
      query = query.eq("sender_id", userId).eq("is_draft", false);
    } else if (currentFilter === "starred") {
      query = query.or(`sender_id.eq.${userId},recipient_id.eq.${userId}`).eq("starred", true).eq("is_draft", false);
    } else if (currentFilter === "archived") {
      query = query.eq("recipient_id", userId).eq("archived", true).eq("is_draft", false);
    } else if (currentFilter === "drafts") {
      query = query.eq("sender_id", userId).eq("is_draft", true);
    }

    const { data, error } = await query;
    
    if (error) {
      toast.error("Failed to fetch emails");
      setIsLoading(false);
      return;
    }
    
    if (data && data.length > 0) {
      // Get unique user IDs not in cache
      const userIds = [...new Set([...data.map(e => e.sender_id), ...data.map(e => e.recipient_id)])];
      const uncachedIds = userIds.filter(id => !profileCache.has(id));
      
      if (uncachedIds.length > 0) {
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("id, username, full_name, avatar_url")
          .in("id", uncachedIds);
        
        profilesData?.forEach(p => {
          profileCache.set(p.id, { ...p, internal_email: `${p.username}@sv.internal` });
        });
      }
      
      const enrichedEmails = data.map(email => ({
        ...email,
        sender: profileCache.get(email.sender_id),
        recipient: profileCache.get(email.recipient_id),
      }));
      
      setEmails(enrichedEmails);
    } else {
      setEmails([]);
    }
    setIsLoading(false);
  }, []);

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

    // Validate recipient is a follower
    const recipientProfile = profiles.find(p => p.id === recipient);
    if (!recipientProfile) {
      toast.error("Recipient not found in your contacts");
      return;
    }

    // Check if recipient is actually a follower
    const { data: followCheck } = await supabase
      .from("follows")
      .select("*")
      .eq("following_id", currentUser.id)
      .eq("follower_id", recipient)
      .maybeSingle();

    if (!followCheck && recipient !== currentUser.id) {
      toast.error("You can only send emails to your followers");
      return;
    }

    const { error } = await supabase.from("internal_emails").insert({
      sender_id: currentUser.id,
      recipient_id: recipient,
      subject,
      body,
      is_draft: false,
    });

    if (error) {
      toast.error("Failed to send email");
      console.error("Email send error:", error);
      return;
    }

    toast.success(`Email sent to ${recipientProfile.internal_email}!`);
    setShowCompose(false);
    setRecipient("");
    setSubject("");
    setBody("");
    setAiSuggestion("");
    fetchEmails(currentUser.id, filter);
  };

  const saveDraft = async () => {
    if (!subject && !body) {
      toast.error("Please enter at least a subject or message");
      return;
    }

    const { error } = await supabase.from("internal_emails").insert({
      sender_id: currentUser.id,
      recipient_id: recipient || currentUser.id,
      subject: subject || "(No subject)",
      body: body || "",
      is_draft: true,
    });

    if (error) {
      toast.error("Failed to save draft");
      console.error("Draft save error:", error);
      return;
    }

    toast.success("Draft saved!");
    setShowCompose(false);
    setRecipient("");
    setSubject("");
    setBody("");
    setAiSuggestion("");
    fetchEmails(currentUser.id, filter);
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Copied to clipboard!");
    } catch (err) {
      toast.error("Failed to copy");
    }
  };

  const toggleStar = async (emailId: string, currentStarred: boolean) => {
    await supabase
      .from("internal_emails")
      .update({ starred: !currentStarred })
      .eq("id", emailId);
    fetchEmails(currentUser.id, filter);
  };

  const toggleArchive = async (emailId: string, currentArchived: boolean) => {
    await supabase
      .from("internal_emails")
      .update({ archived: !currentArchived })
      .eq("id", emailId);
    fetchEmails(currentUser.id, filter);
  };

  const markAsRead = async (emailId: string) => {
    await supabase
      .from("internal_emails")
      .update({ read: true })
      .eq("id", emailId);
    fetchEmails(currentUser.id, filter);
  };

  const deleteEmail = async (emailId: string) => {
    await supabase
      .from("internal_emails")
      .delete()
      .eq("id", emailId);
    toast.success("Email deleted");
    setSelectedEmail(null);
    fetchEmails(currentUser.id, filter);
  };

  return (
    <div className="min-h-screen bg-background">
      <TopNav isVisible={true} />
      <div className="container max-w-4xl mx-auto px-3 pt-16 sm:pt-20 pb-20 sm:pb-24">
        {/* Header - Instagram style clean */}
        <div className="mb-5 space-y-3">
          <div className="flex items-center justify-between">
            <h1 className="text-xl sm:text-2xl font-semibold text-foreground">
              Neuron Email
            </h1>
            <Button 
              onClick={() => setShowCompose(true)} 
              variant="ghost"
              size="sm"
              className="gap-2 h-9 px-3"
            >
              <Send className="w-5 h-5" strokeWidth={1.5} />
            </Button>
          </div>
          
          {currentUser && (
            <div className="py-3 border-b border-border/50">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {profiles.find(p => p.id === currentUser.id)?.username || 'loading'}@sv.internal
                  </p>
                  <p className="text-xs text-muted-foreground">{profiles.length - 1} contacts</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Filters - Instagram style tabs */}
        <div className="flex border-b border-border/50 mb-4 -mx-3 px-3 overflow-x-auto scrollbar-hide">
          <button
            onClick={() => setFilter("inbox")}
            className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              filter === "inbox" 
                ? "border-foreground text-foreground" 
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Inbox className="w-5 h-5" strokeWidth={1.5} />
            <span className="hidden sm:inline">Inbox</span>
          </button>
          <button
            onClick={() => setFilter("sent")}
            className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              filter === "sent" 
                ? "border-foreground text-foreground" 
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Send className="w-5 h-5" strokeWidth={1.5} />
            <span className="hidden sm:inline">Sent</span>
          </button>
          <button
            onClick={() => setFilter("starred")}
            className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              filter === "starred" 
                ? "border-foreground text-foreground" 
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Star className="w-5 h-5" strokeWidth={1.5} />
            <span className="hidden sm:inline">Starred</span>
          </button>
          <button
            onClick={() => setFilter("archived")}
            className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              filter === "archived" 
                ? "border-foreground text-foreground" 
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Archive className="w-5 h-5" strokeWidth={1.5} />
            <span className="hidden sm:inline">Archived</span>
          </button>
          <button
            onClick={() => setFilter("drafts")}
            className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              filter === "drafts" 
                ? "border-foreground text-foreground" 
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <FileText className="w-5 h-5" strokeWidth={1.5} />
            <span className="hidden sm:inline">Drafts</span>
          </button>
        </div>

        {/* Email List - Instagram style clean */}
        <div>
          {isLoading ? (
            // Loading skeletons - clean style
            Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="p-3 border-b border-border/30">
                <div className="flex items-start gap-3">
                  <Skeleton className="w-11 h-11 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center justify-between">
                      <Skeleton className="h-4 w-28" />
                      <Skeleton className="h-3 w-10" />
                    </div>
                    <Skeleton className="h-3.5 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              </div>
            ))
          ) : emails.length > 0 ? (
            emails.map((email) => (
              <div
                key={email.id}
                onClick={() => {
                  setSelectedEmail(email);
                  if (!email.read && email.recipient_id === currentUser?.id) {
                    markAsRead(email.id);
                  }
                }}
                className={`p-3 cursor-pointer hover:bg-muted/50 active:bg-muted transition-colors border-b border-border/30 ${
                  !email.read && email.recipient_id === currentUser?.id ? "bg-muted/30" : ""
                }`}
              >
                <div className="flex items-start gap-3">
                  <OptimizedAvatar
                    src={filter === "sent" ? email.recipient?.avatar_url : email.sender?.avatar_url}
                    alt={filter === "sent" ? email.recipient?.username : email.sender?.username}
                    fallback={(filter === "sent" ? email.recipient?.username?.[0] : email.sender?.username?.[0]) || "U"}
                    userId={filter === "sent" ? email.recipient?.id : email.sender?.id}
                    className="w-11 h-11 rounded-full"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <p className={`text-sm truncate ${!email.read && email.recipient_id === currentUser?.id ? "font-semibold" : "font-medium"}`}>
                          {filter === "sent" ? email.recipient?.full_name : email.sender?.full_name}
                        </p>
                        {email.starred && <Star className="w-4 h-4 fill-foreground text-foreground flex-shrink-0" strokeWidth={1.5} />}
                      </div>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(email.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                    <p className={`text-sm truncate ${!email.read && email.recipient_id === currentUser?.id ? "font-medium text-foreground" : "text-muted-foreground"}`}>
                      {email.subject}
                    </p>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      {stripHtml(email.body).slice(0, 80)}
                    </p>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-16 text-muted-foreground">
              <Mail className="w-12 h-12 mx-auto mb-3" strokeWidth={1} />
              <p className="text-sm">No emails</p>
            </div>
          )}
        </div>
      </div>

      {/* Compose Dialog - Instagram style clean */}
      <Dialog open={showCompose} onOpenChange={setShowCompose}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto border-border bg-background">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">New Message</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">To</label>
              <Select value={recipient} onValueChange={setRecipient}>
                <SelectTrigger className="h-10 text-sm border-border">
                  <SelectValue placeholder="Select recipient" />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {profiles.filter(p => p.id !== currentUser?.id).map((profile) => (
                    <SelectItem key={profile.id} value={profile.id} className="text-sm">
                      <span className="font-medium">{profile.full_name}</span>
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
                placeholder="Subject"
                className="h-10 text-sm border-border"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Message</label>
              <Textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Write a message..."
                rows={5}
                className="text-sm resize-none border-border"
              />
            </div>
            
            {/* AI Suggestion */}
            <button
              onClick={generateAiSuggestion}
              disabled={isGenerating}
              className="w-full flex items-center justify-center gap-2 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <Sparkles className="w-4 h-4" strokeWidth={1.5} />
              {isGenerating ? "Generating..." : "AI Suggestion"}
            </button>
            
            {aiSuggestion && (
              <div className="p-3 rounded-lg border border-border bg-muted/30">
                <p className="text-xs text-muted-foreground mb-2">AI Suggestion:</p>
                <p className="text-sm leading-relaxed">{aiSuggestion}</p>
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => setBody(aiSuggestion)}
                    className="text-sm font-medium text-foreground"
                  >
                    Use
                  </button>
                  <button
                    onClick={() => copyToClipboard(aiSuggestion)}
                    className="text-sm text-muted-foreground flex items-center gap-1"
                  >
                    <Copy className="w-3.5 h-3.5" strokeWidth={1.5} />
                    Copy
                  </button>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between pt-2 border-t border-border">
              <div className="flex gap-2">
                <button
                  onClick={saveDraft}
                  className="p-2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Save className="w-5 h-5" strokeWidth={1.5} />
                </button>
              </div>
              <Button 
                onClick={sendEmail} 
                className="h-9 px-6 rounded-full bg-foreground text-background hover:bg-foreground/90"
              >
                Send
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Email Dialog - Instagram style clean */}
      <Dialog open={!!selectedEmail} onOpenChange={() => setSelectedEmail(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto border-border bg-background">
          {selectedEmail && (
            <>
              <DialogHeader>
                <div className="flex items-start gap-3">
                  <OptimizedAvatar
                    src={filter === "sent" ? selectedEmail.recipient?.avatar_url : selectedEmail.sender?.avatar_url}
                    alt={filter === "sent" ? selectedEmail.recipient?.username : selectedEmail.sender?.username}
                    fallback={(filter === "sent" ? selectedEmail.recipient?.username?.[0] : selectedEmail.sender?.username?.[0]) || "U"}
                    userId={filter === "sent" ? selectedEmail.recipient?.id : selectedEmail.sender?.id}
                    className="w-10 h-10 rounded-full"
                  />
                  <div className="flex-1 min-w-0">
                    <DialogTitle className="text-base font-semibold leading-tight">{selectedEmail.subject}</DialogTitle>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {selectedEmail.sender?.full_name}
                    </p>
                  </div>
                </div>
              </DialogHeader>
              
              {/* Actions - Instagram style */}
              <div className="flex items-center gap-4 py-3 border-b border-border">
                <button
                  onClick={() => toggleStar(selectedEmail.id, selectedEmail.starred)}
                  className="text-foreground"
                >
                  <Star className={`w-6 h-6 ${selectedEmail.starred ? "fill-foreground" : ""}`} strokeWidth={1.5} />
                </button>
                {filter === "inbox" && (
                  <button
                    onClick={() => toggleArchive(selectedEmail.id, selectedEmail.archived)}
                    className="text-foreground"
                  >
                    <Archive className="w-6 h-6" strokeWidth={1.5} />
                  </button>
                )}
                <button
                  onClick={() => deleteEmail(selectedEmail.id)}
                  className="text-foreground"
                >
                  <Trash2 className="w-6 h-6" strokeWidth={1.5} />
                </button>
              </div>
              
              <div className="py-4">
                <div 
                  className="text-sm leading-relaxed [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:mb-3 [&_p]:mb-2 [&_strong]:font-semibold"
                  dangerouslySetInnerHTML={{ __html: decodeHtmlEntities(selectedEmail.body) }}
                />
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
