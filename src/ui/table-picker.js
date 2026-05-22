import { t } from '../lang.js';
import { TABLE_PICKER_GRID_SIZE, TABLE_MAX_SIZE } from '../core/table-constants.js';

export class TablePicker {
  constructor(editor, onInsert) {
    this.editor = editor;
    this.onInsert = onInsert;
    this.wrapper = null;
    this.popover = null;
    this._outsideHandler = null;
    this._headerRow = false;
  }

  toggle(anchor, wrapper) {
    if (this.popover && this.wrapper === wrapper) {
      this.close();
      return;
    }
    this.close();
    this.wrapper = wrapper;
    this._savedRange = this._saveSelection();
    this._render(anchor);
  }

  close() {
    if (this._outsideHandler) {
      document.removeEventListener('mousedown', this._outsideHandler, true);
      this._outsideHandler = null;
    }
    if (this.popover?.parentNode) this.popover.parentNode.removeChild(this.popover);
    this.popover = null;
    this.wrapper = null;
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

  _render(anchor) {
    const locale = this.editor.options.locale;
    const popover = document.createElement('div');
    popover.className = 'aracode-table-popover';

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

    popover.appendChild(label);
    popover.appendChild(grid);
    popover.appendChild(custom);
    popover.appendChild(options);
    this.wrapper.appendChild(popover);
    this.popover = popover;

    this._outsideHandler = (e) => {
      if (popover.contains(e.target) || anchor.contains(e.target)) return;
      this.close();
    };
    setTimeout(() => document.addEventListener('mousedown', this._outsideHandler, true), 0);
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
