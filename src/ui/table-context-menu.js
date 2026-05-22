import { t } from '../lang.js';
import {
  insertRowAbove,
  insertRowBelow,
  insertColumnLeft,
  insertColumnRight,
  deleteRow,
  deleteColumn,
  deleteTable,
} from '../core/table-commands.js';

export class TableContextMenu {
  constructor(editor) {
    this.editor = editor;
    this.menu = null;
    this._cell = null;
    this._outsideHandler = null;
    this._escapeHandler = null;
  }

  open(cell, x, y) {
    this.close();
    this._cell = cell;
    const locale = this.editor.options.locale;

    const menu = document.createElement('div');
    menu.className = 'aracode-table-context-menu';
    menu.setAttribute('role', 'menu');

    const items = [
      { id: 'insertRowAbove', label: t('tableInsertRowAbove', locale), action: () => insertRowAbove(cell, this.editor) },
      { id: 'insertRowBelow', label: t('tableInsertRowBelow', locale), action: () => insertRowBelow(cell, this.editor) },
      { type: 'separator' },
      { id: 'insertColumnLeft', label: t('tableInsertColumnLeft', locale), action: () => insertColumnLeft(cell, this.editor) },
      { id: 'insertColumnRight', label: t('tableInsertColumnRight', locale), action: () => insertColumnRight(cell, this.editor) },
      { type: 'separator' },
      { id: 'deleteRow', label: t('tableDeleteRow', locale), action: () => deleteRow(cell, this.editor) },
      { id: 'deleteColumn', label: t('tableDeleteColumn', locale), action: () => deleteColumn(cell, this.editor) },
      { type: 'separator' },
      { id: 'deleteTable', label: t('tableDeleteTable', locale), action: () => deleteTable(cell, this.editor), danger: true },
    ];

    items.forEach((item) => {
      if (item.type === 'separator') {
        const sep = document.createElement('div');
        sep.className = 'aracode-table-context-menu-sep';
        menu.appendChild(sep);
        return;
      }
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'aracode-table-context-menu-item';
      if (item.danger) btn.classList.add('is-danger');
      btn.textContent = item.label;
      btn.setAttribute('role', 'menuitem');
      btn.addEventListener('mousedown', (e) => e.preventDefault());
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        item.action();
        this.close();
      });
      menu.appendChild(btn);
    });

    document.body.appendChild(menu);
    this.menu = menu;

    const rect = menu.getBoundingClientRect();
    let left = x;
    let top = y;
    if (left + rect.width > window.innerWidth) left = window.innerWidth - rect.width - 8;
    if (top + rect.height > window.innerHeight) top = window.innerHeight - rect.height - 8;
    menu.style.left = `${Math.max(8, left)}px`;
    menu.style.top = `${Math.max(8, top)}px`;

    this._outsideHandler = (e) => {
      if (menu.contains(e.target)) return;
      this.close();
    };
    this._escapeHandler = (e) => {
      if (e.key === 'Escape') this.close();
    };
    setTimeout(() => {
      document.addEventListener('mousedown', this._outsideHandler, true);
      document.addEventListener('keydown', this._escapeHandler);
    }, 0);
  }

  close() {
    if (this._outsideHandler) {
      document.removeEventListener('mousedown', this._outsideHandler, true);
      this._outsideHandler = null;
    }
    if (this._escapeHandler) {
      document.removeEventListener('keydown', this._escapeHandler);
      this._escapeHandler = null;
    }
    if (this.menu?.parentNode) this.menu.parentNode.removeChild(this.menu);
    this.menu = null;
    this._cell = null;
  }
}
