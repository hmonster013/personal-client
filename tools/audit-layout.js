// AUDIT BỐ CỤC LÀNG 3D — phát hiện khối đè nhau / đặt sai logic, KHÔNG cần chạy app.
// Cách dùng:  node tools/audit-layout.js
// Output:
//   1. Báo cáo console: cặp object chồng lấn, prop lọt vào nhà, vật đè lên đường,
//      zone tương tác bị collider chặn, object rơi ra ngoài đảo.
//   2. tools/layout.svg — bản đồ top-down toàn đảo (mở bằng browser / screenshot gửi Claude).
//
// Nguyên tắc: footprint lấy từ bbox THẬT của GLB (như measure-glb.js), nhân scale,
// xoay theo rotation.y — không đoán kích thước.

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const MODELS_DIR = path.join(ROOT, 'src', 'assets', 'game3d', 'models');
const SPEC_TS = path.join(ROOT, 'src', 'app', 'game', 'world', 'world-spec.ts');
const SPEC_CJS = path.join(__dirname, '.world-spec.cjs');

// ---- 1. Compile world-spec.ts -> CJS rồi require ----
execSync(`npx esbuild "${SPEC_TS}" --bundle --format=cjs --platform=node --outfile="${SPEC_CJS}"`, {
  cwd: ROOT, stdio: 'pipe'
});
const { WORLD_SPEC } = require(SPEC_CJS);

// ---- 2. Đo bbox model (cache) ----
const bboxCache = new Map();
function getBBox(modelPath) {
  if (bboxCache.has(modelPath)) return bboxCache.get(modelPath);
  const rel = modelPath.replace('assets/game3d/models/', '');
  const buf = fs.readFileSync(path.join(MODELS_DIR, rel));
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
  const box = { min, max };
  bboxCache.set(modelPath, box);
  return box;
}

// ---- 3. Phân loại object ----
function categoryOf(p) {
  const f = p.split('/').pop();
  if (/^(path_|patch-)/.test(f) || /road/.test(f)) return 'decal';     // nằm bẹt trên đất
  if (/^(wall|roof|chimney|overhang|pillar|banner|blade)/.test(f)) return 'structure'; // mảnh ghép nhà
  if (/^(tree|palm|pine)/.test(f)) return 'tree';
  if (/^(grass|flower|mushroom|crop)/.test(f)) return 'flora';         // cỏ hoa nhỏ, đè chút không sao
  if (/^(ship|boat|structure-platform)/.test(f)) return 'marine';      // dưới nước / bến
  return 'prop'; // stall, cart, barrel, crate, fence, well, log...
}

// ---- 4. Footprint thế giới (4 góc XZ xoay theo rotY) + dải Y ----
function worldFootprint(o) {
  const box = getBBox(o.modelPath);
  const sx = o.scale ? o.scale.x : 1, sy = o.scale ? o.scale.y : 1, sz = o.scale ? o.scale.z : 1;
  const rotY = (o.rotation && o.rotation.y) || 0;
  const c = Math.cos(rotY), s = Math.sin(rotY);
  const cornersModel = [
    [box.min[0] * sx, box.min[2] * sz], [box.max[0] * sx, box.min[2] * sz],
    [box.max[0] * sx, box.max[2] * sz], [box.min[0] * sx, box.max[2] * sz],
  ];
  // Three.js rotY: (x,z) -> (x*cos + z*sin, -x*sin + z*cos)
  const corners = cornersModel.map(([mx, mz]) => [
    o.position.x + mx * c + mz * s,
    o.position.z + (-mx * s + mz * c),
  ]);
  const xs = corners.map((p) => p[0]), zs = corners.map((p) => p[1]);
  return {
    corners,
    minX: Math.min(...xs), maxX: Math.max(...xs),
    minZ: Math.min(...zs), maxZ: Math.max(...zs),
    minY: o.position.y + box.min[1] * sy,
    maxY: o.position.y + box.max[1] * sy,
  };
}

const EPS = 0.06; // bỏ qua chạm mép
function overlaps(a, b) {
  return (
    a.minX + EPS < b.maxX && a.maxX - EPS > b.minX &&
    a.minZ + EPS < b.maxZ && a.maxZ - EPS > b.minZ &&
    a.minY + EPS < b.maxY && a.maxY - EPS > b.minY
  );
}
function overlapArea(a, b) {
  const w = Math.min(a.maxX, b.maxX) - Math.max(a.minX, b.minX);
  const d = Math.min(a.maxZ, b.maxZ) - Math.max(a.minZ, b.minZ);
  return Math.max(0, w) * Math.max(0, d);
}

// ---- 5. Chuẩn bị danh sách ----
const objects = WORLD_SPEC.objects.map((o, idx) => ({
  ...o, idx,
  cat: categoryOf(o.modelPath),
  fp: worldFootprint(o),
  short: o.modelPath.split('/').pop().replace('.glb', ''),
}));

// ---- 6. KIỂM TRA ----
const report = { overlapPairs: [], propInBuilding: [], onRoad: [], blockedZones: [], offIsland: [] };

