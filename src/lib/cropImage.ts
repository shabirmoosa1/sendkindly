/**
 * Canvas-based image cropping utility for react-easy-crop.
 * Takes an image source URL and pixel-based crop area,
 * returns a cropped JPEG File ready for upload.
 */

export interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

function createImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => resolve(image);
    image.onerror = (err) => reject(err);
    image.src = url;
  });
}

export async function getCroppedImg(
  imageSrc: string,
  cropPixels: CropArea,
  quality = 0.85
): Promise<File> {
  const image = await createImage(imageSrc);

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas context not available');

  // Set canvas to the cropped dimensions
  canvas.width = cropPixels.width;
  canvas.height = cropPixels.height;

  // Draw the cropped region
  ctx.drawImage(
    image,
    cropPixels.x,
    cropPixels.y,
    cropPixels.width,
    cropPixels.height,
    0,
    0,
    cropPixels.width,
    cropPixels.height
  );

  // Convert to blob then File
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Crop failed'));
          return;
        }
        resolve(new File([blob], `cropped-${Date.now()}.jpg`, { type: 'image/jpeg' }));
      },
      'image/jpeg',
      quality
    );
  });
}
