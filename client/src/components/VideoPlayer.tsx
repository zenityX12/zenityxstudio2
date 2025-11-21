import { useState } from "react";
import { Play } from "lucide-react";

interface VideoPlayerProps {
  src: string;
  thumbnailUrl?: string | null;
  className?: string;
  prompt?: string;
}

/**
 * VideoPlayer component with thumbnail poster and smooth loading
 * Optimized for both mobile and desktop viewing
 */
export function VideoPlayer({ src, thumbnailUrl, className = "", prompt }: VideoPlayerProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  return (
    <div className={`relative ${className}`}>
      {/* Loading indicator */}
      {isLoading && !hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-sm rounded">
          <div className="flex flex-col items-center gap-2">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
            <p className="text-sm text-white">Loading video...</p>
          </div>
        </div>
      )}

      {/* Error state */}
      {hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 rounded">
          <div className="text-center p-4">
            <p className="text-white mb-2">Failed to load video</p>
            <button
              onClick={() => {
                setHasError(false);
                setIsLoading(true);
              }}
              className="text-sm text-blue-400 hover:text-blue-300 underline"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Play button overlay when thumbnail is shown */}
      {thumbnailUrl && isLoading && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="bg-black/50 rounded-full p-4 backdrop-blur-sm">
            <Play className="h-12 w-12 text-white fill-white" />
          </div>
        </div>
      )}

      <video
        src={src}
        poster={thumbnailUrl || undefined}
        controls
        preload="metadata"
        className={`w-full aspect-video bg-black ${className}`}
        onLoadedData={() => setIsLoading(false)}
        onError={() => {
          setIsLoading(false);
          setHasError(true);
        }}
        onLoadStart={() => setIsLoading(true)}
        aria-label={prompt || "Video player"}
      />
    </div>
  );
}

