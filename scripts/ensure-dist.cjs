const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const distEntry = path.join(__dirname, '..', 'dist', 'aracode-editor.es.js');

if (fs.existsSync(distEntry)) {
  process.exit(0);
}

console.log('dist/ no encontrado; ejecutando npm run build...');
execSync('npm run build', { stdio: 'inherit', cwd: path.join(__dirname, '..') });
