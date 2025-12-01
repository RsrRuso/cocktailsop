import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Music, Sparkles, Search, Filter, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function MatrixMusicTab() {
  const [isLoading, setIsLoading] = useState(false);
  const [musicLibrary, setMusicLibrary] = useState<any[]>([]);
  const [genre, setGenre] = useState("");
  const [mood, setMood] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const handleCurateMusic = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('matrix-music-curator', {
        body: { 
          action: 'curate_music',
          data: {
            genre: genre || undefined,
            mood: mood || undefined,
            count: 20
          }
        }
      });

      if (error) throw error;

      toast.success(`✨ Added ${data.added_count} tracks to platform library!`);
      fetchLibrary();
    } catch (error: any) {
      console.error('Curation error:', error);
      toast.error('Failed to curate music: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchLibrary = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('matrix-music-curator', {
        body: { 
          action: 'get_library',
          data: {
            genre: genre || undefined,
            mood: mood || undefined,
            search: searchQuery || undefined,
            limit: 100
          }
        }
      });

      if (error) throw error;

      setMusicLibrary(data.tracks || []);
    } catch (error: any) {
      console.error('Fetch error:', error);
      toast.error('Failed to fetch library: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Music className="w-6 h-6 text-primary" />
        <h3 className="text-2xl font-bold">AI Music Curator</h3>
        <Badge variant="secondary" className="ml-2">
          <Sparkles className="w-3 h-3 mr-1" />
          Platform Library
        </Badge>
      </div>

      <Card className="p-6 space-y-4 bg-card/50 backdrop-blur">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <label className="text-sm font-medium mb-2 block">Genre</label>
            <Select value={genre} onValueChange={setGenre}>
              <SelectTrigger>
                <SelectValue placeholder="All Genres" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Genres</SelectItem>
                <SelectItem value="Pop">Pop</SelectItem>
                <SelectItem value="Hip-Hop">Hip-Hop</SelectItem>
                <SelectItem value="Electronic">Electronic</SelectItem>
                <SelectItem value="Rock">Rock</SelectItem>
                <SelectItem value="R&B">R&B</SelectItem>
                <SelectItem value="Indie">Indie</SelectItem>
                <SelectItem value="Latin">Latin</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex-1">
            <label className="text-sm font-medium mb-2 block">Mood</label>
            <Select value={mood} onValueChange={setMood}>
              <SelectTrigger>
                <SelectValue placeholder="All Moods" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Moods</SelectItem>
                <SelectItem value="Energetic">Energetic</SelectItem>
                <SelectItem value="Chill">Chill</SelectItem>
                <SelectItem value="Happy">Happy</SelectItem>
                <SelectItem value="Melancholic">Melancholic</SelectItem>
                <SelectItem value="Party">Party</SelectItem>
                <SelectItem value="Romantic">Romantic</SelectItem>
                <SelectItem value="Motivational">Motivational</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            onClick={handleCurateMusic}
            disabled={isLoading}
            className="flex-1"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Curating...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                AI Curate Music
              </>
            )}
          </Button>

          <Button
            onClick={fetchLibrary}
            disabled={isLoading}
            variant="outline"
          >
            <Filter className="w-4 h-4 mr-2" />
            View Library
          </Button>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search tracks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchLibrary()}
            className="pl-10"
          />
        </div>
      </Card>

      {musicLibrary.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-lg font-semibold">Platform Music Library</h4>
            <Badge variant="outline">
              <TrendingUp className="w-3 h-3 mr-1" />
              {musicLibrary.length} Tracks
            </Badge>
          </div>

          <div className="grid gap-3 max-h-[500px] overflow-y-auto">
            {musicLibrary.map((track) => (
              <Card key={track.id} className="p-4 hover:bg-accent/50 transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold truncate">{track.title}</div>
                    <div className="text-sm text-muted-foreground truncate">{track.artist}</div>
                    
                    {track.ai_description && (
                      <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                        {track.ai_description}
                      </p>
                    )}

                    <div className="flex flex-wrap gap-1 mt-2">
                      {track.genre && (
                        <Badge variant="secondary" className="text-xs">
                          {track.genre}
                        </Badge>
                      )}
                      {track.mood && (
                        <Badge variant="outline" className="text-xs">
                          {track.mood}
                        </Badge>
                      )}
                      {track.energy_level && (
                        <Badge variant="outline" className="text-xs">
                          ⚡ {track.energy_level}
                        </Badge>
                      )}
                      {track.ai_tags?.slice(0, 3).map((tag: string, idx: number) => (
                        <Badge key={idx} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div className="text-right text-xs text-muted-foreground space-y-1">
                    <div>🔥 {track.popularity_score}</div>
                    <div>📊 {track.usage_count} uses</div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
