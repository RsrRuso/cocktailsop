import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { AudioSettings } from '@/hooks/useVideoEditor';
import { Music, Mic, Upload } from 'lucide-react';
import MusicSelectionDialog from '@/components/MusicSelectionDialog';

interface AudioToolProps {
  audioSettings: AudioSettings;
  onUpdate: (updates: Partial<AudioSettings>) => void;
}

export function AudioTool({ audioSettings, onUpdate }: AudioToolProps) {
  const [showMusicDialog, setShowMusicDialog] = useState(false);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-semibold mb-4">Audio Settings</h3>
        
        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span>Original Audio</span>
              <span>{Math.round(audioSettings.originalAudioVolume * 100)}%</span>
            </div>
            <Slider
              value={[audioSettings.originalAudioVolume]}
              min={0}
              max={1}
              step={0.01}
              onValueChange={([val]) => onUpdate({ originalAudioVolume: val })}
            />
          </div>

          <div className="space-y-2">
            <Button
              variant="outline"
              className="w-full gap-2"
              onClick={() => setShowMusicDialog(true)}
            >
              <Music className="w-4 h-4" />
              {audioSettings.musicUrl ? 'Change Music' : 'Add Music'}
            </Button>

            {audioSettings.musicUrl && (
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span>Music Volume</span>
                  <span>{Math.round(audioSettings.musicVolume * 100)}%</span>
                </div>
                <Slider
                  value={[audioSettings.musicVolume]}
                  min={0}
                  max={1}
                  step={0.01}
                  onValueChange={([val]) => onUpdate({ musicVolume: val })}
                />
              </div>
            )}
          </div>

          <div>
            <Button variant="outline" className="w-full gap-2">
              <Mic className="w-4 h-4" />
              Record Voiceover
            </Button>

            {audioSettings.voiceoverUrl && (
              <div className="mt-2">
                <div className="flex justify-between text-sm mb-2">
                  <span>Voiceover Volume</span>
                  <span>{Math.round(audioSettings.voiceoverVolume * 100)}%</span>
                </div>
                <Slider
                  value={[audioSettings.voiceoverVolume]}
                  min={0}
                  max={1}
                  step={0.01}
                  onValueChange={([val]) => onUpdate({ voiceoverVolume: val })}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      <MusicSelectionDialog
        open={showMusicDialog}
        onOpenChange={setShowMusicDialog}
        onSelect={(track) => {
          onUpdate({ musicUrl: track.preview_url });
          setShowMusicDialog(false);
        }}
      />
    </div>
  );
}
