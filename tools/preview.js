// Render preview-config.json → tools/preview.png bằng headless Edge.
// Cách dùng: sửa/ghi tools/preview-config.json rồi `node tools/preview.js`
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const edgePaths = [
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
];
const edge = edgePaths.find((p) => fs.existsSync(p));
if (!edge) throw new Error('Không tìm thấy Edge');

const html = path.join(__dirname, 'preview.html').replace(/\\/g, '/');
const out = path.join(__dirname, 'preview.png');
execSync(
  `"${edge}" --headless --allow-file-access-from-files --use-angle=swiftshader ` +
  `--virtual-time-budget=20000 --window-size=900,940 --screenshot="${out}" "file:///${html}"`,
  { stdio: 'pipe', timeout: 60000 }
);
console.log('→ ' + out);
