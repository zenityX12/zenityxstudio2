import { useState, useRef, useEffect } from 'react';
import { X, ImageIcon, VideoIcon, Upload, Loader2 } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';

interface MobileGenerationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Mobile Generation Modal - Compact Facebook-style
 * Full desktop features in mobile-optimized compact layout
 */
export default function MobileGenerationModal({ isOpen, onClose }: MobileGenerationModalProps) {
  const [type, setType] = useState<'image' | 'video'>('image');
  const [selectedModelId, setSelectedModelId] = useState<string>('');
  const [prompt, setPrompt] = useState('');
  const [uploadedImages, setUploadedImages] = useState<string[]>([]); // Support multiple images
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Kling-specific upload state (separate First/End Frame)
  const [klingFirstFrame, setKlingFirstFrame] = useState<string | null>(null);
  const [klingEndFrame, setKlingEndFrame] = useState<string | null>(null);
  const [isUploadingKlingFirst, setIsUploadingKlingFirst] = useState(false);
  const [isUploadingKlingEnd, setIsUploadingKlingEnd] = useState(false);
  const klingFirstInputRef = useRef<HTMLInputElement>(null);
  const klingEndInputRef = useRef<HTMLInputElement>(null);

  // Fetch models
  const { data: allModels = [], isLoading: modelsLoading } = trpc.models.list.useQuery();
  
  // Filter models by type and hide edit variants (they auto-switch internally)
  // For Kling, Sora 2, Seedance: Show only base models (variants accessible via options)
  const models = allModels.filter((m) => {
    if (m.type !== type || m.isActive !== 1) return false;
    
    // Hide edit models (seedream-v4-edit, etc.)
    if (m.modelId?.includes('-edit')) return false;
    
    // For Kling: Only show kling/v2-1-pro as the base model
    // Standard variant will be accessible via option dropdown
    if (m.modelId?.startsWith('kling/v2-1')) {
      return m.modelId === 'kling/v2-1-pro'; // Show Pro as base, Standard via option
    }
    
    // For Sora 2: Only show text-to-video base models (hide image-to-video and storyboard variants)
    // image-to-video variants will be auto-switched at generation time
    // Storyboard is an advanced feature not available in mobile
    if (m.modelId?.startsWith('sora')) {
      return !m.modelId.includes('image-to-video') && !m.modelId.includes('storyboard');
    }
    
    // For Seedance: Only show one base model (hide Lite/Pro variants)
    // Lite/Pro will be accessible via tier option dropdown
    if (m.modelId?.startsWith('bytedance/v1-')) {
      // Show only Pro as base (or Lite if Pro not available)
      return m.modelId === 'bytedance/v1-seedance-pro' || 
             (m.modelId === 'bytedance/v1-seedance-lite' && !allModels.some(model => model.modelId === 'bytedance/v1-seedance-pro' && model.isActive === 1));
    }
    
    return true;
  });
  


  // Get selected model (use allModels to include edit variants)
  const selectedModel = allModels.find((m) => m.id === selectedModelId);

  // Auto-switch logic moved to handleGenerate (Desktop-style)

  // Auto-select first model when type changes
  useEffect(() => {
    if (models.length > 0 && !selectedModelId) {
      setSelectedModelId(models[0].id);
    }
  }, [models, selectedModelId]);

  // Check if model supports image upload (based on modelId)
  const supportsImageUpload = selectedModel?.modelId?.includes('-edit') || selectedModel?.modelId?.includes('image-to-video');

  // Model-specific options state
  const [aspectRatio, setAspectRatio] = useState('16:9');
  const [duration, setDuration] = useState<string | number>(5); // String for Kling, number for others
  const [quality, setQuality] = useState('standard');
  const [resolution, setResolution] = useState('4K'); // Default 4K for Seedream, will be overridden for video models
  const [renderingSpeed, setRenderingSpeed] = useState('TURBO');
  const [numImages, setNumImages] = useState('1');
  const [maxImages, setMaxImages] = useState(1);
  const [klingOption, setKlingOption] = useState<'pro' | 'standard'>('pro'); // Kling model option
  
  // Sora 2 specific state
  const [sora2Duration, setSora2Duration] = useState<'10' | '15'>('10');
  const [sora2Size, setSora2Size] = useState<'standard' | 'high'>('high');
  const [sora2AspectRatio, setSora2AspectRatio] = useState<'16:9' | '9:16'>('16:9');
  
  // Sora 2 Storyboard state
  interface StoryboardScene {
    id: string;
    prompt: string;
    duration: number;
  }
  const [storyboardScenes, setStoryboardScenes] = useState<StoryboardScene[]>([
    { id: 'scene-1', prompt: '', duration: 0 }
  ]);
  
  // Veo 3 specific state
  const [veo3GenerationType, setVeo3GenerationType] = useState<'TEXT_2_VIDEO' | 'FIRST_AND_LAST_FRAMES_2_VIDEO'>('TEXT_2_VIDEO');
  const [veo3AspectRatio, setVeo3AspectRatio] = useState<'16:9' | '9:16' | 'Auto'>('16:9');
  const [veo3FirstFrame, setVeo3FirstFrame] = useState<string>(''); // First frame URL
  const [veo3LastFrame, setVeo3LastFrame] = useState<string>(''); // Last frame URL
  const [isVeo3FirstFrameUploading, setIsVeo3FirstFrameUploading] = useState(false);
  const [isVeo3LastFrameUploading, setIsVeo3LastFrameUploading] = useState(false);
  const veo3FirstFrameInputRef = useRef<HTMLInputElement>(null);
  const veo3LastFrameInputRef = useRef<HTMLInputElement>(null);
  
  // Seedance specific state
  const [seedanceTier, setSeedanceTier] = useState<'lite' | 'pro'>('lite');
  const [seedanceDuration, setSeedanceDuration] = useState<'5' | '10'>('5');
  const [seedanceFirstFrame, setSeedanceFirstFrame] = useState<string>(''); // First frame URL
  const [isSeedanceFirstFrameUploading, setIsSeedanceFirstFrameUploading] = useState(false);
  const seedanceFirstFrameInputRef = useRef<HTMLInputElement>(null);

  // Options are preserved - no auto-reset (Desktop-style)

  // Calculate credit cost based on model and options (same logic as Desktop)
  const calculateCost = (model: any) => {
    if (!model) return 0;
    
    try {
      let cost = Number(model.costPerGeneration || 0);
      
      // Ideogram: pricing based on rendering speed, then multiply by num_images
      if (model.modelId?.startsWith('ideogram/')) {
        if (renderingSpeed && model.pricingOptions) {
          const pricingOptions = JSON.parse(model.pricingOptions);
          cost = pricingOptions[renderingSpeed] || cost;
        }
        cost = cost * parseInt(numImages || '1');
      }
      
      // Seedream V4: multiply by max_images
      else if (model.modelId?.startsWith('bytedance/seedream-v4')) {
        cost = cost * maxImages;
      }
      
      // Seedance: pricing based on resolution + duration
      else if (model.modelId?.startsWith('bytedance/v1-')) {
        if (model.pricingOptions && resolution && duration) {
          const pricingOptions = JSON.parse(model.pricingOptions);
          const key = `${resolution}-${duration}s`;
          cost = pricingOptions[key] || cost;
        }
      }
      
      // Kling: pricing based on duration and option (Standard/Pro)
      else if (model.modelId?.startsWith('kling/')) {
        // Get the correct model based on option
        const targetModelId = klingOption === 'standard' ? 'kling/v2-1-standard' : 'kling/v2-1-pro';
        const targetModel = allModels.find(m => m.modelId === targetModelId);
        
        if (targetModel && targetModel.pricingOptions && duration) {
          const pricingOptions = JSON.parse(targetModel.pricingOptions);
          const key = `${duration}s`;
          cost = pricingOptions[key] || Number(targetModel.costPerGeneration);
        } else if (targetModel) {
          cost = Number(targetModel.costPerGeneration);
        }
      }
      
      // Sora 2: pricing based on duration (and quality for Pro models)
      else if (model.modelId?.startsWith('sora-2')) {
        if (model.pricingOptions) {
          const pricingOptions = JSON.parse(model.pricingOptions);
          const isProModel = model.modelId?.includes('sora-2-pro');
          const isStoryboard = model.modelId?.includes('storyboard');
          
          let key: string;
          if (isProModel && !isStoryboard) {
            // Pro models (non-Storyboard): use quality-based key (e.g., "10s-standard", "15s-high")
            key = `${sora2Duration}s-${sora2Size}`;
          } else {
            // Non-Pro or Storyboard models: use duration-only key (e.g., "10s", "15s")
            key = `${sora2Duration}s`;
          }
          
          cost = pricingOptions[key] || cost;
        }
      }
      
      return cost;
    } catch (e) {
      console.error('[Pricing] Failed to calculate cost:', e);
      return Number(model.costPerGeneration || 0);
    }
  };

  const creditCost = calculateCost(selectedModel);

  // Upload mutation for S3
  const uploadMutation = trpc.upload.useMutation();

  // Helper function to crop image to aspect ratio
  const cropImageToAspectRatio = async (file: File, aspectRatio: '16:9' | '9:16' | 'Auto'): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }

      img.onload = () => {
        let targetAspectRatio = img.width / img.height; // Auto: use original
        if (aspectRatio === '16:9') targetAspectRatio = 16 / 9;
        if (aspectRatio === '9:16') targetAspectRatio = 9 / 16;

        const imgAspectRatio = img.width / img.height;
        let cropWidth = img.width;
        let cropHeight = img.height;
        let cropX = 0;
        let cropY = 0;

        if (aspectRatio !== 'Auto') {
          if (imgAspectRatio > targetAspectRatio) {
            // Image is wider than target - crop width
            cropWidth = img.height * targetAspectRatio;
            cropX = (img.width - cropWidth) / 2;
          } else {
            // Image is taller than target - crop height
            cropHeight = img.width / targetAspectRatio;
            cropY = (img.height - cropHeight) / 2;
          }
        }

        // Set canvas size to cropped dimensions (max 1920px width)
        const maxWidth = 1920;
        const scale = Math.min(1, maxWidth / cropWidth);
        canvas.width = cropWidth * scale;
        canvas.height = cropHeight * scale;

        // Draw cropped image
        ctx.drawImage(
          img,
          cropX, cropY, cropWidth, cropHeight,
          0, 0, canvas.width, canvas.height
        );

        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Failed to create blob'));
            }
          },
          'image/jpeg',
          0.92
        );
      };

      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = URL.createObjectURL(file);
    });
  };

  // Get tRPC utils for invalidating queries
  const utils = trpc.useUtils();

  // Create generation mutation
  const createGeneration = trpc.generations.create.useMutation({
    onSuccess: () => {
      toast.success('Generation started!');
      // Invalidate generations list to refresh Feed
      utils.generations.list.invalidate();
      onClose();
      // Reset form
      setPrompt('');
      setUploadedImages([]);
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to start generation');
    },
  });

  // Handle multiple image uploads - Upload to S3 instead of base64
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // Check file sizes (max 10MB each)
    for (const file of files) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error('Each image must be less than 10MB');
        return;
      }
    }

    setIsUploading(true);
    try {
      const newImages: string[] = [];
      
      for (const file of files) {
        // Convert to base64 for upload
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = () => reject(new Error('Failed to read image'));
          reader.readAsDataURL(file);
        });
        
        // Upload to S3 and get URL
        const result = await uploadMutation.mutateAsync({
          filename: file.name,
          contentType: file.type,
          file: base64.split(',')[1], // Remove data:image/...;base64, prefix
        });
        
        newImages.push(result.url); // Store S3 URL instead of base64
      }
      
      setUploadedImages(prev => [...prev, ...newImages]);
      toast.success(`${files.length} image(s) uploaded successfully`);
      setIsUploading(false);
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload images');
      setIsUploading(false);
    }
  };

  // Remove single image
  const removeImage = (index: number) => {
    setUploadedImages(prev => prev.filter((_, i) => i !== index));
  };

  // Kling First Frame upload handler
  const handleKlingFirstFrameUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      toast.error('Image must be less than 20MB');
      return;
    }

    setIsUploadingKlingFirst(true);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error('Failed to read image'));
        reader.readAsDataURL(file);
      });

      const result = await uploadMutation.mutateAsync({
        filename: file.name,
        contentType: file.type,
        file: base64.split(',')[1],
      });

      setKlingFirstFrame(result.url);
      toast.success('First Frame uploaded');
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload First Frame');
    } finally {
      setIsUploadingKlingFirst(false);
    }
  };

  // Kling End Frame upload handler
  const handleKlingEndFrameUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      toast.error('Image must be less than 20MB');
      return;
    }

    setIsUploadingKlingEnd(true);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error('Failed to read image'));
        reader.readAsDataURL(file);
      });

      const result = await uploadMutation.mutateAsync({
        filename: file.name,
        contentType: file.type,
        file: base64.split(',')[1],
      });

      setKlingEndFrame(result.url);
      toast.success('End Frame uploaded');
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload End Frame');
    } finally {
      setIsUploadingKlingEnd(false);
    }
  };

  // Veo 3 First Frame upload handler (simple upload - backend will auto-crop)
  const handleVeo3FirstFrameUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 16 * 1024 * 1024) {
      toast.error('File size must be less than 16MB');
      return;
    }

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    setIsVeo3FirstFrameUploading(true);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      // Send aspect ratio to backend for auto-crop
      const result = await uploadMutation.mutateAsync({
        filename: 'veo3-first-frame.jpg',
        contentType: 'image/jpeg',
        file: base64.split(',')[1],
        aspectRatio: veo3AspectRatio, // Backend will crop based on this
      });

      setVeo3FirstFrame(result.url);
      toast.success('First frame uploaded');
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Upload failed');
    } finally {
      setIsVeo3FirstFrameUploading(false);
    }
  };

  // Veo 3 Last Frame upload handler (simple upload - backend will auto-crop)
  const handleVeo3LastFrameUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 16 * 1024 * 1024) {
      toast.error('File size must be less than 16MB');
      return;
    }

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    setIsVeo3LastFrameUploading(true);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      // Send aspect ratio to backend for auto-crop
      const result = await uploadMutation.mutateAsync({
        filename: 'veo3-last-frame.jpg',
        contentType: 'image/jpeg',
        file: base64.split(',')[1],
        aspectRatio: veo3AspectRatio, // Backend will crop based on this
      });

      setVeo3LastFrame(result.url);
      toast.success('Last frame uploaded');
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Upload failed');
    } finally {
      setIsVeo3LastFrameUploading(false);
    }
  };

  // Seedance First Frame upload handler
  const handleSeedanceFirstFrameUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 20 * 1024 * 1024) {
      toast.error('Image must be less than 20MB');
      return;
    }

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    setIsSeedanceFirstFrameUploading(true);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error('Failed to read image'));
        reader.readAsDataURL(file);
      });

      const result = await uploadMutation.mutateAsync({
        filename: file.name,
        contentType: file.type,
        file: base64.split(',')[1],
      });

      setSeedanceFirstFrame(result.url);
      toast.success('First frame uploaded');
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Upload failed');
    } finally {
      setIsSeedanceFirstFrameUploading(false);
    }
  };

  // Handle generate
  const handleGenerate = () => {
    if (!prompt.trim()) {
      toast.error('Please enter a prompt');
      return;
    }

    if (!selectedModelId) {
      toast.error('Please select a model');
      return;
    }

    // Desktop-style auto-switch: switch to edit model if images present (at generation time)
    let actualModelId = selectedModelId;
    const isSeedreamV4 = selectedModel?.modelId?.startsWith('bytedance/seedream-v4') && !selectedModel?.modelId?.includes('-edit');
    const isNanoBanana = selectedModel?.modelId?.includes('nano-banana') && !selectedModel?.modelId?.includes('-edit');
    
    if ((isSeedreamV4 || isNanoBanana) && uploadedImages.length > 0) {
      if (isSeedreamV4) {
        const editModel = allModels.find(m => m.modelId === 'bytedance/seedream-v4-edit');
        if (editModel) {
          actualModelId = editModel.id;
        }
      } else if (isNanoBanana) {
        const editModel = allModels.find(m => m.modelId === 'google/nano-banana-edit');
        if (editModel) {
          actualModelId = editModel.id;
          console.log('[Generate] Switched to Nano Banana Edit model');
        }
      }
    }

    // Build options based on model (match Desktop logic)
    const options: Record<string, any> = {};
    
    // Ideogram options
    if (selectedModel?.modelId?.startsWith('ideogram/')) {
      options.renderingSpeed = renderingSpeed;
      options.numImages = numImages; // Keep as string (backend expects "1", "2", "3", "4")
      options.aspectRatio = aspectRatio;
      
      // Ideogram Character requires referenceImageUrls (array)
      if (uploadedImages.length > 0) {
        options.referenceImageUrls = uploadedImages; // Array of reference images
      }
      
      // Ideogram Character Remix uses imageUrl for the image to remix
      if (selectedModel?.modelId === 'ideogram/character-remix' && uploadedImages.length > 0) {
        options.imageUrl = uploadedImages[0]; // Single image to remix
      }
    }
    
    // Seedream V4 options (IMAGE generation - no resolution parameter)
    else if (selectedModel?.modelId?.startsWith('bytedance/seedream-v4')) {
      // Image generation uses aspectRatio, NOT resolution
      // resolution (480p/720p/1080p) is for VIDEO only
      options.maxImages = maxImages;
      options.aspectRatio = aspectRatio;
      // Seedream V4 Edit uses imageUrls (array), not imageUrl (single)
      if (uploadedImages.length > 0) {
        options.imageUrls = uploadedImages; // Array of images for edit
      }
    }
    
    // Seedance options
    else if (selectedModel?.modelId?.startsWith('bytedance/v1-')) {
      options.duration = seedanceDuration; // "5" or "10"
      
      // Auto-switch model based on tier
      const baseModelId = selectedModel.modelId;
      let targetModelId = baseModelId;
      
      if (seedanceTier === 'lite' && baseModelId?.includes('-pro')) {
        targetModelId = baseModelId.replace('-pro', '-lite');
        const targetModel = allModels.find(m => m.modelId === targetModelId);
        if (targetModel) {
          actualModelId = targetModel.id;
          console.log('[Generate] Seedance: Switching to Lite:', targetModelId);
        }
      } else if (seedanceTier === 'pro' && baseModelId?.includes('-lite')) {
        targetModelId = baseModelId.replace('-lite', '-pro');
        const targetModel = allModels.find(m => m.modelId === targetModelId);
        if (targetModel) {
          actualModelId = targetModel.id;
          console.log('[Generate] Seedance: Switching to Pro:', targetModelId);
        }
      }
      
      // First Frame (optional)
      if (seedanceFirstFrame) {
        options.imageUrl = seedanceFirstFrame;
      }
    }
    
    // Kling options - Auto-switch based on option (Standard/Pro)
    else if (selectedModel?.modelId?.startsWith('kling/')) {
      // Auto-switch to correct model based on option
      if (klingOption === 'standard') {
        const standardModel = allModels.find(m => m.modelId === 'kling/v2-1-standard');
        if (standardModel) {
          actualModelId = standardModel.id;
          console.log('[Generate] Switched to Kling Standard');
        }
      } else {
        // Pro is default (already selected)
        const proModel = allModels.find(m => m.modelId === 'kling/v2-1-pro');
        if (proModel) {
          actualModelId = proModel.id;
          console.log('[Generate] Using Kling Pro');
        }
      }
      
      options.duration = String(duration); // Backend expects string "5" or "10"
      
      // Kling requires First Frame (always)
      if (!klingFirstFrame) {
        toast.error('Kling requires a First Frame image');
        return;
      }
      options.imageUrl = klingFirstFrame; // First Frame
      
      // End Frame (optional, Pro only)
      if (klingOption === 'pro' && klingEndFrame) {
        options.endImageUrl = klingEndFrame; // End Frame
      }
    }
    
    // Sora 2 options
    else if (selectedModel?.modelId?.startsWith('sora-2')) {
      options.aspectRatio = sora2AspectRatio;
      options.nFrames = sora2Duration; // "10", "15", or "25"
      options.size = sora2Size; // "standard" or "high"
      
      // Auto-detect image-to-video mode
      const hasImages = uploadedImages.length > 0;
      if (hasImages) {
        // Switch to image-to-video variant
        const baseModelId = selectedModel.modelId;
        if (baseModelId?.includes('text-to-video')) {
          const targetModelId = baseModelId.replace('text-to-video', 'image-to-video');
          const targetModel = allModels.find(m => m.modelId === targetModelId);
          if (targetModel) {
            actualModelId = targetModel.id;
            console.log('[Generate] Sora 2: Switching to image-to-video:', targetModelId);
          }
        }
        options.imageUrls = uploadedImages; // Array of image URLs
      }
    }
    
    // Veo 3 options
    else if (selectedModel?.modelId?.startsWith('veo')) {
      options.aspectRatio = veo3AspectRatio;
      options.generationType = veo3GenerationType;
      
      if (veo3GenerationType === 'FIRST_AND_LAST_FRAMES_2_VIDEO') {
        // Validate First Frame is required
        if (!veo3FirstFrame) {
          toast.error('Veo 3: First Frame is required for First & Last Frames mode');
          return;
        }
        // Build imageUrls array like Desktop
        const imageUrls: string[] = [];
        if (veo3FirstFrame) imageUrls.push(veo3FirstFrame);
        if (veo3LastFrame) imageUrls.push(veo3LastFrame);
        options.imageUrls = imageUrls;
      }
      // TEXT_2_VIDEO mode doesn't need image URLs
    }
    
    // Nano Banana options (IMAGE generation)
    else if (selectedModel?.modelId?.includes('nano-banana')) {
      options.aspectRatio = aspectRatio;
      // Nano Banana Edit uses imageUrls (array), not imageUrl (single)
      if (uploadedImages.length > 0) {
        options.imageUrls = uploadedImages; // Array of images for edit
      }
    }
    
    // Generic fallback for other models
    else {
      if (aspectRatio) options.aspectRatio = aspectRatio;
      // Don't send duration for unknown models (may be image models)
      if (uploadedImages.length > 0) {
        options.imageUrl = uploadedImages[0];
      }
    }

    createGeneration.mutate({
      modelId: actualModelId, // Use actualModelId (may be switched to edit model)
      prompt,
      ...options, // Spread options into the mutation object
    });
  };

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-background flex flex-col" style={{ height: '100dvh' }}>
      {/* Header - Fixed */}
      <div className="flex-shrink-0 bg-background border-b border-border">
        <div className="flex items-center justify-between px-3 h-12">
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-muted rounded-full transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
          <h2 className="text-sm font-semibold">Create</h2>
          <div className="w-8" /> {/* Spacer */}
        </div>
      </div>

      {/* Content - Scrollable */}
      <div className="flex-1 overflow-y-auto overscroll-contain" style={{ WebkitOverflowScrolling: 'touch' }}>
        <div className="p-3 pb-24 space-y-3">
          {/* Type Selector - Compact Pills */}
          <div className="flex gap-1.5 p-1 bg-muted rounded-lg">
            <button
              onClick={() => {
                setType('image');
                setSelectedModelId('');
                setUploadedImages([]);
              }}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                type === 'image'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <ImageIcon className="h-3.5 w-3.5" />
              Image
            </button>
            <button
              onClick={() => {
                setType('video');
                setSelectedModelId('');
                setUploadedImages([]);
              }}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                type === 'video'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <VideoIcon className="h-3.5 w-3.5" />
              Video
            </button>
          </div>

          {/* Prompt Input - Compact */}
          <div>
            <label className="block text-xs font-medium mb-1.5">Prompt</label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe what you want to create..."
              className="w-full px-3 py-2 text-sm bg-muted border-0 rounded-lg resize-none focus:outline-none focus:ring-1 focus:ring-primary"
              rows={3}
            />
          </div>

          {/* Model Selector - Compact */}
          <div>
            <label className="block text-xs font-medium mb-1.5">Model</label>
            {modelsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : models.length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground">
                No {type} models available
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {models.map((model) => (
                  <button
                    key={model.id}
                    onClick={() => setSelectedModelId(model.id)}
                    className={`p-2 text-left rounded-lg border transition-colors ${
                      selectedModelId === model.id
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <div className="text-xs font-medium truncate">
                      {model.modelId?.startsWith('kling/v2-1') 
                        ? 'Kling 2.1' 
                        : model.modelId?.startsWith('bytedance/v1-seedance') 
                        ? 'Seedance' 
                        : model.name}
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">
                      {calculateCost(model)} credits
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Image Upload - Smart multi-image support */}
          {/* Hide for Kling (uses First/End Frame instead) */}
          {/* Hide for Veo 3 (uses First/Last Frame instead) */}
          {selectedModel && !selectedModel.modelId?.startsWith('kling/') && !selectedModel.modelId?.startsWith('veo') && (
            <div>
              <label className="block text-xs font-medium mb-1.5">
                Reference Images (Optional)
                {uploadedImages.length > 0 && (
                  <span className="ml-1.5 text-muted-foreground">({uploadedImages.length})</span>
                )}
              </label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageUpload}
                className="hidden"
              />
              
              {/* Image Grid */}
              {uploadedImages.length > 0 && (
                <div className="grid grid-cols-3 gap-2 mb-2">
                  {uploadedImages.map((img, idx) => (
                    <div key={idx} className="relative aspect-square">
                      <img
                        src={img}
                        alt={`Upload ${idx + 1}`}
                        className="w-full h-full object-cover rounded-lg border border-border"
                      />
                      <button
                        onClick={() => removeImage(idx)}
                        className="absolute -top-1 -right-1 p-0.5 bg-destructive text-destructive-foreground rounded-full shadow-lg"
                      >
                        <X className="h-3 w-3" />
                      </button>
                      {/* Label for Veo3 frames */}
                      {selectedModel.modelId?.startsWith('veo') && uploadedImages.length <= 2 && (
                        <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[10px] text-center py-0.5 rounded-b-lg">
                          {idx === 0 ? 'First' : 'Last'} Frame
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
              
              {/* Upload Button */}
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="w-full h-20 flex flex-col items-center justify-center gap-1.5 bg-muted border-2 border-dashed border-border rounded-lg hover:border-primary transition-colors"
              >
                {isUploading ? (
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                ) : (
                  <>
                    <Upload className="h-4 w-4 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">
                      {uploadedImages.length > 0 ? 'Add more' : 'Tap to upload'}
                    </span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* Model-Specific Options */}
          {selectedModel && (
            <div className="space-y-2.5">
              {/* Ideogram: Rendering Speed */}
              {selectedModel.modelId?.startsWith('ideogram/') && (
                <div>
                  <label className="block text-xs font-medium mb-1.5">Rendering Speed</label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {['TURBO', 'BALANCED', 'QUALITY'].map((speed) => (
                      <button
                        key={speed}
                        onClick={() => setRenderingSpeed(speed)}
                        className={`px-2 py-1.5 text-xs font-medium rounded-md capitalize transition-colors ${
                          renderingSpeed === speed
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted text-muted-foreground hover:bg-muted/80'
                        }`}
                      >
                        {speed}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Ideogram: Number of Images */}
              {selectedModel.modelId?.startsWith('ideogram/') && (
                <div>
                  <label className="block text-xs font-medium mb-1.5">Number of Images</label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {['1', '2', '3', '4'].map((num) => (
                      <button
                        key={num}
                        onClick={() => setNumImages(num)}
                        className={`px-2 py-1.5 text-xs font-medium rounded-md transition-colors ${
                          numImages === num
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted text-muted-foreground hover:bg-muted/80'
                        }`}
                      >
                        {num}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Seedream V4: Resolution */}
              {selectedModel.modelId?.startsWith('bytedance/seedream-v4') && (
                <div>
                  <label className="block text-xs font-medium mb-1.5">Resolution</label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {['1K', '2K', '4K'].map((res) => (
                      <button
                        key={res}
                        onClick={() => setResolution(res)}
                        className={`px-2 py-1.5 text-xs font-medium rounded-md transition-colors ${
                          resolution === res
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted text-muted-foreground hover:bg-muted/80'
                        }`}
                      >
                        {res}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Seedream V4: Number of Images */}
              {selectedModel.modelId?.startsWith('bytedance/seedream-v4') && (
                <div>
                  <label className="block text-xs font-medium mb-1.5">Number of Images</label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[1, 2, 4].map((num) => (
                      <button
                        key={num}
                        onClick={() => setMaxImages(num)}
                        className={`px-2 py-1.5 text-xs font-medium rounded-md transition-colors ${
                          maxImages === num
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted text-muted-foreground hover:bg-muted/80'
                        }`}
                      >
                        {num}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Seedance: Resolution */}
              {selectedModel.modelId?.startsWith('bytedance/v1-') && (
                <div>
                  <label className="block text-xs font-medium mb-1.5">Resolution</label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {['480p', '720p', '1080p'].map((res) => (
                      <button
                        key={res}
                        onClick={() => setResolution(res)}
                        className={`px-2 py-1.5 text-xs font-medium rounded-md transition-colors ${
                          resolution === res
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted text-muted-foreground hover:bg-muted/80'
                        }`}
                      >
                        {res}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Seedance: Duration */}
              {selectedModel.modelId?.startsWith('bytedance/v1-') && (
                <div>
                  <label className="block text-xs font-medium mb-1.5">Duration</label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {[5, 10].map((dur) => (
                      <button
                        key={dur}
                        onClick={() => setDuration(dur)}
                        className={`px-2 py-1.5 text-xs font-medium rounded-md transition-colors ${
                          duration === dur
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted text-muted-foreground hover:bg-muted/80'
                        }`}
                      >
                        {dur}s
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Kling: First Frame + End Frame Upload */}
              {selectedModel.modelId?.startsWith('kling/') && (
                <div className="space-y-2">
                  {/* First Frame (Required) */}
                  <div>
                    <label className="block text-xs font-medium mb-1.5">First Frame (Required)</label>
                    <input
                      ref={klingFirstInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleKlingFirstFrameUpload}
                      className="hidden"
                    />
                    {!klingFirstFrame ? (
                      <button
                        onClick={() => klingFirstInputRef.current?.click()}
                        disabled={isUploadingKlingFirst}
                        className="w-full h-24 flex flex-col items-center justify-center gap-1.5 bg-muted border-2 border-dashed border-border rounded-lg hover:border-primary transition-colors"
                      >
                        {isUploadingKlingFirst ? (
                          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                        ) : (
                          <>
                            <Upload className="h-4 w-4 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">Tap to upload</span>
                          </>
                        )}
                      </button>
                    ) : (
                      <div className="relative h-24">
                        <img
                          src={klingFirstFrame}
                          alt="First Frame"
                          className="w-full h-full object-cover rounded-lg border border-border"
                        />
                        <button
                          onClick={() => setKlingFirstFrame(null)}
                          className="absolute -top-1 -right-1 p-0.5 bg-destructive text-destructive-foreground rounded-full shadow-lg"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* End Frame (Optional, Pro only) */}
                  {klingOption === 'pro' && (
                    <div>
                      <label className="block text-xs font-medium mb-1.5">End Frame (Optional)</label>
                      <input
                        ref={klingEndInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleKlingEndFrameUpload}
                        className="hidden"
                      />
                      {!klingEndFrame ? (
                        <button
                          onClick={() => klingEndInputRef.current?.click()}
                          disabled={isUploadingKlingEnd}
                          className="w-full h-24 flex flex-col items-center justify-center gap-1.5 bg-muted border-2 border-dashed border-border rounded-lg hover:border-primary transition-colors"
                        >
                          {isUploadingKlingEnd ? (
                            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                          ) : (
                            <>
                              <Upload className="h-4 w-4 text-muted-foreground" />
                              <span className="text-xs text-muted-foreground">Tap to upload</span>
                            </>
                          )}
                        </button>
                      ) : (
                        <div className="relative h-24">
                          <img
                            src={klingEndFrame}
                            alt="End Frame"
                            className="w-full h-full object-cover rounded-lg border border-border"
                          />
                          <button
                            onClick={() => setKlingEndFrame(null)}
                            className="absolute -top-1 -right-1 p-0.5 bg-destructive text-destructive-foreground rounded-full shadow-lg"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Kling: Model Option (Standard/Pro) */}
              {selectedModel.modelId?.startsWith('kling/') && (
                <div>
                  <label className="block text-xs font-medium mb-1.5">Model Option</label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {['pro', 'standard'].map((opt) => (
                      <button
                        key={opt}
                        onClick={() => setKlingOption(opt as 'pro' | 'standard')}
                        className={`px-2 py-1.5 text-xs font-medium rounded-md capitalize transition-colors ${
                          klingOption === opt
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted text-muted-foreground hover:bg-muted/80'
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Kling: Duration */}
              {selectedModel.modelId?.startsWith('kling/') && (
                <div>
                  <label className="block text-xs font-medium mb-1.5">Duration</label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {[5, 10].map((dur) => (
                      <button
                        key={dur}
                        onClick={() => setDuration(dur)}
                        className={`px-2 py-1.5 text-xs font-medium rounded-md transition-colors ${
                          duration === dur
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted text-muted-foreground hover:bg-muted/80'
                        }`}
                      >
                        {dur}s
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Sora 2: Aspect Ratio */}
              {selectedModel.modelId?.startsWith('sora-2') && (
                <div>
                  <label className="block text-xs font-medium mb-1.5">Aspect Ratio</label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {(['16:9', '9:16'] as const).map((ratio) => (
                      <button
                        key={ratio}
                        onClick={() => setSora2AspectRatio(ratio)}
                        className={`px-2 py-1.5 text-xs font-medium rounded-md transition-colors ${
                          sora2AspectRatio === ratio
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted text-muted-foreground hover:bg-muted/80'
                        }`}
                      >
                        {ratio}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Sora 2: Duration (10s, 15s only - no 25s for non-Storyboard) */}
              {selectedModel.modelId?.startsWith('sora-2') && (
                <div>
                  <label className="block text-xs font-medium mb-1.5">Duration</label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {(['10', '15'] as const).map((dur) => (
                      <button
                        key={dur}
                        onClick={() => setSora2Duration(dur)}
                        className={`px-2 py-1.5 text-xs font-medium rounded-md transition-colors ${
                          sora2Duration === dur
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted text-muted-foreground hover:bg-muted/80'
                        }`}
                      >
                        {dur}s
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Sora 2: Size (Pro only) */}
              {selectedModel.modelId?.includes('sora-2-pro') && !selectedModel.modelId?.includes('storyboard') && (
                <div>
                  <label className="block text-xs font-medium mb-1.5">Quality</label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {(['standard', 'high'] as const).map((size) => (
                      <button
                        key={size}
                        onClick={() => setSora2Size(size)}
                        className={`px-2 py-1.5 text-xs font-medium rounded-md capitalize transition-colors ${
                          sora2Size === size
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted text-muted-foreground hover:bg-muted/80'
                        }`}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Veo 3: Generation Type */}
              {selectedModel.modelId?.startsWith('veo') && (
                <div>
                  <label className="block text-xs font-medium mb-1.5">Generation Type</label>
                  <div className="grid grid-cols-1 gap-1.5">
                    <button
                      onClick={() => setVeo3GenerationType('TEXT_2_VIDEO')}
                      className={`px-2 py-1.5 text-xs font-medium rounded-md transition-colors ${
                        veo3GenerationType === 'TEXT_2_VIDEO'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground hover:bg-muted/80'
                      }`}
                    >
                      Text to Video
                    </button>
                    <button
                      onClick={() => setVeo3GenerationType('FIRST_AND_LAST_FRAMES_2_VIDEO')}
                      className={`px-2 py-1.5 text-xs font-medium rounded-md transition-colors ${
                        veo3GenerationType === 'FIRST_AND_LAST_FRAMES_2_VIDEO'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground hover:bg-muted/80'
                      }`}
                    >
                      First & Last Frames
                    </button>
                  </div>
                </div>
              )}

              {/* Veo 3: Aspect Ratio */}
              {selectedModel.modelId?.startsWith('veo') && (
                <div>
                  <label className="block text-xs font-medium mb-1.5">Aspect Ratio</label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {(['16:9', '9:16', 'Auto'] as const).map((ratio) => (
                      <button
                        key={ratio}
                        onClick={() => setVeo3AspectRatio(ratio)}
                        className={`px-2 py-1.5 text-xs font-medium rounded-md transition-colors ${
                          veo3AspectRatio === ratio
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted text-muted-foreground hover:bg-muted/80'
                        }`}
                      >
                        {ratio}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Veo 3: First Frame Upload (for FIRST_AND_LAST_FRAMES mode) */}
              {selectedModel.modelId?.startsWith('veo') && veo3GenerationType === 'FIRST_AND_LAST_FRAMES_2_VIDEO' && (
                <div>
                  <label className="block text-xs font-medium mb-1.5">First Frame (Required)</label>
                  <input
                    ref={veo3FirstFrameInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleVeo3FirstFrameUpload}
                    className="hidden"
                  />
                  {veo3FirstFrame ? (
                    <div className="relative aspect-video w-full">
                      <img
                        src={veo3FirstFrame}
                        alt="First Frame"
                        className="w-full h-full object-cover rounded-lg border border-border"
                      />
                      <button
                        onClick={() => setVeo3FirstFrame('')}
                        className="absolute -top-1 -right-1 p-0.5 bg-destructive text-destructive-foreground rounded-full shadow-lg"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => veo3FirstFrameInputRef.current?.click()}
                      disabled={isVeo3FirstFrameUploading}
                      className="w-full h-20 flex flex-col items-center justify-center gap-1.5 bg-muted border-2 border-dashed border-border rounded-lg hover:border-primary transition-colors"
                    >
                      {isVeo3FirstFrameUploading ? (
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      ) : (
                        <>
                          <Upload className="h-4 w-4 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">Upload First Frame</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              )}

              {/* Veo 3: Last Frame Upload (for FIRST_AND_LAST_FRAMES mode) */}
              {selectedModel.modelId?.startsWith('veo') && veo3GenerationType === 'FIRST_AND_LAST_FRAMES_2_VIDEO' && (
                <div>
                  <label className="block text-xs font-medium mb-1.5">Last Frame (Optional)</label>
                  <input
                    ref={veo3LastFrameInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleVeo3LastFrameUpload}
                    className="hidden"
                  />
                  {veo3LastFrame ? (
                    <div className="relative aspect-video w-full">
                      <img
                        src={veo3LastFrame}
                        alt="Last Frame"
                        className="w-full h-full object-cover rounded-lg border border-border"
                      />
                      <button
                        onClick={() => setVeo3LastFrame('')}
                        className="absolute -top-1 -right-1 p-0.5 bg-destructive text-destructive-foreground rounded-full shadow-lg"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => veo3LastFrameInputRef.current?.click()}
                      disabled={isVeo3LastFrameUploading}
                      className="w-full h-20 flex flex-col items-center justify-center gap-1.5 bg-muted border-2 border-dashed border-border rounded-lg hover:border-primary transition-colors"
                    >
                      {isVeo3LastFrameUploading ? (
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      ) : (
                        <>
                          <Upload className="h-4 w-4 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">Upload Last Frame</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              )}

              {/* Seedance: Model Tier */}
              {selectedModel.modelId?.includes('seedance') && (
                <div>
                  <label className="block text-xs font-medium mb-1.5">Model Tier</label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {(['lite', 'pro'] as const).map((tier) => (
                      <button
                        key={tier}
                        onClick={() => setSeedanceTier(tier)}
                        className={`px-2 py-1.5 text-xs font-medium rounded-md capitalize transition-colors ${
                          seedanceTier === tier
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted text-muted-foreground hover:bg-muted/80'
                        }`}
                      >
                        {tier}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Seedance: Duration */}
              {selectedModel.modelId?.includes('seedance') && (
                <div>
                  <label className="block text-xs font-medium mb-1.5">Duration</label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {(['5', '10'] as const).map((dur) => (
                      <button
                        key={dur}
                        onClick={() => setSeedanceDuration(dur)}
                        className={`px-2 py-1.5 text-xs font-medium rounded-md transition-colors ${
                          seedanceDuration === dur
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted text-muted-foreground hover:bg-muted/80'
                        }`}
                      >
                        {dur}s
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Seedance: First Frame Upload */}
              {selectedModel.modelId?.includes('seedance') && (
                <div>
                  <label className="block text-xs font-medium mb-1.5">First Frame (Optional)</label>
                  <input
                    ref={seedanceFirstFrameInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleSeedanceFirstFrameUpload}
                    className="hidden"
                  />
                  {seedanceFirstFrame ? (
                    <div className="relative aspect-video w-full">
                      <img
                        src={seedanceFirstFrame}
                        alt="First Frame"
                        className="w-full h-full object-cover rounded-lg border border-border"
                      />
                      <button
                        onClick={() => setSeedanceFirstFrame('')}
                        className="absolute -top-1 -right-1 p-0.5 bg-destructive text-destructive-foreground rounded-full shadow-lg"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => seedanceFirstFrameInputRef.current?.click()}
                      disabled={isSeedanceFirstFrameUploading}
                      className="w-full h-20 flex flex-col items-center justify-center gap-1.5 bg-muted border-2 border-dashed border-border rounded-lg hover:border-primary transition-colors"
                    >
                      {isSeedanceFirstFrameUploading ? (
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      ) : (
                        <>
                          <Upload className="h-4 w-4 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">Upload First Frame</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              )}

              {/* Aspect Ratio (for other models, not Sora 2, Veo, Seedance) */}
              {!selectedModel.modelId?.startsWith('bytedance/v1-') && !selectedModel.modelId?.startsWith('kling/') && !selectedModel.modelId?.startsWith('sora-2') && !selectedModel.modelId?.startsWith('veo') && !selectedModel.modelId?.includes('seedance') && (
                <div>
                  <label className="block text-xs font-medium mb-1.5">Aspect Ratio</label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {['16:9', '9:16', '1:1'].map((ratio) => (
                      <button
                        key={ratio}
                        onClick={() => setAspectRatio(ratio)}
                        className={`px-2 py-1.5 text-xs font-medium rounded-md transition-colors ${
                          aspectRatio === ratio
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted text-muted-foreground hover:bg-muted/80'
                        }`}
                      >
                        {ratio}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Fixed Bottom Button - Compact */}
      <div className="fixed bottom-0 left-0 right-0 z-[60] p-3 bg-background border-t border-border safe-bottom" style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom))' }}>
        <button
          onClick={handleGenerate}
          disabled={createGeneration.isPending || !prompt.trim() || !selectedModelId}
          className="w-full py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white text-sm font-semibold rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity flex items-center justify-center gap-2"
        >
          {createGeneration.isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Generating...
            </>
          ) : (
            `Generate (${creditCost} credits)`
          )}
        </button>
      </div>
    </div>
  );
}

