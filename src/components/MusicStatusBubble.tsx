import { useState, useRef, useEffect } from "react";
import { Music2, Play, Pause, ExternalLink } from "lucide-react";

interface MusicStatusBubbleProps {
  trackName: string;
  artist: string;
  albumArt?: string;
  previewUrl?: string | null;
  spotifyUrl?: string;
  className?: string;
}

const MusicStatusBubble = ({
  trackName,
  artist,
  albumArt,
  previewUrl,
  spotifyUrl,
  className = ""
}: MusicStatusBubbleProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (previewUrl) {
      audioRef.current = new Audio(previewUrl);
      audioRef.current.volume = 0.5;
      audioRef.current.loop = true; // Enable looping for continuous playback
    }
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [previewUrl]);

  const togglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const openSpotify = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (spotifyUrl) {
      window.open(spotifyUrl, '_blank');
    }
  };

  return (
    <div className={`absolute -top-12 left-1/2 -translate-x-1/2 z-20 pointer-events-auto ${className}`}>
      <div className="relative">
        <div className="bg-gradient-to-r from-emerald-500/90 to-teal-500/90 backdrop-blur-sm text-white px-4 py-2.5 rounded-2xl shadow-lg shadow-emerald-500/30 min-w-[160px] max-w-[220px]">
          <div className="flex items-center gap-3">
            {/* Album Art or Icon */}
            <div className="relative w-10 h-10 rounded-lg overflow-hidden flex-shrink-0">
              {albumArt ? (
                <img src={albumArt} alt={trackName} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-white/20 flex items-center justify-center">
                  <Music2 className="w-5 h-5" />
                </div>
              )}
              {/* Play indicator overlay */}
              {isPlaying && (
                <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                  <div className="flex gap-0.5">
                    <div className="w-0.5 h-4 bg-white animate-pulse" style={{ animationDelay: '0ms' }} />
                    <div className="w-0.5 h-4 bg-white animate-pulse" style={{ animationDelay: '150ms' }} />
                    <div className="w-0.5 h-4 bg-white animate-pulse" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              )}
            </div>

            {/* Track Info */}
            <div className="flex-1 min-w-0 overflow-hidden">
              <div className="overflow-hidden">
                <div className={`whitespace-nowrap text-xs font-medium ${trackName.length > 15 ? 'animate-marquee' : ''}`}>
                  {trackName}
                </div>
              </div>
              <p className="text-[10px] opacity-80 truncate">{artist}</p>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1">
              {previewUrl && (
                <button
                  onClick={togglePlay}
                  className="w-7 h-7 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
                >
                  {isPlaying ? (
                    <Pause className="w-3.5 h-3.5" />
                  ) : (
                    <Play className="w-3.5 h-3.5 ml-0.5" />
                  )}
                </button>
              )}
              {spotifyUrl && (
                <button
                  onClick={openSpotify}
                  className="w-7 h-7 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
        
        {/* Connector dots */}
        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2">
          <div className="w-2 h-2 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full shadow-sm"></div>
        </div>
        <div className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 translate-x-0.5">
          <div className="w-1.5 h-1.5 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full shadow-sm"></div>
        </div>
      </div>
    </div>
  );
};

export default MusicStatusBubble;