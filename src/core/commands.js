import { TABLE_MAX_SIZE } from './table-constants.js';

export class Commands {
  constructor(editor) {
    this.editor = editor;
  }

  exec(name, value = null) {
    const editable = this.editor.editable;
    editable.focus();
    document.execCommand(name, false, value);
    this.editor.emit('change', this.editor.getHTML());
    this.editor.emit('command', name, value);
  }

  bold() { this.exec('bold'); }
  italic() { this.exec('italic'); }
  underline() { this.exec('underline'); }
  strikethrough() { this.exec('strikeThrough'); }
  orderedList() { this.exec('insertOrderedList'); }
  unorderedList() { this.exec('insertUnorderedList'); }
  blockquote() { this.exec('formatBlock', '<blockquote>'); }
  horizontalRule() { this.exec('insertHorizontalRule'); }
  code() {
    const sel = window.getSelection();
    const text = sel.toString() || '';
    const escaped = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    this.exec('insertHTML', `<code>${escaped}</code>`);
  }
  removeFormat() { this.exec('removeFormat'); }
  undo() { this.exec('undo'); }
  redo() { this.exec('redo'); }

  heading(level) {
    if (level === 0) {
      this.exec('formatBlock', '<p>');
    } else {
      this.exec('formatBlock', `<h${level}>`);
    }
  }

  align(className) {
    const img = this.editor.imageController?.selectedImage;
    if (img) {
      img.className = className;
      if (this.editor.imageController?.container) {
        this.editor.imageController.container.classList.remove('align-left', 'align-center', 'align-right');
        if (className) this.editor.imageController.container.classList.add(className);
      }
      this.editor.emit('change', this.editor.getHTML());
    }
  }

  alignLeft() {
    if (this.editor.imageController?.selectedImage) {
      this.align('align-left');
    } else {
      this.exec('justifyLeft');
    }
  }

  alignCenter() {
    if (this.editor.imageController?.selectedImage) {
      this.align('align-center');
    } else {
      this.exec('justifyCenter');
    }
  }

  alignRight() {
    if (this.editor.imageController?.selectedImage) {
      this.align('align-right');
    } else {
      this.exec('justifyRight');
    }
  }

  alignJustify() { this.exec('justifyFull'); }

  codeBlock() {
    const sel = window.getSelection();
    const text = sel.toString() || '';
    const escaped = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    this.exec('insertHTML', `<pre><code>${escaped}</code></pre>`);
  }

  createLink(url, text, target = '') {
    const editable = this.editor.editable;
    editable.focus();
    const sel = window.getSelection();
    if (sel.toString() === '') {
      const linkText = text || url;
      this.exec('insertHTML', `<a href="${url}"${target ? ' target="_blank"' : ''}>${linkText}</a>`);
    } else {
      this.exec('createLink', url);
      if (target) {
        const range = sel.getRangeAt(0);
        const link = range.startContainer.parentElement?.closest?.('a') || editable.querySelector('a:not([target])');
        if (link) link.setAttribute('target', '_blank');
      }
    }
    this.editor.emit('change', this.editor.getHTML());
  }

  removeLink() {
    this.exec('unlink');
  }

  fontFamily(fontFamily) {
    if (!fontFamily) return;
    const selection = window.getSelection();
    if (!selection.rangeCount || selection.toString() === '') return;
    const range = selection.getRangeAt(0);
    if (!this.editor.editable.contains(range.commonAncestorContainer)) return;

    this.editor.editable.focus();
    document.execCommand('fontName', false, fontFamily);

    this.editor.editable.querySelectorAll('font[face]').forEach(fontEl => {
      const span = document.createElement('span');
      span.style.fontFamily = fontEl.getAttribute('face');
      span.innerHTML = fontEl.innerHTML;
      fontEl.parentNode.replaceChild(span, fontEl);
    });

    this.editor.emit('change', this.editor.getHTML());
    this.editor.emit('command', 'fontFamily', fontFamily);
  }

  insertImage(url, alt = '', width = '', height = '', align = '', savedRange = null) {
    const editable = this.editor.editable;
    const img = document.createElement('img');
    img.setAttribute('src', url);
    if (alt) img.setAttribute('alt', alt);
    if (width) img.style.width = /^\d+$/.test(String(width)) ? width + 'px' : width;
    img.style.height = 'auto';
    if (align) img.className = `align-${align}`;
    img.style.display = 'inline';

    const sel = window.getSelection();
    let range;
    if (savedRange && editable.contains(savedRange.commonAncestorContainer)) {
      range = savedRange;
    } else if (sel.rangeCount > 0 && editable.contains(sel.getRangeAt(0).commonAncestorContainer)) {
      range = sel.getRangeAt(0);
    }

    if (range) {
      range.deleteContents();
      range.insertNode(img);
      range.setStartAfter(img);
      range.setEndAfter(img);
      sel.removeAllRanges();
      sel.addRange(range);
    } else {
      editable.appendChild(img);
    }
    this.editor.emit('change', this.editor.getHTML());
  }

  textColor(color) {
    const editable = this.editor.editable;
    editable.focus();
    document.execCommand('styleWithCSS', false, true);
    document.execCommand('foreColor', false, color || '#212529');
    this.editor.emit('change', this.editor.getHTML());
    this.editor.emit('command', 'foreColor', color);
  }

  backgroundColor(color) {
    const editable = this.editor.editable;
    editable.focus();
    document.execCommand('styleWithCSS', false, true);
    const value = color || 'transparent';
    if (!document.execCommand('hiliteColor', false, value)) {
      document.execCommand('backColor', false, value);
    }
    this.editor.emit('change', this.editor.getHTML());
    this.editor.emit('command', 'hiliteColor', color);
  }

  indent() { this.exec('indent'); }
  outdent() { this.exec('outdent'); }

  insertTable(rows, cols, headerRow = false, savedRange = null) {
    const r = Math.max(1, Math.min(TABLE_MAX_SIZE, parseInt(rows, 10) || 1));
    const c = Math.max(1, Math.min(TABLE_MAX_SIZE, parseInt(cols, 10) || 1));
    const editable = this.editor.editable;

    let html = '<table class="aracode-table"><tbody>';
    for (let ri = 0; ri < r; ri++) {
      html += '<tr>';
      for (let ci = 0; ci < c; ci++) {
        const tag = headerRow && ri === 0 ? 'th' : 'td';
        html += `<${tag}>&nbsp;</${tag}>`;
      }
      html += '</tr>';
    }
    html += '</tbody></table>';

    const tableNode = document.createElement('div');
    tableNode.innerHTML = html;
    const table = tableNode.firstElementChild;

    const sel = window.getSelection();
    let range;
    if (savedRange && editable.contains(savedRange.commonAncestorContainer)) {
      range = savedRange;
    } else if (sel.rangeCount > 0 && editable.contains(sel.getRangeAt(0).commonAncestorContainer)) {
      range = sel.getRangeAt(0);
    }

    editable.focus();
    if (range) {
      range.collapse(false);
      range.insertNode(table);
      const firstCell = table.querySelector('td, th');
      if (firstCell) {
        const newRange = document.createRange();
        newRange.selectNodeContents(firstCell);
        newRange.collapse(true);
        sel.removeAllRanges();
        sel.addRange(newRange);
      }
    } else {
      editable.appendChild(table);
    }

    this.editor.emit('change', this.editor.getHTML());
    this.editor.emit('command', 'insertTable', { rows: r, cols: c, headerRow });
  }
}
