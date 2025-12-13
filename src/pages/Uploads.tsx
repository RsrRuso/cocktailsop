import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  ArrowLeft, Pause, Play, RotateCcw, X, Upload, 
  CheckCircle, AlertCircle, Loader2, Film
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import BottomNav from '@/components/BottomNav';

interface UploadSession {
  id: string;
  file_name: string;
  file_size: number;
  status: string;
  total_chunks: number;
  uploaded_chunks: number;
  priority: number;
  error_message: string | null;
  created_at: string;
}

const statusConfig: Record<string, { icon: React.ElementType; color: string }> = {
  active: { icon: Upload, color: 'text-blue-500' },
  paused: { icon: Pause, color: 'text-yellow-500' },
  completed: { icon: CheckCircle, color: 'text-green-500' },
  failed: { icon: AlertCircle, color: 'text-red-500' },
  cancelled: { icon: X, color: 'text-muted-foreground' },
};

export default function Uploads() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [sessions, setSessions] = useState<UploadSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    loadSessions();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('upload_sessions')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'upload_sessions', filter: `user_id=eq.${user.id}` },
        () => loadSessions()
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const loadSessions = async () => {
    const { data, error } = await supabase
      .from('upload_sessions')
      .select('*')
      .eq('user_id', user?.id)
      .order('created_at', { ascending: false });

    if (!error) {
      setSessions(data || []);
    }
    setLoading(false);
  };

  const pauseSession = async (id: string) => {
    await supabase
      .from('upload_sessions')
      .update({ status: 'paused' })
      .eq('id', id);
    toast.success('Upload paused');
  };

  const resumeSession = async (id: string) => {
    await supabase
      .from('upload_sessions')
      .update({ status: 'active' })
      .eq('id', id);
    toast.success('Upload resumed');
    // In real implementation, this would trigger the upload worker
  };

  const retrySession = async (id: string) => {
    await supabase
      .from('upload_sessions')
      .update({ status: 'active', error_message: null })
      .eq('id', id);
    toast.success('Retrying upload');
  };

  const cancelSession = async (id: string) => {
    await supabase
      .from('upload_sessions')
      .update({ status: 'cancelled' })
      .eq('id', id);
    toast.success('Upload cancelled');
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/40">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/create')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-xl font-bold">Upload Queue</h1>
          </div>
        </div>
      </header>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-3">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : sessions.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Upload className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No uploads</p>
              <p className="text-sm">Your upload queue is empty</p>
            </div>
          ) : (
            sessions.map((session) => {
              const progress = session.total_chunks > 0 
                ? (session.uploaded_chunks / session.total_chunks) * 100 
                : 0;
              const status = statusConfig[session.status] || statusConfig.active;
              const StatusIcon = status.icon;

              return (
                <div 
                  key={session.id}
                  className="p-4 bg-card rounded-xl border border-border/40"
                >
                  <div className="flex items-start gap-3">
                    {/* Icon */}
                    <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                      <Film className="w-6 h-6 text-muted-foreground" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-medium truncate">{session.file_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatFileSize(session.file_size)} • {session.uploaded_chunks}/{session.total_chunks} chunks
                          </p>
                        </div>
                        
                        <Badge variant="secondary" className={status.color}>
                          <StatusIcon className={`w-3 h-3 mr-1 ${session.status === 'active' ? 'animate-pulse' : ''}`} />
                          {session.status}
                        </Badge>
                      </div>

                      {/* Progress */}
                      {session.status === 'active' && (
                        <div className="mt-3">
                          <Progress value={progress} className="h-2" />
                          <p className="text-xs text-muted-foreground mt-1">
                            {progress.toFixed(0)}% complete
                          </p>
                        </div>
                      )}

                      {/* Error Message */}
                      {session.error_message && (
                        <p className="text-xs text-red-500 mt-2">{session.error_message}</p>
                      )}

                      {/* Actions */}
                      <div className="flex items-center gap-2 mt-3">
                        {session.status === 'active' && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => pauseSession(session.id)}
                          >
                            <Pause className="w-4 h-4 mr-1" />
                            Pause
                          </Button>
                        )}
                        
                        {session.status === 'paused' && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => resumeSession(session.id)}
                          >
                            <Play className="w-4 h-4 mr-1" />
                            Resume
                          </Button>
                        )}

                        {session.status === 'failed' && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => retrySession(session.id)}
                          >
                            <RotateCcw className="w-4 h-4 mr-1" />
                            Retry
                          </Button>
                        )}

                        {['active', 'paused'].includes(session.status) && (
                          <Button 
                            variant="ghost" 
                            size="sm"
                            className="text-muted-foreground"
                            onClick={() => cancelSession(session.id)}
                          >
                            <X className="w-4 h-4 mr-1" />
                            Cancel
                          </Button>
                        )}

                        <span className="text-xs text-muted-foreground ml-auto">
                          {formatDistanceToNow(new Date(session.created_at), { addSuffix: true })}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </ScrollArea>

      <BottomNav />
    </div>
  );
}
