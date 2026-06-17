// Sinh village.map.json cho game RPG portfolio (plan/03-world-design.md)
// Chạy: node tools/generate-village-map.js
// Tileset: assets/game/tileset-village.png (192x208, 12 cột, tile 16px)
//   - idx 0..131: Kenney Tiny Town nguyên bản
//   - idx 132..155: tile ghép sẵn lên cỏ (xem tools ghi chú bên dưới)

const fs = require('fs');
const path = require('path');

const W = 40, H = 30;

// ===== Bảng tra tile (idx, khi ghi vào layer sẽ +1 thành gid) =====
// Hàng composite (132+) sắp theo đúng thứ tự script PowerShell tạo tileset-village.png:
// 132 nước, 133 nước lấp lánh, 134 biển gỗ, 135 thùng, 136 nấm, 137 bình gốm,
// 138 giếng, 139 tổ ong, 140 gốc cam, 141 gốc xanh, 142 chồng rương, 143 xu,
// 144..151 rào (TL,H,TR,VL,VR,BL,B,BR), 152..154 gốc thông xanh, 155 gốc thông cam
const IDX = {
  GRASS: 0, GRASS_SPROUT: 1, GRASS_FLOWER: 2, PEBBLES: 43,
  DIRT: 25, DIRT_DECOR1: 40, DIRT_DECOR2: 41,
  TREE_O_TOP: 3, TREE_G_TOP: 4,
  PINE_DENSE: 19,
  ROOF_G: { L: 48, M: 49, R: 50, BL: 60, BM: 61, BR: 62 },
  ROOF_R: { L: 52, M: 53, R: 54, BL: 64, BM: 65, BR: 66 },
  WALL_B: { L: 72, M: 73, R: 75, WIN: 84, DOOR: 86 },
  WALL_G: { L: 76, M: 77, R: 79, WIN: 88, DOOR: 90 },
  PLAZA: { TL: 96, T: 97, TR: 98, L: 108, C: 109, R: 110, BL: 120, B: 121, BR: 122 },
  SIGN: 134, CRATE: 135, MUSHROOM: 136, POT: 137, WELL: 138, BEEHIVE: 139,
  TRUNK_O: 140, TRUNK_G: 141, CRATE_STACK: 142, COIN: 143,
  FENCE: { TL: 144, H: 145, TR: 146, VL: 147, VR: 148, BL: 149, B: 150, BR: 151 },
  PINE_BOT: 153, PINE_O_BOT: 155,
};

const ground = new Array(W * H).fill(0);
const above = new Array(W * H).fill(0);
const collision = new Array(W * H).fill(0);
const interactions = [];

const at = (x, y) => y * W + x;
const setG = (x, y, idx) => { ground[at(x, y)] = idx + 1; };
const setA = (x, y, idx) => { above[at(x, y)] = idx + 1; };
const setC = (x, y) => { collision[at(x, y)] = 1; };
const clearC = (x, y) => { collision[at(x, y)] = 0; };

// ===== 1. Nền cỏ với biến thể giả ngẫu nhiên (deterministic) =====
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const r = (x * 7 + y * 13 + ((x * y) % 11)) % 29;
    let idx = IDX.GRASS;
    if (r === 3) idx = IDX.GRASS_SPROUT;
    else if (r === 8) idx = IDX.GRASS_FLOWER;
    else if (r === 17) idx = IDX.PEBBLES;
    setG(x, y, idx);
  }
}

// ===== 2. Rừng viền map (dày 2 tile, chặn toàn bộ) =====
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const onBorder = x < 2 || y < 2 || x >= W - 2 || y >= H - 2;
    if (!onBorder) continue;
    setC(x, y);
    // Tán thông phủ kín vành ngoài; vành trong hiện gốc cây để có chiều sâu
    const inner = (x === 1 || y === 1 || x === W - 2 || y === H - 2);
    const orangeMix = (x + y) % 7 === 0; // điểm xuyết thông cam mùa thu
    setA(x, y, IDX.PINE_DENSE);
    if (inner) setG(x, y, orangeMix ? IDX.PINE_O_BOT : IDX.PINE_BOT);
  }
}

// ===== 3. Quảng trường trung tâm 6x6 (sân đá, spawn tại (20,15)) =====
const PX = 17, PY = 12, PW = 6, PH = 6;
for (let y = PY; y < PY + PH; y++) {
  for (let x = PX; x < PX + PW; x++) {
    let idx = IDX.PLAZA.C;
    if (y === PY) idx = x === PX ? IDX.PLAZA.TL : x === PX + PW - 1 ? IDX.PLAZA.TR : IDX.PLAZA.T;
    else if (y === PY + PH - 1) idx = x === PX ? IDX.PLAZA.BL : x === PX + PW - 1 ? IDX.PLAZA.BR : IDX.PLAZA.B;
    else if (x === PX) idx = IDX.PLAZA.L;
    else if (x === PX + PW - 1) idx = IDX.PLAZA.R;
    setG(x, y, idx);
  }
}

