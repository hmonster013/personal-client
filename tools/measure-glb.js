// Đo kích thước (bounding box) và liệt kê animation của model GLB — KHÔNG cần chạy app.
// Cách dùng:
//   node tools/measure-glb.js town/wall.glb town/lantern.glb nature/tree_oak.glb
//   node tools/measure-glb.js --all town        (đo cả thư mục town/)
// Dùng tool này TRƯỚC khi đặt model vào world-spec — đừng đoán kích thước.

const fs = require('fs');
const path = require('path');

const MODELS_DIR = path.join(__dirname, '..', 'src', 'assets', 'game3d', 'models');

function inspect(relPath) {
  const full = path.join(MODELS_DIR, relPath);
  const buf = fs.readFileSync(full);
  const jsonLen = buf.readUInt32LE(12);
  const j = JSON.parse(buf.slice(20, 20 + jsonLen).toString());

  let min = [Infinity, Infinity, Infinity];
  let max = [-Infinity, -Infinity, -Infinity];
  for (const m of j.meshes || []) {
    for (const pr of m.primitives || []) {
      const a = j.accessors[pr.attributes.POSITION];
      if (a.min && a.max) {
        for (let i = 0; i < 3; i++) {
          min[i] = Math.min(min[i], a.min[i]);
          max[i] = Math.max(max[i], a.max[i]);
        }
      }
    }
  }
  const f = (n) => n.toFixed(2).padStart(6);
  const anims = (j.animations || []).map((a) => a.name);
  console.log(
    relPath.padEnd(36),
    `size (x,y,z): ${f(max[0] - min[0])} ${f(max[1] - min[1])} ${f(max[2] - min[2])}`,
    `| min: ${f(min[0])} ${f(min[1])} ${f(min[2])}`,
    `| max: ${f(max[0])} ${f(max[1])} ${f(max[2])}`,
    anims.length ? `| anims: ${anims.join(',')}` : ''
  );
}

const args = process.argv.slice(2);
if (args[0] === '--all') {
  const dir = args[1] || '';
  const files = fs.readdirSync(path.join(MODELS_DIR, dir)).filter((f) => f.endsWith('.glb'));
  files.forEach((f) => inspect(path.join(dir, f)));
} else if (args.length) {
  args.forEach(inspect);
} else {
  console.log('Usage: node tools/measure-glb.js <path...> | --all <subdir>');
}
