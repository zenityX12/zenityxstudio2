import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { Loader2, Play, CheckCircle2, XCircle, Image, Info } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";

export function ThumbnailManager() {
  const [batchSize, setBatchSize] = useState("10");
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0, successful: 0, failed: 0 });
  const [autoContinue, setAutoContinue] = useState(false);


  const utils = trpc.useUtils();

  // Thumbnail Statistics from database
  const { data: stats, refetch: refetchStats } = trpc.thumbnail.getStats.useQuery();

  const batchGenerateMutation = trpc.thumbnail.batchGenerate.useMutation({
    onSuccess: (data) => {
      setProgress(prev => ({
        current: prev.current + data.total,
        total: prev.total,
        successful: prev.successful + data.successful,
        failed: prev.failed + data.failed
      }));

      toast.success(`Batch completed: ${data.successful}/${data.total} successful`);

      // Auto-continue if enabled and there were results
      if (autoContinue && data.total > 0) {
        setTimeout(() => {
          handleBatchGenerate();
        }, 2000); // 2 second delay between batches
      } else {
        setIsProcessing(false);
      }
    },
    onError: (error) => {
      toast.error(`Batch generation failed: ${error.message}`);
      setIsProcessing(false);
    },
  });

  const handleBatchGenerate = () => {
    const limit = parseInt(batchSize);
    if (isNaN(limit) || limit < 1 || limit > 100) {
      toast.error("Batch size must be between 1 and 100");
      return;
    }

    setIsProcessing(true);
    batchGenerateMutation.mutate({ limit });
  };

  const handleStartAutoContinue = () => {
    setAutoContinue(true);
    setProgress({ current: 0, total: 0, successful: 0, failed: 0 });
    handleBatchGenerate();
  };

  const handleStop = () => {
    setAutoContinue(false);
    setIsProcessing(false);
    toast.info("Batch processing stopped");
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Video Thumbnail Generator</CardTitle>
          <CardDescription>
            Generate thumbnails for videos that don't have them yet
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="batchSize">Batch Size</Label>
            <Input
              id="batchSize"
              type="number"
              min="1"
              max="100"
              value={batchSize}
              onChange={(e) => setBatchSize(e.target.value)}
              disabled={isProcessing}
              placeholder="10"
            />
            <p className="text-xs text-muted-foreground">
              Number of videos to process per batch (1-100). Smaller batches prevent timeout.
            </p>
          </div>

          <div className="flex gap-2">
            {!isProcessing ? (
              <>
                <Button onClick={handleBatchGenerate} disabled={batchGenerateMutation.isPending}>
                  <Play className="h-4 w-4 mr-2" />
                  Generate Single Batch
                </Button>
                <Button onClick={handleStartAutoContinue} variant="default">
                  <Play className="h-4 w-4 mr-2" />
                  Auto-Continue Mode
                </Button>
              </>
            ) : (
              <Button onClick={handleStop} variant="destructive">
                Stop Processing
              </Button>
            )}
          </div>

          {(isProcessing || progress.current > 0) && (
            <Card className="bg-muted/50">
              <CardContent className="pt-6">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Progress</span>
                    <span className="text-sm text-muted-foreground">
                      {progress.current} videos processed
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 text-green-600">
                      <CheckCircle2 className="h-4 w-4" />
                      <span className="text-sm font-medium">{progress.successful} successful</span>
                    </div>
                    <div className="flex items-center gap-2 text-red-600">
                      <XCircle className="h-4 w-4" />
                      <span className="text-sm font-medium">{progress.failed} failed</span>
                    </div>
                  </div>
                  {isProcessing && (
                    <div className="flex items-center gap-2 text-blue-600">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-sm">Processing batch...</span>
                    </div>
                  )}
                  {autoContinue && isProcessing && (
                    <p className="text-xs text-muted-foreground">
                      Auto-continue mode enabled. Processing will continue until no more videos are found.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>

      {/* Thumbnail Statistics */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Thumbnail Statistics</CardTitle>
              <CardDescription>Overview of video thumbnail generation status</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => refetchStats()}>
              <Info className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {stats && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Total Videos</p>
                  <p className="text-2xl font-bold">{stats.totalVideos.toLocaleString()}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">With Thumbnails</p>
                  <p className="text-2xl font-bold text-green-600">{stats.videosWithThumbnails.toLocaleString()}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Without Thumbnails</p>
                  <p className="text-2xl font-bold text-orange-600">{stats.videosWithoutThumbnails.toLocaleString()}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Completion Rate</p>
                  <p className="text-2xl font-bold">{stats.completionRate}%</p>
                </div>
              </div>

              {stats.videosWithoutThumbnails > 0 && (
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertTitle>Pending Thumbnails</AlertTitle>
                  <AlertDescription>
                    {stats.videosWithoutThumbnails} video{stats.videosWithoutThumbnails > 1 ? 's' : ''} still need{stats.videosWithoutThumbnails === 1 ? 's' : ''} thumbnail generation.
                    Use the batch generation feature above to process them.
                  </AlertDescription>
                </Alert>
              )}

              {stats.videosWithoutThumbnails === 0 && stats.totalVideos > 0 && (
                <Alert>
                  <CheckCircle2 className="h-4 w-4" />
                  <AlertTitle>All Thumbnails Generated</AlertTitle>
                  <AlertDescription>
                    All {stats.totalVideos} video{stats.totalVideos > 1 ? 's have' : ' has'} thumbnail{stats.totalVideos > 1 ? 's' : ''}.
                  </AlertDescription>
                </Alert>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>How It Works</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            <strong>Single Batch:</strong> Processes the specified number of videos once.
          </p>
          <p>
            <strong>Auto-Continue Mode:</strong> Automatically processes batches until all videos have thumbnails.
            Each batch waits 2 seconds before starting the next one to prevent server overload.
          </p>
          <p>
            <strong>S3 Storage:</strong> Thumbnails are stored in <code>thumbnails/{"{userId}/{generationId}"}.jpg</code>
          </p>
          <p>
            <strong>Recommended:</strong> Use batch size of 10 to prevent timeout on slow video downloads.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

