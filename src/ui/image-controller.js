export class ImageController {
  constructor(editor) {
    this.editor = editor;
    this.selectedImage = null;
    this.container = null;
    this._bindEvents();
  }

  _bindEvents() {
    this.editor.editable.addEventListener('click', (e) => {
      if (e.target.tagName === 'IMG') {
        this.selectImage(e.target);
      } else if (!e.target.closest('.aracode-img-resizer')) {
        this.deselectImage();
      }
    });
  }

  selectImage(img) {
    if (this.selectedImage === img) return;
    this.deselectImage();
    this.selectedImage = img;
    
    const alignClass = ['align-left', 'align-center', 'align-right'].find(cls => img.classList.contains(cls));
    this.container = document.createElement('span');
    this.container.className = 'aracode-img-container';
    if (alignClass) this.container.classList.add(alignClass);
    img.parentNode.insertBefore(this.container, img);
    this.container.appendChild(img);

    const handles = ['tl', 'tr', 'bl', 'br'];
    handles.forEach(pos => {
      const handle = document.createElement('div');
      handle.className = `aracode-img-resizer ${pos}`;
      handle.addEventListener('mousedown', (e) => this._onResizeStart(e, pos));
      this.container.appendChild(handle);
    });
  }

  deselectImage() {
    if (!this.selectedImage || !this.container) return;
    
    const img = this.selectedImage;
    const alignClass = ['align-left', 'align-center', 'align-right'].find(cls => this.container.classList.contains(cls));
    img.classList.remove('align-left', 'align-center', 'align-right');
    if (alignClass) img.classList.add(alignClass);

    if (this.container.parentNode) {
      this.container.parentNode.insertBefore(img, this.container);
      this.container.parentNode.removeChild(this.container);
    }
    
    this.selectedImage = null;
    this.container = null;
  }

  _onResizeStart(e, pos) {
    e.preventDefault();
    e.stopPropagation();
    const img = this.selectedImage;
    const startX = e.clientX;
    const startW = img.offsetWidth;
    const minWidth = 40;

    const onMove = (me) => {
      const deltaX = me.clientX - startX;
      const horizontalDelta = pos === 'tl' || pos === 'bl' ? -deltaX : deltaX;
      const nextWidth = Math.max(minWidth, startW + horizontalDelta);

      img.style.width = nextWidth + 'px';
      img.style.height = 'auto';
    };

    const onEnd = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onEnd);
      this.editor.emit('change', this.editor.getHTML());
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onEnd);
  }
}
