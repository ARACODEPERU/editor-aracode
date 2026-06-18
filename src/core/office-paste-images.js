/**
 * Extracción de imágenes Office/Word desde RTF.
 * Basado en CKEditor 5 paste-from-office (filters/image.ts).
 */

export function convertHexToBase64(hexString) {
  const pairs = hexString.match(/\w{2}/g);
  if (!pairs?.length) return '';
  return btoa(pairs.map((char) => String.fromCharCode(parseInt(char, 16))).join(''));
}

export function extractImageDataFromRtf(rtfData) {
  if (!rtfData) return [];

  const regexPictureHeader =
    /{\\pict[\s\S]+?\\bliptag-?\d+(\\blipupi-?\d+)?({\\\*\\blipuid\s?[\da-fA-F]+)?[\s}]*?/;
  const regexPicture = new RegExp(
    `(?:(${regexPictureHeader.source}))([\\da-fA-F\\s]+)\\}`,
    'g',
  );

  const images = rtfData.match(regexPicture);
  const result = [];

  if (!images) return result;

  for (const image of images) {
    let imageType = null;
    if (image.includes('\\pngblip')) {
      imageType = 'image/png';
    } else if (image.includes('\\jpegblip')) {
      imageType = 'image/jpeg';
    }

    if (!imageType) continue;

    result.push({
      hex: image.replace(regexPictureHeader, '').replace(/[^\da-fA-F]/g, ''),
      type: imageType,
    });
  }

  return result;
}

export function findWordPasteImages(root) {
  return Array.from(root.querySelectorAll('img')).filter((img) => {
    const src = img.getAttribute('src') || '';
    return src.startsWith('file://') || src === '';
  });
}

export function applyRtfImagesToDocument(doc, rtfData) {
  const images = findWordPasteImages(doc);
  const hexSources = extractImageDataFromRtf(rtfData);

  if (!images.length || !hexSources.length) {
    return 0;
  }

  const count = Math.min(images.length, hexSources.length);

  for (let i = 0; i < count; i += 1) {
    const { hex, type } = hexSources[i];
    if (!hex) continue;

    try {
      const base64 = convertHexToBase64(hex);
      if (!base64) continue;
      images[i].setAttribute('src', `data:${type};base64,${base64}`);
    } catch {
      // ignorar imagen corrupta
    }
  }

  return count;
}

export function rtfImagesToFiles(rtfData) {
  return extractImageDataFromRtf(rtfData).map((item, index) => {
    try {
      const binary = atob(convertHexToBase64(item.hex));
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i += 1) {
        bytes[i] = binary.charCodeAt(i);
      }
      const ext = item.type === 'image/jpeg' ? 'jpg' : 'png';
      return new File([bytes], `rtf-${index}.${ext}`, { type: item.type });
    } catch {
      return null;
    }
  }).filter(Boolean);
}

export async function readRtfFromClipboard(clipboardData) {
  if (!clipboardData) return '';

  let rtf = clipboardData.getData('text/rtf') || clipboardData.getData('application/rtf');
  if (rtf) return rtf;

  const rtfItem = Array.from(clipboardData.items || []).find(
    (item) => item.type === 'text/rtf' || item.type === 'application/rtf',
  );

  if (rtfItem) {
    rtf = await new Promise((resolve) => {
      rtfItem.getAsString((value) => resolve(value || ''));
    });
    if (rtf) return rtf;
  }

  if (navigator.clipboard?.read) {
    try {
      const items = await navigator.clipboard.read();
      for (const item of items) {
        for (const type of ['text/rtf', 'application/rtf']) {
          if (!item.types.includes(type)) continue;
          const blob = await item.getType(type);
          const text = await blob.text();
          if (text) return text;
        }
      }
    } catch {
      // sin permiso o no disponible
    }
  }

  return '';
}
