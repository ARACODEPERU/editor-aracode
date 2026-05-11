import { t } from '../lang.js';

const DEFAULT_TOOLS = [
  'bold', 'italic', 'underline', 'strikethrough', '|',
  'heading', 'fontFamily', '|',
  'orderedList', 'unorderedList', '|',
  'alignLeft', 'alignCenter', 'alignRight', 'alignJustify', '|',
  'link', 'unlink', 'image', '|',
  'blockquote', 'codeBlock', 'code', 'horizontalRule', '|',
  'textColor', 'backgroundColor', '|',
  'undo', 'redo', 'removeFormat', '|',
  'search', 'sourceView', 'fullscreen',
];

const HEADING_OPTIONS = [
  { value: '0', label: 'Párrafo' },
  { value: '1', label: 'H1' },
  { value: '2', label: 'H2' },
  { value: '3', label: 'H3' },
  { value: '4', label: 'H4' },
  { value: '5', label: 'H5' },
  { value: '6', label: 'H6' },
];

const TOOL_ICONS = {
  bold: '<strong>B</strong>',
  italic: '<em>I</em>',
  underline: '<u>U</u>',
  strikethrough: '<s>S</s>',
  orderedList: '<svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M2 17h2v.5H3v1h1v.5H2v1h3v-4H2v1zm1-9h1V4H2v1h1v3zm-1 3h1.8L2 13.1v.9h3v-1H3.2L5 10.9V10H2v1zm5-6v2h14V5H7zm0 14h14v-2H7v2zm0-6h14v-2H7v2z"/></svg>',
  unorderedList: '<svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M2 4h2v2H2V4zm4 0h16v2H6V4zm-4 7h2v2H2v-2zm4 0h16v2H6v-2zm-4 7h2v2H2v-2zm4 0h16v2H6v-2z"/></svg>',
  alignLeft: '<svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M15 15H3v2h12v-2zm0-8H3v2h12V7zM3 13h18v-2H3v2zm0 8h18v-2H3v2zM3 3v2h18V3H3z"/></svg>',
  alignCenter: '<svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M7 15v2h10v-2H7zm-4 6h18v-2H3v2zm0-8h18v-2H3v2zm4-6v2h10V7H7zM3 3v2h18V3H3z"/></svg>',
  alignRight: '<svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M3 21h18v-2H3v2zm6-4h12v-2H9v2zm-6-4h18v-2H3v2zm6-4h12V7H9v2zM3 3v2h18V3H3z"/></svg>',
  alignJustify: '<svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M3 21h18v-2H3v2zm0-4h18v-2H3v2zm0-4h18v-2H3v2zm0-4h18V7H3v2zm0-6v2h18V3H3z"/></svg>',
  link: '<svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z"/></svg>',
  unlink: '<svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M2 5.27L3.28 4 20 20.72 18.73 22l-3.08-3.08c-.53.23-1.1.38-1.65.38H10v-1.9h4c.44 0 .86-.09 1.25-.25l-3.12-3.12H8v-1.9h1.73L5.27 9.05C4.5 9.66 4 10.62 4 12c0 1.71 1.39 3.1 3.1 3.1h4V17H7c-2.76 0-5-2.24-5-5 0-1.83.99-3.43 2.45-4.3L2 5.27zM16 11h4v2h-4v1.9l.06.06L14 12.94V11h2zm-3-4h-1.54L9.27 4.73C9.6 4.28 10.08 4 10.63 4H14v1.9h-4c-.34 0-.66.06-.96.16l-1.36-1.36C8.69 4.26 9.83 4 11 4h2v3z"/></svg>',
  image: '<svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/></svg>',
  blockquote: '<svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M6 17h3l2-4V7H5v6h3l-2 4zm8 0h3l2-4V7h-6v6h3l-2 4z"/></svg>',
  code: '<svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M9.4 16.6L4.8 12l4.6-4.6L8 6l-6 6 6 6 1.4-1.4zm5.2 0l4.6-4.6-4.6-4.6L16 6l6 6-6 6-1.4-1.4z"/></svg>',
  codeBlock: '<svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 14H5V7h14v10zM9.4 10.5l2.1 2.1-2.1 2.1 1.4 1.4L14.3 12l-3.5-3.5L9.4 10.5z"/></svg>',
  horizontalRule: '<svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M3 17h18v-2H3v2zm0-3h18v-2H3v2zm0-5h18V7H3v2z"/></svg>',
  undo: '<svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M12.5 8c-2.65 0-5.05.99-6.9 2.6L2 7v9h9l-3.62-3.62c1.39-1.16 3.16-1.88 5.12-1.88 3.54 0 6.55 2.31 7.6 5.5l2.37-.78C21.08 11.03 17.15 8 12.5 8z"/></svg>',
  redo: '<svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M18.4 10.6C16.55 8.99 14.15 8 11.5 8c-4.65 0-8.58 3.03-9.96 7.22L3.9 16c1.05-3.19 4.06-5.5 7.6-5.5 1.96 0 3.73.72 5.12 1.88L13 16h9V7l-3.6 3.6z"/></svg>',
  removeFormat: '<svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>',
  sourceView: '<svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M9.4 16.6L4.8 12l4.6-4.6L8 6l-6 6 6 6 1.4-1.4zm5.2 0l4.6-4.6-4.6-4.6L16 6l6 6-6 6-1.4-1.4z"/></svg>',
  fullscreen: '<svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/></svg>',
  textColor: '<svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M11 3L5.5 17h2.25l1.12-3h6.25l1.12 3h2.25L13 3h-2zm-1.38 9L11 5.5 12.38 12H9.62z"/><path fill="currentColor" d="M3 21h18v-2H3v2z"/></svg>',
  backgroundColor: '<svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M16.56 8.94L7.62 0 6.21 1.41l2.38 2.38-5.15 5.15a1.49 1.49 0 0 0 0 2.12l5.5 5.5a1.5 1.5 0 0 0 2.12 0l5.15-5.15 2.38 2.38 1.41-1.41-2.38-2.38zM5.5 12.56l4.5-4.5 4.5 4.5-4.5 4.5-4.5-4.5z"/><path fill="currentColor" d="M3 21h18v-2H3v2z"/></svg>',
  search: '<svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M9.5 3a6.5 6.5 0 0 1 5.18 10.43l5.45 5.44-1.42 1.42-5.44-5.45A6.5 6.5 0 1 1 9.5 3zm0 2a4.5 4.5 0 1 0 0 9 4.5 4.5 0 0 0 0-9z"/></svg>',
};

