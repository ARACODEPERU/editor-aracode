# Aracode Editor

Un editor de texto WYSIWYG ligero, moderno y altamente portable.

## Instalación

```bash
npm install @elmerrodriguez/editor-aracode
```

## Uso Básico

```javascript
import AracodeEditor from '@elmerrodriguez/editor-aracode';
import '@elmerrodriguez/editor-aracode/dist/aracode-editor.css';

const editor = new AracodeEditor('#editor', {
    // opciones...
});

// Exportar contenido a PDF (descarga directa; requiere html2pdf.js en el proyecto)
await editor.exportToPDF({ filename: 'documento.pdf' });

// Solo diálogo de impresión (sin dependencias extra)
await editor.exportToPDF({ mode: 'print' });

// También disponible desde el botón "Exportar PDF" del toolbar
```

## Licencia
MIT
