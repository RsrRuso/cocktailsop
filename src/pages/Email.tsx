import { useState, useEffect, memo, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Mail, Send, Star, Archive, Inbox, Trash2, FileText } from "lucide-react";
import TopNav from "@/components/TopNav";
import BottomNav from "@/components/BottomNav";

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

// Ultra-fast localStorage cache
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

// Super lightweight email item
const EmailItem = memo(({ email, isSent, isUnread, onClick }: { email: EmailType; isSent: boolean; isUnread: boolean; onClick: () => void }) => (
  <div onClick={onClick} className={`flex items-center gap-3 p-3 cursor-pointer hover:bg-muted/50 border-b border-border/20 ${isUnread ? "bg-muted/30" : ""}`}>
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
    {email.starred && <Star className="w-4 h-4 fill-foreground shrink-0" strokeWidth={1.5} />}
  </div>
));
EmailItem.displayName = "EmailItem";

// Profile cache
let profileCache: Map<string, Profile> = new Map(CACHE.get("profiles") || []);
const saveProfileCache = () => CACHE.set("profiles", [...profileCache]);

const Email = () => {
  const navigate = useNavigate();
  const [userId] = useState<string | null>(() => CACHE.get("uid"));
  const [emails, setEmails] = useState<EmailType[]>(() => CACHE.get("inbox") || []);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [filter, setFilter] = useState<"inbox" | "sent" | "starred" | "archived" | "drafts">("inbox");
  const [showCompose, setShowCompose] = useState(false);
  const [selectedEmail, setSelectedEmail] = useState<EmailType | null>(null);
  const [recipient, setRecipient] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [username, setUsername] = useState(() => CACHE.get("username") || "");
  const [uid, setUid] = useState<string | null>(userId);

  // Instant init - check auth and prefetch everything
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { navigate("/auth"); return; }
      setUid(user.id);
      CACHE.set("uid", user.id);

      // Load user profile
      supabase.from("profiles").select("id, username, full_name, avatar_url").eq("id", user.id).single().then(({ data }) => {
        if (data) {
          setUsername(data.username);
          CACHE.set("username", data.username);
          profileCache.set(data.id, data);
          saveProfileCache();
        }
      });

      // Load followers for compose
      supabase.from("follows").select("follower_id").eq("following_id", user.id).then(({ data }) => {
        if (data?.length) {
          supabase.from("profiles").select("id, username, full_name, avatar_url").in("id", data.map(f => f.follower_id)).then(({ data: pData }) => {
            if (pData) {
              setProfiles(pData);
              pData.forEach(p => profileCache.set(p.id, p));
              saveProfileCache();
            }
          });
        }
      });

      // Prefetch all tabs in background
      ["inbox", "sent", "starred", "archived", "drafts"].forEach(f => fetchEmails(user.id, f as any, f === "inbox"));
    });
  }, [navigate]);

  // Filter change - instant from cache
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

    // Batch fetch missing profiles
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
    await supabase.from("internal_emails").insert({ sender_id: uid, recipient_id: recipient, subject, body, is_draft: false });
    toast.success("Sent!");
    setShowCompose(false);
    setRecipient(""); setSubject(""); setBody("");
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
            <EmailItem key={email.id} email={email} isSent={filter === "sent"} isUnread={!email.read && email.recipient_id === uid} onClick={() => { setSelectedEmail(email); if (!email.read && email.recipient_id === uid) markRead(email.id); }} />
          )) : (
            <div className="text-center py-16 text-muted-foreground">
              <Mail className="w-10 h-10 mx-auto mb-2 opacity-50" strokeWidth={1} />
              <p className="text-sm">No emails</p>
            </div>
          )}
        </div>
      </div>

      <Dialog open={showCompose} onOpenChange={setShowCompose}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="text-base">New Message</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Select value={recipient} onValueChange={setRecipient}>
              <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="To" /></SelectTrigger>
              <SelectContent>{profiles.filter(p => p.id !== uid).map(p => (<SelectItem key={p.id} value={p.id} className="text-sm">{p.full_name}</SelectItem>))}</SelectContent>
            </Select>
            <Input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Subject" className="h-9 text-sm" />
            <Textarea value={body} onChange={e => setBody(e.target.value)} placeholder="Message" rows={4} className="text-sm resize-none" />
            <div className="flex justify-end"><Button onClick={sendEmail} size="sm" className="h-8 px-4 rounded-full">Send</Button></div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedEmail} onOpenChange={() => setSelectedEmail(null)}>
        <DialogContent className="max-w-md">
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
