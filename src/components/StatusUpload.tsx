import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Music, Upload, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import OptimizedAvatar from "./OptimizedAvatar";

interface StatusUploadProps {
  userId: string;
  avatarUrl: string | null;
  username: string;
}

const StatusUpload = ({ userId, avatarUrl, username }: StatusUploadProps) => {
  const [statusText, setStatusText] = useState("");
  const [musicFile, setMusicFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const handleMusicSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith("audio/")) {
      setMusicFile(file);
    } else {
      toast({
        title: "Invalid file",
        description: "Please select an audio file",
        variant: "destructive",
      });
    }
  };

  const uploadMusic = async (file: File) => {
    const fileExt = file.name.split(".").pop();
    const fileName = `${userId}/${Date.now()}.${fileExt}`;

    const { error: uploadError, data } = await supabase.storage
      .from("music")
      .upload(fileName, file);

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from("music")
      .getPublicUrl(fileName);

    return publicUrl;
  };

  const handleUpload = async () => {
    if (!statusText && !musicFile) {
      toast({
        title: "Nothing to upload",
        description: "Add some text or select a music file",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    try {
      let musicUrl = null;
      let musicTitle = null;

      if (musicFile) {
        musicUrl = await uploadMusic(musicFile);
        musicTitle = musicFile.name.replace(/\.[^/.]+$/, "");
      }

      const { error } = await supabase.from("user_status").insert({
        user_id: userId,
        status_text: statusText || null,
        music_url: musicUrl,
        music_title: musicTitle,
      });

      if (error) throw error;

      toast({
        title: "Status uploaded!",
        description: "Your status is now live for 24 hours",
      });

      setStatusText("");
      setMusicFile(null);
    } catch (error) {
      console.error("Error uploading status:", error);
      toast({
        title: "Upload failed",
        description: "Could not upload your status",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="relative mb-6">
      <div className="flex items-center gap-4 p-4 border rounded-lg bg-card">
        <div className="relative">
          <OptimizedAvatar
            src={avatarUrl}
            alt={username}
            className="w-16 h-16 ring-2 ring-primary ring-offset-2"
          />
          <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-primary rounded-full flex items-center justify-center">
            <Upload className="w-3 h-3 text-primary-foreground" />
          </div>
        </div>

        <div className="flex-1 space-y-2">
          <Input
            placeholder="What's on your mind?"
            value={statusText}
            onChange={(e) => setStatusText(e.target.value)}
            maxLength={150}
            className="border-0 bg-muted"
          />

          {musicFile && (
            <div className="flex items-center gap-2 text-sm bg-muted p-2 rounded">
              <Music className="w-4 h-4" />
              <span className="flex-1 truncate">{musicFile.name}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setMusicFile(null)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          )}

          <div className="flex gap-2">
            <label className="cursor-pointer">
              <input
                type="file"
                accept="audio/*"
                onChange={handleMusicSelect}
                className="hidden"
              />
              <Button variant="outline" size="sm" type="button" asChild>
                <span>
                  <Music className="w-4 h-4 mr-2" />
                  Add Music
                </span>
              </Button>
            </label>

            <Button
              onClick={handleUpload}
              disabled={uploading || (!statusText && !musicFile)}
              size="sm"
            >
              {uploading ? "Uploading..." : "Share Status"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatusUpload;
