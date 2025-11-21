import { useEffect, useRef, useState } from 'react';

interface VideoThumbnailProps {
  videoUrl: string;
  className?: string;
  alt?: string;
}

/**
 * VideoThumbnail Component
 * Extracts first frame from video using Canvas API
 * Displays as static image (no autoplay)
 */
export default function VideoThumbnail({ videoUrl, className = '', alt = 'Video thumbnail' }: VideoThumbnailProps) {
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!videoUrl) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    let isSubscribed = true;

    const generateThumbnail = () => {
      try {
        // Set canvas size to match video
        canvas.width = video.videoWidth || 400;
        canvas.height = video.videoHeight || 400;

        // Draw current video frame to canvas
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          setError(true);
          return;
        }

        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        // Convert canvas to data URL
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        
        if (isSubscribed) {
          setThumbnailUrl(dataUrl);
        }
      } catch (err) {
        console.error('Failed to generate video thumbnail:', err);
        if (isSubscribed) {
          setError(true);
        }
      }
    };

    const handleLoadedData = () => {
      // Seek to 0.5 second to get a better frame (not black)
      video.currentTime = 0.5;
    };

    const handleSeeked = () => {
      generateThumbnail();
    };

    const handleError = () => {
      if (isSubscribed) {
        setError(true);
      }
    };

    video.addEventListener('loadeddata', handleLoadedData);
    video.addEventListener('seeked', handleSeeked);
    video.addEventListener('error', handleError);

    // Start loading video
    video.load();

    // Cleanup
    return () => {
      isSubscribed = false;
      video.removeEventListener('loadeddata', handleLoadedData);
      video.removeEventListener('seeked', handleSeeked);
      video.removeEventListener('error', handleError);
      
      // Revoke object URL if exists
      if (thumbnailUrl && thumbnailUrl.startsWith('blob:')) {
        URL.revokeObjectURL(thumbnailUrl);
      }
    };
  }, [videoUrl]);

  if (error) {
    // Fallback to SVG placeholder on error
    return (
      <div className={`${className} bg-muted flex items-center justify-center`}>
        <svg className="w-12 h-12 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
    );
  }

  return (
    <>
      {/* Hidden video element for thumbnail extraction */}
      <video
        ref={videoRef}
        src={videoUrl}
        className="hidden"
        preload="metadata"
        muted
        playsInline
        crossOrigin="anonymous"
      />
      
      {/* Hidden canvas for frame extraction */}
      <canvas ref={canvasRef} className="hidden" />
      
      {/* Display thumbnail or loading state */}
      {thumbnailUrl ? (
        <img
          src={thumbnailUrl}
          alt={alt}
          className={`${className} object-cover`}
          loading="lazy"
        />
      ) : (
        <div className={`${className} bg-muted animate-pulse`} />
      )}
    </>
  );
}

