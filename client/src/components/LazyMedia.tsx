import { useEffect, useRef, useState } from 'react';

interface LazyMediaProps {
  src: string;
  type: 'image' | 'video';
  alt?: string;
  className?: string;
  videoProps?: React.VideoHTMLAttributes<HTMLVideoElement>;
  imgProps?: React.ImgHTMLAttributes<HTMLImageElement>;
  onError?: () => void;
}

/**
 * LazyMedia Component with Intersection Observer
 * Only loads media when it enters the viewport
 * Improves performance for large galleries
 */
export default function LazyMedia({
  src,
  type,
  alt = '',
  className = '',
  videoProps,
  imgProps,
  onError,
}: LazyMediaProps) {
  const [isInView, setIsInView] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Create observer
    observerRef.current = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting && !isInView) {
          setIsInView(true);
        }
      },
      {
        rootMargin: '100px', // Start loading 100px before entering viewport
        threshold: 0.01,
      }
    );

    observerRef.current.observe(containerRef.current);

    // Cleanup
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
        observerRef.current = null;
      }
    };
  }, []); // Only run once on mount

  const handleError = () => {
    setHasError(true);
    onError?.();
  };

  const handleLoad = () => {
    setIsLoaded(true);
  };

  if (hasError) {
    return null;
  }

  return (
    <div ref={containerRef} className={className}>
      {!isLoaded && isInView && (
        // Loading placeholder (shimmer effect)
        <div className="w-full h-full bg-muted animate-pulse" />
      )}
      
      {isInView && (
        type === 'video' ? (
          <video
            src={src}
            className={`w-full h-full object-cover ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
            muted
            playsInline
            preload="metadata"
            webkit-playsinline="true"
            poster={src + '#t=0.1'}
            onError={handleError}
            onLoadedData={handleLoad}
            {...videoProps}
          />
        ) : (
          <img
            src={src}
            alt={alt}
            className={`w-full h-full object-cover ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
            loading="lazy"
            onError={handleError}
            onLoad={handleLoad}
            {...imgProps}
          />
        )
      )}
      
      {!isInView && (
        // Placeholder before entering viewport
        <div className="w-full h-full bg-muted" />
      )}
    </div>
  );
}