const OPEN_FONTS = [
  'Inter', 'Roboto', 'Open Sans', 'Lato', 'Montserrat', 'Poppins', 'Source Sans 3', 'Noto Sans',
  'Nunito', 'Raleway', 'Ubuntu', 'Merriweather', 'Playfair Display', 'Libre Baskerville',
  'Source Serif 4', 'Crimson Text', 'Cormorant Garamond', 'EB Garamond', 'Bitter', 'Lora',
  'PT Serif', 'PT Sans', 'Fira Sans', 'Fira Code', 'JetBrains Mono', 'Source Code Pro',
  'Inconsolata', 'IBM Plex Sans', 'IBM Plex Serif', 'IBM Plex Mono', 'Work Sans', 'DM Sans',
  'Manrope', 'Mulish', 'Quicksand', 'Karla', 'Barlow', 'Rubik', 'Heebo', 'Archivo',
  'Cabin', 'Mukta', 'Titillium Web', 'Exo 2', 'Josefin Sans', 'Libre Franklin', 'Asap',
  'Hind', 'Arimo', 'Tinos', 'Cousine', 'Noto Serif', 'Noto Sans Mono', 'Noto Sans Display',
  'Oswald', 'Bebas Neue', 'Anton', 'Archivo Black', 'Comfortaa', 'Pacifico', 'Caveat',
  'Dancing Script', 'Satisfy', 'Great Vibes', 'Abril Fatface', 'Bree Serif', 'Righteous',
  'Cinzel', 'Vollkorn', 'Alegreya', 'Alegreya Sans', 'Zilla Slab', 'Space Grotesk',
  'Space Mono', 'Sora', 'Urbanist', 'Outfit', 'Lexend', 'Red Hat Display', 'Red Hat Text',
  'Roboto Slab', 'Roboto Mono', 'Noto Sans JP', 'Noto Sans KR', 'Noto Sans SC', 'Noto Serif JP',
  'M PLUS Rounded 1c', 'M PLUS 1p', 'Prompt', 'Kanit', 'Sarabun', 'Public Sans', 'Jost',
  'Fraunces', 'Chivo', 'Chivo Mono', 'Anek Latin', 'Anybody', 'Epilogue', 'Signika',
  'Varela Round', 'Questrial', 'Assistant', 'Tajawal', 'Cairo', 'Amiri', 'Merriweather Sans',
  'Noto Color Emoji', 'Edu NSW ACT Foundation', 'Shadows Into Light', 'Permanent Marker',
  'Indie Flower', 'Amatic SC', 'Patrick Hand', 'Courgette', 'Sacramento', 'Kaushan Script'
];