// ===== 4. Đường đất 2 tile nối quảng trường tới các khu =====
function dirtPath(x1, y1, x2, y2) {
  // đi theo trục x trước rồi trục y, vẽ băng 2 tile
  for (let x = Math.min(x1, x2); x <= Math.max(x1, x2); x++) {
    for (const dy of [0, 1]) {
      const y = y1 + dy;
      const r = (x * 11 + y * 5) % 13;
      setG(x, y, r === 4 ? IDX.DIRT_DECOR1 : r === 9 ? IDX.DIRT_DECOR2 : IDX.DIRT);
    }
  }
  for (let y = Math.min(y1, y2); y <= Math.max(y1, y2); y++) {
    for (const dx of [0, 1]) {
      const x = x2 + dx;
      const r = (x * 11 + y * 5) % 13;
      setG(x, y, r === 4 ? IDX.DIRT_DECOR1 : r === 9 ? IDX.DIRT_DECOR2 : IDX.DIRT);
    }
  }
}
dirtPath(9, 10, 17 - 1, 10);   // thư viện -> rìa quảng trường (ngang y=10..11, dọc xuống x=16)
dirtPath(16, 10, 16, 11);      // dừng ở y=11 để không đè góc quảng trường (17,12)
dirtPath(23, 10, 27, 10);      // nhà DE013 -> quảng trường
dirtPath(23, 10, 23, 12);
dirtPath(9, 22, 16, 22);       // xưởng -> quảng trường
dirtPath(16, 18, 16, 22);
dirtPath(23, 18, 23, 22);      // quảng trường -> khu vườn/hòm thư
dirtPath(23, 22, 29, 22);
dirtPath(23, 14, 35, 14);      // đường mòn phía đông -> biển "đường tắt"
// nối dọc cửa từng nhà xuống đường
dirtPath(9, 7, 9, 10);         // cửa thư viện
dirtPath(27, 7, 27, 10);       // cửa nhà DE013
dirtPath(9, 19, 9, 22);        // cửa xưởng (cửa ở y=21... đường ngắn)

// ===== 5. Nhà cửa =====
// stamp nhà: roof 2 hàng (above) + tường 1 hàng (ground + collision), cửa ở doorOffset
function building(x, y, width, roof, wall, doorOffset, interactionName) {
  for (let i = 0; i < width; i++) {
    const rTop = i === 0 ? roof.L : i === width - 1 ? roof.R : roof.M;
    const rBot = i === 0 ? roof.BL : i === width - 1 ? roof.BR : roof.BM;
    setA(x + i, y, rTop);
    setA(x + i, y + 1, rBot);
    let w = i === 0 ? wall.L : i === width - 1 ? wall.R : wall.WIN;
    if (i === doorOffset) w = wall.DOOR;
    setG(x + i, y + 2, w);
    setC(x + i, y + 2);
    // chặn cả 2 hàng mái để không đi "xuyên" nhà từ phía sau
    setC(x + i, y);
    setC(x + i, y + 1);
  }
  interactions.push({
    name: interactionName,
    x: (x + doorOffset) * 16, y: (y + 2) * 16, width: 16, height: 16,
  });
}
building(7, 4, 5, IDX.ROOF_G, IDX.WALL_G, 2, 'door_blog');     // 📚 thư viện (xám, 5 tile), cửa (9,6)
building(25, 4, 4, IDX.ROOF_R, IDX.WALL_B, 2, 'door_about');   // 🏠 nhà DE013 (đỏ, 4 tile), cửa (27,6)
building(7, 19, 4, IDX.ROOF_R, IDX.WALL_B, 2, 'door_projects'); // ⚒️ xưởng (đỏ/nâu, 4 tile), cửa (9,21)

// đồ ngoài xưởng: chồng rương + thùng
setG(12, 21, IDX.CRATE_STACK); setC(12, 21);
setG(12, 22, IDX.CRATE); setC(12, 22);

// ===== 6. Điểm tương tác lẻ =====
function prop(x, y, idx, name, w = 16, h = 16) {
  setG(x, y, idx);
  setC(x, y);
  if (name) interactions.push({ name, x: x * 16, y: y * 16, width: w, height: h });
}
// Bảng nhiệm vụ: 2 biển gỗ cạnh nhau, mép tây quảng trường
setG(15, 13, IDX.SIGN); setC(15, 13);
setG(16, 13, IDX.SIGN); setC(16, 13);
interactions.push({ name: 'board_quest', x: 15 * 16, y: 13 * 16, width: 32, height: 16 });
// Giếng nước mép đông quảng trường
prop(24, 16, IDX.WELL, 'well_easteregg');
// Biển hướng dẫn ngay nam spawn
prop(19, 18, IDX.SIGN, 'sign_controls');
// Biển "đường tắt" cuối đường mòn đông
prop(35, 13, IDX.SIGN, 'sign_skip');
// Hòm thư (dùng bình gốm + biển làm cụm mailbox) cuối đường đông nam
prop(29, 21, IDX.POT, 'mailbox_contact');
setG(30, 21, IDX.SIGN); setC(30, 21);

