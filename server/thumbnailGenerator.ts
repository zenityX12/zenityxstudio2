import { exec } from 'child_process';
import { promisify } from 'util';
import { randomBytes } from 'crypto';
import { writeFile, unlink } from 'fs/promises';
import { storagePut } from './storage';

const execAsync = promisify(exec);

/**
 * Generate thumbnail from video URL using FFmpeg
 * @param videoUrl - URL of the video file
 * @param userId - User ID for organizing thumbnails in S3
 * @returns Thumbnail URL in S3
 */
export async function generateVideoThumbnail(
  videoUrl: string,
  userId: string,
  generationId: string
): Promise<string> {
  const tempVideoPath = `/tmp/video-${randomBytes(16).toString('hex')}.mp4`;
  const tempThumbnailPath = `/tmp/thumb-${randomBytes(16).toString('hex')}.jpg`;

  try {
    // Download video to temp file
    const { stdout: downloadOutput } = await execAsync(
      `curl -L -o "${tempVideoPath}" "${videoUrl}"`,
      { maxBuffer: 100 * 1024 * 1024 } // 100MB buffer
    );

    // Extract frame at 0.5 second using FFmpeg
    // -ss 0.5: seek to 0.5 seconds
    // -i: input file
    // -vframes 1: extract only 1 frame
    // -vf scale=400:-1: resize to 400px width, maintain aspect ratio
    // -q:v 2: JPEG quality (2 = high quality, 1-31 scale)
    const { stdout: ffmpegOutput } = await execAsync(
      `ffmpeg -ss 0.5 -i "${tempVideoPath}" -vframes 1 -vf "scale=400:-1" -q:v 2 "${tempThumbnailPath}"`,
      { maxBuffer: 50 * 1024 * 1024 } // 50MB buffer
    );

    // Read thumbnail file
    const fs = await import('fs/promises');
    const thumbnailBuffer = await fs.readFile(tempThumbnailPath);

    // Upload to S3 with organized folder structure
    const thumbnailKey = `thumbnails/${userId}/${generationId}.jpg`;
    const { url } = await storagePut(thumbnailKey, thumbnailBuffer, 'image/jpeg');

    // Clean up temp files
    await Promise.all([
      unlink(tempVideoPath).catch(() => {}),
      unlink(tempThumbnailPath).catch(() => {})
    ]);

    return url;
  } catch (error) {
    // Clean up temp files on error
    await Promise.all([
      unlink(tempVideoPath).catch(() => {}),
      unlink(tempThumbnailPath).catch(() => {})
    ]);

    console.error('[ThumbnailGenerator] Error generating thumbnail:', error);
    throw new Error(`Failed to generate thumbnail: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Check if FFmpeg is available
 */
export async function checkFFmpegAvailable(): Promise<boolean> {
  try {
    await execAsync('ffmpeg -version');
    return true;
  } catch {
    return false;
  }
}

