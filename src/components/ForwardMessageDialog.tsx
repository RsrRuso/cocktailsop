import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Send, Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import OptimizedAvatar from './OptimizedAvatar';
import { useToast } from '@/hooks/use-toast';
import { Message } from '@/hooks/useMessageThread';

interface Contact {
  id: string;
  username: string;
  full_name: string;
  avatar_url: string | null;
  conversationId?: string;
}

interface ForwardMessageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  message: Message | null;
  currentUserId: string;
}

export const ForwardMessageDialog = ({
  open,
  onOpenChange,
  message,
  currentUserId,
}: ForwardMessageDialogProps) => {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedContacts, setSelectedContacts] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      fetchContacts();
      setSelectedContacts(new Set());
      setSearchQuery('');
    }
  }, [open]);

  const fetchContacts = async () => {
    setIsLoading(true);
    try {
      // Get all conversations
      const { data: conversations } = await supabase
        .from('conversations')
        .select('*')
        .contains('participant_ids', [currentUserId])
        .order('last_message_at', { ascending: false });

      if (conversations) {
        // Get other user IDs
        const otherUserIds = conversations
          .map(conv => conv.participant_ids.find((id: string) => id !== currentUserId))
          .filter(Boolean);

        // Fetch profiles
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, username, full_name, avatar_url')
          .in('id', otherUserIds);

        if (profiles) {
          // Map conversations to contacts
          const contactsWithConvId = profiles.map(profile => {
            const conv = conversations.find(c => 
              c.participant_ids.includes(profile.id)
            );
            return {
              ...profile,
              conversationId: conv?.id,
            };
          });
          setContacts(contactsWithConvId);
        }
      }
    } catch (error) {
      console.error('Error fetching contacts:', error);
      toast({
        title: 'Error',
        description: 'Failed to load contacts',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const toggleContact = (contactId: string) => {
    setSelectedContacts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(contactId)) {
        newSet.delete(contactId);
      } else {
        newSet.add(contactId);
      }
      return newSet;
    });
  };

  const handleForward = async () => {
    if (!message || selectedContacts.size === 0) return;

    setIsSending(true);
    try {
      const forwardedMessages = [];

      for (const contactId of selectedContacts) {
        const contact = contacts.find(c => c.id === contactId);
        let conversationId = contact?.conversationId;

        // Create conversation if it doesn't exist
        if (!conversationId) {
          const { data: newConv, error: convError } = await supabase
            .from('conversations')
            .insert({
              participant_ids: [currentUserId, contactId],
              last_message_at: new Date().toISOString(),
            })
            .select()
            .single();

          if (convError) throw convError;
          conversationId = newConv.id;
        }

        // Create forwarded message
        const messageData: any = {
          conversation_id: conversationId,
          sender_id: currentUserId,
          content: message.content,
          delivered: false,
          read: false,
          forwarded: true,
        };

        // Copy media if present
        if (message.media_url) {
          messageData.media_url = message.media_url;
          messageData.media_type = message.media_type;
        }

        const { error: msgError } = await supabase
          .from('messages')
          .insert(messageData);

        if (msgError) throw msgError;

        // Update conversation timestamp
        await supabase
          .from('conversations')
          .update({ last_message_at: new Date().toISOString() })
          .eq('id', conversationId);

        forwardedMessages.push(contactId);
      }

      toast({
        title: 'Message forwarded',
        description: `Sent to ${forwardedMessages.length} contact${forwardedMessages.length > 1 ? 's' : ''}`,
      });

      onOpenChange(false);
    } catch (error) {
      console.error('Error forwarding message:', error);
      toast({
        title: 'Error',
        description: 'Failed to forward message',
        variant: 'destructive',
      });
    } finally {
      setIsSending(false);
    }
  };

  const filteredContacts = contacts.filter(contact =>
    contact.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    contact.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass backdrop-blur-xl border-primary/20 max-w-md max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Forward Message
          </DialogTitle>
        </DialogHeader>

        {/* Preview of message being forwarded */}
        {message && (
          <div className="glass rounded-xl p-3 mb-4 border border-border/50">
            <p className="text-xs text-muted-foreground mb-1">Forwarding:</p>
            {message.media_type && (
              <p className="text-sm font-medium mb-1">
                📎 {message.media_type === 'image' ? 'Photo' : 
                     message.media_type === 'video' ? 'Video' : 
                     message.media_type === 'voice' ? 'Voice message' : 'File'}
              </p>
            )}
            <p className="text-sm line-clamp-2">{message.content}</p>
          </div>
        )}

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search contacts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 glass border-border/50"
          />
        </div>

        {/* Selected count */}
        {selectedContacts.size > 0 && (
          <div className="glass rounded-lg px-3 py-2 mb-2 flex items-center justify-between">
            <p className="text-sm text-primary font-medium">
              {selectedContacts.size} contact{selectedContacts.size > 1 ? 's' : ''} selected
            </p>
            <Button
              size="sm"
              onClick={() => setSelectedContacts(new Set())}
              variant="ghost"
              className="h-7 text-xs"
            >
              Clear
            </Button>
          </div>
        )}

        {/* Contacts list */}
        <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar pr-2">
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="glass rounded-xl p-3 flex items-center gap-3 animate-pulse">
                <div className="w-12 h-12 rounded-full bg-muted" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-32 bg-muted rounded" />
                  <div className="h-3 w-24 bg-muted rounded" />
                </div>
              </div>
            ))
          ) : filteredContacts.length === 0 ? (
            <div className="glass rounded-xl p-8 text-center">
              <p className="text-muted-foreground">No contacts found</p>
            </div>
          ) : (
            filteredContacts.map(contact => {
              const isSelected = selectedContacts.has(contact.id);
              return (
                <button
                  key={contact.id}
                  onClick={() => toggleContact(contact.id)}
                  className={`w-full glass-hover rounded-xl p-3 flex items-center gap-3 transition-all duration-200 ${
                    isSelected ? 'ring-2 ring-primary glow-primary' : ''
                  }`}
                >
                  <OptimizedAvatar
                    src={contact.avatar_url}
                    alt={contact.username}
                    fallback={contact.username[0]?.toUpperCase()}
                    userId={contact.id}
                    className="w-12 h-12"
                  />
                  <div className="flex-1 text-left min-w-0">
                    <p className="font-semibold truncate">{contact.full_name}</p>
                    <p className="text-sm text-muted-foreground truncate">
                      @{contact.username}
                    </p>
                  </div>
                  {isSelected && (
                    <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center shrink-0">
                      <Check className="w-4 h-4 text-primary-foreground" />
                    </div>
                  )}
                </button>
              );
            })
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-4 border-t border-border/50">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="flex-1 glass"
            disabled={isSending}
          >
            Cancel
          </Button>
          <Button
            onClick={handleForward}
            className="flex-1 bg-primary hover:bg-primary/90"
            disabled={selectedContacts.size === 0 || isSending}
          >
            {isSending ? (
              <>Sending...</>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Forward
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
