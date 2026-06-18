import { t } from '../lang.js';
import {
  applyRtfImagesToDocument,
  readRtfFromClipboard,
  rtfImagesToFiles,
} from './office-paste-images.js';

const ALLOWED_TAGS = new Set([
  'P', 'BR', 'DIV', 'SPAN', 'STRONG', 'B', 'EM', 'I', 'U', 'S', 'STRIKE', 'DEL',
  'H1', 'H2', 'H3', 'H4', 'H5', 'H6',
  'UL', 'OL', 'LI',
  'TABLE', 'THEAD', 'TBODY', 'TFOOT', 'TR', 'TD', 'TH', 'COL', 'COLGROUP',
  'A', 'IMG', 'BLOCKQUOTE', 'PRE', 'CODE', 'SUB', 'SUP', 'HR', 'FONT',
]);

const STRIP_TAGS = new Set([
  'SCRIPT', 'STYLE', 'META', 'LINK', 'TITLE', 'HEAD', 'IFRAME', 'OBJECT', 'EMBED',
  'XML', 'W', 'O:P', 'V:SHAPE', 'V:SHAPETYPE', 'V:IMAGEDATA', 'V:TEXTBOX',
]);

const MSO_COMMENT_RE = /<!--\[if gte mso[\s\S]*?endif\]-->/gi;
const WORD_VML_BLOCK_RE = /<!--\[if gte vml[\s\S]*?<!\[endif\]-->/gi;
const WORD_NON_VML_BLOCK_RE = /<!--\[if !vml\]-->([\s\S]*?)<!--\[endif\]-->/gi;

function ptToPx(value, unit) {
  const n = parseFloat(value);
  if (!Number.isFinite(n) || n <= 0) return null;
  if (unit === 'pt') return `${Math.round(n * 1.333)}px`;
  return `${Math.round(n)}px`;
}

/**
 * Word envuelve las imágenes en comentarios condicionales VML.
 * El fallback real para navegadores está en <!--[if !vml]--><img ...><!--[endif]-->
 */
function preprocessWordHtml(html) {
  if (!html) return '';

  let processed = html;

  processed = processed.replace(WORD_NON_VML_BLOCK_RE, (_, inner) => inner);
  processed = processed.replace(WORD_VML_BLOCK_RE, '');
  processed = processed.replace(MSO_COMMENT_RE, '');
  processed = processed.replace(/<\/?\?xml[^>]*>/gi, '');
  processed = processed.replace(/<!\[if !supportLists\][\s\S]*?<!\[endif\]>/gi, '');
  processed = processed.replace(/<!\[if !supportLineBreakNewLine\][\s\S]*?<!\[endif\]>/gi, '');

  return processed;
}

function extractVmlImageHints(html) {
  const hints = [];
  let match;

  const blockRegex = /<!--\[if gte vml 1\]>([\s\S]*?)<!\[endif\]-->/gi;
  while ((match = blockRegex.exec(html)) !== null) {
    const block = match[1];
    const shapeMatch = block.match(/<v:shape[^>]*style="([^"]*)"[^>]*>/i);
    const style = shapeMatch?.[1] || '';
    const sizeMatch = style.match(/width:\s*([0-9.]+)(pt|px)[^;]*;\s*height:\s*([0-9.]+)(pt|px)/i)
      || style.match(/width:\s*([0-9.]+)(pt|px)/i);

    hints.push({
      width: sizeMatch ? ptToPx(sizeMatch[1], sizeMatch[2]) : null,
      height: sizeMatch && sizeMatch[3] ? ptToPx(sizeMatch[3], sizeMatch[4] || sizeMatch[2]) : null,
    });
  }

  return hints;
}

