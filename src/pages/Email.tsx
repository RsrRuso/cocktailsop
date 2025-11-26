import { useState, useEffect } from "react";
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

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }
      setCurrentUser(user);
      
      // Fetch current user's profile
      const { data: currentProfile } = await supabase
        .from("profiles")
        .select("id, username, full_name, avatar_url")
        .eq("id", user.id)
        .single();
      
      // Fetch followers as available contacts for internal email
      const { data: followsData } = await supabase
        .from("follows")
        .select("follower_id")
        .eq("following_id", user.id);
      
      const allProfiles = [];
      
      // Add current user to profiles
      if (currentProfile) {
        allProfiles.push({
          ...currentProfile,
          internal_email: `${currentProfile.username}@sv.internal`
        });
      }
      
      if (followsData && followsData.length > 0) {
        const followerIds = followsData.map(f => f.follower_id);
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("id, username, full_name, avatar_url")
          .in("id", followerIds);
        
        if (profilesData) {
          // Add internal email addresses
          const profilesWithEmail = profilesData.map(p => ({
            ...p,
            internal_email: `${p.username}@sv.internal`
          }));
          allProfiles.push(...profilesWithEmail);
        }
      }
      
      setProfiles(allProfiles);
      
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
      query = query.eq("recipient_id", userId).eq("archived", false).eq("is_draft", false);
    } else if (filter === "sent") {
      query = query.eq("sender_id", userId).eq("is_draft", false);
    } else if (filter === "starred") {
      query = query.or(`sender_id.eq.${userId},recipient_id.eq.${userId}`).eq("starred", true).eq("is_draft", false);
    } else if (filter === "archived") {
      query = query.eq("recipient_id", userId).eq("archived", true).eq("is_draft", false);
    } else if (filter === "drafts") {
      query = query.eq("sender_id", userId).eq("is_draft", true);
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
    fetchEmails(currentUser.id);
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
    fetchEmails(currentUser.id);
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
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-accent/10 relative overflow-hidden">
      {/* Floating particles background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-20 left-20 w-40 h-40 bg-primary/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-40 right-20 w-48 h-48 bg-accent/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/3 w-32 h-32 bg-primary/5 rounded-full blur-2xl animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      <TopNav isVisible={true} />
      <div className="container max-w-4xl mx-auto px-3 pt-16 sm:pt-20 pb-20 sm:pb-24 relative z-10">
        {/* Header - Enhanced Design */}
        <div className="mb-6 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h1 className="text-2xl sm:text-4xl font-bold bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent drop-shadow-lg animate-pulse" style={{ animationDuration: '3s' }}>
              Neuron Email
            </h1>
            <Button 
              onClick={() => setShowCompose(true)} 
              size="sm"
              className="gap-2 text-xs sm:text-sm h-10 sm:h-12 px-4 sm:px-6 bg-gradient-to-r from-primary via-accent to-primary hover:scale-110 transition-all duration-300 shadow-xl hover:shadow-2xl hover:shadow-primary/40 rounded-full"
            >
              <Send className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="hidden sm:inline font-semibold">Compose</span>
              <span className="sm:hidden font-semibold">New</span>
            </Button>
          </div>
          
          {currentUser && (
            <div className="glass backdrop-blur-2xl p-4 rounded-2xl border-2 border-primary/30 shadow-xl relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-accent/10 to-primary/10 animate-pulse" style={{ animationDuration: '3s' }} />
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 relative z-10">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-muted-foreground/80 mb-1">Your IE Account</p>
                  <p className="text-sm sm:text-base font-mono font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent truncate">
                    {profiles.find(p => p.id === currentUser.id)?.username || 'loading'}@sv.internal
                  </p>
                </div>
                <div className="flex items-center gap-4 text-xs font-medium">
                  <span className="glass px-3 py-1.5 rounded-full whitespace-nowrap">{profiles.length - 1} contacts</span>
                  <span className="glass px-3 py-1.5 rounded-full bg-gradient-to-r from-green-500/20 to-emerald-500/20 text-green-500 whitespace-nowrap flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                    Unique
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Filters - Enhanced Design */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2 -mx-3 px-3 scrollbar-hide">
          <Button
            variant={filter === "inbox" ? "default" : "outline"}
            onClick={() => setFilter("inbox")}
            size="sm"
            className={`gap-2 whitespace-nowrap text-xs h-10 min-w-fit px-4 rounded-full transition-all duration-300 ${
              filter === "inbox" 
                ? "bg-gradient-to-r from-primary to-accent shadow-xl scale-105" 
                : "glass hover:scale-105 hover:bg-gradient-to-r hover:from-primary/20 hover:to-accent/20"
            }`}
          >
            <Inbox className="w-4 h-4" />
            <span className="hidden sm:inline font-semibold">Inbox</span>
          </Button>
          <Button
            variant={filter === "sent" ? "default" : "outline"}
            onClick={() => setFilter("sent")}
            size="sm"
            className={`gap-2 whitespace-nowrap text-xs h-10 min-w-fit px-4 rounded-full transition-all duration-300 ${
              filter === "sent" 
                ? "bg-gradient-to-r from-primary to-accent shadow-xl scale-105" 
                : "glass hover:scale-105 hover:bg-gradient-to-r hover:from-primary/20 hover:to-accent/20"
            }`}
          >
            <Send className="w-4 h-4" />
            <span className="hidden sm:inline font-semibold">Sent</span>
          </Button>
          <Button
            variant={filter === "starred" ? "default" : "outline"}
            onClick={() => setFilter("starred")}
            size="sm"
            className={`gap-2 whitespace-nowrap text-xs h-10 min-w-fit px-4 rounded-full transition-all duration-300 ${
              filter === "starred" 
                ? "bg-gradient-to-r from-primary to-accent shadow-xl scale-105" 
                : "glass hover:scale-105 hover:bg-gradient-to-r hover:from-primary/20 hover:to-accent/20"
            }`}
          >
            <Star className="w-4 h-4" />
            <span className="hidden sm:inline font-semibold">Starred</span>
          </Button>
          <Button
            variant={filter === "archived" ? "default" : "outline"}
            onClick={() => setFilter("archived")}
            size="sm"
            className={`gap-2 whitespace-nowrap text-xs h-10 min-w-fit px-4 rounded-full transition-all duration-300 ${
              filter === "archived" 
                ? "bg-gradient-to-r from-primary to-accent shadow-xl scale-105" 
                : "glass hover:scale-105 hover:bg-gradient-to-r hover:from-primary/20 hover:to-accent/20"
            }`}
          >
            <Archive className="w-4 h-4" />
            <span className="hidden sm:inline font-semibold">Archived</span>
          </Button>
          <Button
            variant={filter === "drafts" ? "default" : "outline"}
            onClick={() => setFilter("drafts")}
            size="sm"
            className={`gap-2 whitespace-nowrap text-xs h-10 min-w-fit px-4 rounded-full transition-all duration-300 ${
              filter === "drafts" 
                ? "bg-gradient-to-r from-primary to-accent shadow-xl scale-105" 
                : "glass hover:scale-105 hover:bg-gradient-to-r hover:from-primary/20 hover:to-accent/20"
            }`}
          >
            <FileText className="w-4 h-4" />
            <span className="hidden sm:inline font-semibold">Drafts</span>
          </Button>
        </div>

        {/* Email List - Enhanced Design */}
        <div className="space-y-3">
          {emails.map((email) => (
            <div
              key={email.id}
              onClick={() => {
                setSelectedEmail(email);
                if (!email.read && email.recipient_id === currentUser?.id) {
                  markAsRead(email.id);
                }
              }}
              className={`glass backdrop-blur-2xl p-4 rounded-2xl cursor-pointer hover:bg-gradient-to-r hover:from-primary/10 hover:to-accent/10 transition-all duration-300 active:scale-[0.97] hover:scale-[1.02] shadow-lg hover:shadow-2xl relative overflow-hidden ${
                !email.read && email.recipient_id === currentUser?.id ? "border-2 border-primary shadow-primary/30" : "border border-border/20"
              }`}
            >
              {!email.read && email.recipient_id === currentUser?.id && (
                <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-accent/10 animate-pulse" />
              )}
              <div className="flex items-start gap-2.5">
                <OptimizedAvatar
                  src={filter === "sent" ? email.recipient?.avatar_url : email.sender?.avatar_url}
                  alt={filter === "sent" ? email.recipient?.username : email.sender?.username}
                  fallback={(filter === "sent" ? email.recipient?.username?.[0] : email.sender?.username?.[0]) || "U"}
                  userId={filter === "sent" ? email.recipient?.id : email.sender?.id}
                  className="w-10 h-10 sm:w-12 sm:h-12"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <p className="text-sm sm:text-base font-semibold truncate">
                        {filter === "sent" ? email.recipient?.full_name : email.sender?.full_name}
                      </p>
                      {email.starred && <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500 flex-shrink-0" />}
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap flex-shrink-0">
                      {new Date(email.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm font-medium truncate mb-0.5">{email.subject}</p>
                  <p className="text-xs text-muted-foreground truncate">{email.body}</p>
                </div>
              </div>
            </div>
          ))}
          {emails.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <Mail className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm">No emails found</p>
            </div>
          )}
        </div>
      </div>

      {/* Compose Dialog - Mobile Optimized */}
      <Dialog open={showCompose} onOpenChange={setShowCompose}>
        <DialogContent className="glass max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Mail className="w-4 h-4 sm:w-5 sm:h-5" />
              Compose Email
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 sm:space-y-4">
            <div>
              <label className="text-xs sm:text-sm font-medium mb-1.5 sm:mb-2 block">Recipient</label>
              <Select value={recipient} onValueChange={setRecipient}>
                <SelectTrigger className="h-9 sm:h-10 text-sm">
                  <SelectValue placeholder="Select follower" />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {profiles.filter(p => p.id !== currentUser?.id).map((profile) => (
                    <SelectItem key={profile.id} value={profile.id} className="text-sm">
                      <div className="flex flex-col py-1">
                        <span className="font-medium">{profile.full_name}</span>
                        <span className="text-xs font-mono text-muted-foreground">
                          {profile.internal_email}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                  {profiles.filter(p => p.id !== currentUser?.id).length === 0 && (
                    <div className="p-3 text-xs text-muted-foreground text-center">
                      No followers available
                    </div>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs sm:text-sm font-medium mb-1.5 sm:mb-2 block">Subject</label>
              <Input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Email subject"
                className="h-9 sm:h-10 text-sm"
              />
            </div>
            <div>
              <label className="text-xs sm:text-sm font-medium mb-1.5 sm:mb-2 block">Message</label>
              <Textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Write your email..."
                rows={6}
                className="text-sm resize-none"
              />
            </div>
            
            {/* AI Suggestion */}
            <Button
              variant="outline"
              onClick={generateAiSuggestion}
              disabled={isGenerating}
              size="sm"
              className="w-full gap-1.5 sm:gap-2 h-9 text-xs sm:text-sm"
            >
              <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              {isGenerating ? "Generating..." : "AI Suggestion"}
            </Button>
            
            {aiSuggestion && (
              <div className="glass p-3 rounded-xl border border-primary/20">
                <p className="text-xs font-medium mb-2 text-primary">AI Suggestion:</p>
                <p className="text-xs leading-relaxed select-text whitespace-pre-wrap break-words">
                  {aiSuggestion}
                </p>
                <div className="flex gap-2 mt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setBody(aiSuggestion)}
                    className="h-8 text-xs flex-1"
                  >
                    Use This
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyToClipboard(aiSuggestion)}
                    className="h-8 text-xs flex items-center gap-1"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Copy</span>
                  </Button>
                </div>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <Button onClick={sendEmail} className="flex-1 gap-1.5 h-9 sm:h-10 text-sm">
                <Send className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                Send
              </Button>
              <Button 
                variant="outline" 
                onClick={saveDraft}
                className="gap-1.5 h-9 sm:h-10 text-sm"
              >
                <Save className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">Draft</span>
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setShowCompose(false)}
                className="h-9 sm:h-10 text-sm px-3"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Email Dialog - Mobile Optimized */}
      <Dialog open={!!selectedEmail} onOpenChange={() => setSelectedEmail(null)}>
        <DialogContent className="glass max-w-2xl max-h-[85vh] overflow-y-auto">
          {selectedEmail && (
            <>
              <DialogHeader>
                <div className="flex items-start gap-2.5">
                  <OptimizedAvatar
                    src={filter === "sent" ? selectedEmail.recipient?.avatar_url : selectedEmail.sender?.avatar_url}
                    alt={filter === "sent" ? selectedEmail.recipient?.username : selectedEmail.sender?.username}
                    fallback={(filter === "sent" ? selectedEmail.recipient?.username?.[0] : selectedEmail.sender?.username?.[0]) || "U"}
                    userId={filter === "sent" ? selectedEmail.recipient?.id : selectedEmail.sender?.id}
                    className="w-9 h-9 sm:w-10 sm:h-10"
                  />
                  <div className="flex-1 min-w-0">
                    <DialogTitle className="text-sm sm:text-base leading-tight">{selectedEmail.subject}</DialogTitle>
                    <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                      From: {selectedEmail.sender?.full_name}
                    </p>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => toggleStar(selectedEmail.id, selectedEmail.starred)}
                      className="h-8 w-8"
                    >
                      <Star className={`w-3.5 h-3.5 ${selectedEmail.starred ? "fill-yellow-500 text-yellow-500" : ""}`} />
                    </Button>
                    {filter === "inbox" && (
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => toggleArchive(selectedEmail.id, selectedEmail.archived)}
                        className="h-8 w-8"
                      >
                        <Archive className="w-3.5 h-3.5" />
                      </Button>
                    )}
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => deleteEmail(selectedEmail.id)}
                      className="h-8 w-8"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </DialogHeader>
              <div className="mt-3 sm:mt-4">
                <p className="text-xs sm:text-sm whitespace-pre-wrap leading-relaxed">{selectedEmail.body}</p>
                <p className="text-xs text-muted-foreground mt-3 sm:mt-4">
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
