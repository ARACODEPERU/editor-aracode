import { t } from '../lang.js';
import { Toolbar } from './toolbar.js';
import { Commands } from './commands.js';
import { Dialog, startCountdown } from '../ui/dialog.js';
import { ColorPicker } from '../ui/color-picker.js';
import { ImageController } from '../ui/image-controller.js';

const DEFAULT_OPTIONS = {
  height: 400,
  placeholder: null,
  toolbar: null,
  theme: 'default',
  locale: 'es',
  value: '',
  readOnly: false,
  imageUploadHandler: null,
  imageUploadUrl: null,
  imageUploadFieldName: 'image',
  imageDeleteDelay: 20000,
  fonts: null,
};

export class AracodeEditor {
  constructor(element, options = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
    this._events = {};
    this._isFullscreen = false;
    this._isSourceView = false;
    this._sourceTextarea = null;
    this._loadedFonts = new Set();
    this._searchPanel = null;
    this._uploadedImages = new Map();
    this._syncingImages = false;

    this.container = element instanceof HTMLElement ? element : document.querySelector(element);
    if (!this.container) throw new Error(`AracodeEditor: element not found`);

    this.container.classList.add('aracode-editor-container');
    this.container.classList.add(`aracode-theme-${this.options.theme}`);

    this.commands = new Commands(this);
    this.toolbar = new Toolbar(this);
    this.dialog = new Dialog({
      cancelText: t('linkDialogCancel', this.options.locale),
      applyText: t('linkDialogApply', this.options.locale),
    });
    this.colorPicker = null;

    this.editable = document.createElement('div');
    this.editable.className = 'aracode-editable';
    this.editable.contentEditable = !this.options.readOnly;
    this.editable.setAttribute('role', 'textbox');
    this.editable.setAttribute('aria-multiline', 'true');
    this.editable.innerHTML = this.options.value || '';

    const placeholder = this.options.placeholder || t('placeholder', this.options.locale);
    this.editable.dataset.placeholder = placeholder;

    this.container.appendChild(this.toolbar.container);
    this.container.appendChild(this.editable);

    // Inicializar ImageController después de crear el editable
    this.imageController = new ImageController(this);

    if (this.options.height) {
      this.editable.style.minHeight = `${this.options.height}px`;
    }

    this._bindEvents();
    this.emit('ready');
  }

  _bindEvents() {
    this.editable.addEventListener('input', () => {
      this.emit('change', this.getHTML());
    });

    this.editable.addEventListener('focus', (e) => {
      this.container.classList.add('is-focused');
      this.emit('focus', e);
    });

    this.editable.addEventListener('blur', (e) => {
      this.container.classList.remove('is-focused');
      this.emit('blur', e);
    });

    this.editable.addEventListener('mouseup', () => {
      this.toolbar.updateActiveStates();
    });

    this.editable.addEventListener('keyup', () => {
      this.toolbar.updateActiveStates();
    });
  }

  on(event, handler) {
    if (!this._events[event]) this._events[event] = [];
    this._events[event].push(handler);
    return this;
  }

  off(event, handler) {
    if (!this._events[event]) return this;
    this._events[event] = this._events[event].filter(h => h !== handler);
    return this;
  }

  emit(event, ...args) {
    if (event === 'change') this._syncUploadedImages();
    const handlers = this._events[event];
    if (handlers) handlers.forEach(handler => handler(...args));
    return this;
  }

  getHTML() {
    return this.editable.innerHTML;
  }

  getExportHTML() {
    const content = this.getHTML();
    const fontImports = this._getExportFontImports(content);
    return [
      '<div class="aracode-export">',
      '<style>',
      fontImports,
      this._getExportCSS(),
      '</style>',
      `<div class="aracode-export-content">${content}</div>`,
      '</div>',
    ].join('');
  }

