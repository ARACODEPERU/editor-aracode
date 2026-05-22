# Aracode Editor

Editor WYSIWYG en JavaScript, empaquetado como librería npm. Pensado para usarse en **cualquier proyecto** (Laravel, Vue, React, Angular, HTML estático, etc.), no solo en un monorepo concreto.

## Instalación en tu proyecto

Elige **una** forma según tu flujo:

| Entorno | Comando |
|--------|---------|
| Producción / CI (recomendado) | `npm install github:ARACODEPERU/editor-aracode#main` |
| Versión fija | `npm install github:ARACODEPERU/editor-aracode#v0.2.0` |
| Desarrollo local del editor | `"@elmerrodriguez/editor-aracode": "file:../editor-aracode"` en `package.json` |

**Requisitos del paquete publicado**

- Debe incluir la carpeta `dist/` en el repositorio (tras `npm run build`).
- No necesitas instalar `html2pdf.js` en el proyecto consumidor: ya va dentro del bundle.
- El paquete no añade dependencias runtime a `node_modules` del host.

## Uso (cualquier bundler: Vite, Webpack, esbuild)

```javascript
import AracodeEditor from '@elmerrodriguez/editor-aracode';
import '@elmerrodriguez/editor-aracode/style.css';

const editor = new AracodeEditor('#editor', {
  locale: 'es',
  height: 320,
});

await editor.exportToPDF({ filename: 'documento.pdf' });
await editor.exportToPDF({ mode: 'print' });
```

Ruta alternativa del CSS (equivalente):

```javascript
import '@elmerrodriguez/editor-aracode/dist/aracode-editor.css';
```

## Vue 3 (ejemplo en cualquier app)

```vue
<script setup>
import { onMounted, onBeforeUnmount, ref } from 'vue';
import AracodeEditor from '@elmerrodriguez/editor-aracode';
import '@elmerrodriguez/editor-aracode/style.css';

const host = ref(null);
let editor = null;

onMounted(() => {
  editor = new AracodeEditor(host.value, { locale: 'es' });
});

onBeforeUnmount(() => editor?.destroy());
</script>

<template>
  <div ref="host" />
</template>
```

En Laravel + Vite, el import es el mismo dentro de `resources/js/...`.

## HTML sin bundler (CDN / script)

```html
<link rel="stylesheet" href="node_modules/@elmerrodriguez/editor-aracode/dist/aracode-editor.css" />
<script src="node_modules/@elmerrodriguez/editor-aracode/dist/aracode-editor.umd.js"></script>
<script>
  const editor = new AracodeEditor('#editor', { locale: 'es' });
</script>
```

## Qué incluye el paquete (y qué no)

| Incluido en `dist/` | No forma parte del npm publicado |
|---------------------|----------------------------------|
| Editor + toolbar + tablas + PDF (`html2pdf` empaquetado) | Carpeta `src/` (solo en el repo de desarrollo) |
| CSS `aracode-editor.css` | `graphify-out/` (herramienta local; ignorada en git) |

## Fuentes tipográficas

Las fuentes del selector se cargan desde **Google Fonts** cuando el usuario las elige o al exportar. Funciona igual en todos los proyectos que tengan acceso a internet en el navegador del usuario.

No usa rutas de tu PC ni archivos dentro de `graphify-out/`.

## Desarrollo del editor (mantenedores)

```bash
git clone https://github.com/ARACODEPERU/editor-aracode.git
cd editor-aracode
npm install
npm run build
git add dist
git commit -m "Actualizar dist"
git push
```

Quien instale desde GitHub recibirá `dist/` listo, sin compilar en su Laravel/Vue/React.

## Licencia

MIT
