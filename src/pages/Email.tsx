import { useState, useEffect, memo, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Mail, Send, Star, Archive, Inbox, Trash2, FileText, Search, X, Check } from "lucide-react";
import TopNav from "@/components/TopNav";
import BottomNav from "@/components/BottomNav";
import OptimizedAvatar from "@/components/OptimizedAvatar";

interface EmailType {
  id: string;
  sender_id: string;
  recipient_id: string;
  subject: string;
  body: string;
  read: boolean;
  starred: boolean;
  archived: boolean;
  created_at: string;
  sender_name?: string;
  recipient_name?: string;
}

interface Profile {
  id: string;
  username: string;
  full_name: string;
  avatar_url: string;
}

const CACHE = {
  get: (key: string) => { try { return JSON.parse(localStorage.getItem(`em_${key}`) || "null"); } catch { return null; } },
  set: (key: string, val: any) => { try { localStorage.setItem(`em_${key}`, JSON.stringify(val)); } catch {} },
};

const decodeHtml = (html: string): string => {
  const txt = document.createElement('textarea');
  txt.innerHTML = html;
  return txt.value;
};

const stripHtml = (html: string): string => decodeHtml(html).replace(/<[^>]*>/g, '').trim();

const EmailItem = memo(({ email, isSent, isUnread, onClick, onDelete }: { email: EmailType; isSent: boolean; isUnread: boolean; onClick: () => void; onDelete: (id: string) => void }) => {
  const [showDelete, setShowDelete] = useState(false);
  
  return (
    <div className="relative group">
      <div 
        onClick={onClick} 
        onContextMenu={(e) => { e.preventDefault(); setShowDelete(true); }}
        className={`flex items-center gap-3 p-3 cursor-pointer hover:bg-muted/50 border-b border-border/20 ${isUnread ? "bg-muted/30" : ""}`}
      >
        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-sm font-medium shrink-0">
          {(isSent ? email.recipient_name?.[0] : email.sender_name?.[0]) || "?"}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className={`text-sm truncate ${isUnread ? "font-semibold" : ""}`}>{isSent ? email.recipient_name : email.sender_name}</span>
            <span className="text-xs text-muted-foreground shrink-0">{new Date(email.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
          </div>
          <p className={`text-sm truncate ${isUnread ? "text-foreground" : "text-muted-foreground"}`}>{email.subject}</p>
          <p className="text-xs text-muted-foreground truncate">{stripHtml(email.body).slice(0, 50)}</p>
        </div>
        <div className="flex items-center gap-1">
          {email.starred && <Star className="w-4 h-4 fill-foreground shrink-0" strokeWidth={1.5} />}
          <button
            onClick={(e) => { e.stopPropagation(); setShowDelete(true); }}
            className="p-1 rounded-full text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <Trash2 className="w-4 h-4" strokeWidth={1.5} />
          </button>
        </div>
      </div>
      {showDelete && (
        <div className="absolute inset-0 bg-destructive/10 backdrop-blur-sm flex items-center justify-center gap-2 z-10">
          <button onClick={() => { onDelete(email.id); setShowDelete(false); }} className="px-3 py-1.5 bg-destructive text-destructive-foreground rounded-lg text-sm font-medium flex items-center gap-1">
            <Trash2 className="w-4 h-4" />Delete
          </button>
          <button onClick={() => setShowDelete(false)} className="px-3 py-1.5 bg-muted text-foreground rounded-lg text-sm font-medium">Cancel</button>
        </div>
      )}
    </div>
  );
});
EmailItem.displayName = "EmailItem";

let profileCache: Map<string, Profile> = new Map(CACHE.get("profiles") || []);
const saveProfileCache = () => CACHE.set("profiles", [...profileCache]);

const Email = () => {
  const [userId] = useState<string | null>(() => CACHE.get("uid"));
  const [emails, setEmails] = useState<EmailType[]>(() => CACHE.get("inbox") || []);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [filter, setFilter] = useState<"inbox" | "sent" | "starred" | "archived" | "drafts">("inbox");
  const [showCompose, setShowCompose] = useState(false);
  const [selectedEmail, setSelectedEmail] = useState<EmailType | null>(null);
  const [recipient, setRecipient] = useState<Profile | null>(null);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [username, setUsername] = useState(() => CACHE.get("username") || "");
  const [uid, setUid] = useState<string | null>(userId);
  const [searchQuery, setSearchQuery] = useState("");
  const [showRecipientPicker, setShowRecipientPicker] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { window.location.href = "/auth"; return; }
      setUid(user.id);
      CACHE.set("uid", user.id);

      supabase.from("profiles").select("id, username, full_name, avatar_url").eq("id", user.id).single().then(({ data }) => {
        if (data) {
          setUsername(data.username);
          CACHE.set("username", data.username);
          profileCache.set(data.id, data);
          saveProfileCache();
        }
      });

      // Load BOTH followers AND following
      Promise.all([
        supabase.from("follows").select("follower_id").eq("following_id", user.id),
        supabase.from("follows").select("following_id").eq("follower_id", user.id)
      ]).then(([followersRes, followingRes]) => {
        const followerIds = followersRes.data?.map(f => f.follower_id) || [];
        const followingIds = followingRes.data?.map(f => f.following_id) || [];
        const allIds = [...new Set([...followerIds, ...followingIds])].filter(id => id !== user.id);
        
        if (allIds.length) {
          supabase.from("profiles").select("id, username, full_name, avatar_url").in("id", allIds).then(({ data: pData }) => {
            if (pData) {
              setProfiles(pData);
              pData.forEach(p => profileCache.set(p.id, p));
              saveProfileCache();
            }
          });
        }
      });

      ["inbox", "sent", "starred", "archived", "drafts"].forEach(f => fetchEmails(user.id, f as any, f === "inbox"));
    });
  }, []);

  useEffect(() => {
    const cached = CACHE.get(filter);
    if (cached?.length) setEmails(cached);
    if (uid) fetchEmails(uid, filter, true);
  }, [filter, uid]);

  const fetchEmails = async (id: string, f: string, updateState = false) => {
    let query = supabase.from("internal_emails").select("*").order("created_at", { ascending: false }).limit(25);

    if (f === "inbox") query = query.eq("recipient_id", id).eq("archived", false).eq("is_draft", false);
    else if (f === "sent") query = query.eq("sender_id", id).eq("is_draft", false);
    else if (f === "starred") query = query.or(`sender_id.eq.${id},recipient_id.eq.${id}`).eq("starred", true).eq("is_draft", false);
    else if (f === "archived") query = query.eq("recipient_id", id).eq("archived", true).eq("is_draft", false);
    else if (f === "drafts") query = query.eq("sender_id", id).eq("is_draft", true);

    const { data } = await query;
    if (!data) return;

    const ids = [...new Set([...data.map(e => e.sender_id), ...data.map(e => e.recipient_id)])];
    const missing = ids.filter(i => !profileCache.has(i));
    if (missing.length) {
      const { data: pData } = await supabase.from("profiles").select("id, username, full_name, avatar_url").in("id", missing);
      pData?.forEach(p => profileCache.set(p.id, p));
      saveProfileCache();
    }

    const enriched = data.map(e => ({
      ...e,
      sender_name: profileCache.get(e.sender_id)?.full_name || "Unknown",
      recipient_name: profileCache.get(e.recipient_id)?.full_name || "Unknown",
    }));

    CACHE.set(f, enriched);
    if (updateState) setEmails(enriched);
  };

  const sendEmail = async () => {
    if (!recipient || !subject || !body || !uid) return toast.error("Fill all fields");
    await supabase.from("internal_emails").insert({ sender_id: uid, recipient_id: recipient.id, subject, body, is_draft: false });
    toast.success("Sent!");
    setShowCompose(false);
    setRecipient(null); setSubject(""); setBody("");
    fetchEmails(uid, filter, true);
  };

  const toggleStar = async (id: string, starred: boolean) => {
    await supabase.from("internal_emails").update({ starred: !starred }).eq("id", id);
    if (uid) fetchEmails(uid, filter, true);
  };

  const toggleArchive = async (id: string, archived: boolean) => {
    await supabase.from("internal_emails").update({ archived: !archived }).eq("id", id);
    setSelectedEmail(null);
    if (uid) fetchEmails(uid, filter, true);
  };

  const markRead = async (id: string) => {
    await supabase.from("internal_emails").update({ read: true }).eq("id", id);
  };

  const deleteEmail = async (id: string) => {
    await supabase.from("internal_emails").delete().eq("id", id);
    setSelectedEmail(null);
    toast.success("Deleted");
    if (uid) fetchEmails(uid, filter, true);
  };

  const filteredProfiles = useMemo(() => {
    if (!searchQuery) return profiles;
    const q = searchQuery.toLowerCase();
    return profiles.filter(p => 
      p.full_name?.toLowerCase().includes(q) || 
      p.username?.toLowerCase().includes(q)
    );
  }, [profiles, searchQuery]);

  const tabs = useMemo(() => [
    { id: "inbox", icon: Inbox, label: "Inbox" },
    { id: "sent", icon: Send, label: "Sent" },
    { id: "starred", icon: Star, label: "Starred" },
    { id: "archived", icon: Archive, label: "Archived" },
    { id: "drafts", icon: FileText, label: "Drafts" },
  ] as const, []);

  return (
    <div className="min-h-screen bg-background">
      <TopNav isVisible={true} />
      <div className="max-w-2xl mx-auto px-3 pt-14 pb-20">
        <div className="flex items-center justify-between py-3 border-b border-border/30">
          <div>
            <h1 className="text-lg font-semibold">Neuron Email</h1>
            {username && <p className="text-xs text-muted-foreground">{username}@sv.internal</p>}
          </div>
          <button onClick={() => setShowCompose(true)} className="p-2"><Send className="w-5 h-5" strokeWidth={1.5} /></button>
        </div>

        <div className="flex border-b border-border/30 overflow-x-auto scrollbar-hide">
          {tabs.map(({ id, icon: Icon, label }) => (
            <button key={id} onClick={() => setFilter(id)} className={`flex items-center gap-1.5 px-3 py-2.5 text-sm border-b-2 whitespace-nowrap ${filter === id ? "border-foreground text-foreground" : "border-transparent text-muted-foreground"}`}>
              <Icon className="w-4 h-4" strokeWidth={1.5} />
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>

        <div>
          {emails.length > 0 ? emails.map(email => (
            <EmailItem key={email.id} email={email} isSent={filter === "sent"} isUnread={!email.read && email.recipient_id === uid} onClick={() => { setSelectedEmail(email); if (!email.read && email.recipient_id === uid) markRead(email.id); }} onDelete={deleteEmail} />
          )) : (
            <div className="text-center py-16 text-muted-foreground">
              <Mail className="w-10 h-10 mx-auto mb-2 opacity-50" strokeWidth={1} />
              <p className="text-sm">No emails</p>
            </div>
          )}
        </div>
      </div>

      {/* Full-screen mobile compose sheet */}
      <Sheet open={showCompose} onOpenChange={setShowCompose}>
        <SheetContent side="bottom" className="h-[100dvh] p-0 rounded-t-none">
          <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border/30">
              <button onClick={() => setShowCompose(false)} className="text-muted-foreground">
                <X className="w-6 h-6" />
              </button>
              <SheetTitle className="text-base font-semibold">New Message</SheetTitle>
              <Button onClick={sendEmail} size="sm" className="h-8 px-4 rounded-full" disabled={!recipient || !subject || !body}>
                <Send className="w-4 h-4" />
              </Button>
            </div>

            {/* Compose form */}
            <div className="flex-1 overflow-y-auto">
              {/* To field */}
              <div 
                className="flex items-center gap-3 px-4 py-3 border-b border-border/20 cursor-pointer"
                onClick={() => setShowRecipientPicker(true)}
              >
                <span className="text-muted-foreground text-sm w-12">To</span>
                {recipient ? (
                  <div className="flex items-center gap-2 flex-1">
                    <OptimizedAvatar src={recipient.avatar_url} alt={recipient.username} fallback={recipient.full_name?.[0]} className="w-6 h-6" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{recipient.full_name}</p>
                      <p className="text-xs text-muted-foreground truncate">{recipient.username}@sv.internal</p>
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); setRecipient(null); }} className="p-1">
                      <X className="w-4 h-4 text-muted-foreground" />
                    </button>
                  </div>
                ) : (
                  <span className="text-muted-foreground text-sm">Select recipient</span>
                )}
              </div>

              {/* Subject */}
              <div className="px-4 py-3 border-b border-border/20">
                <Input 
                  value={subject} 
                  onChange={e => setSubject(e.target.value)} 
                  placeholder="Subject" 
                  className="border-0 p-0 h-auto text-base focus-visible:ring-0 bg-transparent"
                />
              </div>

              {/* Message body */}
              <div className="px-4 py-3 flex-1">
                <Textarea 
                  value={body} 
                  onChange={e => setBody(e.target.value)} 
                  placeholder="Message" 
                  className="border-0 p-0 min-h-[200px] text-base focus-visible:ring-0 bg-transparent resize-none"
                />
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Recipient picker sheet */}
      <Sheet open={showRecipientPicker} onOpenChange={setShowRecipientPicker}>
        <SheetContent side="bottom" className="h-[85dvh] p-0 rounded-t-2xl">
          <div className="flex flex-col h-full">
            <div className="p-4 border-b border-border/30">
              <SheetTitle className="text-base font-semibold mb-3">Select Recipient</SheetTitle>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input 
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search followers & following"
                  className="pl-9 h-10 rounded-xl bg-muted/50 border-0"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {filteredProfiles.length > 0 ? filteredProfiles.map(p => (
                <div 
                  key={p.id}
                  className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-muted/50 active:bg-muted"
                  onClick={() => { setRecipient(p); setShowRecipientPicker(false); setSearchQuery(""); }}
                >
                  <OptimizedAvatar src={p.avatar_url} alt={p.username} fallback={p.full_name?.[0]} className="w-11 h-11" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{p.full_name}</p>
                    <p className="text-xs text-muted-foreground truncate">{p.username}@sv.internal</p>
                  </div>
                  {recipient?.id === p.id && <Check className="w-5 h-5 text-primary" />}
                </div>
              )) : (
                <div className="text-center py-12 text-muted-foreground">
                  <p className="text-sm">No contacts found</p>
                  <p className="text-xs mt-1">Follow users to email them</p>
                </div>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Email detail dialog */}
      <Dialog open={!!selectedEmail} onOpenChange={() => setSelectedEmail(null)}>
        <DialogContent className="max-w-md max-h-[85dvh] overflow-y-auto">
          {selectedEmail && (
            <>
              <DialogHeader>
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-sm font-medium">{selectedEmail.sender_name?.[0] || "?"}</div>
                  <div className="flex-1 min-w-0">
                    <DialogTitle className="text-sm font-semibold">{selectedEmail.subject}</DialogTitle>
                    <p className="text-xs text-muted-foreground">{selectedEmail.sender_name}</p>
                  </div>
                </div>
              </DialogHeader>
              <div className="flex gap-3 py-2 border-b border-border/30">
                <button onClick={() => toggleStar(selectedEmail.id, selectedEmail.starred)}><Star className={`w-5 h-5 ${selectedEmail.starred ? "fill-foreground" : ""}`} strokeWidth={1.5} /></button>
                {filter === "inbox" && <button onClick={() => toggleArchive(selectedEmail.id, selectedEmail.archived)}><Archive className="w-5 h-5" strokeWidth={1.5} /></button>}
                <button onClick={() => deleteEmail(selectedEmail.id)}><Trash2 className="w-5 h-5" strokeWidth={1.5} /></button>
              </div>
              <div className="py-3">
                <div className="text-sm leading-relaxed [&_h2]:text-base [&_h2]:font-semibold [&_h2]:mb-2 [&_p]:mb-2" dangerouslySetInnerHTML={{ __html: decodeHtml(selectedEmail.body) }} />
                <p className="text-xs text-muted-foreground mt-3">{new Date(selectedEmail.created_at).toLocaleString()}</p>
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