// ===== 7. Vườn rào + tổ ong (trang trí, đông nam) =====
const GX = 30, GY = 23, GW = 6, GH = 4;
for (let x = GX; x < GX + GW; x++) {
  for (let y = GY; y < GY + GH; y++) {
    const ex = x === GX || x === GX + GW - 1, ey = y === GY || y === GY + GH - 1;
    if (!ex && !ey) { setG(x, y, IDX.GRASS_FLOWER); continue; } // hoa trong vườn
    let idx;
    if (x === GX && y === GY) idx = IDX.FENCE.TL;
    else if (x === GX + GW - 1 && y === GY) idx = IDX.FENCE.TR;
    else if (x === GX && y === GY + GH - 1) idx = IDX.FENCE.BL;
    else if (x === GX + GW - 1 && y === GY + GH - 1) idx = IDX.FENCE.BR;
    else if (y === GY) idx = IDX.FENCE.H;
    else if (y === GY + GH - 1) idx = IDX.FENCE.B;
    else idx = x === GX ? IDX.FENCE.VL : IDX.FENCE.VR;
    setG(x, y, idx); setC(x, y);
  }
}
setG(GX + 2, GY, IDX.GRASS_FLOWER); clearC(GX + 2, GY); // cổng vườn (khe hở hàng rào)
setG(GX + 2, GY + 1, IDX.BEEHIVE); setC(GX + 2, GY + 1);

// ===== 8. Cây + trang trí rải trong làng =====
function tree(x, y, orange) {
  setA(x, y, orange ? IDX.TREE_O_TOP : IDX.TREE_G_TOP);
  setG(x, y + 1, orange ? IDX.TRUNK_O : IDX.TRUNK_G);
  setC(x, y + 1);
}
tree(4, 9, false); tree(4, 16, true); tree(5, 24, false);
tree(14, 4, true); tree(20, 8, false); tree(31, 8, true);
tree(34, 18, false); tree(27, 25, true); tree(14, 25, false);
tree(33, 4, false);
setG(13, 16, IDX.MUSHROOM);
setG(26, 18, IDX.MUSHROOM);
setG(21, 25, IDX.MUSHROOM);
setG(25, 13, IDX.COIN); // easter egg nhỏ gần giếng

// ===== 9. Vùng NPC (không có tile, chỉ interaction) =====
interactions.push({ name: 'npc_guide', x: 17 * 16, y: 14 * 16, width: 32, height: 32 }); // NPC đứng (288,240)
interactions.push({ name: 'cat_npc', x: 21 * 16, y: 14 * 16, width: 32, height: 32 });   // mèo quanh (340,230)

// ===== 10. Kiểm tra an toàn =====
const required = ['npc_guide', 'door_about', 'door_projects', 'door_blog', 'board_quest',
  'mailbox_contact', 'sign_controls', 'sign_skip', 'well_easteregg', 'cat_npc'];
const names = interactions.map(i => i.name);
for (const r of required) {
  if (!names.includes(r)) throw new Error(`Thiếu interaction: ${r}`);
}
// spawn + NPC không bị kẹt collision
for (const [sx, sy, label] of [[20, 15, 'spawn'], [18, 15, 'guide'], [21, 14, 'cat']]) {
  if (collision[at(sx, sy)]) throw new Error(`Ô ${label} (${sx},${sy}) bị collision!`);
}
// trước mỗi cửa phải đi được
for (const i of interactions.filter(i => i.name.startsWith('door_'))) {
  const tx = i.x / 16, ty = i.y / 16 + 1;
  if (collision[at(tx, ty)]) throw new Error(`Trước cửa ${i.name} (${tx},${ty}) bị chặn!`);
}

// ===== 11. Ghi file =====
const map = {
  width: W, height: H, tilewidth: 16, tileheight: 16,
  layers: [
    { name: 'ground', type: 'tilelayer', data: ground, visible: true, opacity: 1 },
    { name: 'collision', type: 'tilelayer', data: collision, visible: false, opacity: 1 },
    { name: 'above', type: 'tilelayer', data: above, visible: true, opacity: 1 },
    { name: 'interactions', type: 'objectgroup', objects: interactions, visible: true, opacity: 1 },
  ],
  tilesets: [{
    firstgid: 1, image: 'assets/game/tileset-village.png',
    imagewidth: 192, imageheight: 208, tilewidth: 16, tileheight: 16,
  }],
};

const out = path.join(__dirname, '..', 'src', 'app', 'game', 'world', 'village.map.json');
fs.writeFileSync(out, JSON.stringify(map));
console.log(`OK: ${out}`);
console.log(`interactions: ${names.join(', ')}`);
