import { useState, useRef, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import TopNav from '@/components/TopNav';
import { Button } from '@/components/ui/button';
import { VideoCanvas } from '@/components/reel-editor/VideoCanvas';
import { EditorToolbar } from '@/components/reel-editor/EditorToolbar';
import { TrimTool } from '@/components/reel-editor/TrimTool';
import { SpeedTool } from '@/components/reel-editor/SpeedTool';
import { FilterTool } from '@/components/reel-editor/FilterTool';
import { AdjustTool } from '@/components/reel-editor/AdjustTool';
import { TextTool } from '@/components/reel-editor/TextTool';
import { StickerTool } from '@/components/reel-editor/StickerTool';
import { DrawingTool } from '@/components/reel-editor/DrawingTool';
import { AudioTool } from '@/components/reel-editor/AudioTool';
import { LayoutTool } from '@/components/reel-editor/LayoutTool';
import { useVideoEditor } from '@/hooks/useVideoEditor';
import { ArrowLeft, Download, Upload } from 'lucide-react';
import { toast } from 'sonner';

export type EditorTool = 'trim' | 'speed' | 'filter' | 'adjust' | 'text' | 'sticker' | 'draw' | 'audio' | 'layout' | 'none';

export default function ReelEditorPro() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const videoUrl = searchParams.get('video');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const {
    videoRef,
    canvasRef,
    activeTool,
    setActiveTool,
    videoState,
    filters,
    adjustments,
    textOverlays,
    stickers,
    drawings,
    audioSettings,
    layoutMode,
    updateVideoState,
    updateFilters,
    updateAdjustments,
    addTextOverlay,
    updateTextOverlay,
    removeTextOverlay,
    addSticker,
    removeSticker,
    addDrawing,
    clearDrawings,
    updateAudioSettings,
    updateLayoutMode,
    exportVideo,
  } = useVideoEditor(videoUrl || undefined);

  const [isProcessing, setIsProcessing] = useState(false);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('video/')) {
      const url = URL.createObjectURL(file);
      navigate(`/reel-editor-pro?video=${encodeURIComponent(url)}`);
    } else {
      toast.error('Please select a valid video file');
    }
  };

  const handleExport = async () => {
    setIsProcessing(true);
    toast.info('Processing video... This may take a moment');
    
    try {
      await exportVideo();
      toast.success('Video exported successfully!');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export video');
    } finally {
      setIsProcessing(false);
    }
  };

  if (!videoUrl) {
    return (
      <div className="min-h-screen bg-background">
        <TopNav />
        <div className="container max-w-2xl mx-auto px-4 py-20">
          <div className="text-center space-y-6">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
              Reel Editor Pro
            </h1>
            <p className="text-muted-foreground text-lg">
              Professional video editing with Instagram-level features
            </p>
            
            <div className="mt-12">
              <Button
                size="lg"
                onClick={() => fileInputRef.current?.click()}
                className="gap-2"
              >
                <Upload className="w-5 h-5" />
                Upload Video to Edit
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="video/*"
                className="hidden"
                onChange={handleFileSelect}
              />
            </div>

            <div className="mt-12 grid grid-cols-2 md:grid-cols-3 gap-4 text-left">
              {[
                '✂️ Trim & Cut',
                '⚡ Speed Control',
                '🎨 Filters',
                '🔧 Adjustments',
                '📝 Text Overlays',
                '😊 Stickers',
                '✏️ Drawing',
                '🎵 Music',
                '📱 Layouts',
              ].map((feature) => (
                <div key={feature} className="p-4 rounded-lg bg-card border">
                  <span className="text-sm">{feature}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <TopNav />
      
      {/* Header */}
      <div className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/reels')}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
          
          <h1 className="font-semibold">Reel Editor Pro</h1>
          
          <Button
            onClick={handleExport}
            disabled={isProcessing}
            className="gap-2"
          >
            <Download className="w-4 h-4" />
            {isProcessing ? 'Processing...' : 'Export'}
          </Button>
        </div>
      </div>

      {/* Main Editor */}
      <div className="flex-1 flex flex-col lg:flex-row gap-4 p-4 container max-w-7xl mx-auto">
        {/* Video Canvas */}
        <div className="flex-1 flex items-center justify-center bg-black rounded-lg overflow-hidden">
          <VideoCanvas
            videoUrl={videoUrl}
            videoRef={videoRef}
            canvasRef={canvasRef}
            videoState={videoState}
            filters={filters}
            adjustments={adjustments}
            textOverlays={textOverlays}
            stickers={stickers}
            drawings={drawings}
            layoutMode={layoutMode}
          />
        </div>

        {/* Tools Panel */}
        <div className="w-full lg:w-80 space-y-4">
          <EditorToolbar
            activeTool={activeTool}
            onToolChange={setActiveTool}
          />

          <div className="bg-card rounded-lg border p-4 max-h-[500px] overflow-y-auto">
            {activeTool === 'trim' && (
              <TrimTool
                videoState={videoState}
                onUpdate={updateVideoState}
              />
            )}
            {activeTool === 'speed' && (
              <SpeedTool
                videoState={videoState}
                onUpdate={updateVideoState}
              />
            )}
            {activeTool === 'filter' && (
              <FilterTool
                filters={filters}
                onUpdate={updateFilters}
              />
            )}
            {activeTool === 'adjust' && (
              <AdjustTool
                adjustments={adjustments}
                onUpdate={updateAdjustments}
              />
            )}
            {activeTool === 'text' && (
              <TextTool
                textOverlays={textOverlays}
                onAdd={addTextOverlay}
                onUpdate={updateTextOverlay}
                onRemove={removeTextOverlay}
              />
            )}
            {activeTool === 'sticker' && (
              <StickerTool
                stickers={stickers}
                onAdd={addSticker}
                onRemove={removeSticker}
              />
            )}
            {activeTool === 'draw' && (
              <DrawingTool
                drawings={drawings}
                onAdd={addDrawing}
                onClear={clearDrawings}
              />
            )}
            {activeTool === 'audio' && (
              <AudioTool
                audioSettings={audioSettings}
                onUpdate={updateAudioSettings}
              />
            )}
            {activeTool === 'layout' && (
              <LayoutTool
                layoutMode={layoutMode}
                onUpdate={updateLayoutMode}
              />
            )}
            {activeTool === 'none' && (
              <div className="text-center text-muted-foreground py-8">
                Select a tool to start editing
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