// 6a. Chồng lấn (bỏ structure-vs-structure cùng nhà, decal, flora-vs-flora, marine)
for (let i = 0; i < objects.length; i++) {
  for (let k = i + 1; k < objects.length; k++) {
    const A = objects[i], B = objects[k];
    if (A.cat === 'decal' || B.cat === 'decal') continue;
    if (A.cat === 'marine' && B.cat === 'marine') continue;
    if (A.cat === 'flora' && B.cat === 'flora') continue;
    if (A.cat === 'structure' && B.cat === 'structure') {
      const dx = A.position.x - B.position.x, dz = A.position.z - B.position.z;
      if (dx * dx + dz * dz < 16) continue; // cùng một cụm nhà (stamp helper) — chấp nhận
    }
    if (overlaps(A.fp, B.fp)) {
      const area = overlapArea(A.fp, B.fp);
      if (area < 0.04) continue; // chạm mép không đáng kể
      report.overlapPairs.push({
        a: `${A.short}@(${A.position.x},${A.position.z})`,
        b: `${B.short}@(${B.position.x},${B.position.z})`,
        catA: A.cat, catB: B.cat,
        area: area.toFixed(2),
      });
    }
  }
}

// 6b. Vật to đè lên đường (tâm rơi vào tile path) — trừ decal/flora
const roadTiles = objects.filter((o) => o.cat === 'decal' && /path_/.test(o.modelPath));
for (const o of objects) {
  if (o.cat === 'decal' || o.cat === 'flora' || o.cat === 'marine') continue;
  for (const r of roadTiles) {
    if (
      o.position.x > r.fp.minX && o.position.x < r.fp.maxX &&
      o.position.z > r.fp.minZ && o.position.z < r.fp.maxZ
    ) {
      report.onRoad.push(`${o.short}@(${o.position.x},${o.position.z}) đè lên ${r.short}@(${r.position.x},${r.position.z})`);
      break;
    }
  }
}

// 6c. Zone tương tác bị collider chặn (sample lưới 0.25)
for (const z of WORLD_SPEC.interactionZones) {
  let total = 0, blocked = 0;
  for (let x = z.minX + 0.1; x < z.maxX; x += 0.25) {
    for (let zz = z.minZ + 0.1; zz < z.maxZ; zz += 0.25) {
      total++;
      for (const c of WORLD_SPEC.colliders) {
        if (x > c.minX && x < c.maxX && zz > c.minZ && zz < c.maxZ) { blocked++; break; }
      }
    }
  }
  const pct = total ? Math.round((blocked / total) * 100) : 0;
  if (pct > 60) report.blockedZones.push(`${z.name}: ${pct}% diện tích bị collider chặn`);
}

// 6d. Object trên cạn nhưng rơi ngoài mép đảo (r > 16.7 ở y>=0) — sẽ lơ lửng trên mặt nước
for (const o of objects) {
  if (o.cat === 'marine') continue;
  const r = Math.hypot(o.position.x, o.position.z);
  if (o.position.y >= -0.1 && r > 16.7) {
    report.offIsland.push(`${o.short}@(${o.position.x},${o.position.z}) r=${r.toFixed(1)}`);
  }
}

// ---- 7. In báo cáo ----
console.log(`\n=== AUDIT BỐ CỤC (${objects.length} objects, ${WORLD_SPEC.colliders.length} colliders, ${WORLD_SPEC.interactionZones.length} zones) ===\n`);
console.log(`--- A. CHỒNG LẤN THẬT (${report.overlapPairs.length} cặp) ---`);
report.overlapPairs
  .sort((x, y) => y.area - x.area)
  .forEach((p) => console.log(`  [${p.area}m²] ${p.a} (${p.catA}) ⚔ ${p.b} (${p.catB})`));
console.log(`\n--- B. VẬT ĐÈ LÊN ĐƯỜNG (${report.onRoad.length}) ---`);
report.onRoad.forEach((s) => console.log('  ' + s));
console.log(`\n--- C. ZONE BỊ COLLIDER CHẶN (${report.blockedZones.length}) ---`);
report.blockedZones.forEach((s) => console.log('  ' + s));
console.log(`\n--- D. VẬT RƠI NGOÀI ĐẢO (${report.offIsland.length}) ---`);
report.offIsland.forEach((s) => console.log('  ' + s));

// ---- 8. Vẽ SVG top-down ----
const S = 30; // px / unit
const W = 1500;
const cx = W / 2, cy = W / 2;
const px = (wx) => cx + wx * S;
const py = (wz) => cy + wz * S;

const CAT_COLOR = {
  structure: '#b5651d', prop: '#e07b00', tree: '#2e7d32',
  flora: '#81c784', decal: '#9e9e9e', marine: '#1565c0',
};

