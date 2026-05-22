import { t } from '../lang.js';
import { TABLE_PICKER_GRID_SIZE, TABLE_MAX_SIZE } from '../core/table-constants.js';

export class TablePicker {
  constructor(editor, onInsert) {
    this.editor = editor;
    this.onInsert = onInsert;
    this.overlay = null;
    this.dialog = null;
    this._outsideHandler = null;
    this._keyHandler = null;
    this._headerRow = false;
    this._savedRange = null;
  }

  toggle() {
    if (this.overlay) {
      this.close();
      return;
    }
    this._savedRange = this._saveSelection();
    this._render();
  }

  close() {
    if (this._keyHandler) {
      document.removeEventListener('keydown', this._keyHandler);
      this._keyHandler = null;
    }
    if (this._outsideHandler) {
      document.removeEventListener('mousedown', this._outsideHandler, true);
      this._outsideHandler = null;
    }
    if (this.overlay?.parentNode) {
      this.overlay.parentNode.removeChild(this.overlay);
    }
    this.overlay = null;
    this.dialog = null;
    if (!this._otherModalOpen()) {
      document.body.style.overflow = '';
    }
  }

  _otherModalOpen() {
    return !!document.querySelector('.aracode-dialog-overlay:not(.aracode-table-picker-overlay)');
  }

  _saveSelection() {
    const selection = window.getSelection();
    if (!selection.rangeCount) return null;
    const range = selection.getRangeAt(0);
    if (!this.editor.editable.contains(range.commonAncestorContainer)) return null;
    return range.cloneRange();
  }

  _restoreSelection() {
    if (!this._savedRange) return;
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(this._savedRange);
  }

  _clampSize(value) {
    const n = parseInt(value, 10);
    if (!Number.isFinite(n)) return 1;
    return Math.max(1, Math.min(TABLE_MAX_SIZE, n));
  }

  _render() {
    const locale = this.editor.options.locale;
    document.body.style.overflow = 'hidden';

    const overlay = document.createElement('div');
    overlay.className = 'aracode-dialog-overlay aracode-table-picker-overlay';
    overlay.setAttribute('role', 'presentation');

    const dialog = document.createElement('div');
    dialog.className = 'aracode-dialog aracode-table-picker-dialog';
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('aria-modal', 'true');
    dialog.setAttribute('aria-label', t('table', locale));

    const header = document.createElement('div');
    header.className = 'aracode-dialog-header';
    header.textContent = t('table', locale);

    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'aracode-dialog-close';
    closeBtn.setAttribute('aria-label', t('cancel', locale));
    closeBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>';
    closeBtn.addEventListener('mousedown', (e) => e.preventDefault());
    closeBtn.addEventListener('click', () => this.close());
    header.appendChild(closeBtn);

    const body = document.createElement('div');
    body.className = 'aracode-dialog-body aracode-table-picker-body';

    const label = document.createElement('div');
    label.className = 'aracode-table-picker-label';
    label.textContent = t('tablePickerHint', locale);

    const grid = document.createElement('div');
    grid.className = 'aracode-table-picker-grid';
    grid.setAttribute('role', 'grid');
    grid.setAttribute('aria-label', t('table', locale));

    for (let r = 0; r < TABLE_PICKER_GRID_SIZE; r++) {
      for (let c = 0; c < TABLE_PICKER_GRID_SIZE; c++) {
        const cell = document.createElement('button');
        cell.type = 'button';
        cell.className = 'aracode-table-picker-cell';
        cell.dataset.row = String(r + 1);
        cell.dataset.col = String(c + 1);
        cell.setAttribute('aria-label', `${r + 1} × ${c + 1}`);
        cell.addEventListener('mousedown', (e) => e.preventDefault());
        cell.addEventListener('mouseenter', () => this._setHover(r + 1, c + 1, grid, label, locale));
        cell.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          this._insert(r + 1, c + 1);
        });
        grid.appendChild(cell);
      }
    }

    const custom = document.createElement('div');
    custom.className = 'aracode-table-picker-custom';

    const rowsLabel = document.createElement('label');
    rowsLabel.className = 'aracode-table-picker-field';
    rowsLabel.textContent = t('tableRows', locale);
    const rowsInput = document.createElement('input');
    rowsInput.type = 'number';
    rowsInput.className = 'aracode-table-picker-input';
    rowsInput.min = '1';
    rowsInput.max = String(TABLE_MAX_SIZE);
    rowsInput.value = '3';
    rowsLabel.appendChild(rowsInput);

    const colsLabel = document.createElement('label');
    colsLabel.className = 'aracode-table-picker-field';
    colsLabel.textContent = t('tableCols', locale);
    const colsInput = document.createElement('input');
    colsInput.type = 'number';
    colsInput.className = 'aracode-table-picker-input';
    colsInput.min = '1';
    colsInput.max = String(TABLE_MAX_SIZE);
    colsInput.value = '3';
    colsLabel.appendChild(colsInput);

    const insertBtn = document.createElement('button');
    insertBtn.type = 'button';
    insertBtn.className = 'aracode-btn aracode-btn-primary aracode-table-picker-insert';
    insertBtn.textContent = t('tableInsertCustom', locale);
    insertBtn.addEventListener('mousedown', (e) => e.preventDefault());
    insertBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this._insert(this._clampSize(rowsInput.value), this._clampSize(colsInput.value));
    });

    const onEnter = (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        insertBtn.click();
      }
    };
    rowsInput.addEventListener('keydown', onEnter);
    colsInput.addEventListener('keydown', onEnter);

    custom.appendChild(rowsLabel);
    custom.appendChild(colsLabel);
    custom.appendChild(insertBtn);

    const options = document.createElement('label');
    options.className = 'aracode-table-picker-option';
    const headerCheck = document.createElement('input');
    headerCheck.type = 'checkbox';
    headerCheck.addEventListener('change', () => {
      this._headerRow = headerCheck.checked;
    });
    options.appendChild(headerCheck);
    options.appendChild(document.createTextNode(t('tableHeaderRow', locale)));

    body.appendChild(label);
    body.appendChild(grid);
    body.appendChild(custom);
    body.appendChild(options);

    const footer = document.createElement('div');
    footer.className = 'aracode-dialog-footer';
    const cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.className = 'aracode-btn aracode-btn-secondary';
    cancelBtn.textContent = t('cancel', locale);
    cancelBtn.addEventListener('mousedown', (e) => e.preventDefault());
    cancelBtn.addEventListener('click', () => this.close());
    footer.appendChild(cancelBtn);

    dialog.appendChild(header);
    dialog.appendChild(body);
    dialog.appendChild(footer);
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);

    this.overlay = overlay;
    this.dialog = dialog;

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) this.close();
    });

    this._keyHandler = (e) => {
      if (e.key === 'Escape') this.close();
    };
    document.addEventListener('keydown', this._keyHandler);

    setTimeout(() => dialog.classList.add('is-open'), 10);
  }

  _setHover(rows, cols, grid, label, locale) {
    label.textContent = t('tablePickerSize', locale)
      .replace('{rows}', rows)
      .replace('{cols}', cols);
    grid.querySelectorAll('.aracode-table-picker-cell').forEach((cell) => {
      const r = parseInt(cell.dataset.row, 10);
      const c = parseInt(cell.dataset.col, 10);
      cell.classList.toggle('is-highlighted', r <= rows && c <= cols);
    });
  }

  _insert(rows, cols) {
    this._restoreSelection();
    this.onInsert(rows, cols, this._headerRow, this._savedRange);
    this.close();
  }
}
