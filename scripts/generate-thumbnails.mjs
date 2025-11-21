#!/usr/bin/env node

/**
 * Batch Video Thumbnail Generation Script
 * 
 * Generates thumbnails for all videos that don't have one yet.
 * Run this script as admin to backfill thumbnails for existing videos.
 * 
 * Usage:
 *   node scripts/generate-thumbnails.mjs [limit]
 * 
 * Example:
 *   node scripts/generate-thumbnails.mjs 100
 */

import { generateVideoThumbnail } from '../server/thumbnailGenerator.js';
import { getDb } from '../server/db.js';
import { generations } from '../drizzle/schema.js';
import { eq, and, isNull } from 'drizzle-orm';

const limit = parseInt(process.argv[2]) || 10;

console.log(`🎬 Starting batch thumbnail generation (limit: ${limit})...`);

async function main() {
  const db = await getDb();
  if (!db) {
    console.error('❌ Database not available');
    process.exit(1);
  }

  // Get videos without thumbnails
  const videos = await db
    .select()
    .from(generations)
    .where(and(
      eq(generations.type, 'video'),
      eq(generations.status, 'completed'),
      isNull(generations.thumbnailUrl)
    ))
    .limit(limit);

  console.log(`📹 Found ${videos.length} videos without thumbnails`);

  if (videos.length === 0) {
    console.log('✅ All videos already have thumbnails!');
    process.exit(0);
  }

  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < videos.length; i++) {
    const video = videos[i];
    console.log(`\n[${i + 1}/${videos.length}] Processing ${video.id}...`);

    try {
      // Get video URL
      let videoUrl = null;
      if (video.resultUrls) {
        try {
          const urls = JSON.parse(video.resultUrls);
          videoUrl = urls[0];
        } catch {}
      }
      if (!videoUrl) {
        videoUrl = video.resultUrl;
      }

      if (!videoUrl) {
        console.log(`  ⚠️  No video URL found, skipping`);
        failCount++;
        continue;
      }

      // Generate thumbnail
      console.log(`  🎨 Generating thumbnail...`);
      const thumbnailUrl = await generateVideoThumbnail(videoUrl, video.userId);

      // Update database
      await db
        .update(generations)
        .set({ thumbnailUrl })
        .where(eq(generations.id, video.id));

      console.log(`  ✅ Success! Thumbnail: ${thumbnailUrl}`);
      successCount++;
    } catch (error) {
      console.error(`  ❌ Error:`, error.message);
      failCount++;
    }
  }

  console.log(`\n📊 Summary:`);
  console.log(`  ✅ Success: ${successCount}`);
  console.log(`  ❌ Failed: ${failCount}`);
  console.log(`  📈 Total: ${videos.length}`);
  console.log(`\n🎉 Done!`);
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