export class Toolbar {
  constructor(editor) {
    this.editor = editor;
    this.container = document.createElement('div');
    this.container.className = 'aracode-toolbar';
    this.buttons = {};
    this.build();
  }

  build() {
    const tools = this.editor.options.toolbar || DEFAULT_TOOLS;
    let group = document.createElement('div');
    group.className = 'aracode-toolbar-group';

    tools.forEach((tool, index) => {
      if (tool === '|') {
        this.container.appendChild(group);
        const sep = document.createElement('span');
        sep.className = 'aracode-toolbar-separator';
        this.container.appendChild(sep);
        group = document.createElement('div');
        group.className = 'aracode-toolbar-group';
        return;
      }

      if (tool === 'heading') {
        const select = document.createElement('select');
        select.className = 'aracode-toolbar-select';
        select.setAttribute('aria-label', t('heading', this.editor.options.locale));
        HEADING_OPTIONS.forEach(opt => {
          const option = document.createElement('option');
          option.value = opt.value;
          option.textContent = opt.label;
          select.appendChild(option);
        });
        select.addEventListener('change', () => {
          const val = parseInt(select.value, 10);
          this.editor.commands.heading(val);
          select.value = '0';
        });
        group.appendChild(select);
        this.buttons.heading = select;
        return;
      }

      if (tool === 'fontFamily') {
        const wrapper = document.createElement('div');
        wrapper.className = 'aracode-font-picker';
        const btn = document.createElement('button');
        btn.className = 'aracode-toolbar-font-btn';
        btn.type = 'button';
        btn.textContent = t('fontFamily', this.editor.options.locale);
        btn.title = t('fontFamily', this.editor.options.locale);
        btn.addEventListener('mousedown', (e) => e.preventDefault());
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.toggleFontPicker(wrapper);
        });
        wrapper.appendChild(btn);
        group.appendChild(wrapper);
        this.buttons.fontFamily = btn;
        return;
      }

      if (tool === 'textColor' || tool === 'backgroundColor') {
        const btn = document.createElement('button');
        btn.className = 'aracode-toolbar-btn aracode-toolbar-color-btn';
        btn.innerHTML = TOOL_ICONS[tool] || '';
        btn.title = t(tool, this.editor.options.locale);
        btn.dataset.tool = tool;
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const isTextColor = tool === 'textColor';
          this.editor.openColorPicker(btn, isTextColor);
        });
        group.appendChild(btn);
        this.buttons[tool] = btn;
        return;
      }

      const btn = document.createElement('button');
      btn.className = 'aracode-toolbar-btn';
      btn.innerHTML = TOOL_ICONS[tool] || tool;
      btn.title = t(tool, this.editor.options.locale);
      btn.dataset.tool = tool;
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.handleToolClick(tool);
      });
      group.appendChild(btn);
      this.buttons[tool] = btn;
    });

    if (group.children.length > 0) {
      this.container.appendChild(group);
    }
  }

  handleToolClick(tool) {
    const cmds = this.editor.commands;
    if (['alignLeft', 'alignCenter', 'alignRight'].includes(tool)) {
      const img = this.editor.imageController?.selectedImage;
      if (img) {
        if (tool === 'alignLeft') cmds.align('align-left');
        if (tool === 'alignCenter') cmds.align('align-center');
        if (tool === 'alignRight') cmds.align('align-right');
        return;
      }
    }
    
    switch (tool) {
      case 'bold': cmds.bold(); break;
      case 'italic': cmds.italic(); break;
      case 'underline': cmds.underline(); break;
      case 'strikethrough': cmds.strikethrough(); break;
      case 'orderedList': cmds.orderedList(); break;
      case 'unorderedList': cmds.unorderedList(); break;
      case 'alignLeft': cmds.alignLeft(); break;
      case 'alignCenter': cmds.alignCenter(); break;
      case 'alignRight': cmds.alignRight(); break;
      case 'alignJustify': cmds.alignJustify(); break;
      case 'blockquote': cmds.blockquote(); break;
      case 'codeBlock': cmds.codeBlock(); break;
      case 'code': cmds.code(); break;
      case 'horizontalRule': cmds.horizontalRule(); break;
      case 'undo': cmds.undo(); break;
      case 'redo': cmds.redo(); break;
      case 'removeFormat': cmds.removeFormat(); break;
      case 'link': this.editor.openLinkDialog(); break;
      case 'unlink': cmds.removeLink(); break;
      case 'image': this.editor.openImageDialog(); break;
      case 'search': this.editor.toggleSearchPanel(); break;
      case 'sourceView': this.editor.toggleSourceView(); break;
      case 'fullscreen': this.editor.toggleFullscreen(); break;
    }
  }

  toggleFontPicker(wrapper) {
    const existing = wrapper.querySelector('.aracode-font-popover');
    if (existing) {
      existing.remove();
      return;
    }

    this.container.querySelectorAll('.aracode-font-popover').forEach(popover => popover.remove());
    const selection = window.getSelection();
    const savedRange = selection.rangeCount > 0 ? selection.getRangeAt(0).cloneRange() : null;
    const popover = document.createElement('div');
    popover.className = 'aracode-font-popover';

    const search = document.createElement('input');
    search.className = 'aracode-font-search';
    search.type = 'search';
    search.placeholder = t('fontSearchPlaceholder', this.editor.options.locale);
    const list = document.createElement('div');
    list.className = 'aracode-font-list';

    const render = () => {
      const query = search.value.trim().toLowerCase();
      const fonts = this.editor.options.fonts || OPEN_FONTS;
      const matches = fonts.filter(font => font.toLowerCase().includes(query)).slice(0, 40);
      list.innerHTML = '';
      matches.forEach(font => {
        this.editor.loadFontFamily(font);
        const item = document.createElement('button');
        item.type = 'button';
        item.className = 'aracode-font-option';
        item.textContent = font;
        item.style.fontFamily = `"${font}", sans-serif`;
        item.addEventListener('mousedown', (e) => e.preventDefault());
        item.addEventListener('click', () => {
          if (savedRange) {
            const sel = window.getSelection();
            sel.removeAllRanges();
            sel.addRange(savedRange);
          }
          this.editor.loadFontFamily(font);
          this.editor.commands.fontFamily(font);
          popover.remove();
        });
        list.appendChild(item);
      });
    };

    search.addEventListener('input', render);
    popover.appendChild(search);
    popover.appendChild(list);
    wrapper.appendChild(popover);
    render();
    setTimeout(() => search.focus(), 0);
  }

  updateActiveStates() {
    const tools = this.editor.options.toolbar || DEFAULT_TOOLS;
    tools.forEach(tool => {
      if (tool === '|' || tool === 'heading' || tool === 'fontFamily' || tool === 'textColor' || tool === 'backgroundColor') return;
      const btn = this.buttons[tool];
      if (!btn) return;
      const isActive = document.queryCommandState(tool === 'codeBlock' ? 'bold' :
        tool === 'sourceView' ? false :
        tool === 'fullscreen' ? false : tool);
      btn.classList.toggle('is-active', !!isActive);
    });
  }

  destroy() {
    if (this.container.parentNode) this.container.parentNode.removeChild(this.container);
    this.buttons = {};
  }
}
