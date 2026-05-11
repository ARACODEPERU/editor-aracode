export function startCountdown(dropZone, seconds, onDone) {
  if (dropZone._countdownTimer) clearInterval(dropZone._countdownTimer);

  let current = seconds;
  const countdown = document.createElement('div');
  countdown.className = 'aracode-dialog-dropzone-countdown';
  countdown.textContent = current;
  dropZone.appendChild(countdown);

  dropZone._countdownTimer = setInterval(() => {
    current -= 1;
    countdown.textContent = current;

    if (current <= 0) {
      clearInterval(dropZone._countdownTimer);
      dropZone._countdownTimer = null;
      setTimeout(() => {
        if (typeof onDone === 'function') onDone();
      }, 250);
    }
  }, 1000);
}

function createDropZone(fileInput, fileValues, fieldName, placeholder) {
  const wrapper = document.createElement('div');
  wrapper.className = 'aracode-dialog-file-wrapper';
  fileInput.type = 'file';
  fileInput.className = 'aracode-dialog-file-input';
  if (fieldName.name) fileInput.name = fieldName.name;
  fileInput.accept = fieldName.accept || '*/*';
  if (fieldName.multiple) fileInput.multiple = true;
  const dropZone = document.createElement('div');
  dropZone.className = 'aracode-dialog-dropzone';
  dropZone.innerHTML = `
    <div class="aracode-dialog-dropzone-inner">
      <div class="aracode-dialog-dropzone-icon">
        <svg viewBox="0 0 24 24" width="40" height="40"><path fill="currentColor" d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/></svg>
      </div>
      <div class="aracode-dialog-dropzone-text">${placeholder || 'Haz clic o arrastra un archivo'}</div>
    </div>
  `;
  dropZone.addEventListener('click', () => fileInput.click());
  function handleFile(file) {
    if (!file) return;
    if (dropZone._countdownTimer) clearInterval(dropZone._countdownTimer);
    const countdownEl = dropZone.querySelector('.aracode-dialog-dropzone-countdown');
    if (countdownEl) countdownEl.remove();
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target.result;
      fileValues.value = { file, dataUrl, width: '', height: '' };
      dropZone.innerHTML = `<img src="${dataUrl}" class="aracode-dialog-dropzone-preview" />`;
      dropZone.classList.add('has-image');

      const image = new Image();
      image.onload = () => {
        fileValues.value.width = image.naturalWidth || image.width || '';
        fileValues.value.height = image.naturalHeight || image.height || '';
      };
      image.src = dataUrl;
    };
    reader.readAsDataURL(file);
  }
  fileInput.addEventListener('change', () => handleFile(fileInput.files[0]));
  dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('is-dragover'); });
  dropZone.addEventListener('dragleave', () => dropZone.classList.remove('is-dragover'));
  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('is-dragover');
    if (e.dataTransfer.files[0]) {
      fileInput.files = e.dataTransfer.files;
      handleFile(e.dataTransfer.files[0]);
    }
  });
  wrapper.appendChild(fileInput);
  wrapper.appendChild(dropZone);
  return wrapper;
}

export class Dialog {
  constructor(options = {}) {
    this.options = options;
    this.overlay = null;
    this.dialog = null;
  }

