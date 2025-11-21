import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Upload, X, Plus, Trash2, ChevronUp, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { ImageCropper } from "./ImageCropper";
import { trpc } from "@/lib/trpc";

// Helper function to format credits (remove .0 if whole number)
const formatCredits = (value: number | string): string => {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '0';
  return num % 1 === 0 ? num.toString() : num.toFixed(1);
};

interface Sora2TabProps {
  models: any[];
  credits: number;
  prompt: string;
  setPrompt: (prompt: string) => void;
  selectedModel: string;
  setSelectedModel: (modelId: string) => void;
  onGenerate: (params: {
    modelId: string;
    prompt: string;
    aspectRatio?: "16:9" | "9:16";
    nFrames?: "10" | "15" | "25";
    size?: "standard" | "high";
    imageUrls?: string[];
    shots?: Array<{ Scene: string; duration: number }>;
  }) => void;
  isGenerating: boolean;
}

interface StoryboardScene {
  id: string;
  prompt: string;
  duration: number;
}

export function Sora2Tab({
  models,
  credits,
  prompt,
  setPrompt,
  selectedModel,
  setSelectedModel,
  onGenerate,
  isGenerating,
}: Sora2TabProps) {
  const [aspectRatio, setAspectRatio] = useState<"16:9" | "9:16">("16:9");
  const [duration, setDuration] = useState<"10" | "15" | "25">("10");
  const [size, setSize] = useState<"standard" | "high">("high");
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [uploadedImageUrls, setUploadedImageUrls] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [showCropper, setShowCropper] = useState(false);
  const [currentCropImage, setCurrentCropImage] = useState<File | null>(null);
  
  // Storyboard-specific state
  const [scenes, setScenes] = useState<StoryboardScene[]>([
    { id: "scene-1", prompt: "", duration: 0 }
  ]);
  
  const uploadMutation = trpc.upload.useMutation();

  // Filter SORA 2 models: show only base models (exclude image-to-video variants)
  const sora2Models = models.filter((m) => 
    m.isActive && 
    m.modelId?.startsWith("sora") &&
    !m.modelId?.includes("image-to-video")
  );

  const selectedModelData = models.find((m) => m.id === selectedModel);
  const isStoryboard = selectedModelData?.modelId === "sora-2-pro-storyboard";
  const isProModel = selectedModelData?.modelId?.includes("sora-2-pro");
  
  // Auto-detect mode based on file attachment (only for non-Storyboard models)
  const hasImages = uploadedFiles.length > 0;
  
  // Get the base model ID (without duration suffix)
  const baseModelId = selectedModelData?.modelId;
  
  // Determine actual model ID based on image upload and duration
  const actualModelId = selectedModelData ? 
    (isStoryboard ? "sora-2-pro-storyboard" :
     hasImages ? baseModelId?.replace("text-to-video", "image-to-video") :
     baseModelId) : "";
  
  // Calculate total time used by scenes
  const getTotalSceneTime = () => {
    return scenes.reduce((sum, scene) => sum + (scene.duration || 0), 0);
  };
  
  // Calculate remaining time credit
  const getRemainingTime = () => {
    const totalDuration = parseFloat(duration);
    const usedTime = getTotalSceneTime();
    return totalDuration - usedTime;
  };
  
  // Calculate cost based on duration, quality, and pricingOptions
  const getModelCost = () => {
    if (!selectedModelData) return 0;
    
    // Determine which model to use (text-to-video or image-to-video)
    const targetModelId = hasImages && !isStoryboard ? 
      selectedModelData.modelId?.replace("text-to-video", "image-to-video") : 
      selectedModelData.modelId;
    
    // Find the actual model (could be different if image-to-video)
    const targetModel = models.find((m) => m.modelId === targetModelId) || selectedModelData;
    
    // If model has pricingOptions, use it
    if (targetModel.pricingOptions) {
      try {
        const pricing = JSON.parse(targetModel.pricingOptions);
        
        // Determine key format based on model type
        let key: string;
        if (isStoryboard || !isProModel) {
          // Storyboard and non-Pro models: use duration-only key (e.g., "10s", "15s")
          key = `${duration}s`;
        } else {
          // Pro models (non-Storyboard): use quality-based key (e.g., "10s-standard", "15s-high")
          key = `${duration}s-${size}`;
        }
        
        return pricing[key] || targetModel.costPerGeneration;
      } catch (e) {
        console.error("Failed to parse pricingOptions:", e);
        return targetModel.costPerGeneration;
      }
    }
    
    return targetModel.costPerGeneration;
  };
  
  const currentCost = getModelCost();

  // Reset duration when model changes
  useEffect(() => {
    if (isStoryboard) {
      setDuration("15"); // Default for Storyboard
      // Reset scenes when switching to Storyboard
      setScenes([{ id: "scene-1", prompt: "", duration: 0 }]);
    } else {
      setDuration("10"); // Default for others
    }
  }, [selectedModelData?.id, isStoryboard]);

  // Reset size when switching between models
  useEffect(() => {
    if (isProModel && !isStoryboard) {
      if (hasImages) {
        setSize("standard"); // Default for Image-to-Video
      } else {
        setSize("high"); // Default for Text-to-Video
      }
    }
  }, [isProModel, isStoryboard, hasImages]);

  // Storyboard scene management functions
  const addScene = () => {
    const newScene: StoryboardScene = {
      id: `scene-${Date.now()}`,
      prompt: "",
      duration: 0
    };
    setScenes([...scenes, newScene]);
  };

  const removeScene = (id: string) => {
    if (scenes.length === 1) {
      toast.error("You must have at least one scene");
      return;
    }
    setScenes(scenes.filter(s => s.id !== id));
  };

  const updateScene = (id: string, field: "prompt" | "duration", value: string | number) => {
    setScenes(scenes.map(s => 
      s.id === id ? { ...s, [field]: value } : s
    ));
  };

  const moveScene = (index: number, direction: "up" | "down") => {
    if (direction === "up" && index === 0) return;
    if (direction === "down" && index === scenes.length - 1) return;
    
    const newScenes = [...scenes];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    [newScenes[index], newScenes[targetIndex]] = [newScenes[targetIndex], newScenes[index]];
    setScenes(newScenes);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // SORA 2 only supports 1 image
    if (uploadedFiles.length >= 1) {
      toast.error("SORA 2 supports only 1 image. Please remove the existing image first.");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error("File size must be less than 10MB");
      return;
    }

    setCurrentCropImage(file);
    setShowCropper(true);
    e.target.value = ''; // Reset input
  };

  const handleCropComplete = async (croppedImage: Blob) => {
    const croppedFile = new File([croppedImage], currentCropImage?.name || "cropped.jpg", {
      type: croppedImage.type,
    });
    setIsUploading(true);
    setShowCropper(false);

    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(croppedFile);
      });

      const result = await uploadMutation.mutateAsync({
        filename: croppedFile.name,
        contentType: croppedFile.type,
        file: base64.split(',')[1],
      });

      setUploadedFiles([croppedFile]);
      setUploadedImageUrls([result.url]);
      toast.success("Image uploaded successfully");
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to upload image");
    } finally {
      setIsUploading(false);
    }
  };

  const removeImage = (index: number) => {
    setUploadedFiles(uploadedFiles.filter((_, i) => i !== index));
    setUploadedImageUrls(uploadedImageUrls.filter((_, i) => i !== index));
  };

  const handleGenerate = () => {
    if (!selectedModel) {
      toast.error("Please select a SORA 2 model");
      return;
    }

    // Validation for Storyboard
    if (isStoryboard) {
      // Check if all scenes have prompts
      const emptyScenes = scenes.filter(s => !s.prompt.trim());
      if (emptyScenes.length > 0) {
        toast.error("All scenes must have a description");
        return;
      }

      // Check if all scenes have duration > 0
      const zeroDurationScenes = scenes.filter(s => s.duration <= 0);
      if (zeroDurationScenes.length > 0) {
        toast.error("All scenes must have a duration greater than 0");
        return;
      }

      // Check if total duration matches selected duration
      const totalSceneTime = getTotalSceneTime();
      const selectedDuration = parseFloat(duration);
      if (Math.abs(totalSceneTime - selectedDuration) > 0.01) {
        toast.error(`Total scene duration (${totalSceneTime}s) must equal selected duration (${selectedDuration}s)`);
        return;
      }
    }

    // Validation for non-Storyboard: requires prompt
    if (!isStoryboard && !prompt.trim()) {
      toast.error("Please enter a prompt");
      return;
    }

    // Use the base model directly (no duration suffix needed)
    const targetModel = models.find((m) => m.modelId === actualModelId);
    
    if (!targetModel) {
      toast.error(`Model ${actualModelId} not found`);
      return;
    }

    // Prepare shots for Storyboard
    const shots = isStoryboard ? scenes.map(s => ({
      Scene: s.prompt,
      duration: s.duration
    })) : undefined;

    onGenerate({
      modelId: targetModel.id,
      prompt: isStoryboard ? "" : prompt,
      aspectRatio,
      nFrames: duration,
      size: isProModel && !isStoryboard ? size : undefined,
      imageUrls: uploadedImageUrls.length > 0 ? uploadedImageUrls : undefined,
      shots,
    });
  };

  const getDurationOptions = () => {
    if (isStoryboard) {
      return [
        { value: "10", label: "10 seconds" },
        { value: "15", label: "15 seconds" },
        { value: "25", label: "25 seconds" },
      ];
    }
    return [
      { value: "10", label: "10 seconds" },
      { value: "15", label: "15 seconds" },
    ];
  };

  return (
    <>
      {showCropper && currentCropImage && (
        <ImageCropper
          imageFile={currentCropImage}
          aspectRatio={aspectRatio === "16:9" ? 16 / 9 : 9 / 16}
          onCropComplete={handleCropComplete}
          onCancel={() => {
            setShowCropper(false);
            setCurrentCropImage(null);
          }}
        />
      )}

      <div className="space-y-4">
        {/* MODEL Section */}
        <div className="space-y-2">
          <Label className="text-xs font-semibold uppercase text-muted-foreground">Model</Label>
          <Select value={selectedModel} onValueChange={setSelectedModel}>
            <SelectTrigger className="h-16 w-full">
              <SelectValue placeholder="Select a SORA 2 model">
                {selectedModel && sora2Models.find(m => m.id === selectedModel)?.name.replace(/ \(\d+s\)$/, '')}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {sora2Models.map((model) => {
                const displayName = model.name.replace(/ \(\d+s\)$/, '');
                return (
                  <SelectItem key={model.id} value={model.id}>
                    {displayName}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>

        {/* Storyboard Scenes - Only for Storyboard model */}
        {selectedModel && isStoryboard && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold uppercase text-muted-foreground">Storyboard Scenes</Label>
              <div className="text-xs text-muted-foreground">
                Time: <strong>{getTotalSceneTime().toFixed(2)}s</strong> / {duration}s
                {getRemainingTime() < 0 && (
                  <span className="ml-2 text-destructive font-semibold">
                    (Over by {Math.abs(getRemainingTime()).toFixed(2)}s!)
                  </span>
                )}
                {getRemainingTime() > 0 && (
                  <span className="ml-2 text-orange-600">
                    (Remaining: {getRemainingTime().toFixed(2)}s)
                  </span>
                )}
                {getRemainingTime() === 0 && (
                  <span className="ml-2 text-green-600">✓ Perfect!</span>
                )}
              </div>
            </div>

            <div className="space-y-3">
              {scenes.map((scene, index) => (
                <div key={scene.id} className="border rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-semibold">Scene {index + 1}</Label>
                    <div className="flex items-center gap-1">
                      {scenes.length > 1 && (
                        <>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => moveScene(index, "up")}
                            disabled={index === 0}
                            className="h-7 w-7 p-0"
                          >
                            <ChevronUp className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => moveScene(index, "down")}
                            disabled={index === scenes.length - 1}
                            className="h-7 w-7 p-0"
                          >
                            <ChevronDown className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeScene(scene.id)}
                            className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                  
                  <Textarea
                    placeholder="Describe this scene..."
                    value={scene.prompt}
                    onChange={(e) => updateScene(scene.id, "prompt", e.target.value)}
                    rows={3}
                    className="resize-none"
                  />
                  
                  <div className="flex items-center gap-2">
                    <Label className="text-xs whitespace-nowrap">Duration (seconds):</Label>
                    <Input
                      type="number"
                      min="0"
                      max={duration}
                      step="0.1"
                      value={scene.duration || ""}
                      onChange={(e) => updateScene(scene.id, "duration", parseFloat(e.target.value) || 0)}
                      className="text-sm"
                    />
                  </div>
                </div>
              ))}
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addScene}
              className="w-full"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Scene
            </Button>
          </div>
        )}

        {/* PROMPT Section - Hide for Storyboard */}
        {selectedModel && !isStoryboard && (
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase text-muted-foreground">Prompt</Label>
            <Textarea
              placeholder="Describe the video you want to create..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={6}
              maxLength={5000}
              className="min-h-[140px] resize-none"
            />
          </div>
        )}

        {/* REFERENCES Section - Image Upload */}
        {selectedModel && !isStoryboard && (
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase text-muted-foreground">References</Label>
            <div className="grid grid-cols-3 gap-3">
              {/* Show uploaded image */}
              {uploadedFiles.length > 0 && (
                <div className="relative group">
                  <div className="aspect-square rounded-lg overflow-hidden border-2 border-border">
                    <img
                      src={URL.createObjectURL(uploadedFiles[0])}
                      alt="Reference"
                      className="w-full h-full object-contain bg-gray-100"
                    />
                  </div>
                  <button
                    onClick={() => removeImage(0)}
                    className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                    type="button"
                  >
                    <X className="w-4 h-4" />
                  </button>
                  <span className="text-xs text-center block mt-1 truncate">@img1</span>
                </div>
              )}

              {/* Show upload box if no image */}
              {uploadedFiles.length === 0 && (
                <label className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-muted-foreground/25 p-4 hover:border-muted-foreground/50 transition-colors aspect-square w-full cursor-pointer">
                  {isUploading ? (
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  ) : (
                    <Upload className="w-6 h-6 text-muted-foreground" />
                  )}
                  <span className="text-xs text-muted-foreground">Upload</span>
                  <input
                    type="file"
                    className="hidden"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleImageUpload}
                    disabled={isUploading}
                  />
                </label>
              )}
            </div>
          </div>
        )}

        {/* Storyboard Reference Image */}
        {selectedModel && isStoryboard && (
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase text-muted-foreground">
              Reference Image <span className="text-xs normal-case text-muted-foreground/70">(Optional)</span>
            </Label>
            <div className="grid grid-cols-3 gap-3">
              {uploadedFiles.length > 0 && (
                <div className="relative group">
                  <div className="aspect-square rounded-lg overflow-hidden border-2 border-border">
                    <img
                      src={URL.createObjectURL(uploadedFiles[0])}
                      alt="Reference"
                      className="w-full h-full object-contain bg-gray-100"
                    />
                  </div>
                  <button
                    onClick={() => removeImage(0)}
                    className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                    type="button"
                  >
                    <X className="w-4 h-4" />
                  </button>
                  <span className="text-xs text-center block mt-1 truncate">Reference</span>
                </div>
              )}

              {uploadedFiles.length === 0 && (
                <label className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-muted-foreground/25 p-4 hover:border-muted-foreground/50 transition-colors aspect-square w-full cursor-pointer">
                  {isUploading ? (
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  ) : (
                    <Upload className="w-6 h-6 text-muted-foreground" />
                  )}
                  <span className="text-xs text-muted-foreground">Upload</span>
                  <input
                    type="file"
                    className="hidden"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleImageUpload}
                    disabled={isUploading}
                  />
                </label>
              )}
            </div>
          </div>
        )}

        {/* Aspect Ratio */}
        {selectedModel && (
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase text-muted-foreground">Aspect Ratio</Label>
            <Select
              value={aspectRatio}
              onValueChange={(value) => setAspectRatio(value as "16:9" | "9:16")}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="16:9">Landscape (16:9)</SelectItem>
                <SelectItem value="9:16">Portrait (9:16)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Duration */}
        {selectedModel && (
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase text-muted-foreground">Duration</Label>
            <Select
              value={duration}
              onValueChange={(value) => setDuration(value as "10" | "15" | "25")}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {getDurationOptions().map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Quality Option - For Sora 2 Pro models (except Storyboard) */}
        {selectedModel && isProModel && !isStoryboard && (
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase text-muted-foreground">Quality</Label>
            <Select
              value={size}
              onValueChange={(value) => setSize(value as "standard" | "high")}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="standard">Standard</SelectItem>
                <SelectItem value="high">High</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Generate Button */}
        {selectedModel && (
          <Button
            onClick={handleGenerate}
            disabled={
              isGenerating || 
              !selectedModel || 
              (isStoryboard && (scenes.length === 0 || Math.abs(getRemainingTime()) > 0.01)) ||
              (!isStoryboard && !prompt.trim())
            }
            className="w-full h-12 text-base font-semibold"
            size="lg"
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                Generate Video ({formatCredits(currentCost)} credits)
              </>
            )}
          </Button>
        )}
      </div>
    </>
  );
}