  _getExportFontImports(content) {
    const families = new Set();
    const wrapper = document.createElement('div');
    wrapper.innerHTML = content;
    wrapper.querySelectorAll('[style*="font-family"]').forEach(node => {
      const family = node.style.fontFamily.split(',')[0].replace(/["']/g, '').trim();
      if (family) families.add(family);
    });

    return Array.from(families)
      .filter(family => this._loadedFonts.has(family))
      .map(family => `@import url("https://fonts.googleapis.com/css2?family=${family.replace(/\s+/g, '+')}&display=swap");`)
      .join('\n');
  }

  _getExportCSS() {
    return `
.aracode-export {
  all: initial;
  display: block;
  box-sizing: border-box;
  width: 100%;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
  font-size: 16px;
  line-height: 1.7;
  color: #212529;
  background: #ffffff;
  word-wrap: break-word;
}
.aracode-export *,
.aracode-export *::before,
.aracode-export *::after {
  box-sizing: border-box;
}
.aracode-export-content {
  all: revert;
  display: block;
  font-family: inherit;
  font-size: inherit;
  line-height: inherit;
  color: inherit;
}
.aracode-export-content * {
  max-width: 100%;
}
.aracode-export-content h1 { font-size: 2em; margin: 0.67em 0; font-weight: 700; line-height: 1.25; }
.aracode-export-content h2 { font-size: 1.5em; margin: 0.75em 0; font-weight: 700; line-height: 1.3; }
.aracode-export-content h3 { font-size: 1.25em; margin: 0.83em 0; font-weight: 600; line-height: 1.35; }
.aracode-export-content h4 { font-size: 1em; margin: 1em 0; font-weight: 600; }
.aracode-export-content h5 { font-size: 0.875em; margin: 1em 0; font-weight: 600; }
.aracode-export-content h6 { font-size: 0.85em; margin: 1em 0; font-weight: 600; color: #6c757d; }
.aracode-export-content p { margin: 0 0 1em; }
.aracode-export-content p:last-child { margin-bottom: 0; }
.aracode-export-content blockquote {
  margin: 1em 0;
  padding: 0.5em 1em;
  border-left: 4px solid #1a73e8;
  background: #f8f9fa;
  color: #495057;
  font-style: italic;
}
.aracode-export-content pre {
  margin: 1em 0;
  padding: 12px 16px;
  background: #1e1e2e;
  color: #cdd6f4;
  border-radius: 6px;
  font-family: SFMono-Regular, Consolas, Liberation Mono, Menlo, monospace;
  font-size: 14px;
  line-height: 1.5;
  overflow-x: auto;
}
.aracode-export-content code {
  font-family: SFMono-Regular, Consolas, Liberation Mono, Menlo, monospace;
  font-size: 0.9em;
  padding: 2px 6px;
  background: #f1f3f5;
  border-radius: 3px;
  color: #e03131;
}
.aracode-export-content pre code {
  background: none;
  padding: 0;
  color: inherit;
  font-size: inherit;
  border-radius: 0;
}
.aracode-export-content img {
  max-width: 100%;
  height: auto;
  border-radius: 4px;
  margin: 0.5em 0;
}
.aracode-export-content img.align-left { float: left; margin-right: 15px; margin-bottom: 10px; }
.aracode-export-content img.align-center { display: block; margin: 10px auto; }
.aracode-export-content img.align-right { float: right; margin-left: 15px; margin-bottom: 10px; }
.aracode-export-content a { color: #1a73e8; text-decoration: underline; }
.aracode-export-content a:hover { color: #1557b0; }
.aracode-export-content ul,
.aracode-export-content ol {
  margin: 0.5em 0;
  padding-left: 2em;
}
.aracode-export-content li { margin: 0.25em 0; }
.aracode-export-content hr {
  border: none;
  border-top: 2px solid #dee2e6;
  margin: 1.5em 0;
}
.aracode-export-content table {
  width: 100%;
  border-collapse: collapse;
  margin: 1em 0;
}
.aracode-export-content th,
.aracode-export-content td {
  padding: 8px 10px;
  border: 1px solid #dee2e6;
  text-align: left;
  vertical-align: top;
}
.aracode-export-content th {
  background: #f8f9fa;
  font-weight: 600;
}
.aracode-export-content figure {
  margin: 1em 0;
}
.aracode-export-content figcaption {
  margin-top: 6px;
  color: #6c757d;
  font-size: 0.9em;
}
.aracode-export-content mark {
  padding: 0 2px;
  background: #fff3bf;
}
.aracode-export-content small {
  font-size: 0.875em;
}
.aracode-export-content sub,
.aracode-export-content sup {
  font-size: 0.75em;
  line-height: 0;
}
.aracode-export-content::after {
  content: "";
  display: block;
  clear: both;
}`;
  }

  setHTML(html) {
    this.editable.innerHTML = html;
    this.emit('change', html);
    return this;
  }

  getText() {
    return this.editable.textContent;
  }

  setReadOnly(readOnly) {
    this.options.readOnly = readOnly;
    this.editable.contentEditable = !readOnly;
    return this;
  }

  openLinkDialog() {
    const sel = window.getSelection();
    const selectedText = sel.toString();
    this.dialog.open(
      t('linkDialogTitle', this.options.locale),
      [
        { label: t('linkDialogUrl', this.options.locale), value: 'https://', autofocus: true },
        { label: t('linkDialogText', this.options.locale), value: selectedText },
        { label: t('linkDialogTarget', this.options.locale), type: 'checkbox', value: true },
      ],
      ([url, text, target]) => {
        if (url && url !== 'https://') {
          this.commands.createLink(url, text, target ? '_blank' : '');
        }
      }
    );
  }

  openImageDialog() {
    const locale = this.options.locale;

    let savedRange = null;
    const sel = window.getSelection();
    if (sel.rangeCount > 0) {
      savedRange = sel.getRangeAt(0);
    }

    this.dialog.options.uploadText = t('imageUploadBtn', locale);
    this.dialog.options.onUpload = async (data, dlg) => {
      const uploadData = data.upload;
      if (uploadData && uploadData.file) {
        try {
          const uploadedUrl = await this._uploadImageFile(uploadData.file, dlg);
          if (uploadedUrl) {
            dlg.setValue('url', uploadedUrl);
            const previewEl = dlg.dialog.querySelector('.aracode-dialog-url-preview');
            if (previewEl) {
              previewEl.src = uploadedUrl;
              previewEl.style.display = 'block';
            }
            const dropZone = dlg.dialog.querySelector('.aracode-dialog-dropzone');
            if (dropZone) {
              dropZone.classList.add('is-counting');
              startCountdown(dropZone, 3, () => {
                dlg.switchTab(1);
              });
            } else {
              dlg.switchTab(1);
            }
          }
        } catch (err) {
          console.error(t('imageUploadError', locale), err);
          alert(t('imageUploadError', locale));
        }
      }
    };

    this.dialog.open(
      t('imageDialogTitle', locale),
      [
        {
          type: 'tabs',
          tabs: [
            {
              label: t('imageUploadTab', locale),
              fields: [
                {
                  type: 'file',
                  name: 'upload',
                  accept: 'image/*',
                  placeholder: t('imageDropHint', locale),
                },
              ],
            },
            {
              label: t('imageUrlTab', locale),
              fields: [
                { label: t('imageDialogUrl', locale), value: '', name: 'url' },
                { type: 'image-preview', name: 'preview' },
                { label: t('imageDialogAlt', locale), value: '', name: 'alt' },
                {
                  type: 'row',
                  fields: [
                    { label: t('imageWidth', locale), value: '', name: 'width', placeholder: 'auto' },
                    { label: t('imageHeight', locale), value: '', name: 'height', placeholder: 'auto' },
                  ],
                },
                { label: 'Alineación', type: 'select', name: 'align', options: [
                  {label: 'Ninguna', value: ''},
                  {label: 'Izquierda', value: 'left'},
                  {label: 'Centro', value: 'center'},
                  {label: 'Derecha', value: 'right'},
                ]}
              ],
            },
          ],
        },
      ],
      async (data) => {
        const url = data.url || '';
        const alt = data.alt || '';
        const width = data.width || '';
        const height = data.height || '';
        const align = data.align || '';

        if (url) {
          if (savedRange) {
             const currentSel = window.getSelection();
             currentSel.removeAllRanges();
             currentSel.addRange(savedRange);
          }
          this.commands.insertImage(url, alt, width, height, align, savedRange);
        }
      }
    );

    const urlInput = this.dialog.dialog.querySelector('[name="url"]');
    const previewEl = this.dialog.dialog.querySelector('.aracode-dialog-url-preview');
    if (urlInput && previewEl) {
       urlInput.addEventListener('input', () => {
          previewEl.src = urlInput.value;
          previewEl.style.display = urlInput.value ? 'block' : 'none';
       });
    }
  }

  async _uploadImageFile(file, dialog = null, targetUrl = '') {
    if (typeof this.options.imageUploadHandler === 'function') {
      if (dialog) dialog.updateProgress(10);
      const result = await this.options.imageUploadHandler(file);
      if (dialog) dialog.updateProgress(100);
      return result;
    }

    if (!this.options.imageUploadUrl) {
      return null;
    }

    const formData = new FormData();
    formData.append(this.options.imageUploadFieldName || 'image', file);
    if (targetUrl) formData.append('target_url', targetUrl);

    if (dialog) dialog.updateProgress(20);
    const response = await fetch(this.options.imageUploadUrl, {
      method: 'POST',
      body: formData,
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.error || t('imageUploadError', this.options.locale));
    }

    if (dialog) dialog.updateProgress(100);
    return data.url || data.path || data.location || null;
  }

  _trackUploadedImage(url, file) {
    const normalizedUrl = this._normalizeImageUrl(url);
    if (!normalizedUrl || !file) return;
    const current = this._uploadedImages.get(normalizedUrl) || {};
    this._uploadedImages.set(normalizedUrl, {
      ...current,
      url: normalizedUrl,
      file,
      deleted: false,
      reuploading: false,
      deleteTimer: current.deleteTimer || null,
    });
  }

  _syncUploadedImages() {
    if (this._syncingImages || !this._uploadedImages.size) return;
    this._syncingImages = true;

    const currentUrls = new Set(
      Array.from(this.editable.querySelectorAll('img[src]'))
        .map(img => this._normalizeImageUrl(img.getAttribute('src')))
        .filter(Boolean)
    );

    this._uploadedImages.forEach((record, url) => {
      if (currentUrls.has(url)) {
        if (record.deleteTimer) {
          clearTimeout(record.deleteTimer);
          record.deleteTimer = null;
        }
        if (record.deleted && !record.reuploading) {
          this._restoreDeletedImage(url);
        }
        return;
      }

      if (!record.deleted && !record.deleteTimer) {
        record.deleteTimer = setTimeout(() => {
          record.deleteTimer = null;
          this._deleteUploadedImage(url);
        }, this.options.imageDeleteDelay);
      }
    });

    this._syncingImages = false;
  }

  async _deleteUploadedImage(url) {
    const record = this._uploadedImages.get(url);
    if (!record || record.deleted || !this.options.imageUploadUrl) return;

    const formData = new FormData();
    formData.append('action', 'delete');
    formData.append('url', url);

    try {
      const response = await fetch(this.options.imageUploadUrl, {
        method: 'POST',
        body: formData,
      });
      if (!response.ok) return;
      record.deleted = true;
    } catch (err) {
      console.error('Error al eliminar la imagen', err);
    }
  }

  async _restoreDeletedImage(url) {
    const record = this._uploadedImages.get(url);
    if (!record || !record.file || record.reuploading) return;

    record.reuploading = true;
    try {
      const restoredUrl = await this._uploadImageFile(record.file, null, url);
      const finalUrl = this._normalizeImageUrl(restoredUrl || url);
      record.deleted = false;
      record.reuploading = false;

      if (finalUrl && finalUrl !== url) {
        this._uploadedImages.delete(url);
        this._uploadedImages.set(finalUrl, record);
        this.editable.querySelectorAll('img[src]').forEach(img => {
          if (this._normalizeImageUrl(img.getAttribute('src')) === url) img.setAttribute('src', finalUrl);
        });
      } else {
        this.editable.querySelectorAll('img[src]').forEach(img => {
          if (this._normalizeImageUrl(img.getAttribute('src')) === url) {
            img.setAttribute('src', '');
            img.setAttribute('src', url);
          }
        });
      }
    } catch (err) {
      record.reuploading = false;
      console.error('Error al restaurar la imagen', err);
    }
  }

  _normalizeImageUrl(url) {
    if (!url) return '';
    try {
      return new URL(url, window.location.href).href;
    } catch (err) {
      return url;
    }
  }

  loadFontFamily(fontFamily) {
    if (!fontFamily || this._loadedFonts.has(fontFamily)) return;
    const link = document.createElement('link');
    const family = fontFamily.trim().replace(/\s+/g, '+');
    link.rel = 'stylesheet';
    link.href = `https://fonts.googleapis.com/css2?family=${family}&display=swap`;
    document.head.appendChild(link);
    this._loadedFonts.add(fontFamily);
  }

  toggleSearchPanel() {
    if (this._searchPanel) {
      this._searchPanel.remove();
      this._searchPanel = null;
      return;
    }
    this.openSearchPanel();
  }

  openSearchPanel() {
    const panel = document.createElement('div');
    panel.className = 'aracode-search-panel';

    const header = document.createElement('div');
    header.className = 'aracode-search-header';
    const input = document.createElement('input');
    input.className = 'aracode-search-input';
    input.type = 'search';
    input.placeholder = t('searchPlaceholder', this.options.locale);
    const closeBtn = document.createElement('button');
    closeBtn.className = 'aracode-search-close';
    closeBtn.type = 'button';
    closeBtn.textContent = 'x';
    closeBtn.setAttribute('aria-label', 'Cerrar');
    header.appendChild(input);
    header.appendChild(closeBtn);

    const count = document.createElement('div');
    count.className = 'aracode-search-count';
    const results = document.createElement('div');
    results.className = 'aracode-search-results';

    panel.appendChild(header);
    panel.appendChild(count);
    panel.appendChild(results);
    this.container.insertBefore(panel, this.editable);
    this._searchPanel = panel;

    const render = () => {
      const query = input.value.trim();
      const matches = query ? this._findSearchMatches(query) : [];
      results.innerHTML = '';
      count.textContent = query ? `${matches.length} ${t('searchResults', this.options.locale)}` : '';

      if (query && matches.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'aracode-search-empty';
        empty.textContent = t('searchEmpty', this.options.locale);
        results.appendChild(empty);
        return;
      }

      matches.forEach(match => {
        const item = document.createElement('button');
        item.type = 'button';
        item.className = 'aracode-search-result';
        item.innerHTML = `<span>Línea ${match.line}</span><strong>${this._escapeHTML(match.preview)}</strong>`;
        item.addEventListener('click', () => this._selectSearchMatch(match));
        results.appendChild(item);
      });
    };

    input.addEventListener('input', render);
    closeBtn.addEventListener('click', () => this.toggleSearchPanel());
    setTimeout(() => input.focus(), 0);
  }

  _findSearchMatches(query) {
    const blocks = Array.from(this.editable.querySelectorAll('p,h1,h2,h3,h4,h5,h6,li,blockquote,pre,div'))
      .filter(block => !block.closest('.aracode-search-panel'));
    const lines = blocks.length ? blocks : [this.editable];
    const needle = query.toLowerCase();
    const matches = [];

    lines.forEach((node, index) => {
      const text = node.textContent || '';
      const haystack = text.toLowerCase();
      let start = haystack.indexOf(needle);
      while (start !== -1) {
        const from = Math.max(0, start - 24);
        const to = Math.min(text.length, start + query.length + 24);
        matches.push({
          node,
          line: index + 1,
          start,
          end: start + query.length,
          preview: text.slice(from, to).trim(),
        });
        start = haystack.indexOf(needle, start + query.length);
      }
    });

    return matches;
  }

  _selectSearchMatch(match) {
    const range = this._rangeFromTextOffsets(match.node, match.start, match.end);
    if (!range) return;
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
    match.node.scrollIntoView({ behavior: 'smooth', block: 'center' });
    this.editable.focus();
    if (this._searchPanel) {
      this._searchPanel.remove();
      this._searchPanel = null;
    }
  }

  _rangeFromTextOffsets(root, start, end) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let currentOffset = 0;
    let startNode = null;
    let startOffset = 0;
    let endNode = null;
    let endOffset = 0;

    while (walker.nextNode()) {
      const node = walker.currentNode;
      const nextOffset = currentOffset + node.nodeValue.length;
      if (!startNode && start >= currentOffset && start <= nextOffset) {
        startNode = node;
        startOffset = start - currentOffset;
      }
      if (!endNode && end >= currentOffset && end <= nextOffset) {
        endNode = node;
        endOffset = end - currentOffset;
        break;
      }
      currentOffset = nextOffset;
    }

    if (!startNode || !endNode) return null;
    const range = document.createRange();
    range.setStart(startNode, startOffset);
    range.setEnd(endNode, endOffset);
    return range;
  }

  _escapeHTML(value) {
    const div = document.createElement('div');
    div.textContent = value;
    return div.innerHTML;
  }

  openColorPicker(anchor, isTextColor) {
    if (this.colorPicker) this.colorPicker.destroy();
    if (this._searchPanel) {
      this._searchPanel.remove();
      this._searchPanel = null;
    }
    this.colorPicker = new ColorPicker((color) => {
      if (color) {
        if (isTextColor) this.commands.textColor(color);
        else this.commands.backgroundColor(color);
      } else {
        if (isTextColor) this.commands.textColor('');
        else this.commands.backgroundColor('');
      }
    });
    this.colorPicker.show(anchor);
  }

  toggleSourceView() {
    this._isSourceView = !this._isSourceView;
    if (this._isSourceView) {
      const html = this.getHTML();
      this._sourceTextarea = document.createElement('textarea');
      this._sourceTextarea.className = 'aracode-source';
      this._sourceTextarea.value = html;
      this._sourceTextarea.style.minHeight = `${this.options.height}px`;
      this._sourceTextarea.setAttribute('aria-label', t('sourceView', this.options.locale));
      this.editable.style.display = 'none';
      this.editable.parentNode.insertBefore(this._sourceTextarea, this.editable.nextSibling);
      this._sourceTextarea.focus();
    } else {
      this.setHTML(this._sourceTextarea.value);
      if (this._sourceTextarea.parentNode) this._sourceTextarea.parentNode.removeChild(this._sourceTextarea);
      this._sourceTextarea = null;
      this.editable.style.display = '';
    }
    this.container.classList.toggle('is-source-view', this._isSourceView);
    this.emit('sourceview', this._isSourceView);
  }

  toggleFullscreen() {
    this._isFullscreen = !this._isFullscreen;
    this.container.classList.toggle('is-fullscreen', this._isFullscreen);
    if (this._isFullscreen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    this.emit('fullscreen', this._isFullscreen);
  }

  focus() {
    this.editable.focus();
    return this;
  }

  destroy() {
    this.emit('destroy');
    this._events = {};
    if (this._sourceTextarea && this._sourceTextarea.parentNode) {
      this._sourceTextarea.parentNode.removeChild(this._sourceTextarea);
    }
    this.toolbar.destroy();
    this.dialog.destroy();
    if (this.colorPicker) this.colorPicker.destroy();
    if (this._searchPanel) {
      this._searchPanel.remove();
      this._searchPanel = null;
    }
    this._uploadedImages.forEach(record => {
      if (record.deleteTimer) clearTimeout(record.deleteTimer);
    });
    this._uploadedImages.clear();
    if (this.editable.parentNode) this.editable.parentNode.removeChild(this.editable);
    this.container.classList.remove('aracode-editor-container', 'is-focused', 'is-fullscreen', 'is-source-view');
    this.container.innerHTML = '';
  }
}
