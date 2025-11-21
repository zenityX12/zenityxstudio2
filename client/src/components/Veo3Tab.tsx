import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Loader2, Upload, X } from "lucide-react";
import { ImageCropper } from "./ImageCropper";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { trpc } from "@/lib/trpc";

// Helper function to format credits (remove .0 if whole number)
const formatCredits = (value: number | string): string => {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '0';
  return num % 1 === 0 ? num.toString() : num.toFixed(1);
};

interface Veo3TabProps {
  models: any[];
  credits: number;
  prompt: string;
  setPrompt: (prompt: string) => void;
  selectedModel: string;
  setSelectedModel: (modelId: string) => void;
  onGenerate: (params: {
    modelId: string;
    prompt: string;
    aspectRatio?: "16:9" | "9:16" | "Auto";
    generationType?: "TEXT_2_VIDEO" | "FIRST_AND_LAST_FRAMES_2_VIDEO" | "REFERENCE_2_VIDEO";
    imageUrls?: string[];
    seeds?: number;
    watermark?: string;
    enableTranslation?: boolean;
  }) => void;
  isGenerating: boolean;
}

export function Veo3Tab({
  models,
  credits,
  prompt,
  setPrompt,
  selectedModel,
  setSelectedModel,
  onGenerate,
  isGenerating,
}: Veo3TabProps) {
  const [aspectRatio, setAspectRatio] = useState<"16:9" | "9:16" | "Auto">("16:9");
  const [generationType, setGenerationType] = useState<"TEXT_2_VIDEO" | "FIRST_AND_LAST_FRAMES_2_VIDEO" | "REFERENCE_2_VIDEO">("TEXT_2_VIDEO");
  
  // Separate states for first and last frames
  const [firstFrameFile, setFirstFrameFile] = useState<File | null>(null);
  const [firstFrameUrl, setFirstFrameUrl] = useState<string>("");
  const [isFirstFrameUploading, setIsFirstFrameUploading] = useState(false);
  
  const [lastFrameFile, setLastFrameFile] = useState<File | null>(null);
  const [lastFrameUrl, setLastFrameUrl] = useState<string>("");
  const [isLastFrameUploading, setIsLastFrameUploading] = useState(false);
  
  // Reference mode images
  const [referenceFiles, setReferenceFiles] = useState<File[]>([]);
  const [referenceUrls, setReferenceUrls] = useState<string[]>([]);
  const [isReferenceUploading, setIsReferenceUploading] = useState(false);
  
  const [seeds, setSeeds] = useState<string>("");
  const [watermark, setWatermark] = useState<string>("");
  const [enableTranslation, setEnableTranslation] = useState(false);
  
  // Cropper states
  const [showFirstFrameCropper, setShowFirstFrameCropper] = useState(false);
  const [showLastFrameCropper, setShowLastFrameCropper] = useState(false);
  const [showReferenceCropper, setShowReferenceCropper] = useState(false);
  const [currentCropFile, setCurrentCropFile] = useState<File | null>(null);
  
  const uploadMutation = trpc.upload.useMutation();

  const veoModels = models.filter((m) => m.type === "video" && m.modelId?.startsWith("veo"));
  const selectedModelData = veoModels.find((m) => m.id === selectedModel);
  const isVeo3Fast = selectedModelData?.modelId === "veo3_fast";

  // Validation for REFERENCE_2_VIDEO
  const isReferenceMode = generationType === "REFERENCE_2_VIDEO";
  const referenceValidationError = isReferenceMode && (!isVeo3Fast || aspectRatio !== "16:9");

  const handleFirstFrameUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error("File size must be less than 10MB");
      return;
    }

    setCurrentCropFile(file);
    setShowFirstFrameCropper(true);
    e.target.value = '';
  };

  const handleLastFrameUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error("File size must be less than 10MB");
      return;
    }

    setCurrentCropFile(file);
    setShowLastFrameCropper(true);
    e.target.value = '';
  };

  const handleReferenceUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (referenceFiles.length >= 3) {
      toast.error("Maximum 3 reference images allowed");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error("File size must be less than 10MB");
      return;
    }

    setCurrentCropFile(file);
    setShowReferenceCropper(true);
    e.target.value = '';
  };

  const handleFirstFrameCropComplete = async (croppedBlob: Blob) => {
    setIsFirstFrameUploading(true);
    setShowFirstFrameCropper(false);

    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(croppedBlob);
      });

      const result = await uploadMutation.mutateAsync({
        filename: "first-frame.jpg",
        contentType: "image/jpeg",
        file: base64.split(',')[1],
      });

      setFirstFrameUrl(result.url);
      setFirstFrameFile(new File([croppedBlob], "first-frame.jpg"));
      toast.success("First frame uploaded");
    } catch (error) {
      toast.error("Failed to upload first frame");
    } finally {
      setIsFirstFrameUploading(false);
    }
  };

  const handleLastFrameCropComplete = async (croppedBlob: Blob) => {
    setIsLastFrameUploading(true);
    setShowLastFrameCropper(false);

    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(croppedBlob);
      });

      const result = await uploadMutation.mutateAsync({
        filename: "last-frame.jpg",
        contentType: "image/jpeg",
        file: base64.split(',')[1],
      });

      setLastFrameUrl(result.url);
      setLastFrameFile(new File([croppedBlob], "last-frame.jpg"));
      toast.success("Last frame uploaded");
    } catch (error) {
      toast.error("Failed to upload last frame");
    } finally {
      setIsLastFrameUploading(false);
    }
  };

  const handleReferenceCropComplete = async (croppedBlob: Blob) => {
    setIsReferenceUploading(true);
    setShowReferenceCropper(false);

    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(croppedBlob);
      });

      const result = await uploadMutation.mutateAsync({
        filename: `reference-${referenceFiles.length + 1}.jpg`,
        contentType: "image/jpeg",
        file: base64.split(',')[1],
      });

      setReferenceUrls([...referenceUrls, result.url]);
      setReferenceFiles([...referenceFiles, new File([croppedBlob], `reference-${referenceFiles.length + 1}.jpg`)]);
      toast.success("Reference image uploaded");
    } catch (error) {
      toast.error("Failed to upload reference image");
    } finally {
      setIsReferenceUploading(false);
    }
  };

  const removeFirstFrame = () => {
    setFirstFrameFile(null);
    setFirstFrameUrl("");
  };

  const removeLastFrame = () => {
    setLastFrameFile(null);
    setLastFrameUrl("");
  };

  const removeReferenceImage = (index: number) => {
    setReferenceFiles(referenceFiles.filter((_, i) => i !== index));
    setReferenceUrls(referenceUrls.filter((_, i) => i !== index));
  };

  const handleGenerate = () => {
    if (!selectedModel) {
      toast.error("Please select a model");
      return;
    }

    if (!prompt.trim()) {
      toast.error("Please enter a prompt");
      return;
    }

    // Prepare imageUrls based on generation type
    let imageUrls: string[] = [];
    
    if (generationType === "FIRST_AND_LAST_FRAMES_2_VIDEO") {
      if (!firstFrameUrl && !lastFrameUrl) {
        toast.error("Please upload at least one frame (first or last)");
        return;
      }
      if (firstFrameUrl) imageUrls.push(firstFrameUrl);
      if (lastFrameUrl) imageUrls.push(lastFrameUrl);
    } else if (generationType === "REFERENCE_2_VIDEO") {
      if (referenceUrls.length === 0) {
        toast.error("Please upload at least one reference image");
        return;
      }
      imageUrls = referenceUrls;
    }

    if (referenceValidationError) {
      toast.error("REFERENCE_2_VIDEO requires Veo 3.1 Fast model and 16:9 aspect ratio");
      return;
    }

    // Validate seeds if provided
    let seedsValue: number | undefined;
    if (seeds.trim()) {
      seedsValue = parseInt(seeds);
      if (isNaN(seedsValue) || seedsValue < 10000 || seedsValue > 99999) {
        toast.error("Seeds must be between 10000 and 99999");
        return;
      }
    }

    const params: any = {
      modelId: selectedModel,
      prompt: prompt.trim(),
      aspectRatio,
      generationType,
    };

    if (imageUrls.length > 0) {
      params.imageUrls = imageUrls;
    }

    if (seedsValue) {
      params.seeds = seedsValue;
    }

    if (watermark.trim()) {
      params.watermark = watermark.trim();
    }

    params.enableTranslation = enableTranslation;

    onGenerate(params);
  };

  return (
    <>
      {/* Image Croppers */}
      {showFirstFrameCropper && currentCropFile && (
        <ImageCropper
          imageFile={currentCropFile}
          aspectRatio={aspectRatio === "16:9" ? 16/9 : aspectRatio === "9:16" ? 9/16 : 1}
          onCropComplete={handleFirstFrameCropComplete}
          onCancel={() => {
            setShowFirstFrameCropper(false);
            setCurrentCropFile(null);
          }}
        />
      )}

      {showLastFrameCropper && currentCropFile && (
        <ImageCropper
          imageFile={currentCropFile}
          aspectRatio={aspectRatio === "16:9" ? 16/9 : aspectRatio === "9:16" ? 9/16 : 1}
          onCropComplete={handleLastFrameCropComplete}
          onCancel={() => {
            setShowLastFrameCropper(false);
            setCurrentCropFile(null);
          }}
        />
      )}

      {showReferenceCropper && currentCropFile && (
        <ImageCropper
          imageFile={currentCropFile}
          aspectRatio={16/9}
          onCropComplete={handleReferenceCropComplete}
          onCancel={() => {
            setShowReferenceCropper(false);
            setCurrentCropFile(null);
          }}
        />
      )}

      <div className="space-y-4">
        {/* MODEL Section */}
        <div className="space-y-2">
          <Label className="text-xs font-semibold uppercase text-muted-foreground">Model</Label>
          <Select value={selectedModel} onValueChange={setSelectedModel}>
            <SelectTrigger className="h-16 w-full">
              <SelectValue placeholder="Select a Veo 3.1 model">
                {selectedModel && veoModels.find(m => m.id === selectedModel)?.name}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {veoModels.map((model) => (
                <SelectItem key={model.id} value={model.id}>
                  {model.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Generation Type */}
        {selectedModel && (
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase text-muted-foreground">Generation Type</Label>
            <Select value={generationType} onValueChange={(v: any) => setGenerationType(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TEXT_2_VIDEO">Text to Video</SelectItem>
                <SelectItem value="FIRST_AND_LAST_FRAMES_2_VIDEO">First & Last Frames to Video</SelectItem>
                <SelectItem value="REFERENCE_2_VIDEO">Reference to Video</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {/* PROMPT Section */}
        {selectedModel && (
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

        {/* REFERENCES Section - First & Last Frames */}
        {selectedModel && generationType === "FIRST_AND_LAST_FRAMES_2_VIDEO" && (
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase text-muted-foreground">References</Label>
            <div className="grid grid-cols-3 gap-3">
              {/* First Frame */}
              {firstFrameFile ? (
                <div className="relative group">
                  <div className="aspect-square rounded-lg overflow-hidden border-2 border-border">
                    <img
                      src={URL.createObjectURL(firstFrameFile)}
                      alt="First Frame"
                      className="w-full h-full object-contain bg-gray-100"
                    />
                  </div>
                  <button
                    onClick={removeFirstFrame}
                    className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                    type="button"
                  >
                    <X className="w-4 h-4" />
                  </button>
                  <span className="text-xs text-center block mt-1">First Frame</span>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-muted-foreground/25 p-4 hover:border-muted-foreground/50 transition-colors aspect-square w-full cursor-pointer">
                  {isFirstFrameUploading ? (
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  ) : (
                    <Upload className="w-6 h-6 text-muted-foreground" />
                  )}
                  <span className="text-xs text-muted-foreground">First Frame</span>
                  <input
                    type="file"
                    className="hidden"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleFirstFrameUpload}
                    disabled={isFirstFrameUploading}
                  />
                </label>
              )}

              {/* Last Frame */}
              {lastFrameFile ? (
                <div className="relative group">
                  <div className="aspect-square rounded-lg overflow-hidden border-2 border-border">
                    <img
                      src={URL.createObjectURL(lastFrameFile)}
                      alt="Last Frame"
                      className="w-full h-full object-contain bg-gray-100"
                    />
                  </div>
                  <button
                    onClick={removeLastFrame}
                    className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                    type="button"
                  >
                    <X className="w-4 h-4" />
                  </button>
                  <span className="text-xs text-center block mt-1">Last Frame</span>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-muted-foreground/25 p-4 hover:border-muted-foreground/50 transition-colors aspect-square w-full cursor-pointer">
                  {isLastFrameUploading ? (
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  ) : (
                    <Upload className="w-6 h-6 text-muted-foreground" />
                  )}
                  <span className="text-xs text-muted-foreground">Last Frame</span>
                  <input
                    type="file"
                    className="hidden"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleLastFrameUpload}
                    disabled={isLastFrameUploading}
                  />
                </label>
              )}
            </div>
          </div>
        )}

        {/* REFERENCES Section - Reference Images */}
        {selectedModel && generationType === "REFERENCE_2_VIDEO" && (
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase text-muted-foreground">References (1-3 images)</Label>
            <div className="grid grid-cols-3 gap-3">
              {referenceFiles.map((file, index) => (
                <div key={index} className="relative group">
                  <div className="aspect-square rounded-lg overflow-hidden border-2 border-border">
                    <img
                      src={URL.createObjectURL(file)}
                      alt={`Reference ${index + 1}`}
                      className="w-full h-full object-contain bg-gray-100"
                    />
                  </div>
                  <button
                    onClick={() => removeReferenceImage(index)}
                    className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                    type="button"
                  >
                    <X className="w-4 h-4" />
                  </button>
                  <span className="text-xs text-center block mt-1">@ref{index + 1}</span>
                </div>
              ))}

              {referenceFiles.length < 3 && (
                <label className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-muted-foreground/25 p-4 hover:border-muted-foreground/50 transition-colors aspect-square w-full cursor-pointer">
                  {isReferenceUploading ? (
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  ) : (
                    <Upload className="w-6 h-6 text-muted-foreground" />
                  )}
                  <span className="text-xs text-muted-foreground">Upload</span>
                  <input
                    type="file"
                    className="hidden"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleReferenceUpload}
                    disabled={isReferenceUploading}
                  />
                </label>
              )}
            </div>
            {referenceValidationError && (
              <p className="text-xs text-destructive">
                REFERENCE_2_VIDEO requires Veo 3.1 Fast model and 16:9 aspect ratio
              </p>
            )}
          </div>
        )}

        {/* Aspect Ratio */}
        {selectedModel && (
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase text-muted-foreground">Aspect Ratio</Label>
            <Select value={aspectRatio} onValueChange={(v: any) => setAspectRatio(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="16:9">Landscape (16:9)</SelectItem>
                <SelectItem value="9:16">Portrait (9:16)</SelectItem>
                <SelectItem value="Auto">Auto</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Advanced Options */}
        {selectedModel && (
          <>
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase text-muted-foreground">Seeds (Optional)</Label>
              <Input
                type="number"
                placeholder="10000-99999"
                value={seeds}
                onChange={(e) => setSeeds(e.target.value)}
                min={10000}
                max={99999}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase text-muted-foreground">Watermark (Optional)</Label>
              <Input
                type="text"
                placeholder="Your watermark text"
                value={watermark}
                onChange={(e) => setWatermark(e.target.value)}
                maxLength={50}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-xs font-semibold uppercase text-muted-foreground">Enable Translation</Label>
                <p className="text-xs text-muted-foreground">
                  Translate prompts to English
                </p>
              </div>
              <Switch
                checked={enableTranslation}
                onCheckedChange={setEnableTranslation}
              />
            </div>
          </>
        )}

        {/* Generate Button */}
        {selectedModel && (
          <Button
            onClick={handleGenerate}
            disabled={isGenerating || !selectedModel || !prompt.trim() || referenceValidationError}
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
                Generate Video ({formatCredits(selectedModelData?.costPerGeneration || 0)} credits)
              </>
            )}
          </Button>
        )}
      </div>
    </>
  );
}

