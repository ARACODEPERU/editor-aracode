const COLORS = [
  '#000000', '#434343', '#666666', '#999999', '#b7b7b7', '#cccccc', '#d9d9d9', '#efefef', '#f3f3f3', '#ffffff',
  '#980000', '#ff0000', '#ff9900', '#ffff00', '#00ff00', '#00ffff', '#4a86e8', '#0000ff', '#9900ff', '#ff00ff',
  '#e6b8af', '#f4cccc', '#fce5cd', '#fff2cc', '#d9ead3', '#d0e0e3', '#c9daf8', '#cfe2f3', '#d9d2e9', '#ead1dc',
  '#dd7e6b', '#ea9999', '#f9cb9c', '#ffe599', '#b6d7a8', '#a2c4c9', '#a4c2f4', '#9fc5e8', '#b4a7d6', '#d5a6bd',
  '#cc4125', '#e06666', '#f6b26b', '#ffd966', '#93c47d', '#76a5af', '#6d9eeb', '#6fa8dc', '#8e7cc3', '#c27ba0',
  '#a61c00', '#cc0000', '#e69138', '#f1c232', '#6aa84f', '#45818e', '#3c78d8', '#3d85c6', '#674ea7', '#a64d79',
  '#85200c', '#990000', '#b45f06', '#bf9000', '#38761d', '#134f5c', '#1155cc', '#0b5394', '#351c75', '#741b47',
  '#5b0f00', '#660000', '#783f04', '#7f6000', '#274e13', '#0c343d', '#1c4587', '#073763', '#20124d', '#4c1130',
];

export class ColorPicker {
  constructor(onSelect) {
    this.onSelect = onSelect;
    this._anchor = null;
    this._outsideHandler = null;
    this.container = document.createElement('div');
    this.container.className = 'aracode-color-picker';
    this.build();
  }

  build() {
    const grid = document.createElement('div');
    grid.className = 'aracode-color-picker-grid';
    COLORS.forEach(color => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'aracode-color-picker-swatch';
      btn.style.backgroundColor = color;
      btn.dataset.color = color;
      btn.title = color;
      btn.addEventListener('mousedown', (e) => e.preventDefault());
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.onSelect(color);
        this.hide();
      });
      grid.appendChild(btn);
    });

    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'aracode-color-picker-remove';
    removeBtn.textContent = '✕ Sin color';
    removeBtn.addEventListener('mousedown', (e) => e.preventDefault());
    removeBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.onSelect('');
      this.hide();
    });

    this.container.appendChild(grid);
    this.container.appendChild(removeBtn);
    document.body.appendChild(this.container);
  }

  isOpenFor(anchor) {
    return this._anchor === anchor && this.container.classList.contains('is-visible');
  }

  show(anchor) {
    this._anchor = anchor;
    const rect = anchor.getBoundingClientRect();
    this.container.style.top = `${rect.bottom + 4}px`;
    this.container.style.left = `${Math.max(8, rect.left)}px`;
    this.container.classList.add('is-visible');

    if (this._outsideHandler) {
      document.removeEventListener('mousedown', this._outsideHandler, true);
    }

    this._outsideHandler = (e) => {
      if (this.container.contains(e.target) || anchor.contains(e.target)) return;
      this.hide();
    };

    setTimeout(() => {
      document.addEventListener('mousedown', this._outsideHandler, true);
    }, 0);
  }

  hide() {
    this.container.classList.remove('is-visible');
    this._anchor = null;
    if (this._outsideHandler) {
      document.removeEventListener('mousedown', this._outsideHandler, true);
      this._outsideHandler = null;
    }
  }

  destroy() {
    this.hide();
    if (this.container.parentNode) this.container.parentNode.removeChild(this.container);
  }
}