let svg = [];
svg.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${W}" viewBox="0 0 ${W} ${W}" font-family="monospace">`);
svg.push(`<rect width="${W}" height="${W}" fill="#3f7fc4"/>`);
// Đảo (same noise như scene-manager)
{
  const pts = [];
  for (let i = 0; i <= 96; i++) {
    const t = (i / 96) * Math.PI * 2;
    let r = 17.5 + Math.sin(t * 3 + 1) * 0.5 + Math.sin(t * 7 + 2) * 0.3;
    // Vịnh cát nam (đồng bộ scene-manager). Lưu ý: shape Y = −world Z nên vẽ map cần lật dấu sin.
    const dCove = Math.abs(Math.atan2(Math.sin(t - 4.712), Math.cos(t - 4.712)));
    if (dCove < 0.46) r -= 5.6 * Math.pow(Math.cos((dCove / 0.46) * (Math.PI / 2)), 1.2);
    pts.push(`${px(Math.cos(t) * r).toFixed(1)},${py(-Math.sin(t) * r).toFixed(1)}`);
  }
  svg.push(`<polygon points="${pts.join(' ')}" fill="#5d8a4e" stroke="#8b6b4f" stroke-width="3"/>`);
}
// Bãi cát
svg.push(`<circle cx="${px(0)}" cy="${py(15)}" r="${3.5 * S}" fill="#d9c389"/>`);
// Decals (đường) trước
for (const o of objects.filter((x) => x.cat === 'decal')) {
  const ptsStr = o.fp.corners.map(([x, z]) => `${px(x).toFixed(1)},${py(z).toFixed(1)}`).join(' ');
  svg.push(`<polygon points="${ptsStr}" fill="#b0a89a" opacity="0.85"/>`);
}
// Colliders (đỏ outline)
for (const c of WORLD_SPEC.colliders) {
  svg.push(`<rect x="${px(c.minX)}" y="${py(c.minZ)}" width="${(c.maxX - c.minX) * S}" height="${(c.maxZ - c.minZ) * S}" fill="none" stroke="#d32f2f" stroke-width="1" opacity="0.6"/>`);
}
// Zones (vàng)
for (const z of WORLD_SPEC.interactionZones) {
  svg.push(`<rect x="${px(z.minX)}" y="${py(z.minZ)}" width="${(z.maxX - z.minX) * S}" height="${(z.maxZ - z.minZ) * S}" fill="#ffd75e" opacity="0.3" stroke="#c8a200" stroke-width="1.5"/>`);
  svg.push(`<text x="${px((z.minX + z.maxX) / 2)}" y="${py(z.maxZ) + 11}" font-size="11" fill="#7a6200" text-anchor="middle">${z.name}</text>`);
}
// Objects
for (const o of objects.filter((x) => x.cat !== 'decal')) {
  const ptsStr = o.fp.corners.map(([x, z]) => `${px(x).toFixed(1)},${py(z).toFixed(1)}`).join(' ');
  svg.push(`<polygon points="${ptsStr}" fill="${CAT_COLOR[o.cat]}" opacity="${o.cat === 'structure' ? 0.55 : 0.75}" stroke="#333" stroke-width="0.5"/>`);
  if (o.cat === 'prop' || o.cat === 'marine') {
    svg.push(`<text x="${px(o.position.x)}" y="${py(o.position.z)}" font-size="7" fill="#111" text-anchor="middle">${o.short}</text>`);
  }
}
// NPCs
for (const n of WORLD_SPEC.npcs) {
  svg.push(`<circle cx="${px(n.position.x)}" cy="${py(n.position.z)}" r="5" fill="#e91e63" stroke="#fff" stroke-width="1.5"/>`);
  svg.push(`<text x="${px(n.position.x)}" y="${py(n.position.z) - 8}" font-size="10" fill="#fff" text-anchor="middle">${n.name}</text>`);
}
// Spawn
svg.push(`<circle cx="${px(WORLD_SPEC.spawnPoint.x)}" cy="${py(WORLD_SPEC.spawnPoint.z)}" r="6" fill="#00e676" stroke="#000" stroke-width="2"/>`);
svg.push(`<text x="${px(WORLD_SPEC.spawnPoint.x)}" y="${py(WORLD_SPEC.spawnPoint.z) - 10}" font-size="12" fill="#00e676" text-anchor="middle" font-weight="bold">SPAWN</text>`);
// Legend
svg.push(`<g font-size="13" fill="#fff">
<rect x="10" y="10" width="220" height="120" fill="rgba(0,0,0,0.55)" rx="4"/>
<text x="20" y="30">■ nâu nhạt = nhà (structure)</text>
<text x="20" y="48">■ cam = prop · ■ xanh = cây</text>
<text x="20" y="66">▭ đỏ = collider · ▭ vàng = zone E</text>
<text x="20" y="84">● hồng = NPC · ● xanh lá = spawn</text>
<text x="20" y="102">Bắc = phía trên (−Z)</text>
</g>`);
svg.push('</svg>');
fs.writeFileSync(path.join(__dirname, 'layout.svg'), svg.join('\n'));
console.log('\n→ Đã vẽ tools/layout.svg');
