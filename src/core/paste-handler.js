import { t } from '../lang.js';

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

const MSO_COMMENT_RE = /<!--\[if[\s\S]*?endif\]-->/gi;

function createPasteId() {
  return `paste-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function isPasteUploadEnabled(editor) {
  if (editor.options.readOnly) return false;
  if (editor.options.pasteImageUpload === false) return false;
  if (editor.options.pasteImageUpload === true) {
    return Boolean(editor.options.imageUploadUrl || editor.options.imageUploadHandler);
  }
  return Boolean(editor.options.imageUploadUrl || editor.options.imageUploadHandler);
}

function getClipboardImageFiles(clipboardData) {
  if (!clipboardData?.items) return [];
  const files = [];
  for (const item of clipboardData.items) {
    if (item.kind === 'file' && item.type.startsWith('image/')) {
      const file = item.getAsFile();
      if (file) files.push(file);
    }
  }
  return files;
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
  if (!html) return '';
  let cleaned = html.replace(MSO_COMMENT_RE, '');
  cleaned = cleaned.replace(/<\/?\?xml[^>]*>/gi, '');
  cleaned = cleaned.replace(/<!\[if !supportLists\][\s\S]*?<!\[endif\]>/gi, '');
  return cleaned;
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
    if (src && !/^javascript:/i.test(src)) {
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

function htmlToFragment(html, doc) {
  const cleaned = cleanOfficeHtml(html);
  const parsed = new DOMParser().parseFromString(cleaned, 'text/html');
  const fragment = doc.createDocumentFragment();

  const bodyChildren = parsed.body?.childNodes || [];
  bodyChildren.forEach((child) => {
    const sanitized = sanitizeNode(child, doc);
    if (!sanitized) return;
    fragment.appendChild(sanitized);
  });

  return fragment;
}

function resolveImageFile(img, imageFiles, indexRef, timestamp) {
  const src = img.getAttribute('src') || '';

  if (src.startsWith('data:image/')) {
    const file = dataUrlToFile(src, `paste-${timestamp}-${indexRef.value}.${extensionFromMime(src.match(/^data:([^;,]+)/)?.[1] || 'image/png')}`);
    indexRef.value += 1;
    return file;
  }

  if (imageFiles[indexRef.value]) {
    const file = imageFiles[indexRef.value];
    indexRef.value += 1;
    return file;
  }

  return null;
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

function insertFragmentAtRange(range, fragment) {
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

function prepareFragmentForPaste(editor, fragment, imageFiles) {
  const locale = editor.options.locale;
  const loadingLabel = t('pasteImageUploading', locale);
  const timestamp = Date.now();
  const fileIndex = { value: 0 };
  const uploadTasks = [];
  const doc = editor.editable.ownerDocument;

  const images = fragment.querySelectorAll('img');
  images.forEach((img) => {
    const meta = captureImageMeta(img);
    const file = resolveImageFile(img, imageFiles, fileIndex, timestamp);
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
  });

  return { fragment, uploadTasks };
}

function hasPasteableRichContent(html, imageFiles) {
  if (imageFiles.length > 0) return true;
  if (!html) return false;
  return /<(img|table|p|div|span|ul|ol|li|h[1-6]|strong|em|br)\b/i.test(html);
}

function pasteImageOnly(editor, file, range) {
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

async function handlePaste(editor, clipboardData) {
  const html = clipboardData.getData('text/html');
  const imageFiles = getClipboardImageFiles(clipboardData);
  const selection = window.getSelection();

  if (!selection.rangeCount) return;
  const range = selection.getRangeAt(0);
  if (!editor.editable.contains(range.commonAncestorContainer)) return;

  if (!html && imageFiles.length === 1) {
    await pasteImageOnly(editor, imageFiles[0], range.cloneRange());
    editor.emit('change', editor.getHTML());
    return;
  }

  if (!html) return;

  const doc = editor.editable.ownerDocument;
  const fragment = htmlToFragment(html, doc);
  const { uploadTasks } = prepareFragmentForPaste(editor, fragment, imageFiles);

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

export function bindPasteHandler(editor) {
  editor.editable.addEventListener('paste', (event) => {
    if (!isPasteUploadEnabled(editor)) return;

    const clipboardData = event.clipboardData;
    if (!clipboardData) return;

    const html = clipboardData.getData('text/html');
    const imageFiles = getClipboardImageFiles(clipboardData);
    const plainText = clipboardData.getData('text/plain');

    const shouldHandle =
      imageFiles.length > 0 ||
      (html && hasPasteableRichContent(html, imageFiles));

    if (!shouldHandle) return;

    if (!html && !imageFiles.length && plainText) return;

    event.preventDefault();
    handlePaste(editor, clipboardData).catch((err) => {
      console.error('Error al procesar pegado', err);
    });
  });
}
