# Aracode Editor

Un editor de texto WYSIWYG ligero, moderno y altamente portable.

## Instalación

```bash
npm install github:ARACODEPERU/editor-aracode#main
```

El paquete publica la carpeta `dist/` (incluye `html2pdf.js` empaquetado). No hace falta instalar `html2pdf.js` por separado en el proyecto consumidor.

## Uso básico

```javascript
import AracodeEditor from '@elmerrodriguez/editor-aracode';
import '@elmerrodriguez/editor-aracode/dist/aracode-editor.css';

const editor = new AracodeEditor('#editor', {
    // opciones...
});

// Descarga PDF (html2pdf ya viene en el bundle)
await editor.exportToPDF({ filename: 'documento.pdf' });

// Solo diálogo de impresión del navegador
await editor.exportToPDF({ mode: 'print' });
```

## Fuentes tipográficas

Las fuentes del selector se cargan desde **Google Fonts** (`fonts.googleapis.com`) cuando el usuario las elige o al exportar HTML/PDF. No dependen de rutas locales de tu PC.

La carpeta `graphify-out/` **no** contiene fuentes: es salida local de la herramienta [Graphify](https://github.com) (mapa del código). Puede incluir rutas absolutas de tu máquina (por ejemplo `python.exe`) y **no debe subirse ni desplegarse**; está en `.gitignore`.

## Desarrollo

```bash
npm install
npm run build
```

Tras cambiar el código, ejecuta `npm run build` y sube `dist/` al repositorio para que quien instale desde GitHub reciba el bundle actualizado.

## Licencia

MIT
