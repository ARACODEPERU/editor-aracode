import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  build: {
    lib: {
      entry: 'src/index.js',
      name: 'AracodeEditor',
      formats: ['es', 'cjs', 'umd'],
      fileName: (format) => format === 'cjs' ? 'aracode-editor.cjs' : `aracode-editor.${format}.js`,
    },
    cssFileName: 'aracode-editor',
    sourcemap: true,
    minify: 'esbuild',
    rollupOptions: {
      external: ['html2pdf.js'],
      output: {
        globals: {
          'html2pdf.js': 'html2pdf',
        },
      },
    },
  },
  optimizeDeps: {
    include: ['html2pdf.js'],
  },
  server: {
    open: true,
  },
});
