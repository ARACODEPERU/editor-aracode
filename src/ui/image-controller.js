export class ImageController {
  constructor(editor) {
    this.editor = editor;
    this.selectedImage = null;
    this.container = null;
    this._isDragging = false;
    this._dropIndicator = null;
    this._dragStartPos = null;
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

    this._initDrag();
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
    this._removeDropIndicator();
  }

  _initDrag() {
    if (!this.container) return;

    const onMouseDown = (e) => {
      if (e.target.closest('.aracode-img-resizer')) return;
      e.preventDefault();
      this._dragStartPos = { x: e.clientX, y: e.clientY };
      this._isDragging = false;
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    };

    const onMouseMove = (e) => {
      if (!this._dragStartPos) return;
      const dx = e.clientX - this._dragStartPos.x;
      const dy = e.clientY - this._dragStartPos.y;
      if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
        if (!this._isDragging) {
          this._isDragging = true;
          this.container.style.opacity = '0.4';
          this._createDropIndicator();
        }
        this._updateDropPosition(e.clientX, e.clientY);
      }
    };

    const onMouseUp = (e) => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      if (this._isDragging) {
        this._finishDrag(e.clientX, e.clientY);
      }
      this._dragStartPos = null;
      this._isDragging = false;
    };

    this.container.addEventListener('mousedown', onMouseDown);
  }

  _createDropIndicator() {
    this._removeDropIndicator();
    this._dropIndicator = document.createElement('div');
    this._dropIndicator.className = 'aracode-drop-indicator';
    this.editor.editable.appendChild(this._dropIndicator);
  }

  _removeDropIndicator() {
    if (this._dropIndicator && this._dropIndicator.parentNode) {
      this._dropIndicator.parentNode.removeChild(this._dropIndicator);
    }
    this._dropIndicator = null;
  }

  _updateDropPosition(clientX, clientY) {
    if (!this._dropIndicator) return;
    const range = this._getDropRange(clientX, clientY);
    if (!range) {
      this._dropIndicator.style.display = 'none';
      return;
    }
    this._dropIndicator.style.display = '';
    const rect = range.getClientRects()[0];
    if (rect) {
      const editableRect = this.editor.editable.getBoundingClientRect();
      this._dropIndicator.style.top = (rect.top - editableRect.top) + 'px';
      this._dropIndicator.style.left = (rect.left - editableRect.left) + 'px';
      this._dropIndicator.style.height = rect.height + 'px';
    }
  }

  _getDropRange(clientX, clientY) {
    const editable = this.editor.editable;
    if (!document.caretRangeFromPoint) return null;
    const range = document.caretRangeFromPoint(clientX, clientY);
    if (!range || !editable.contains(range.commonAncestorContainer)) return null;
    return range;
  }

  _finishDrag(clientX, clientY) {
    this._removeDropIndicator();
    if (this.container) this.container.style.opacity = '';

    if (!this.selectedImage || !this.container) return;

    const range = this._getDropRange(clientX, clientY);
    if (!range) return;

    const img = this.selectedImage;
    const container = this.container;
    const alignClass = ['align-left', 'align-center', 'align-right'].find(cls => container.classList.contains(cls));

    img.classList.remove('align-left', 'align-center', 'align-right');
    if (alignClass) img.classList.add(alignClass);

    if (container.parentNode) {
      container.parentNode.insertBefore(img, container);
      container.parentNode.removeChild(container);
    }

    range.deleteContents();
    range.insertNode(img);

    const newContainer = document.createElement('span');
    newContainer.className = 'aracode-img-container';
    if (alignClass) newContainer.classList.add(alignClass);
    img.parentNode.insertBefore(newContainer, img);
    newContainer.appendChild(img);

    const handles = ['tl', 'tr', 'bl', 'br'];
    handles.forEach(pos => {
      const handle = document.createElement('div');
      handle.className = `aracode-img-resizer ${pos}`;
      handle.addEventListener('mousedown', (e) => this._onResizeStart(e, pos));
      newContainer.appendChild(handle);
    });

    this.selectedImage = img;
    this.container = newContainer;
    this._initDrag();

    this.editor.emit('change', this.editor.getHTML());
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
