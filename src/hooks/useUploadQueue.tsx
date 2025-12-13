import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface UploadItem {
  id: string;
  file: File;
  draftId: string;
  progress: number;
  status: 'queued' | 'uploading' | 'paused' | 'processing' | 'completed' | 'failed';
  error?: string;
  sessionId?: string;
  priority: number;
  startTime?: number;
  thumbnail?: string;
}

const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB chunks

export function useUploadQueue() {
  const { user } = useAuth();
  const [queue, setQueue] = useState<UploadItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const abortControllers = useRef<Map<string, AbortController>>(new Map());

  // Load persisted queue from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('upload_queue');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Restore queue items (files can't be restored, so mark as failed)
        const restored = parsed.map((item: any) => ({
          ...item,
          status: item.status === 'completed' ? 'completed' : 'failed',
          error: item.status !== 'completed' ? 'Session interrupted' : undefined,
        }));
        setQueue(restored);
      } catch (e) {
        console.error('Failed to restore upload queue');
      }
    }
  }, []);

  // Persist queue to localStorage
  useEffect(() => {
    const toSave = queue.map(({ file, ...rest }) => rest);
    localStorage.setItem('upload_queue', JSON.stringify(toSave));
  }, [queue]);

  // Generate thumbnail for video
  const generateThumbnail = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      if (!file.type.startsWith('video/')) {
        if (file.type.startsWith('image/')) {
          resolve(URL.createObjectURL(file));
        } else {
          resolve('');
        }
        return;
      }

      const video = document.createElement('video');
      video.preload = 'metadata';
      video.src = URL.createObjectURL(file);
      
      video.onloadeddata = () => {
        video.currentTime = 1;
      };
      
      video.onseeked = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 120;
        canvas.height = 120;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0, 120, 120);
          resolve(canvas.toDataURL('image/jpeg', 0.7));
        } else {
          resolve('');
        }
        URL.revokeObjectURL(video.src);
      };
    });
  };

  // Add file to queue
  const addToQueue = useCallback(async (file: File, draftId: string, priority = 5) => {
    const id = crypto.randomUUID();
    const thumbnail = await generateThumbnail(file);

    const newItem: UploadItem = {
      id,
      file,
      draftId,
      progress: 0,
      status: 'queued',
      priority,
      thumbnail,
    };

    setQueue(prev => [...prev, newItem].sort((a, b) => b.priority - a.priority));
    
    // Start processing if not already
    if (!isProcessing) {
      processQueue();
    }

    return id;
  }, [isProcessing]);

  // Process queue
  const processQueue = useCallback(async () => {
    setIsProcessing(true);

    while (true) {
      const nextItem = queue.find(item => item.status === 'queued');
      if (!nextItem) break;

      await uploadFile(nextItem);
    }

    setIsProcessing(false);
  }, [queue]);

  // Upload single file with chunking
  const uploadFile = async (item: UploadItem) => {
    if (!user) return;

    const controller = new AbortController();
    abortControllers.current.set(item.id, controller);

    updateItem(item.id, { status: 'uploading', startTime: Date.now() });

    try {
      // Create upload session
      const { data: session, error: sessionError } = await supabase
        .from('upload_sessions')
        .insert({
          user_id: user.id,
          draft_id: item.draftId,
          file_name: item.file.name,
          file_size: item.file.size,
          file_type: item.file.type,
          chunk_size: CHUNK_SIZE,
          total_chunks: Math.ceil(item.file.size / CHUNK_SIZE),
          status: 'uploading',
        })
        .select()
        .single();

      if (sessionError) throw sessionError;

      updateItem(item.id, { sessionId: session.id });

      // Upload chunks
      const totalChunks = Math.ceil(item.file.size / CHUNK_SIZE);
      
      for (let i = 0; i < totalChunks; i++) {
        if (controller.signal.aborted) {
          throw new Error('Upload cancelled');
        }

        // Check if paused
        const currentItem = queue.find(q => q.id === item.id);
        if (currentItem?.status === 'paused') {
          return;
        }

        const start = i * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, item.file.size);
        const chunk = item.file.slice(start, end);

        // Upload chunk to storage
        const chunkPath = `uploads/${user.id}/${session.id}/chunk_${i}`;
        const { error: uploadError } = await supabase.storage
          .from('media')
          .upload(chunkPath, chunk, { upsert: true });

        if (uploadError) throw uploadError;

        // Record chunk
        await supabase.from('upload_chunks').insert({
          session_id: session.id,
          chunk_index: i,
          chunk_size: chunk.size,
          status: 'uploaded',
        });

        const progress = Math.round(((i + 1) / totalChunks) * 100);
        updateItem(item.id, { progress });
      }

      // Complete upload
      await supabase
        .from('upload_sessions')
        .update({ status: 'completed' })
        .eq('id', session.id);

      // Assemble file and update draft
      const filePath = `uploads/${user.id}/${session.id}/${item.file.name}`;
      const { error: finalError } = await supabase.storage
        .from('media')
        .upload(filePath, item.file, { upsert: true });

      if (finalError) throw finalError;

      const { data: { publicUrl } } = supabase.storage
        .from('media')
        .getPublicUrl(filePath);

      // Create media asset record
      await supabase.from('media_assets').insert({
        user_id: user.id,
        draft_id: item.draftId,
        storage_path: filePath,
        asset_type: item.file.type.startsWith('video/') ? 'video' : 'image',
        file_size: item.file.size,
        mime_type: item.file.type,
        original_filename: item.file.name,
        status: 'ready',
      });

      // Log history event
      await supabase.from('history_events').insert({
        draft_id: item.draftId,
        user_id: user.id,
        event_type: 'UPLOAD_COMPLETED',
        event_data: { fileName: item.file.name, fileSize: item.file.size },
      });

      updateItem(item.id, { status: 'completed', progress: 100 });
      toast.success('Upload complete');

    } catch (error: any) {
      console.error('Upload error:', error);
      updateItem(item.id, { 
        status: 'failed', 
        error: error.message || 'Upload failed' 
      });

      if (item.sessionId) {
        await supabase
          .from('upload_sessions')
          .update({ status: 'failed' })
          .eq('id', item.sessionId);
      }
    }

    abortControllers.current.delete(item.id);
  };

  // Update queue item
  const updateItem = (id: string, updates: Partial<UploadItem>) => {
    setQueue(prev => prev.map(item => 
      item.id === id ? { ...item, ...updates } : item
    ));
  };

  // Pause upload
  const pauseUpload = (id: string) => {
    const controller = abortControllers.current.get(id);
    if (controller) {
      controller.abort();
    }
    updateItem(id, { status: 'paused' });
  };

  // Resume upload
  const resumeUpload = async (id: string) => {
    const item = queue.find(q => q.id === id);
    if (!item) return;

    updateItem(id, { status: 'queued' });
    
    if (!isProcessing) {
      processQueue();
    }
  };

  // Retry failed upload
  const retryUpload = (id: string) => {
    updateItem(id, { status: 'queued', error: undefined, progress: 0 });
    
    if (!isProcessing) {
      processQueue();
    }
  };

  // Remove from queue
  const removeFromQueue = (id: string) => {
    const controller = abortControllers.current.get(id);
    if (controller) {
      controller.abort();
    }
    setQueue(prev => prev.filter(item => item.id !== id));
  };

  // Set priority
  const setPriority = (id: string, priority: number) => {
    setQueue(prev => 
      prev.map(item => item.id === id ? { ...item, priority } : item)
        .sort((a, b) => b.priority - a.priority)
    );
  };

  return {
    queue,
    isProcessing,
    addToQueue,
    pauseUpload,
    resumeUpload,
    retryUpload,
    removeFromQueue,
    setPriority,
  };
}
