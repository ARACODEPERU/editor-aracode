import { TableContextMenu } from './table-context-menu.js';

/**
 * Navegación entre celdas con Tab / Shift+Tab y menú contextual (clic derecho).
 */
export class TableController {
  constructor(editor) {
    this.editor = editor;
    this.contextMenu = new TableContextMenu(editor);
    this._bindEvents();
  }

  _bindEvents() {
    this.editor.editable.addEventListener('keydown', (e) => {
      if (e.key !== 'Tab') return;
      const cell = this._getActiveCell();
      if (!cell) return;
      e.preventDefault();
      const next = e.shiftKey
        ? this._findPreviousCell(cell)
        : this._findNextCell(cell);
      if (next) this._focusCell(next);
    });

    this.editor.editable.addEventListener('contextmenu', (e) => {
      const cell = this._getCellFromTarget(e.target);
      if (!cell) return;
      e.preventDefault();
      this.contextMenu.open(cell, e.clientX, e.clientY);
    });
  }

  _getCellFromTarget(target) {
    if (!target) return null;
    const el = target.nodeType === Node.TEXT_NODE ? target.parentElement : target;
    const cell = el?.closest?.('td, th');
    if (!cell) return null;
    const table = cell.closest('table.aracode-table, table');
    if (!table || !this.editor.editable.contains(table)) return null;
    return cell;
  }

  _getActiveCell() {
    const sel = window.getSelection();
    if (!sel.rangeCount) return null;
    let node = sel.anchorNode;
    if (node?.nodeType === Node.TEXT_NODE) node = node.parentElement;
    return this._getCellFromTarget(node);
  }

  _getTableRows(table) {
    return Array.from(table.querySelectorAll('tr'));
  }

  _findNextCell(cell) {
    const row = cell.parentElement;
    const table = row?.closest('table');
    if (!table || !row) return null;

    const rows = this._getTableRows(table);
    const rowIndex = rows.indexOf(row);
    const cells = Array.from(row.cells);
    const colIndex = cells.indexOf(cell);

    if (colIndex < cells.length - 1) return cells[colIndex + 1];

    if (rowIndex < rows.length - 1) {
      const nextRow = rows[rowIndex + 1];
      return nextRow.cells[0] || null;
    }

    const tbody = table.querySelector('tbody') || table;
    const newRow = tbody.insertRow();
    const cols = cells.length || 1;
    for (let i = 0; i < cols; i++) {
      const td = document.createElement('td');
      td.innerHTML = '&nbsp;';
      newRow.appendChild(td);
    }
    this.editor.emit('change', this.editor.getHTML());
    return newRow.cells[0] || null;
  }

  _findPreviousCell(cell) {
    const row = cell.parentElement;
    const table = row?.closest('table');
    if (!table || !row) return null;

    const rows = this._getTableRows(table);
    const rowIndex = rows.indexOf(row);
    const cells = Array.from(row.cells);
    const colIndex = cells.indexOf(cell);

    if (colIndex > 0) return cells[colIndex - 1];
    if (rowIndex > 0) {
      const prevRow = rows[rowIndex - 1];
      return prevRow.cells[prevRow.cells.length - 1] || null;
    }
    return cell;
  }

  _focusCell(cell) {
    const range = document.createRange();
    range.selectNodeContents(cell);
    range.collapse(true);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
    this.editor.editable.focus();
  }

  destroy() {
    this.contextMenu.close();
  }
}
