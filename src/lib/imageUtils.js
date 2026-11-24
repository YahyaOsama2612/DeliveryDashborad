/**
 * Image processing utilities for client-side image uploading and previewing.
 */

/**
 * Converts a File object into a base64 Data URL link.
 * If the image is large, it scales it down proportionally (e.g. max 1280px)
 * to ensure fast uploads and prevent HTTP 413 Payload Too Large errors.
 *
 * @param {File} file - The file selected by the user.
 * @param {Object} [options]
 * @param {number} [options.maxDimension=1280] - Maximum width or height in pixels.
 * @param {number} [options.quality=0.85] - Compression quality for JPEG/WEBP (0 to 1).
 * @returns {Promise<string>} Data URL string (e.g. "data:image/jpeg;base64,...").
 */
export const fileToDataUrl = (file, options = {}) => {
  const { maxDimension = 1280, quality = 0.85 } = options;

  return new Promise((resolve, reject) => {
    if (!file || !(file instanceof File)) {
      return reject(new Error('Invalid file provided.'));
    }

    if (!file.type.startsWith('image/')) {
      return reject(new Error('Selected file is not an image.'));
    }

    // SVGs and GIFs are read directly without canvas processing
    if (file.type === 'image/svg+xml' || file.type === 'image/gif') {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
      return;
    }

    const reader = new FileReader();
    reader.onerror = (err) => reject(err);
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => {
        // Fallback to raw data URL if image decoding fails
        resolve(reader.result);
      };
      img.onload = () => {
        let { width, height } = img;

        // If dimensions are within bounds and file is under 500KB, use directly
        if (width <= maxDimension && height <= maxDimension && file.size < 500 * 1024) {
          return resolve(reader.result);
        }

        // Scale down proportionally
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          return resolve(reader.result);
        }

        // Smooth image scaling
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        // Keep PNG if PNG, otherwise use JPEG for better compression
        const targetType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
        const dataUrl = canvas.toDataURL(targetType, quality);
        resolve(dataUrl);
      };
      img.src = reader.result;
    };

    reader.readAsDataURL(file);
  });
};

/**
 * Normalizes an image data URL or bare base64 image payload.
 * @param {string} value
 * @returns {string}
 */
export const normalizeImageDataUrl = (value) => {
  if (typeof value !== 'string') return '';

  const trimmed = value.trim();
  if (!trimmed) return '';

  if (trimmed.toLowerCase().startsWith('data:image/')) {
    const commaIndex = trimmed.indexOf(',');
    if (commaIndex < 0) return trimmed;
    const metadata = trimmed.slice(0, commaIndex);
    if (!/;base64/i.test(metadata)) return trimmed;
    return `${metadata},${trimmed.slice(commaIndex + 1).replace(/\s/g, '')}`;
  }

  const base64 = trimmed.replace(/\s/g, '');
  const imageTypes = [
    { prefix: '/9j/', mimeType: 'image/jpeg' },
    { prefix: 'iVBORw0KGgo', mimeType: 'image/png' },
    { prefix: 'R0lGOD', mimeType: 'image/gif' },
    { prefix: 'UklGR', mimeType: 'image/webp' },
    { prefix: 'PHN2Zy', mimeType: 'image/svg+xml' },
    { prefix: 'PD94bWwg', mimeType: 'image/svg+xml' },
  ];
  const imageType = imageTypes.find(({ prefix }) => base64.startsWith(prefix));

  return imageType
    ? `data:${imageType.mimeType};base64,${base64}`
    : trimmed;
};

/**
 * Checks if a string is a valid Data URL or external HTTP/HTTPS URL.
 * @param {string} str
 * @returns {boolean}
 */
export const isValidImageUrl = (str) => {
  if (typeof str !== 'string') return false;
  const trimmed = str.trim();
  if (!trimmed) return false;
  return (
    trimmed.startsWith('data:image/') ||
    normalizeImageDataUrl(trimmed).startsWith('data:image/') ||
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('/') ||
    trimmed.startsWith('blob:')
  );
};

/**
 * Formats bytes to human-readable size string.
 * @param {number} bytes
 * @returns {string}
 */
export const formatFileSize = (bytes) => {
  if (!bytes || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
};
