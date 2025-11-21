/**
 * Loading Skeleton Component
 * Skeleton loaders for mobile feed cards
 */
export function FeedCardSkeleton() {
  return (
    <div className="bg-card border-b border-border animate-pulse">
      {/* Image Skeleton */}
      <div className="w-full aspect-square bg-muted" />

      {/* Action Bar Skeleton */}
      <div className="flex items-center gap-4 px-4 py-3">
        <div className="h-6 w-6 bg-muted rounded-full" />
        <div className="h-6 w-6 bg-muted rounded-full" />
        <div className="h-6 w-6 bg-muted rounded-full" />
      </div>

      {/* Info Skeleton */}
      <div className="px-4 pb-3 space-y-2">
        <div className="flex items-center gap-2">
          <div className="h-5 w-20 bg-muted rounded-full" />
          <div className="h-4 w-16 bg-muted rounded" />
        </div>
        <div className="space-y-1">
          <div className="h-4 w-full bg-muted rounded" />
          <div className="h-4 w-3/4 bg-muted rounded" />
        </div>
      </div>
    </div>
  );
}

export function HistoryItemSkeleton() {
  return (
    <div className="bg-card border border-border rounded-lg p-4 animate-pulse">
      <div className="flex items-start gap-3">
        <div className="h-5 w-5 bg-muted rounded-full flex-shrink-0 mt-1" />
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2">
            <div className="h-4 w-24 bg-muted rounded" />
            <div className="h-4 w-20 bg-muted rounded" />
          </div>
          <div className="space-y-1">
            <div className="h-4 w-full bg-muted rounded" />
            <div className="h-4 w-2/3 bg-muted rounded" />
          </div>
          <div className="h-5 w-20 bg-muted rounded-full" />
        </div>
      </div>
    </div>
  );
}

