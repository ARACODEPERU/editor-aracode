const fs = require('fs');
const path = require('path');

const dist = path.resolve(__dirname, '..', 'dist');
const oldCss = path.join(dist, 'style.css');
const oldMap = path.join(dist, 'style.css.map');
const newCss = path.join(dist, 'aracode-editor.css');
const newMap = path.join(dist, 'aracode-editor.css.map');

if (fs.existsSync(oldCss)) {
  fs.renameSync(oldCss, newCss);
  console.log('Renamed: style.css → aracode-editor.css');
}
if (fs.existsSync(oldMap)) {
  fs.renameSync(oldMap, newMap);
  console.log('Renamed: style.css.map → aracode-editor.css.map');
}

const darkSrc = path.join(__dirname, '..', 'src', 'styles', 'themes', 'dark.css');
const darkDest = path.join(dist, 'theme-dark.css');
if (fs.existsSync(darkSrc)) {
  fs.copyFileSync(darkSrc, darkDest);
  console.log('Copied: src/styles/themes/dark.css → dist/theme-dark.css');
}
