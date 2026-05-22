const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const root = path.join(__dirname, '..');
const distEntry = path.join(root, 'dist', 'aracode-editor.es.js');

if (fs.existsSync(distEntry)) {
  process.exit(0);
}

const hasVite = fs.existsSync(path.join(root, 'node_modules', 'vite', 'package.json'));

if (!hasVite) {
  console.error(
    '[editor-aracode] Falta dist/ en el paquete instalado. ' +
      'Usa una versión del repositorio que incluya dist/ (npm run build + commit) ' +
      'o instala desde una etiqueta/release publicada.'
  );
  process.exit(1);
}

console.log('[editor-aracode] dist/ no encontrado; ejecutando build local...');
execSync('npm run build', { stdio: 'inherit', cwd: root });