function injectOrphanImages(fragment, editor, imageFiles, startIndex, vmlHints = []) {
  const locale = editor.options.locale;
  const loadingLabel = t('pasteImageUploading', locale);
  const uploadTasks = [];
  const doc = editor.editable.ownerDocument;

  for (let i = startIndex; i < imageFiles.length; i += 1) {
    const file = imageFiles[i];
    const hint = vmlHints[i - startIndex] || {};
    const dimensions = {
      width: hint.width || '150px',
      height: hint.height || '200px',
      display: 'inline-block',
    };

    const placeholder = createLoadingPlaceholder(editor, createPasteId(), dimensions, loadingLabel);
    placeholder.style.float = 'right';
    placeholder.style.margin = '0 0 12px 12px';

    const wrapper = doc.createElement('div');
    wrapper.style.overflow = 'hidden';
    wrapper.appendChild(placeholder);
    if (fragment.firstChild) {
      fragment.insertBefore(wrapper, fragment.firstChild);
    } else {
      fragment.appendChild(wrapper);
    }

    uploadTasks.push({
      placeholder,
      file,
      meta: {
        alt: '',
        widthAttr: '',
        heightAttr: '',
        style: `width:${dimensions.width};height:auto;float:right;margin:0 0 12px 12px;`,
        className: '',
        dimensions,
      },
    });
  }

  return uploadTasks;
}

