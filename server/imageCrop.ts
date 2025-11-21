import sharp from 'sharp';

/**
 * Auto-crop image to specified aspect ratio (center crop)
 * @param imageBuffer - Input image buffer
 * @param aspectRatio - Target aspect ratio ('16:9', '9:16', or 'Auto')
 * @returns Cropped image buffer as JPEG
 */
export async function autoCropImage(
  imageBuffer: Buffer,
  aspectRatio: '16:9' | '9:16' | 'Auto' = '16:9'
): Promise<Buffer> {
  const image = sharp(imageBuffer);
  const metadata = await image.metadata();

  if (!metadata.width || !metadata.height) {
    throw new Error('Invalid image: unable to read dimensions');
  }

  // If Auto, return resized image without cropping
  if (aspectRatio === 'Auto') {
    return image
      .resize(1920, undefined, { withoutEnlargement: true })
      .jpeg({ quality: 92 })
      .toBuffer();
  }

  // Calculate target aspect ratio
  const targetRatio = aspectRatio === '16:9' ? 16 / 9 : 9 / 16;
  const currentRatio = metadata.width / metadata.height;

  let cropWidth: number;
  let cropHeight: number;

  if (currentRatio > targetRatio) {
    // Image is wider than target - crop width
    cropHeight = metadata.height;
    cropWidth = Math.round(cropHeight * targetRatio);
  } else {
    // Image is taller than target - crop height
    cropWidth = metadata.width;
    cropHeight = Math.round(cropWidth / targetRatio);
  }

  // Center crop
  const left = Math.round((metadata.width - cropWidth) / 2);
  const top = Math.round((metadata.height - cropHeight) / 2);

  return image
    .extract({
      left: Math.max(0, left),
      top: Math.max(0, top),
      width: cropWidth,
      height: cropHeight,
    })
    .resize(1920, undefined, { withoutEnlargement: true })
    .jpeg({ quality: 92 })
    .toBuffer();
}

