import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, Upload, Camera, X, CheckCircle2, Zap, Music2, Image as ImageIcon, Layers, Settings, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import TopNav from "@/components/TopNav";
import { usePowerfulUpload } from "@/hooks/usePowerfulUpload";
import { StoryEditor } from "@/components/StoryEditor";
import { Card } from "@/components/ui/card";

const CreateStory = () => {
  const navigate = useNavigate();
  const [showSelection, setShowSelection] = useState(true);
  const [selectedMedia, setSelectedMedia] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editedData, setEditedData] = useState<Record<number, any>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { uploadState, uploadMultiple } = usePowerfulUpload();

  const handleMediaSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setShowSelection(false);

    const validFiles: File[] = [];
    const newPreviewUrls: string[] = [];
    let processedCount = 0;

    files.forEach((file) => {
      // Validate MIME types - accept all common video and image formats
      const allowedImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif', 'image/heic'];
      const allowedVideoTypes = [
        'video/mp4', 
        'video/webm', 
        'video/quicktime',  // .mov (iPhone)
        'video/x-msvideo',  // .avi
        'video/3gpp',       // .3gp (Android)
        'video/x-matroska', // .mkv
        'video/mpeg',       // .mpeg
        'video/x-m4v'       // .m4v
      ];
      const isVideo = file.type.startsWith('video/');
      const isImage = file.type.startsWith('image/');
      
      // More lenient validation - accept any video or image format
      if (!isVideo && !isImage) {
        toast.error(`${file.name}: Invalid file type. Please upload images or videos only`);
        return;
      }
      
      const maxSize = isVideo ? 50 * 1024 * 1024 : 10 * 1024 * 1024;
      if (file.size > maxSize) {
        toast.error(`${file.name} is too large. Max ${isVideo ? '50' : '10'}MB`);
        return;
      }

      validFiles.push(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        newPreviewUrls.push(reader.result as string);
        processedCount++;
        
        if (processedCount === validFiles.length) {
          setPreviewUrls(prev => [...prev, ...newPreviewUrls]);
          setSelectedMedia(prev => [...prev, ...validFiles]);
        }
      };
      reader.readAsDataURL(file);
    });

    if (validFiles.length > 0) {
      toast.success(`${validFiles.length} media file(s) added!`);
    }
  };

  const removeMedia = (index: number) => {
    setSelectedMedia(selectedMedia.filter((_, i) => i !== index));
    setPreviewUrls(previewUrls.filter((_, i) => i !== index));
    const newEditedData = { ...editedData };
    delete newEditedData[index];
    setEditedData(newEditedData);
  };

  const handleSaveEdit = (index: number, data: any) => {
    setEditedData({ ...editedData, [index]: data });
    setEditingIndex(null);
    toast.success("Edits saved!");
  };

  const handleCreateStory = async () => {
    if (selectedMedia.length === 0) {
      toast.error("Please select media for your story");
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
      return;
    }

    try {
      // Upload files using powerful upload system
      const results = await uploadMultiple('stories', user.id, selectedMedia);
      
      const uploadedUrls: string[] = [];
      const mediaTypes: string[] = [];
      
      results.forEach((result, index) => {
        if (!result.error) {
          uploadedUrls.push(result.publicUrl);
          mediaTypes.push(selectedMedia[index].type.startsWith('video') ? 'video' : 'image');
        }
      });
      
      if (uploadedUrls.length === 0) {
        throw new Error('All uploads failed');
      }

      // Prepare edited data arrays aligned with uploaded URLs
      const musicDataArray = uploadedUrls.map((_, urlIndex) => {
        // Find the original index in selectedMedia that corresponds to this uploaded URL
        let originalIndex = 0;
        let uploadCount = 0;
        for (let i = 0; i < results.length; i++) {
          if (!results[i].error) {
            if (uploadCount === urlIndex) {
              originalIndex = i;
              break;
            }
            uploadCount++;
          }
        }
        // Get music data from editedData - check all possible field names
        const ed = editedData[originalIndex];
        if (ed?.musicTrackId) {
          return {
            url: ed.musicTrackId,
            trimStart: ed.trimStart || 0,
            trimEnd: ed.trimEnd || 45
          };
        }
        return null;
      });
      
      const filtersArray = uploadedUrls.map((_, urlIndex) => {
        let originalIndex = 0;
        let uploadCount = 0;
        for (let i = 0; i < results.length; i++) {
          if (!results[i].error) {
            if (uploadCount === urlIndex) {
              originalIndex = i;
              break;
            }
            uploadCount++;
          }
        }
        return editedData[originalIndex]?.filter ? { filter: editedData[originalIndex].filter } : null;
      });
      
      const textOverlaysArray = uploadedUrls.map((_, urlIndex) => {
        let originalIndex = 0;
        let uploadCount = 0;
        for (let i = 0; i < results.length; i++) {
          if (!results[i].error) {
            if (uploadCount === urlIndex) {
              originalIndex = i;
              break;
            }
            uploadCount++;
          }
        }
        return editedData[originalIndex]?.textOverlays || [];
      });
      
      const trimDataArray = uploadedUrls.map((_, urlIndex) => {
        let originalIndex = 0;
        let uploadCount = 0;
        for (let i = 0; i < results.length; i++) {
          if (!results[i].error) {
            if (uploadCount === urlIndex) {
              originalIndex = i;
              break;
            }
            uploadCount++;
          }
        }
        return editedData[originalIndex]?.trim ? { start: editedData[originalIndex].trim.start, end: editedData[originalIndex].trim.end } : null;
      });

      // Check if user has an active story (within last 24 hours)
      const { data: existingStories, error: fetchError } = await supabase
        .from("stories")
        .select("*")
        .eq("user_id", user.id)
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false });

      if (fetchError) {
        console.error('Error fetching existing stories:', fetchError);
        throw fetchError;
      }

      if (existingStories && existingStories.length > 0) {
        // Add to the most recent story
        const existingStory = existingStories[0];
        
        const updatedMediaUrls = [...(existingStory.media_urls || []), ...uploadedUrls];
        const updatedMediaTypes = [...(existingStory.media_types || []), ...mediaTypes];
        
        // Safely merge edited data arrays, ensuring existing data is an array
        const existingMusicData = Array.isArray(existingStory.music_data) ? existingStory.music_data : [];
        const existingFilters = Array.isArray(existingStory.filters) ? existingStory.filters : [];
        const existingTextOverlays = Array.isArray(existingStory.text_overlays) ? existingStory.text_overlays : [];
        const existingTrimData = Array.isArray(existingStory.trim_data) ? existingStory.trim_data : [];
        
        const updatedMusicData = [...existingMusicData, ...musicDataArray];
        const updatedFilters = [...existingFilters, ...filtersArray];
        const updatedTextOverlays = [...existingTextOverlays, ...textOverlaysArray];
        const updatedTrimData = [...existingTrimData, ...trimDataArray];

        const { error: updateError } = await supabase
          .from("stories")
          .update({
            media_urls: updatedMediaUrls,
            media_types: updatedMediaTypes,
            music_data: updatedMusicData,
            filters: updatedFilters,
            text_overlays: updatedTextOverlays,
            trim_data: updatedTrimData,
          })
          .eq("id", existingStory.id);

        if (updateError) {
          // Ignore duplicate notification errors from triggers
          if (updateError.code !== '23505' || !updateError.message?.includes('notifications')) {
            console.error('Update error:', updateError);
            throw updateError;
          }
        }
        
        toast.success(`Added ${uploadedUrls.length} to your story! (${updatedMediaUrls.length} total)`);
      } else {
        // Create new story with edited data - explicitly set expires_at
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
        
        const { data: newStory, error: insertError } = await supabase
          .from("stories")
          .insert({
            user_id: user.id,
            media_urls: uploadedUrls,
            media_types: mediaTypes,
            music_data: musicDataArray,
            filters: filtersArray,
            text_overlays: textOverlaysArray,
            trim_data: trimDataArray,
            expires_at: expiresAt,
          })
          .select()
          .single();

        if (insertError) {
          console.error('Insert error:', insertError);
          // Only ignore duplicate notification errors, not actual insert failures
          if (insertError.code === '23505' && insertError.message?.includes('notifications')) {
            toast.success(`Story created with ${uploadedUrls.length} media!`);
          } else {
            throw insertError;
          }
        } else {
          console.log('Story created:', newStory);
          toast.success(`Story created with ${uploadedUrls.length} media!`);
        }
      }

      navigate("/home");
    } catch (error: any) {
      // Ignore duplicate notification errors - story was created successfully
      if (error?.code === '23505' && error?.message?.includes('notifications')) {
        toast.success('Story created successfully!');
        navigate("/home");
        return;
      }
      console.error('Error creating/updating story:', error);
      toast.error(`Failed: ${error.message || 'Unknown error'}`);
    }
  };

  if (editingIndex !== null) {
    return (
      <StoryEditor
        media={selectedMedia[editingIndex]}
        mediaUrl={previewUrls[editingIndex]}
        isVideo={selectedMedia[editingIndex]?.type.startsWith('video')}
        onSave={(data) => handleSaveEdit(editingIndex, data)}
        onCancel={() => setEditingIndex(null)}
      />
    );
  }

  // Instagram-style Add to Story Screen
  if (showSelection) {
    return (
      <div className="fixed inset-0 bg-black z-50">
        <div className="flex items-center justify-between p-4">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => navigate("/create")}
            className="text-white hover:bg-white/10"
          >
            <X className="w-6 h-6" />
          </Button>
          <h1 className="text-xl font-bold text-white">Add to story</h1>
          <Button 
            variant="ghost" 
            size="icon" 
            className="text-white hover:bg-white/10"
          >
            <Settings className="w-6 h-6" />
          </Button>
        </div>

        {/* Main Options */}
        <div className="grid grid-cols-3 gap-4 px-4 mt-8">
          <Card 
            onClick={() => toast.info("Templates coming soon!")}
            className="bg-white/10 border-white/20 backdrop-blur-xl p-6 flex flex-col items-center justify-center gap-3 cursor-pointer hover:bg-white/15 transition-all"
          >
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <ImageIcon className="w-8 h-8 text-white" />
            </div>
            <span className="text-white font-medium">Templates</span>
          </Card>

          <Card 
            onClick={() => toast.info("Music coming soon!")}
            className="bg-white/10 border-white/20 backdrop-blur-xl p-6 flex flex-col items-center justify-center gap-3 cursor-pointer hover:bg-white/15 transition-all"
          >
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
              <Music2 className="w-8 h-8 text-white" />
            </div>
            <span className="text-white font-medium">Music</span>
          </Card>

          <Card 
            onClick={() => toast.info("Collage coming soon!")}
            className="bg-white/10 border-white/20 backdrop-blur-xl p-6 flex flex-col items-center justify-center gap-3 cursor-pointer hover:bg-white/15 transition-all"
          >
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center">
              <Layers className="w-8 h-8 text-white" />
            </div>
            <span className="text-white font-medium">Collage</span>
          </Card>
        </div>

        {/* Recents Section */}
        <div className="mt-8 px-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 text-white">
              <span className="font-semibold">Recents</span>
              <ChevronDown className="w-4 h-4" />
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              className="text-white hover:bg-white/10"
            >
              <ImageIcon className="w-5 h-5" />
            </Button>
          </div>

          {/* Camera Button */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="aspect-square bg-white/10 border-2 border-white/20 rounded-xl flex items-center justify-center hover:bg-white/15 transition-all"
            >
              <Camera className="w-12 h-12 text-white" />
            </button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            multiple
            onChange={handleMediaSelect}
            className="hidden"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20 pt-16">
      <TopNav />

      <div className="px-4 py-6 space-y-6">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/create")}
            className="glass-hover"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-bold">Add Story</h1>
          <div className="w-10" />
        </div>

        <div className="glass rounded-2xl p-8 space-y-6 text-center">
          {previewUrls.length > 0 ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {previewUrls.map((url, index) => (
                  <div key={index} className="relative group">
                    {selectedMedia[index]?.type.startsWith('video') ? (
                      <video src={url} className="w-full h-48 object-cover rounded-xl" />
                    ) : (
                      <img src={url} alt={`Preview ${index + 1}`} className="w-full h-48 object-cover rounded-xl" />
                    )}
                    
                    {/* Edit Button - Always Visible */}
                    <button
                      onClick={() => setEditingIndex(index)}
                      className="absolute bottom-2 left-2 right-2 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground px-4 py-2 rounded-lg font-medium shadow-lg flex items-center justify-center gap-2 hover:from-primary/90 hover:to-primary/70 transition-all"
                    >
                      <Zap className="w-4 h-4" />
                      Edit & Add Music
                    </button>
                    
                    {editedData[index] && (
                      <div className="absolute top-2 left-2 bg-green-500 text-white px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        Edited
                      </div>
                    )}
                    
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeMedia(index);
                      }}
                      className="absolute top-2 right-2 w-8 h-8 bg-red-500 rounded-full flex items-center justify-center shadow-lg hover:bg-red-600 transition-colors"
                    >
                      <X className="w-4 h-4 text-white" />
                    </button>
                  </div>
                ))}
              </div>
              <p className="text-sm text-muted-foreground">{previewUrls.length} media file(s) added</p>
            </div>
          ) : (
            <>
              <div className="w-32 h-32 mx-auto rounded-full bg-gradient-to-br from-amber-500 via-orange-500 to-rose-500 flex items-center justify-center shadow-xl shadow-orange-500/50">
                <Camera className="w-16 h-16 text-white" />
              </div>

              <div>
                <h2 className="text-2xl font-bold mb-2">Create Your Story</h2>
                <p className="text-muted-foreground">
                  Share a moment that disappears after 24 hours
                </p>
              </div>
            </>
          )}

          <div className="space-y-3">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              multiple
              onChange={handleMediaSelect}
              className="hidden"
            />
            
            <Button
              onClick={() => toast.info("Camera feature coming soon!")}
              className="w-full glass-hover h-14"
              variant="outline"
            >
              <Camera className="w-5 h-5 mr-2" />
              Take Photo
            </Button>

            <Button
              onClick={() => fileInputRef.current?.click()}
              className="w-full glass-hover h-14"
              variant="outline"
            >
              <Upload className="w-5 h-5 mr-2" />
              Upload from Gallery
            </Button>

            {uploadState.isUploading && (
              <div className="glass rounded-xl p-4 space-y-3 border border-primary/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {uploadState.progress === 100 ? (
                      <CheckCircle2 className="w-5 h-5 text-green-500" />
                    ) : (
                      <Zap className="w-5 h-5 text-primary animate-pulse" />
                    )}
                    <div>
                      <p className="font-semibold text-sm">{uploadState.stage}</p>
                      {uploadState.currentFile && (
                        <p className="text-xs text-muted-foreground">
                          {uploadState.currentFile}/{uploadState.totalFiles} files
                        </p>
                      )}
                    </div>
                  </div>
                  <p className="text-xl font-bold text-primary">
                    {Math.round(uploadState.progress)}%
                  </p>
                </div>
                <Progress value={uploadState.progress} className="h-2" />
              </div>
            )}

            <Button
              onClick={handleCreateStory}
              disabled={uploadState.isUploading || previewUrls.length === 0}
              className="w-full glow-primary h-14"
            >
              {uploadState.isUploading ? (
                <>
                  <Zap className="w-4 h-4 mr-2 animate-pulse" />
                  Uploading...
                </>
              ) : (
                `Share Story (${previewUrls.length})`
              )}
            </Button>
          </div>
          <div className="flex items-center justify-center gap-2 text-xs text-center text-muted-foreground mt-2">
            <Zap className="w-3 h-3 text-primary" />
            <span>Smart compression • Auto-retry • Up to 200MB per file</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateStory;
