import { Heart, Download, RefreshCw, MoreVertical } from 'lucide-react';
import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import LazyMedia from '@/components/LazyMedia';

interface MobileFeedCardProps {
  generation: {
    id: string;
    prompt: string;
    resultUrl?: string | null;
    resultUrls?: string | null;
    thumbnailUrl?: string | null;
    status: string;
    createdAt: Date;
    modelId: string;
  };
  modelName?: string;
  isVideo?: boolean;
  onDownload?: () => void;
  onReuse?: () => void;
  onMore?: () => void;
}

/**
 * Mobile Feed Card Component
 * Instagram-style card for displaying generation results
 */
export default function MobileFeedCard({
  generation,
  modelName = 'Unknown Model',
  isVideo = false,
  onDownload,
  onReuse,
  onMore,
}: MobileFeedCardProps) {
  const [liked, setLiked] = useState(false);
  const [showFullPrompt, setShowFullPrompt] = useState(false);

  // Get image/video URLs
  const getMediaUrls = (): string[] => {
    if (generation.resultUrls) {
      try {
        return JSON.parse(generation.resultUrls);
      } catch {
        return generation.resultUrl ? [generation.resultUrl] : [];
      }
    }
    return generation.resultUrl ? [generation.resultUrl] : [];
  };

  const mediaUrls = getMediaUrls();
  const hasMedia = mediaUrls.length > 0 && generation.status === 'completed';

  // Format timestamp
  const timeAgo = generation.createdAt
    ? formatDistanceToNow(new Date(generation.createdAt), { addSuffix: true })
    : '';

  // Truncate prompt for preview
  const promptPreview = generation.prompt.length > 100
    ? generation.prompt.slice(0, 100) + '...'
    : generation.prompt;

  return (
    <div className="bg-card border-b border-border">
      {/* Media Section */}
      {hasMedia && (
        <div className="relative w-full bg-muted">
          {isVideo ? (
            // Video Thumbnail (use backend thumbnail if available)
            <LazyMedia
              src={generation.thumbnailUrl || mediaUrls[0]}
              type="image"
              className="w-full aspect-auto object-cover"
            />
          ) : (
            // Image(s)
            <div className={`grid gap-0.5 h-full ${mediaUrls.length > 1 ? 'grid-cols-2' : ''}`}>
              {mediaUrls.map((url, idx) => (
                <img
                  key={idx}
                  src={url}
                  alt={`${generation.prompt} - ${idx + 1}`}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Processing/Failed State */}
      {!hasMedia && (
        <div className="w-full aspect-video bg-muted flex items-center justify-center">
          <div className="text-center p-4">
            <div className={`text-sm font-medium ${
              generation.status === 'failed' ? 'text-red-500' : 'text-muted-foreground'
            }`}>
              {generation.status === 'processing' && 'Generating...'}
              {generation.status === 'pending' && 'In Queue...'}
              {generation.status === 'failed' && 'Generation Failed'}
            </div>
          </div>
        </div>
      )}

      {/* Action Bar */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setLiked(!liked)}
            className="transition-transform active:scale-110 p-1 -m-1"
            aria-label="Like"
          >
            <Heart
              className={`h-6 w-6 ${
                liked ? 'fill-red-500 text-red-500' : 'text-foreground'
              }`}
            />
          </button>
          {onDownload && hasMedia && (
            <button
              onClick={onDownload}
              className="transition-transform active:scale-110 p-1 -m-1"
              aria-label="Download"
            >
              <Download className="h-6 w-6 text-foreground" />
            </button>
          )}
          {onReuse && (
            <button
              onClick={onReuse}
              className="transition-transform active:scale-110 p-1 -m-1"
              aria-label="Reuse prompt"
            >
              <RefreshCw className="h-6 w-6 text-foreground" />
            </button>
          )}
        </div>
        {onMore && (
          <button
            onClick={onMore}
            className="transition-transform active:scale-110 p-1 -m-1"
            aria-label="More options"
          >
            <MoreVertical className="h-6 w-6 text-foreground" />
          </button>
        )}
      </div>

      {/* Info Section */}
      <div className="px-4 pb-3">
        {/* Model & Time */}
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
            {modelName}
          </span>
          <span className="text-xs text-muted-foreground">{timeAgo}</span>
        </div>

        {/* Prompt */}
        <div className="text-sm">
          <p className={showFullPrompt ? '' : 'line-clamp-2'}>
            {showFullPrompt ? generation.prompt : promptPreview}
          </p>
          {generation.prompt.length > 100 && (
            <button
              onClick={() => setShowFullPrompt(!showFullPrompt)}
              className="text-muted-foreground text-xs mt-1 hover:text-foreground"
            >
              {showFullPrompt ? 'Show less' : 'Read more'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