function createPasteId() {
  return `paste-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function isPasteUploadEnabled(editor) {
  if (editor.options.readOnly) return false;
  if (editor.options.pasteImageUpload === false) return false;
  if (editor.options.pasteImageUpload === true) {
    return Boolean(editor.options.imageUploadUrl || editor.options.imageUploadHandler);
  }
  return Boolean(editor.options.imageUploadUrl || editor.options.imageUploadHandler);
}

function mergeUniqueFiles(...lists) {
  const files = [];
  const seen = new Set();

  lists.flat().forEach((file) => {
    if (!file || !file.type?.startsWith('image/')) return;
    const key = `${file.name}|${file.size}|${file.type}|${file.lastModified}`;
    if (seen.has(key)) return;
    seen.add(key);
    files.push(file);
  });

  return files;
}

function getClipboardImageFiles(clipboardData) {
  if (!clipboardData) return [];

  const files = [];
  const seen = new Set();

  const pushFile = (file) => {
    if (!file || !file.type?.startsWith('image/')) return;
    const key = `${file.name}|${file.size}|${file.type}|${file.lastModified}`;
    if (seen.has(key)) return;
    seen.add(key);
    files.push(file);
  };

  if (clipboardData.files?.length) {
    for (const file of clipboardData.files) {
      pushFile(file);
    }
  }

  if (clipboardData.items?.length) {
    for (const item of clipboardData.items) {
      if (item.type?.startsWith('image/')) {
        pushFile(item.getAsFile());
      }
    }
  }

  return files;
}

async function readClipboardImagesViaApi() {
  if (!navigator.clipboard?.read) return [];

  try {
    const items = await navigator.clipboard.read();
    const files = [];

    for (const item of items) {
      for (const type of item.types) {
        if (!type.startsWith('image/')) continue;
        const blob = await item.getType(type);
        const ext = extensionFromMime(blob.type || type);
        files.push(new File([blob], `clipboard-api-${files.length}.${ext}`, {
          type: blob.type || type,
        }));
      }
    }

    return files;
  } catch {
    return [];
  }
}

function captureNativePasteImages(sourceClipboardData = null) {
  return new Promise((resolve) => {
    const temp = document.createElement('div');
    temp.setAttribute('contenteditable', 'true');
    temp.setAttribute('aria-hidden', 'true');
    temp.style.cssText = [
      'position:fixed',
      'left:-9999px',
      'top:0',
      'width:1px',
      'height:1px',
      'overflow:hidden',
      'opacity:0',
      'pointer-events:none',
    ].join(';');
    document.body.appendChild(temp);

    let settled = false;
    const finish = async () => {
      if (settled) return;
      settled = true;

      const files = [];
      for (const img of temp.querySelectorAll('img')) {
        const src = img.currentSrc || img.getAttribute('src') || '';
        if (src.startsWith('data:image/')) {
          const mime = src.match(/^data:([^;,]+)/)?.[1] || 'image/png';
          const file = dataUrlToFile(src, `native-${files.length}.${extensionFromMime(mime)}`);
          if (file) files.push(file);
        } else if (src.startsWith('blob:')) {
          const file = await blobUrlToFile(src, `native-${files.length}.png`);
          if (file) files.push(file);
        }
      }

      temp.remove();
      resolve(files);
    };

    temp.addEventListener('paste', () => {
      window.setTimeout(finish, 30);
    }, { once: true });

    temp.focus();

    if (sourceClipboardData) {
      try {
        const pasteEvt = new ClipboardEvent('paste', {
          clipboardData: sourceClipboardData,
          bubbles: true,
          cancelable: true,
        });
        temp.dispatchEvent(pasteEvt);
        window.setTimeout(finish, 250);
        return;
      } catch {
        // continuar con execCommand
      }
    }

    try {
      const pasted = document.execCommand('paste');
      if (!pasted) {
        finish();
        return;
      }
    } catch {
      finish();
      return;
    }

    window.setTimeout(finish, 200);
  });
}

function extractAllDataUrlsFromRawHtml(html) {
  if (!html) return [];

  const files = [];
  const regex = /data:image\/(?:png|jpe?g|gif|webp|svg\+xml);base64,[A-Za-z0-9+/=\s]+/gi;
  let match;

  while ((match = regex.exec(html)) !== null) {
    const dataUrl = match[0].replace(/\s+/g, '');
    const mime = dataUrl.match(/^data:([^;,]+)/)?.[1] || 'image/png';
    const file = dataUrlToFile(dataUrl, `raw-${files.length}.${extensionFromMime(mime)}`);
    if (file) files.push(file);
  }

  return files;
}

function countPasteImagesInHtml(html) {
  if (!html) return 0;

  const processed = preprocessWordHtml(html);
  const doc = new DOMParser().parseFromString(processed, 'text/html');
  let count = doc.querySelectorAll('img').length;

  const vmlBlocks = html.match(/<!--\[if gte vml 1\][\s\S]*?<!\[endif\]-->/gi) || [];
  count = Math.max(count, vmlBlocks.length);

  return count;
}

function extractDataUrlImagesFromHtml(html) {
  if (!html) return [];

  const files = [];
  const processed = preprocessWordHtml(html);
  const doc = new DOMParser().parseFromString(processed, 'text/html');

  doc.querySelectorAll('img').forEach((img, index) => {
    const src = img.getAttribute('src') || '';
    if (!src.startsWith('data:image/')) return;
    const mime = src.match(/^data:([^;,]+)/)?.[1] || 'image/png';
    const file = dataUrlToFile(src, `html-${index}.${extensionFromMime(mime)}`);
    if (file) files.push(file);
  });

  const vmlRegex = /<v:imagedata[^>]+src=["'](data:image\/[^"']+)["']/gi;
  let match;
  while ((match = vmlRegex.exec(html)) !== null) {
    const mime = match[1].match(/^data:([^;,]+)/)?.[1] || 'image/png';
    const file = dataUrlToFile(match[1], `vml-${files.length}.${extensionFromMime(mime)}`);
    if (file) files.push(file);
  }

  return files;
}

function buildPasteImageSources(clipboardData, rawHtml, rtfData = '') {
  const html = rawHtml || '';
  const rtf = rtfData || clipboardData?.getData('text/rtf') || clipboardData?.getData('application/rtf') || '';

  return {
    clipboardFiles: getClipboardImageFiles(clipboardData),
    htmlDataFiles: mergeUniqueFiles(
      extractDataUrlImagesFromHtml(html),
      extractAllDataUrlsFromRawHtml(html),
    ),
    rtfFiles: rtfImagesToFiles(rtf),
  };
}

async function enrichPasteImageSources(sources, extraPromises = []) {
  if (!extraPromises.length) return sources;

  const extraFileLists = await Promise.all(extraPromises);
  sources.clipboardFiles = mergeUniqueFiles(
    sources.clipboardFiles,
    ...extraFileLists.filter(Array.isArray),
  );

  return sources;
}

function imageNeedsUpload(img) {
  const src = (img.getAttribute('src') || '').trim();
  if (!src) return true;
  if (src.startsWith('data:image/')) return true;
  if (src.startsWith('blob:')) return true;
  if (/^https?:\/\//i.test(src)) return false;
  if (/^file:/i.test(src)) return true;
  if (/^cid:/i.test(src)) return true;
  return true;
}

async function blobUrlToFile(src, filename) {
  try {
    const response = await fetch(src);
    const blob = await response.blob();
    if (!blob.type.startsWith('image/')) return null;
    const ext = extensionFromMime(blob.type);
    return new File([blob], filename, { type: blob.type || `image/${ext}` });
  } catch {
    return null;
  }
}

function dataUrlToFile(dataUrl, filename) {
  const match = dataUrl.match(/^data:([^;,]+)(?:;[^,]*)?,(.*)$/i);
  if (!match) return null;

  const mime = match[1];
  const data = match[2];
  let bytes;

  if (dataUrl.includes(';base64,')) {
    const binary = atob(data);
    bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i);
    }
  } else {
    const decoded = decodeURIComponent(data);
    bytes = new Uint8Array(decoded.length);
    for (let i = 0; i < decoded.length; i += 1) {
      bytes[i] = decoded.charCodeAt(i);
    }
  }

  const extension = mime.split('/')[1]?.replace('jpeg', 'jpg') || 'png';
  const safeName = filename || `paste-${Date.now()}.${extension}`;
  return new File([bytes], safeName, { type: mime });
}

function extensionFromMime(mime) {
  const map = {
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/png': 'png',
    'image/gif': 'gif',
    'image/webp': 'webp',
    'image/svg+xml': 'svg',
  };
  return map[mime] || 'png';
}

function parseDimension(value) {
  if (!value) return null;
  const raw = String(value).trim();
  if (!raw) return null;
  if (/^\d+$/.test(raw)) return `${raw}px`;
  if (/^\d+(\.\d+)?(px|em|rem|%)$/i.test(raw)) return raw;
  const numeric = parseFloat(raw);
  if (Number.isFinite(numeric) && numeric > 0) return `${Math.round(numeric)}px`;
  return null;
}

function getImageDimensions(img) {
  const width =
    parseDimension(img.getAttribute('width')) ||
    parseDimension(img.style.width) ||
    null;
  const height =
    parseDimension(img.getAttribute('height')) ||
    parseDimension(img.style.height) ||
    null;

  return {
    width: width || '120px',
    height: height || '80px',
    display: img.style.display || (width ? 'inline-block' : 'inline-block'),
  };
}

function cleanOfficeHtml(html) {
  return preprocessWordHtml(html);
}

function sanitizeNode(node, doc) {
  if (node.nodeType === Node.TEXT_NODE) {
    return doc.createTextNode(node.textContent);
  }

  if (node.nodeType !== Node.ELEMENT_NODE) {
    return null;
  }

  const tag = node.tagName.toUpperCase();

  if (STRIP_TAGS.has(tag)) {
    return null;
  }

  if (tag === 'IMG') {
    const clone = doc.createElement('img');
    const src = node.getAttribute('src') || '';
    if (src && !/^javascript:/i.test(src) && !/^file:/i.test(src) && !/^cid:/i.test(src)) {
      clone.setAttribute('src', src);
    }
    if (node.getAttribute('alt')) clone.setAttribute('alt', node.getAttribute('alt'));
    if (node.getAttribute('width')) clone.setAttribute('width', node.getAttribute('width'));
    if (node.getAttribute('height')) clone.setAttribute('height', node.getAttribute('height'));
    if (node.getAttribute('style')) clone.setAttribute('style', node.getAttribute('style'));
    if (node.className) clone.className = node.className;
    return clone;
  }

  if (!ALLOWED_TAGS.has(tag)) {
    const fragment = doc.createDocumentFragment();
    node.childNodes.forEach((child) => {
      const sanitized = sanitizeNode(child, doc);
      if (sanitized) fragment.appendChild(sanitized);
    });
    return fragment;
  }

  const clone = doc.createElement(tag.toLowerCase());

  if (node.getAttribute('style')) {
    clone.setAttribute('style', node.getAttribute('style'));
  }

  if (tag === 'A') {
    const href = node.getAttribute('href') || '';
    if (href && !/^javascript:/i.test(href)) {
      clone.setAttribute('href', href);
    }
    if (node.getAttribute('target')) clone.setAttribute('target', node.getAttribute('target'));
  }

  if (tag === 'TD' || tag === 'TH') {
    ['colspan', 'rowspan', 'width', 'height', 'align', 'valign'].forEach((attr) => {
      if (node.getAttribute(attr)) clone.setAttribute(attr, node.getAttribute(attr));
    });
  }

  if (tag === 'TABLE') {
    ['border', 'cellpadding', 'cellspacing', 'width'].forEach((attr) => {
      if (node.getAttribute(attr)) clone.setAttribute(attr, node.getAttribute(attr));
    });
  }

  node.childNodes.forEach((child) => {
    const sanitized = sanitizeNode(child, doc);
    if (!sanitized) return;
    if (sanitized.nodeType === Node.DOCUMENT_FRAGMENT_NODE) {
      clone.appendChild(sanitized);
    } else {
      clone.appendChild(sanitized);
    }
  });

  if ((tag === 'O:P' || tag === 'W:SDT') && clone.childNodes.length) {
    const fragment = doc.createDocumentFragment();
    while (clone.firstChild) {
      fragment.appendChild(clone.firstChild);
    }
    return fragment;
  }

  return clone;
}

function htmlToFragment(html, doc, rtfData = '') {
  const cleaned = cleanOfficeHtml(html);
  const parsed = new DOMParser().parseFromString(cleaned, 'text/html');

  if (rtfData) {
    applyRtfImagesToDocument(parsed, rtfData);
  }

  const fragment = doc.createDocumentFragment();

  const bodyChildren = parsed.body?.childNodes || [];
  bodyChildren.forEach((child) => {
    const sanitized = sanitizeNode(child, doc);
    if (!sanitized) return;
    fragment.appendChild(sanitized);
  });

  return fragment;
}

async function resolveImageFile(img, sources, counters, timestamp) {
  const src = (img.getAttribute('src') || '').trim();

  if (!imageNeedsUpload(img)) {
    return { file: null, keepOriginal: true };
  }

  if (src.startsWith('data:image/')) {
    const mime = src.match(/^data:([^;,]+)/)?.[1] || 'image/png';
    const file = dataUrlToFile(
      src,
      `paste-${timestamp}-${counters.total}.${extensionFromMime(mime)}`
    );
    counters.total += 1;
    return { file, keepOriginal: false };
  }

  if (src.startsWith('blob:')) {
    const file = await blobUrlToFile(src, `paste-${timestamp}-${counters.total}.png`);
    counters.total += 1;
    return { file, keepOriginal: false };
  }

  if (sources.clipboardFiles[counters.clipboard]) {
    const file = sources.clipboardFiles[counters.clipboard];
    counters.clipboard += 1;
    counters.total += 1;
    return { file, keepOriginal: false };
  }

  if (sources.htmlDataFiles[counters.htmlData]) {
    const file = sources.htmlDataFiles[counters.htmlData];
    counters.htmlData += 1;
    counters.total += 1;
    return { file, keepOriginal: false };
  }

  if (sources.rtfFiles[counters.rtf]) {
    const file = sources.rtfFiles[counters.rtf];
    counters.rtf += 1;
    counters.total += 1;
    return { file, keepOriginal: false };
  }

  counters.total += 1;
  return { file: null, keepOriginal: false };
}

function createLoadingPlaceholder(editor, pasteId, dimensions, label) {
  const placeholder = editor.editable.ownerDocument.createElement('span');
  placeholder.className = 'aracode-paste-image';
  placeholder.dataset.pasteId = pasteId;
  placeholder.setAttribute('contenteditable', 'false');
  placeholder.style.width = dimensions.width;
  placeholder.style.height = dimensions.height;
  placeholder.style.display = dimensions.display;

  const spinner = editor.editable.ownerDocument.createElement('span');
  spinner.className = 'aracode-paste-image__spinner';
  spinner.setAttribute('aria-hidden', 'true');

  const text = editor.editable.ownerDocument.createElement('span');
  text.className = 'aracode-paste-image__label';
  text.textContent = label;

  placeholder.appendChild(spinner);
  placeholder.appendChild(text);

  return placeholder;
}

function createErrorPlaceholder(editor, pasteId, dimensions, message) {
  const placeholder = createLoadingPlaceholder(editor, pasteId, dimensions, message);
  placeholder.classList.add('aracode-paste-image--error');
  const spinner = placeholder.querySelector('.aracode-paste-image__spinner');
  if (spinner) spinner.remove();
  return placeholder;
}

function createFinalImage(doc, meta, url) {
  const img = doc.createElement('img');
  img.setAttribute('src', url);
  if (meta.alt) img.setAttribute('alt', meta.alt);
  if (meta.widthAttr) img.setAttribute('width', meta.widthAttr);
  if (meta.heightAttr) img.setAttribute('height', meta.heightAttr);
  if (meta.style) img.setAttribute('style', meta.style);
  if (meta.className) img.className = meta.className;
  img.style.maxWidth = '100%';
  img.style.height = 'auto';
  return img;
}

function captureImageMeta(img) {
  return {
    alt: img.getAttribute('alt') || '',
    widthAttr: img.getAttribute('width') || '',
    heightAttr: img.getAttribute('height') || '',
    style: img.getAttribute('style') || '',
    className: img.className || '',
    dimensions: getImageDimensions(img),
  };
}

function plainTextToFragment(text, doc) {
  const fragment = doc.createDocumentFragment();
  const lines = String(text || '').split(/\r?\n/);

  if (!lines.length) {
    return fragment;
  }

  lines.forEach((line) => {
    const block = doc.createElement('p');
    block.textContent = line;
    fragment.appendChild(block);
  });

  return fragment;
}

function saveEditorRange(editor) {
  const selection = window.getSelection();
  if (!selection?.rangeCount) return null;

  const range = selection.getRangeAt(0);
  if (!editor.editable.contains(range.commonAncestorContainer)) return null;

  return range.cloneRange();
}

function insertFragmentAtRange(range, fragment) {
  if (!range) return;

  if (!fragment?.childNodes?.length) {
    return;
  }

  range.deleteContents();

  const lastNode = fragment.lastChild;
  range.insertNode(fragment);

  if (lastNode) {
    range.setStartAfter(lastNode);
    range.collapse(true);
  }

  const selection = window.getSelection();
  selection.removeAllRanges();
  selection.addRange(range);
}

function replacePlaceholderWithImage(placeholder, img) {
  if (!placeholder?.parentNode) return;
  placeholder.parentNode.replaceChild(img, placeholder);
}

function replacePlaceholderWithError(editor, placeholder, message) {
  if (!placeholder?.parentNode) return;
  const pasteId = placeholder.dataset.pasteId || createPasteId();
  const dimensions = {
    width: placeholder.style.width || '120px',
    height: placeholder.style.height || '80px',
    display: placeholder.style.display || 'inline-block',
  };
  const errorEl = createErrorPlaceholder(editor, pasteId, dimensions, message);
  placeholder.parentNode.replaceChild(errorEl, placeholder);
}

async function uploadPastedImage(editor, file, placeholder, meta) {
  const doc = editor.editable.ownerDocument;

  if (!file) {
    replacePlaceholderWithError(editor, placeholder, t('pasteImageMissing', editor.options.locale));
    return;
  }

  try {
    const url = await editor._uploadImageFile(file);
    if (!url) {
      throw new Error(t('imageUploadError', editor.options.locale));
    }

    editor._trackUploadedImage(url, file);
    const img = createFinalImage(doc, meta, url);
    replacePlaceholderWithImage(placeholder, img);
  } catch (err) {
    console.error('Error al pegar imagen', err);
    replacePlaceholderWithError(
      editor,
      placeholder,
      t('pasteImageError', editor.options.locale)
    );
  }
}

async function prepareFragmentForPaste(editor, fragment, sources, vmlHints = []) {
  const locale = editor.options.locale;
  const loadingLabel = t('pasteImageUploading', locale);
  const timestamp = Date.now();
  const counters = { clipboard: 0, htmlData: 0, rtf: 0, total: 0 };
  const uploadTasks = [];

  const images = fragment.querySelectorAll('img');
  for (const img of images) {
    const meta = captureImageMeta(img);
    const { file, keepOriginal } = await resolveImageFile(img, sources, counters, timestamp);

    if (keepOriginal) {
      continue;
    }

    const pasteId = createPasteId();
    const placeholder = file
      ? createLoadingPlaceholder(editor, pasteId, meta.dimensions, loadingLabel)
      : createErrorPlaceholder(editor, pasteId, meta.dimensions, t('pasteImageMissing', locale));

    img.parentNode.replaceChild(placeholder, img);

    if (file) {
      uploadTasks.push({
        placeholder,
        file,
        meta,
      });
    }
  }

  const orphanFiles = [
    ...sources.clipboardFiles.slice(counters.clipboard),
    ...sources.htmlDataFiles.slice(counters.htmlData),
    ...sources.rtfFiles.slice(counters.rtf),
  ];

  if (orphanFiles.length) {
    uploadTasks.push(
      ...injectOrphanImages(fragment, editor, orphanFiles, 0, vmlHints)
    );
  }

  return { fragment, uploadTasks };
}

function hasPasteableRichContent(html, imageFiles) {
  if (imageFiles.length > 0) return true;
  if (!html) return false;
  return /<(img|table|p|div|span|ul|ol|li|h[1-6]|strong|em|br)\b/i.test(html);
}

export function pasteImageOnly(editor, file, range) {
  const locale = editor.options.locale;
  const dimensions = { width: '120px', height: '80px', display: 'inline-block' };
  const placeholder = createLoadingPlaceholder(
    editor,
    createPasteId(),
    dimensions,
    t('pasteImageUploading', locale)
  );

  range.deleteContents();
  range.insertNode(placeholder);
  range.setStartAfter(placeholder);
  range.collapse(true);

  const selection = window.getSelection();
  selection.removeAllRanges();
  selection.addRange(range);

  return uploadPastedImage(editor, file, placeholder, {
    alt: '',
    widthAttr: '',
    heightAttr: '',
    style: '',
    className: '',
    dimensions,
  });
}

async function handlePaste(editor, clipboardData, savedRange, prefetchPromises = []) {
  const rawHtml = clipboardData.getData('text/html');
  const plainText = clipboardData.getData('text/plain');
  const rtfData = await readRtfFromClipboard(clipboardData);

  let sources = buildPasteImageSources(clipboardData, rawHtml, rtfData);

  if (prefetchPromises.length) {
    sources = await enrichPasteImageSources(sources, prefetchPromises);
  }

  const clipboardFiles = sources.clipboardFiles;
  const vmlHints = extractVmlImageHints(rawHtml || '');
  const range = savedRange;

  if (!range) return;

  if (!rawHtml && clipboardFiles.length >= 1) {
    if (clipboardFiles.length === 1) {
      await pasteImageOnly(editor, clipboardFiles[0], range);
    } else {
      const doc = editor.editable.ownerDocument;
      const fragment = doc.createDocumentFragment();
      const { uploadTasks } = await prepareFragmentForPaste(editor, fragment, sources, vmlHints);
      insertFragmentAtRange(range, fragment);
      if (uploadTasks.length) {
        await Promise.all(
          uploadTasks.map(({ placeholder, file, meta }) =>
            uploadPastedImage(editor, file, placeholder, meta)
          )
        );
      }
    }
    editor.emit('change', editor.getHTML());
    return;
  }

  if (!rawHtml) {
    if (plainText) {
      const fragment = plainTextToFragment(plainText, editor.editable.ownerDocument);
      insertFragmentAtRange(range, fragment);
      editor.emit('change', editor.getHTML());
    }
    return;
  }

  const doc = editor.editable.ownerDocument;
  let fragment = htmlToFragment(rawHtml, doc, rtfData);

  if (!fragment.childNodes.length && plainText) {
    fragment = plainTextToFragment(plainText, doc);
  }

  const { uploadTasks } = await prepareFragmentForPaste(editor, fragment, sources, vmlHints);

  insertFragmentAtRange(range, fragment);

  if (uploadTasks.length) {
    await Promise.all(
      uploadTasks.map(({ placeholder, file, meta }) =>
        uploadPastedImage(editor, file, placeholder, meta)
      )
    );
  }

  editor.emit('change', editor.getHTML());
}

function shouldInterceptPaste(html, imageFiles, rtfImages, htmlImages, expectedImages) {
  if (imageFiles.length > 0 || rtfImages.length > 0 || htmlImages.length > 0) {
    return true;
  }

  if (expectedImages > 0) {
    return true;
  }

  if (html && hasPasteableRichContent(html, imageFiles)) {
    return true;
  }

  return false;
}

export function bindPasteHandler(editor) {
  editor.editable.addEventListener('paste', (event) => {
    if (!isPasteUploadEnabled(editor)) return;

    const clipboardData = event.clipboardData;
    if (!clipboardData) return;

    const html = clipboardData.getData('text/html');
    const plainText = clipboardData.getData('text/plain');
    const imageFiles = getClipboardImageFiles(clipboardData);
    const rtfImages = rtfImagesToFiles(
      clipboardData.getData('text/rtf') || clipboardData.getData('application/rtf') || '',
    );
    const htmlImages = mergeUniqueFiles(
      extractDataUrlImagesFromHtml(html || ''),
      extractAllDataUrlsFromRawHtml(html || ''),
    );
    const expectedImages = countPasteImagesInHtml(html || '');

    if (!shouldInterceptPaste(html, imageFiles, rtfImages, htmlImages, expectedImages)) {
      return;
    }

    if (!html && !imageFiles.length && !rtfImages.length && !expectedImages && plainText) {
      return;
    }

    const savedRange = saveEditorRange(editor);
    if (!savedRange) return;

    event.preventDefault();

    const prefetchPromises = [];
    if (navigator.clipboard?.read) {
      prefetchPromises.push(
        Promise.race([
          readClipboardImagesViaApi(),
          new Promise((resolve) => window.setTimeout(() => resolve([]), 300)),
        ])
      );
    }

    handlePaste(editor, clipboardData, savedRange, prefetchPromises).catch((err) => {
      console.error('Error al procesar pegado', err);

      const fallback = plainTextToFragment(plainText, editor.editable.ownerDocument);
      insertFragmentAtRange(savedRange, fallback);
      editor.emit('change', editor.getHTML());
    });
  });
}