  open(title, fields, onSubmit) {
    this.close();
    document.body.style.overflow = 'hidden';
    const result = {};
    this.overlay = document.createElement('div');
    this.overlay.className = 'aracode-dialog-overlay';
    this.dialog = document.createElement('div');
    this.dialog.className = 'aracode-dialog';
    const header = document.createElement('div');
    header.className = 'aracode-dialog-header';
    header.textContent = title;

    const closeBtn = document.createElement('button');
    closeBtn.className = 'aracode-dialog-close';
    closeBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>';
    closeBtn.addEventListener('click', () => this.close());
    header.appendChild(closeBtn);

    const body = document.createElement('div');
    body.className = 'aracode-dialog-body';
    const progress = document.createElement('div');
    progress.className = 'aracode-dialog-progress';
    progress.innerHTML = '<div class="aracode-dialog-progress-bar"></div>';
    body.appendChild(progress);

    // Botones
    const footer = document.createElement('div');
    footer.className = 'aracode-dialog-footer';
    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'aracode-btn aracode-btn-secondary';
    cancelBtn.textContent = this.options.cancelText || 'Cancelar';
    cancelBtn.addEventListener('click', () => this.close());
    const applyBtn = document.createElement('button');
    applyBtn.className = 'aracode-btn aracode-btn-primary aracode-dialog-apply-btn';
    applyBtn.textContent = this.options.applyText || 'Aplicar';
    applyBtn.style.display = 'none';
    const uploadBtn = document.createElement('button');
    uploadBtn.className = 'aracode-btn aracode-btn-primary aracode-dialog-upload-btn';
    uploadBtn.textContent = this.options.uploadText || 'Subir al servidor';
    uploadBtn.style.display = 'none';

    let firstInput = null;
    const dialogApi = this;

    function addField(field, parent) {
      if (field.type === 'file') {
        const fs = { value: null };
        const wrapper = createDropZone(document.createElement('input'), fs, field, field.placeholder);
        if (field.label) {
          const lbl = document.createElement('div');
          lbl.className = 'aracode-dialog-label';
          lbl.textContent = field.label;
          parent.appendChild(lbl);
        }
        parent.appendChild(wrapper);
        if (field.name) result[field.name] = fs;
        return;
      }
      if (field.type === 'hidden') {
        if (field.name) result[field.name] = { value: field.value || '' };
        return;
      }
      if (field.type === 'button') {
        const btn = document.createElement('button');
        btn.className = `aracode-btn ${field.primary ? 'aracode-btn-primary' : 'aracode-btn-secondary'}`;
        btn.textContent = field.label;
        btn.style.marginTop = '12px';
        btn.style.width = '100%';
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          if (field.onClick) {
            const data = {};
            for (const key of Object.keys(result)) {
              const val = result[key];
              if (val instanceof HTMLInputElement || val instanceof HTMLSelectElement) {
                data[key] = val.type === 'checkbox' ? val.checked : val.value;
              } else if (val && typeof val === 'object' && 'value' in val) {
                data[key] = val.value;
              }
            }
            field.onClick(data, dialogApi);
          }
        });
        parent.appendChild(btn);
        return;
      }
      if (field.type === 'image-preview') {
        const preview = document.createElement('img');
        preview.className = 'aracode-dialog-url-preview';
        preview.style.cssText = 'max-width:100%;max-height:150px;display:none;margin:10px auto;border-radius:4px;object-fit:contain;';
        parent.appendChild(preview);
        return;
      }
      if (field.type === 'select') {
        const container = document.createElement('div');
        container.className = 'aracode-dialog-field';
        if (field.label) {
          const label = document.createElement('label');
          label.className = 'aracode-dialog-label';
          label.textContent = field.label;
          container.appendChild(label);
        }
        const select = document.createElement('select');
        select.className = 'aracode-dialog-input';
        if (field.name) select.name = field.name;
        (field.options || []).forEach(opt => {
          const option = document.createElement('option');
          option.value = opt.value;
          option.textContent = opt.label;
          select.appendChild(option);
        });
        if (field.value !== undefined) select.value = field.value;
        container.appendChild(select);
        parent.appendChild(container);
        if (field.name) result[field.name] = select;
        return;
      }
      if (field.type === 'row') {
        const row = document.createElement('div');
        row.className = 'aracode-dialog-row';
        (field.fields || []).forEach(subField => {
          const cell = document.createElement('div');
          cell.className = 'aracode-dialog-cell';
          addField(subField, cell);
          row.appendChild(cell);
        });
        parent.appendChild(row);
        return;
      }
      if (field.type === 'tabs') {
        const tabsContainer = document.createElement('div');
        tabsContainer.className = 'aracode-dialog-tabs';
        const tabHeaders = document.createElement('div');
        tabHeaders.className = 'aracode-dialog-tab-headers';
        const tabContents = document.createElement('div');
        tabContents.className = 'aracode-dialog-tab-contents';
        field.tabs.forEach((tab, ti) => {
          const tabBtn = document.createElement('button');
          tabBtn.className = 'aracode-dialog-tab-btn' + (ti === 0 ? ' is-active' : '');
          tabBtn.textContent = tab.label;
          tabBtn.dataset.tabIndex = ti;
          const tabContent = document.createElement('div');
          tabContent.className = 'aracode-dialog-tab-content' + (ti === 0 ? ' is-active' : '');
          (tab.fields || []).forEach(subField => addField(subField, tabContent));
          tabHeaders.appendChild(tabBtn);
          tabContents.appendChild(tabContent);
            tabBtn.addEventListener('click', () => {
             tabHeaders.querySelectorAll('.aracode-dialog-tab-btn').forEach(b => b.classList.remove('is-active'));
             tabContents.querySelectorAll('.aracode-dialog-tab-content').forEach(c => c.classList.remove('is-active'));
             tabBtn.classList.add('is-active');
             tabContent.classList.add('is-active');
             // Botones según pestaña
             uploadBtn.style.display = ti === 0 ? '' : 'none';
             applyBtn.style.display = ti === 1 ? '' : 'none';
           });
        });
        tabsContainer.appendChild(tabHeaders);
        tabsContainer.appendChild(tabContents);
        parent.appendChild(tabsContainer);
        return;
      }
      const container = document.createElement('div');
      container.className = 'aracode-dialog-field';
      if (field.label) {
        const label = document.createElement('label');
        label.className = 'aracode-dialog-label';
        label.textContent = field.label;
        container.appendChild(label);
      }
      const input = document.createElement('input');
      input.className = 'aracode-dialog-input';
      if (field.name) input.name = field.name;
      input.type = field.type === 'checkbox' ? 'checkbox' : 'text';
      if (field.type === 'checkbox') input.checked = field.value || false;
      else {
        input.value = field.value || '';
        input.placeholder = field.placeholder || '';
      }
      if (field.autofocus && !firstInput) firstInput = input;
      container.appendChild(input);
      if (field.name) result[field.name] = input;
      parent.appendChild(container);
    }

    fields.forEach(field => addField(field, body));
    if (firstInput) setTimeout(() => firstInput.focus(), 50);

    applyBtn.addEventListener('click', async () => {
      const data = {};
      for (const key of Object.keys(result)) {
        const val = result[key];
        if (val instanceof HTMLInputElement || val instanceof HTMLSelectElement) {
          data[key] = val.type === 'checkbox' ? val.checked : val.value;
        } else if (val && typeof val === 'object' && 'value' in val) {
          data[key] = val.value;
        }
      }
      await onSubmit(data);
      this.close();
    });
    uploadBtn.addEventListener('click', async () => {
      const data = {};
      for (const key of Object.keys(result)) {
        const val = result[key];
        if (val instanceof HTMLInputElement || val instanceof HTMLSelectElement) {
          data[key] = val.type === 'checkbox' ? val.checked : val.value;
        } else if (val && typeof val === 'object' && 'value' in val) {
          data[key] = val.value;
        }
      }
      if (typeof this.options.onUpload === 'function') {
        await this.options.onUpload(data, dialogApi);
      }
    });
    footer.appendChild(cancelBtn);
    footer.appendChild(uploadBtn);
    footer.appendChild(applyBtn);
    this.dialog.appendChild(header);
    this.dialog.appendChild(body);
    this.dialog.appendChild(footer);

    // Visibilidad inicial de botones según pestaña activa
    const initialTabs = this.dialog.querySelectorAll('.aracode-dialog-tab-btn');
    if (initialTabs.length > 0) {
      uploadBtn.style.display = '';
      applyBtn.style.display = 'none';
    }
    this.overlay.appendChild(this.dialog);
    document.body.appendChild(this.overlay);
    this.overlay.addEventListener('click', (e) => { if (e.target === this.overlay) this.close(); });
    this._keyHandler = (e) => {
      if (e.key === 'Escape') this.close();
      if (e.key === 'Enter' && e.target.closest('.aracode-dialog-input:not([type="file"])')) applyBtn.click();
    };
    document.addEventListener('keydown', this._keyHandler);
    setTimeout(() => this.dialog.classList.add('is-open'), 10);
  }

  switchTab(index) {
    if (!this.dialog) return;
    const btns = this.dialog.querySelectorAll('.aracode-dialog-tab-btn');
    const contents = this.dialog.querySelectorAll('.aracode-dialog-tab-content');
    const applyBtn = this.dialog.querySelector('.aracode-dialog-apply-btn');
    const uploadBtn = this.dialog.querySelector('.aracode-dialog-upload-btn');
    if (btns[index] && contents[index]) {
      btns.forEach(b => b.classList.remove('is-active'));
      contents.forEach(c => c.classList.remove('is-active'));
      btns[index].classList.add('is-active');
      contents[index].classList.add('is-active');
      if (uploadBtn) uploadBtn.style.display = index === 0 ? '' : 'none';
      if (applyBtn) applyBtn.style.display = index === 1 ? '' : 'none';
    }
  }

  updateProgress(percent) {
    if (!this.dialog) return;
    const bar = this.dialog.querySelector('.aracode-dialog-progress-bar');
    const progress = this.dialog.querySelector('.aracode-dialog-progress');
    if (bar && progress) {
      progress.style.display = 'block';
      bar.style.width = percent + '%';
    }
  }

  setValue(name, value) {
    if (!this.dialog) return;
    const input = this.dialog.querySelector(`[name="${name}"]`);
    if (input) {
      input.value = value;
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }

  close() {
    document.body.style.overflow = '';
    if (this._keyHandler) {
      document.removeEventListener('keydown', this._keyHandler);
      this._keyHandler = null;
    }
    if (this.dialog) {
      this.dialog.classList.remove('is-open');
      setTimeout(() => {
        if (this.overlay && this.overlay.parentNode) this.overlay.parentNode.removeChild(this.overlay);
        this.overlay = null;
        this.dialog = null;
      }, 200);
    }
  }

  destroy() {
    this.close();
  }
}
