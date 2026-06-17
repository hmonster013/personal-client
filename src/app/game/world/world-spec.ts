export interface WorldObjectSpec {
  modelPath: string;
  position: { x: number; y: number; z: number };
  rotation?: { x?: number; y?: number; z?: number };
  scale?: { x: number; y: number; z: number };
  interactionName?: string; // có giá trị → mảnh này glow khi zone tương ứng active
}

export interface ColliderSpec {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export interface InteractionZoneSpec {
  name: string;
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export interface NPCSpec {
  name: string;
  modelPath: string;
  position: { x: number; y: number; z: number };
  rotationY?: number;
  roam?: boolean;
  roamRadius?: number;
  scale?: number;  // thú nuôi cube-pets cần thu nhỏ (cat 0.3, crab 0.25...)
  speed?: number;
}

/** Marker nổi đánh dấu điểm event — viên kim cương vàng xoay lơ lửng kiểu RPG */
export interface EventMarkerSpec {
  name: string; // trùng tên interaction zone — đã thăm thì marker mờ đi
  x: number;
  y: number; // độ cao lơ lửng (trên nóc công trình)
  z: number;
}

export interface WorldSpec {
  objects: WorldObjectSpec[];
  colliders: ColliderSpec[];
  interactionZones: InteractionZoneSpec[];
  npcs: NPCSpec[];
  eventMarkers: EventMarkerSpec[];
  spawnPoint: { x: number; y: number; z: number };
}

const M = (p: string) => `assets/game3d/models/${p}`;
const S = 1.5; // Scale chung cho các module nhà

// ===== HELPERS GHÉP NHÀ QUY ƯỚC KÈM COLLIDER =====

/**
 * 🏡 COTTAGE GỖ 2×1 mái dài (thay hut 1×1 mái chóp cũ — user muốn nhà to đẹp hơn).
 * Mảnh wall là PANEL MỎNG ở MÉP +X của ô 1×1; xoay: 0 → +X | π/2 → -Z | π → -X | -π/2 → +Z.
 * Mái: roof-gable-end ĐÃ XÁC MINH BẰNG tools/preview.js — rot 0 (ô tây) + π (ô đông) = đỉnh dọc trục X.
 * facing 'S' = cửa quay +Z, 'N' = cửa quay -Z (hướng về quảng trường).
 */
function stampCottage(cx: number, cz: number, facing: 'S' | 'N' = 'S'): WorldObjectSpec[] {
  const sc = { x: S, y: S, z: S };
  const x1 = cx - S / 2;
  const x2 = cx + S / 2;
  const front = facing === 'S' ? -Math.PI / 2 : Math.PI / 2; // mặt có cửa
  const back = facing === 'S' ? Math.PI / 2 : -Math.PI / 2;
  return [
    { modelPath: M('town/wall-wood.glb'), position: { x: x1, y: 0, z: cz }, rotation: { y: back }, scale: sc },
    { modelPath: M('town/wall-wood.glb'), position: { x: x1, y: 0, z: cz }, rotation: { y: Math.PI }, scale: sc },
    { modelPath: M('town/wall-wood-window-shutters.glb'), position: { x: x1, y: 0, z: cz }, rotation: { y: front }, scale: sc },
    { modelPath: M('town/wall-wood.glb'), position: { x: x2, y: 0, z: cz }, rotation: { y: back }, scale: sc },
    { modelPath: M('town/wall-wood.glb'), position: { x: x2, y: 0, z: cz }, rotation: { y: 0 }, scale: sc },
    { modelPath: M('town/wall-wood-door.glb'), position: { x: x2, y: 0, z: cz }, rotation: { y: front }, scale: sc },
    { modelPath: M('town/roof-gable-end.glb'), position: { x: x1, y: S, z: cz }, rotation: { y: 0 }, scale: sc },
    { modelPath: M('town/roof-gable-end.glb'), position: { x: x2, y: S, z: cz }, rotation: { y: Math.PI }, scale: sc },
  ];
}

/**
 * 🏠 BIỆT THỰ 2×2 mái hông (About) — nhà to nhất làng, 4 ô + mái chóp hông 4 mảnh roof-corner.
 * Bộ xoay mái ĐÃ XÁC MINH BẰNG tools/preview.js: NW −π/2 | NE π | SE π/2 | SW 0 (đỉnh chụm giữa).
 * (cx,cz) = TÂM 2×2; cửa ở ô ĐÔNG-NAM quay +Z. Mặt tiền tại z = cz + S.
 */
function stampManor(cx: number, cz: number, interactionName: string): WorldObjectSpec[] {
  const sc = { x: S, y: S, z: S };
  const x1 = cx - S / 2, x2 = cx + S / 2;
  const z1 = cz - S / 2, z2 = cz + S / 2;
  return [
    // Ô TB (x1,z1): lưng + hông tây
    { modelPath: M('town/wall.glb'), position: { x: x1, y: 0, z: z1 }, rotation: { y: Math.PI / 2 }, scale: sc, interactionName },
    { modelPath: M('town/wall-window-shutters.glb'), position: { x: x1, y: 0, z: z1 }, rotation: { y: Math.PI }, scale: sc, interactionName },
    // Ô ĐB (x2,z1): lưng + hông đông
    { modelPath: M('town/wall-window-shutters.glb'), position: { x: x2, y: 0, z: z1 }, rotation: { y: Math.PI / 2 }, scale: sc, interactionName },
    { modelPath: M('town/wall.glb'), position: { x: x2, y: 0, z: z1 }, rotation: { y: 0 }, scale: sc, interactionName },
    // Ô ĐN (x2,z2): hông đông + CỬA mặt tiền
    { modelPath: M('town/wall.glb'), position: { x: x2, y: 0, z: z2 }, rotation: { y: 0 }, scale: sc, interactionName },
    { modelPath: M('town/wall-door.glb'), position: { x: x2, y: 0, z: z2 }, rotation: { y: -Math.PI / 2 }, scale: sc, interactionName },
    // Ô TN (x1,z2): mặt tiền cửa sổ + hông tây
    { modelPath: M('town/wall-window-shutters.glb'), position: { x: x1, y: 0, z: z2 }, rotation: { y: -Math.PI / 2 }, scale: sc, interactionName },
    { modelPath: M('town/wall.glb'), position: { x: x1, y: 0, z: z2 }, rotation: { y: Math.PI }, scale: sc, interactionName },
    // Mái hông 4 mảnh
    { modelPath: M('town/roof-corner.glb'), position: { x: x1, y: S, z: z1 }, rotation: { y: -Math.PI / 2 }, scale: sc, interactionName },
    { modelPath: M('town/roof-corner.glb'), position: { x: x2, y: S, z: z1 }, rotation: { y: Math.PI }, scale: sc, interactionName },
    { modelPath: M('town/roof-corner.glb'), position: { x: x2, y: S, z: z2 }, rotation: { y: Math.PI / 2 }, scale: sc, interactionName },
    { modelPath: M('town/roof-corner.glb'), position: { x: x1, y: S, z: z2 }, rotation: { y: 0 }, scale: sc, interactionName },
    // Ống khói góc TB (khói bếp tự bám theo trong game.component)
    { modelPath: M('town/chimney.glb'), position: { x: x1 + 0.15, y: S + 0.7, z: z1 + 0.25 }, scale: { x: 1.1, y: 1.1, z: 1.1 }, interactionName },
    // Vườn rau nép hông TÂY nhà (tránh đè đường lát đá dẫn tới cửa)
    { modelPath: M('nature/fence_simple.glb'), position: { x: cx - 2.1, y: 0, z: cz + 0.65 }, scale: { x: 1.0, y: 1.0, z: 1.0 } },
    { modelPath: M('nature/crop_pumpkin.glb'), position: { x: cx - 2.4, y: 0, z: cz + 1.15 }, scale: { x: 1.0, y: 1.0, z: 1.0 } },
    { modelPath: M('nature/crop_carrot.glb'), position: { x: cx - 1.8, y: 0, z: cz + 1.25 }, scale: { x: 1.0, y: 1.0, z: 1.0 } },
  ];
}

/**
 * 📚 THƯ VIỆN (Blog) — tòa 2 TẦNG bằng gỗ duy nhất trong làng, cao nổi bật + cờ xanh + biển treo.
 * Tầng 2 = lặp lại panel tường tại y = S; mái chóp tại y = 2S.
 */
function stampLibrary(cx: number, cz: number, interactionName: string): WorldObjectSpec[] {
  const sc = { x: S, y: S, z: S };
  const x1 = cx - S / 2;
  const x2 = cx + S / 2;
  const pieces: WorldObjectSpec[] = [];

  // 2 tầng tường (level 0 và level 1)
  for (const level of [0, S]) {
    pieces.push(
      // Cell 1 (Tây): lưng, hông tây, mặt trước
      { modelPath: M('town/wall-wood.glb'), position: { x: x1, y: level, z: cz }, rotation: { y: Math.PI }, scale: sc, interactionName },
      { modelPath: M('town/wall-wood.glb'), position: { x: x1, y: level, z: cz }, rotation: { y: Math.PI / 2 }, scale: sc, interactionName },
      { modelPath: M('town/wall-wood-window-shutters.glb'), position: { x: x1, y: level, z: cz }, rotation: { y: -Math.PI / 2 }, scale: sc, interactionName },
      // Cell 2 (Đông): hông đông, lưng, mặt trước (tầng trệt là CỬA)
      { modelPath: M('town/wall-wood-window-shutters.glb'), position: { x: x2, y: level, z: cz }, rotation: { y: 0 }, scale: sc, interactionName },
      { modelPath: M('town/wall-wood.glb'), position: { x: x2, y: level, z: cz }, rotation: { y: Math.PI / 2 }, scale: sc, interactionName },
      { modelPath: M(level === 0 ? 'town/wall-wood-door.glb' : 'town/wall-wood-window-shutters.glb'), position: { x: x2, y: level, z: cz }, rotation: { y: -Math.PI / 2 }, scale: sc, interactionName },
    );
  }

  pieces.push(
    // Mái DÀI 2 đỉnh đầu hồi (đẹp hơn 2 chóp rời — xác minh bằng tools/preview.js: rot 0 + π)
    { modelPath: M('town/roof-gable-end.glb'), position: { x: x1, y: 2 * S, z: cz }, rotation: { y: 0 }, scale: sc, interactionName },
    { modelPath: M('town/roof-gable-end.glb'), position: { x: x2, y: 2 * S, z: cz }, rotation: { y: Math.PI }, scale: sc, interactionName },
    // Cờ xanh GẮN TƯỜNG hông đông (banner là panel neo mép +X như mảnh tường — anchor 0.40×1.2=0.48,
    // wall face tại 0.75 → đặt lệch +0.28 cho lá cờ áp sát ngoài tường; rot 0 = mặt +X)
    { modelPath: M('town/banner-green.glb'), position: { x: x2 + 0.28, y: 0.55, z: cz }, rotation: { y: 0 }, scale: { x: 1.2, y: 1.2, z: 1.2 }, interactionName },
    { modelPath: M('town/blade.glb'), position: { x: x2 + 1.0, y: 0, z: cz + 0.85 }, scale: { x: 1.0, y: 1.0, z: 1.0 }, rotation: { y: Math.PI }, interactionName },
    // Bánh xe nước gắn hông tây — landmark của thư viện (tâm bánh ở giữa nên y = 0.9)
    { modelPath: M('town/watermill.glb'), position: { x: x1 - 0.85, y: 0.9, z: cz }, scale: { x: 1.0, y: 1.0, z: 1.0 }, interactionName },
  );
  return pieces;
}

/**
 * ⚒️ XƯỞNG CHẾ TÁC (Projects) — KHU LỘ THIÊN, không phải nhà kín:
 * sạp chợ mái bạt đỏ làm trung tâm + bàn làm việc + xe kéo + đống gỗ. Nhìn là biết nơi "chế đồ".
 */
function stampWorkshop(cx: number, cz: number, interactionName: string): WorldObjectSpec[] {
  return [
    // Sạp mái bạt đỏ — trung tâm, quay mặt về phía người chơi (+Z)
    { modelPath: M('town/stall-red.glb'), position: { x: cx, y: 0, z: cz }, scale: { x: 1.6, y: 1.6, z: 1.6 }, rotation: { y: Math.PI }, interactionName },
    // Bàn làm việc thấp cạnh sạp
    { modelPath: M('town/stall.glb'), position: { x: cx + 1.5, y: 0, z: cz + 0.2 }, scale: { x: 1.3, y: 1.3, z: 1.3 }, rotation: { y: Math.PI / 2 }, interactionName },
    { modelPath: M('town/stall-bench.glb'), position: { x: cx + 1.5, y: 0, z: cz + 1.0 }, scale: { x: 1.2, y: 1.2, z: 1.2 }, rotation: { y: Math.PI } },
    // Xe kéo + vật liệu
    { modelPath: M('town/cart.glb'), position: { x: cx - 1.8, y: 0, z: cz + 0.4 }, scale: { x: 1.0, y: 1.0, z: 1.0 }, rotation: { y: 0.5 } },
    { modelPath: M('nature/log_stack.glb'), position: { x: cx - 1.4, y: 0, z: cz - 1.1 }, scale: { x: 1.0, y: 1.0, z: 1.0 }, rotation: { y: -0.2 } },
    { modelPath: M('town/pillar-wood.glb'), position: { x: cx + 0.9, y: 0, z: cz - 1.0 }, scale: { x: 1.2, y: 1.2, z: 1.2 } },
  ];
}

/**
 * Ghép hòm thư liên hệ (Contact) kèm vườn rào + quả bí ngô, cà rốt
 */
/**
 * 📫 BƯU ĐIỆN (Contact) — nhà ĐÁ (khác hẳn nhà gỗ/đôi), cờ đỏ + biển treo + mái hiên trên cửa.
 */
function stampContactArea(cx: number, cz: number, interactionName: string): WorldObjectSpec[] {
  // 📫 BƯU ĐIỆN ĐÁ 2×1 mái dài (nâng từ 1×1 mái bằng): cửa ô đông, cửa kính ô tây, hiên + cờ + biển.
  const sc = { x: S, y: S, z: S };
  const x1 = cx - S / 2, x2 = cx + S / 2;
  return [
    // Ô TÂY: lưng + hông tây kính + mặt tiền kính (quầy giao dịch)
    { modelPath: M('town/wall.glb'), position: { x: x1, y: 0, z: cz }, rotation: { y: Math.PI / 2 }, scale: sc, interactionName },
    { modelPath: M('town/wall-window-glass.glb'), position: { x: x1, y: 0, z: cz }, rotation: { y: Math.PI }, scale: sc, interactionName },
    { modelPath: M('town/wall-window-glass.glb'), position: { x: x1, y: 0, z: cz }, rotation: { y: -Math.PI / 2 }, scale: sc, interactionName },
    // Ô ĐÔNG: lưng + hông đông + CỬA
    { modelPath: M('town/wall.glb'), position: { x: x2, y: 0, z: cz }, rotation: { y: Math.PI / 2 }, scale: sc, interactionName },
    { modelPath: M('town/wall.glb'), position: { x: x2, y: 0, z: cz }, rotation: { y: 0 }, scale: sc, interactionName },
    { modelPath: M('town/wall-door.glb'), position: { x: x2, y: 0, z: cz }, rotation: { y: -Math.PI / 2 }, scale: sc, interactionName },
    // Mái dài 2 đầu hồi (xác minh tools/preview.js)
    { modelPath: M('town/roof-gable-end.glb'), position: { x: x1, y: S, z: cz }, rotation: { y: 0 }, scale: sc, interactionName },
    { modelPath: M('town/roof-gable-end.glb'), position: { x: x2, y: S, z: cz }, rotation: { y: Math.PI }, scale: sc, interactionName },
    // Hiên trên cửa + cột biển treo + biển hòm thư (cờ đỏ lơ lửng đã XÓA — nhà đủ điểm nhấn rồi)
    { modelPath: M('town/overhang.glb'), position: { x: x2, y: 0, z: cz }, rotation: { y: -Math.PI / 2 }, scale: sc, interactionName },
    { modelPath: M('town/blade.glb'), position: { x: x1 - 1.0, y: 0, z: cz + 0.8 }, scale: { x: 1.0, y: 1.0, z: 1.0 }, interactionName },
    { modelPath: M('nature/sign.glb'), position: { x: x2 + 1.4, y: 0, z: cz + 0.5 }, scale: { x: 1.5, y: 1.5, z: 1.5 }, rotation: { y: -0.5 }, interactionName },
  ];
}

/** Collider vuông quanh tâm nhà */
function hutCollider(cx: number, cz: number): ColliderSpec {
  const half = 0.5 * S + 0.05;
  return { minX: cx - half, maxX: cx + half, minZ: cz - half, maxZ: cz + half };
}

/** Collider cho nhà đôi 2x1 */
function doubleHouseCollider(cx: number, cz: number): ColliderSpec {
  const halfW = S + 0.05;
  const halfD = 0.5 * S + 0.05;
  return { minX: cx - halfW, maxX: cx + halfW, minZ: cz - halfD, maxZ: cz + halfD };
}

/**
 * Lối đi bằng ĐÁ TỰ NHIÊN (path_stone) — mỗi cụm đá xoay lệch nhau cho hữu cơ.
 * (road.glb dạng tấm bê tông xám bị user chê xấu — đừng dùng lại.)
 */
function roadRect(x1: number, x2: number, z1: number, z2: number): WorldObjectSpec[] {
  const tiles: WorldObjectSpec[] = [];
  for (let x = x1; x <= x2; x++) {
    for (let z = z1; z <= z2; z++) {
      tiles.push({
        modelPath: M('nature/path_stone.glb'),
        position: { x, y: 0.01, z },
        rotation: { y: ((x * 7 + z * 13) % 7) * 0.9 },
        scale: { x: 1.25, y: 1.0, z: 1.25 },
      });
    }
  }
  return tiles;
}

// Cỏ hoa rải tự nhiên KHẮP làng theo vòng xoắn vàng (deterministic, không Math.random)
const grassScatter: WorldObjectSpec[] = [];
const scatterModels = ['nature/grass.glb', 'nature/grass_large.glb', 'nature/flower_yellowA.glb', 'nature/flower_redA.glb'];
for (let i = 0; i < 44; i++) {
  const angle = i * 2.399963;
  const radius = 3.5 + (i % 7) * 1.35;
  const x = Math.round(Math.cos(angle) * radius * 10) / 10;
  const z = Math.round(Math.sin(angle) * radius * 0.85 * 10) / 10;
  // chừa sân + đường trung tâm
  if (Math.abs(x) < 2.6 && z > -6.6 && z < 0.6) continue;
  grassScatter.push({
    modelPath: M(scatterModels[i % scatterModels.length]),
    position: { x, y: 0, z },
    rotation: { y: (i * 1.7) % 3.1 },
  });
}

// ===== 🏝️ ĐẢO: nước là ranh giới tự nhiên, cây chỉ điểm xuyết ven rìa =====
// Bán kính đồng bộ với scene-manager.setupGround(): cỏ 17, cát 19.5

const boundaryTrees: WorldObjectSpec[] = [];
const rimTreeColliders: ColliderSpec[] = [];
// 🌴 100% DỪA quanh rìa (đảo nhiệt đới — cây ôn đới pine/oak cũ bị user chê không hợp, đã bỏ)
const rimTreeModels = [
  'pirate/palm-straight.glb',
  'pirate/palm-bend.glb',
  'pirate/palm-detailed-straight.glb',
  'pirate/palm-detailed-bend.glb',
];
// 10 cây (giảm từ 16 — user chê rối mắt khi nhà đã to đẹp hơn)
for (let i = 0; i < 10; i++) {
  // jitter 0.10 (không phải 0.21!): jitter to làm 2 cây liên tiếp gần trùng góc khi i%3 quay vòng
  // → 2 thân dừa dính nhau (tán dừa rộng 3.2, cần thân cách ≥2.5)
  const a = (i * Math.PI * 2) / 10 + (i % 3) * 0.1;
  const r = 13.6 + (i % 3) * 1.0; // rải trong vành cỏ 13.6..15.6
  const x = Math.round(Math.cos(a) * r * 10) / 10;
  const z = Math.round(Math.sin(a) * r * 10) / 10;
  // Chừa cửa vịnh cát (đã có cặp dừa đôi nghiêng ±3.6 làm cổng — thêm nữa là dính thân)
  if (z > 11 && Math.abs(x) < 5) continue;
  // Né footprint 3 cottage dân phụ (11,-8) và (±11.5,6.5) — dừa mọc giữa nhà là vô lý
  if (x > 8.8 && x < 13.2 && z > -9.4 && z < -6.6) continue;
  if (Math.abs(x) > 9.3 && Math.abs(x) < 13.7 && z > 5.1 && z < 7.9) continue;
  boundaryTrees.push({
    modelPath: M(rimTreeModels[i % rimTreeModels.length]),
    // Cây rơi vào vịnh cát nam thì đứng trên dốc (beachDepth), không lơ lửng
    position: { x, y: beachDepth(x, z), z },
    rotation: { y: (i * 2.4) % 6.28 },
    scale: { x: 1.1, y: 1.1, z: 1.1 },
  });
  // Vùng đi lại giờ mở rộng tới mép vực — mỗi cây rìa cần collider riêng (thân dừa mảnh)
  rimTreeColliders.push({ minX: x - 0.4, maxX: x + 0.4, minZ: z - 0.4, maxZ: z + 0.4 });
}

// Collider BÁT GIÁC ôm theo mép đảo (viền đảo 16.7..18.3): 4 tường trục + 4 khối góc.
// Người chơi dạo được tới sát mép vực (bán kính tối đa ~16.6 < 16.7 = mép hẹp nhất). Riêng
// phía NAM chừa hành lang x -2.5..2.5 đi ra bãi cát + bến thuyền, chặn lại ở mép vực z=17.4.
const boundaryColliders: ColliderSpec[] = [
  { minX: -10, maxX: 10, minZ: -24, maxZ: -14 },         // tường bắc
  { minX: -10, maxX: -2.5, minZ: 14, maxZ: 24 },         // tường nam (nửa tây)
  { minX: 2.5, maxX: 10, minZ: 14, maxZ: 24 },           // tường nam (nửa đông)
  { minX: -2.5, maxX: 2.5, minZ: 17.4, maxZ: 24 },       // chặn cuối hành lang ra bến
  { minX: 14, maxX: 24, minZ: -10, maxZ: 10 },           // tường đông
  { minX: -24, maxX: -14, minZ: -10, maxZ: 10 },         // tường tây
  { minX: 9, maxX: 24, minZ: 9, maxZ: 24 },              // góc ĐN
  { minX: -24, maxX: -9, minZ: 9, maxZ: 24 },            // góc TN
  { minX: 9, maxX: 24, minZ: -24, maxZ: -9 },            // góc ĐB
  { minX: -24, maxX: -9, minZ: -24, maxZ: -9 }           // góc TB
];

/**
 * 🏖️ Độ sâu vịnh cát phía nam — bãi biển TRŨNG dần ra biển (thấp hơn đất liền, không phải nhô lên).
 * Dùng CHUNG cho cả mesh bãi cát (scene-manager) lẫn cao độ đi lại (game.component) — một nguồn sự thật.
 * z 11.8 → 17.5: sâu 0 → −1.0 (smoothstep); mép hai bên |x| 3 → 7.5 vuốt về 0 để ăn vào vách đảo.
 */
export function beachDepth(x: number, z: number): number {
  if (z <= 11.8 || Math.abs(x) >= 7.5) return 0;
  const t = Math.min(1, (z - 11.8) / 5.7);
  const ss = t * t * (3 - 2 * t);
  const ax = Math.abs(x);
  const side = ax <= 3 ? 1 : Math.cos(((ax - 3) / 4.5) * (Math.PI / 2));
  return -1.0 * ss * side;
}

export const WORLD_SPEC: WorldSpec = {
  spawnPoint: { x: 0, y: 0, z: 0 },
  
  npcs: [
    {
      name: 'npc_guide',
      modelPath: M('chars/character-female-a.glb'), // Female guide
      position: { x: 2.0, y: 0, z: -1.5 },
      rotationY: Math.PI // Face South/towards player
    },
    {
      name: 'cat_npc', // 🐱 MÈO THẬT từ cube-pets (có sẵn animation idle/walk)
      modelPath: M('pets/animal-cat.glb'),
      position: { x: -2.0, y: 0, z: -2.0 },
      roam: true,
      roamRadius: 4.5,
      scale: 0.3,
      speed: 1.4
    },
    {
      name: 'dog_about', // 🐶 chó nhà DE013, quanh quẩn trước cửa
      modelPath: M('pets/animal-dog.glb'),
      position: { x: 4.5, y: 0, z: -5.5 },
      roam: true,
      roamRadius: 2.0,
      scale: 0.3,
      speed: 1.2
    },
    {
      name: 'crab_beach', // 🦀 cua bò trên bãi cát
      modelPath: M('pets/animal-crab.glb'),
      position: { x: 1.2, y: 0, z: 15.0 },
      roam: true,
      roamRadius: 1.6,
      scale: 0.25,
      speed: 0.8
    },
    {
      name: 'villager_kid', // bé Tí — chuyển thành dân làng thuần (mèo thật đã về)
      modelPath: M('chars/character-male-c.glb'),
      position: { x: 2.5, y: 0, z: -3.0 },
      roam: true,
      roamRadius: 3.5,
      scale: 0.55,
      speed: 2.2
    },
    // Dân làng đi lại cho làng có sinh khí (không tương tác)
    {
      name: 'villager_market',
      modelPath: M('chars/character-male-b.glb'),
      position: { x: 3.2, y: 0, z: 1.0 },
      roam: true,
      roamRadius: 3.0
    },
    {
      name: 'villager_west',
      modelPath: M('chars/character-female-c.glb'),
      position: { x: -6.0, y: 0, z: 2.5 },
      roam: true,
      roamRadius: 4.0
    },
    {
      name: 'villager_north',
      modelPath: M('chars/character-female-b.glb'),
      position: { x: 0.5, y: 0, z: -5.5 },
      roam: true,
      roamRadius: 2.5
    }
  ],

  objects: [
    // 1. Vành đai cây viền ngoài
    ...boundaryTrees,

    // 2. Các công trình chính — VÒNG CUNG QUANH QUẢNG TRƯỜNG, đứng ở spawn thấy đủ 4 cái,
    //    mọi cửa quay về phía người chơi (+Z). KHÔNG ném ra 4 góc map.
    ...stampManor(4.5, -8.75, 'door_about'),         // Bắc-Đông: biệt thự 2×2, MẶT TIỀN giữ z=-7.25 như cũ
    ...stampLibrary(-4.5, -8, 'door_blog'),          // Bắc-Tây
    ...stampWorkshop(-8.5, -1, 'door_projects'),     // Tây
    ...stampContactArea(8.5, -1, 'mailbox_contact'), // Đông

    // 3. Central Fountain (Quảng trường)
    { modelPath: M('town/fountain-round.glb'), position: { x: 0, y: 0, z: -4.5 }, scale: { x: 1.2, y: 1.2, z: 1.2 } },
    { modelPath: M('town/fountain-center.glb'), position: { x: 0, y: 0, z: -4.5 }, scale: { x: 1.2, y: 1.2, z: 1.2 } },

    // 4. Bảng Nhiệm Vụ (Experience) - gồm sign, cờ và hàng rào
    { modelPath: M('nature/sign.glb'), position: { x: -4, y: 0, z: -2 }, scale: { x: 2, y: 2, z: 2 }, rotation: { y: 0.3 }, interactionName: 'board_quest' },
    { modelPath: M('town/banner-green.glb'), position: { x: -3.3, y: 0, z: -2.2 }, scale: { x: 1.5, y: 1.5, z: 1.5 }, rotation: { y: 0.3 } },
    { modelPath: M('town/fence.glb'), position: { x: -4.8, y: 0, z: -2 }, scale: { x: 1.2, y: 1.2, z: 1.2 }, rotation: { y: 0.3 } },

    // 5. Giếng Nước Cổ (well_easteregg) — đông nam spawn, trong tầm nhìn
    { modelPath: M('town/fountain-round-detail.glb'), position: { x: 9.5, y: 0, z: 2.8 }, scale: { x: 1.1, y: 1.1, z: 1.1 }, interactionName: 'well_easteregg' },

    // 6. Biển Điều Khiển (sign_controls)
    { modelPath: M('nature/sign.glb'), position: { x: -2.2, y: 0, z: 2.2 }, scale: { x: 1.5, y: 1.5, z: 1.5 }, rotation: { y: 0.5 }, interactionName: 'sign_controls' },

    // 7. Biển Skip Game (sign_skip)
    { modelPath: M('nature/sign.glb'), position: { x: 4.2, y: 0, z: 3.2 }, scale: { x: 1.5, y: 1.5, z: 1.5 }, rotation: { y: -0.5 }, interactionName: 'sign_skip' },

    // 8. Đèn lồng chiếu sáng quanh quảng trường
    { modelPath: M('town/lantern.glb'), position: { x: 2, y: 0, z: -5 }, scale: { x: 1.0, y: 1.0, z: 1.0 } },
    { modelPath: M('town/lantern.glb'), position: { x: -2, y: 0, z: -5 }, scale: { x: 1.0, y: 1.0, z: 1.0 } },

    // 10. Các cây xanh trang trí phân bổ trong làng
    { modelPath: M('pirate/palm-straight.glb'), position: { x: 5, y: 0, z: -5 }, scale: { x: 1.0, y: 1.0, z: 1.0 }, rotation: { y: 0.8 } },
    { modelPath: M('pirate/palm-bend.glb'), position: { x: -5, y: 0, z: -5 }, scale: { x: 1.0, y: 1.0, z: 1.0 }, rotation: { y: 2.1 } },
    { modelPath: M('pirate/palm-detailed-straight.glb'), position: { x: -6, y: 0, z: 3 }, scale: { x: 1.05, y: 1.05, z: 1.05 }, rotation: { y: 4.0 } },
    { modelPath: M('pirate/palm-detailed-bend.glb'), position: { x: 6, y: 0, z: 3 }, scale: { x: 1.05, y: 1.05, z: 1.05 }, rotation: { y: 5.3 } },
    
    // 10b. Cây cổ thụ nghiêng được đặt chắc chắn trên mặt đất ở quảng trường phía Nam
    { modelPath: M('town/tree-crooked.glb'), position: { x: 0, y: 0, z: 6.5 }, scale: { x: 1.1, y: 1.1, z: 1.1 } },

    // ===== ĐÁ VEN BỜ (scale THƯỜNG — núi scale 4-7 cũ nuốt cả nhà, đã bỏ sau audit bố cục) =====
    // Đá rìa tây bắc, nằm trong vùng collider góc nên không cần collider riêng
    { modelPath: M('town/rock-wide.glb'), position: { x: -12.5, y: -0.2, z: -13.5 }, scale: { x: 1.4, y: 1.4, z: 1.4 }, rotation: { y: 0.6 } },
    { modelPath: M('town/rock-small.glb'), position: { x: -10.5, y: -0.1, z: -13.8 }, scale: { x: 1.2, y: 1.2, z: 1.2 } },
    // Đá-cát hai bên bãi biển nam (đúng logic bờ đá, không chèn vào nhà dân)
    { modelPath: M('pirate/rocks-sand-a.glb'), position: { x: 8.4, y: 0, z: 12.5 }, scale: { x: 0.9, y: 0.9, z: 0.9 } },
    { modelPath: M('pirate/rocks-sand-b.glb'), position: { x: -5.8, y: -0.12, z: 13.8 }, scale: { x: 0.9, y: 0.9, z: 0.9 } },

    { modelPath: M('pirate/palm-straight.glb'), position: { x: -2, y: 0, z: -10.5 }, scale: { x: 1.1, y: 1.1, z: 1.1 }, rotation: { y: 1.5 } },

    // 11. Các tảng đá trang trí
    { modelPath: M('town/rock-wide.glb'), position: { x: -7.5, y: 0, z: -5 }, scale: { x: 1.0, y: 1.0, z: 1.0 } },
    { modelPath: M('town/rock-small.glb'), position: { x: 7.5, y: 0, z: -5 }, scale: { x: 1.0, y: 1.0, z: 1.0 } },
    { modelPath: M('town/rock-large.glb'), position: { x: -11, y: 0, z: 4 }, scale: { x: 1.2, y: 1.2, z: 1.2 } },

    // 12. Hoa, nấm, cỏ dại trang trí quanh quảng trường
    { modelPath: M('nature/flower_yellowA.glb'), position: { x: 2, y: 0, z: -3.8 }, scale: { x: 1, y: 1, z: 1 } },
    { modelPath: M('nature/flower_yellowB.glb'), position: { x: -2, y: 0, z: -3.8 }, scale: { x: 1, y: 1, z: 1 } },
    { modelPath: M('nature/flower_redA.glb'), position: { x: 1.5, y: 0, z: 4 }, scale: { x: 1, y: 1, z: 1 } },
    { modelPath: M('nature/flower_purpleA.glb'), position: { x: -1.5, y: 0, z: 4 }, scale: { x: 1, y: 1, z: 1 } },
    { modelPath: M('nature/mushroom_redGroup.glb'), position: { x: -5, y: 0, z: -3.8 }, scale: { x: 1.1, y: 1.1, z: 1.1 } },
    { modelPath: M('nature/mushroom_tan.glb'), position: { x: 5, y: 0, z: -3.8 }, scale: { x: 1.1, y: 1.1, z: 1.1 } },
    { modelPath: M('nature/grass_large.glb'), position: { x: -3, y: 0, z: -4.8 }, scale: { x: 1.2, y: 1.2, z: 1.2 } },
    { modelPath: M('nature/grass.glb'), position: { x: 3, y: 0, z: -4.8 }, scale: { x: 1.2, y: 1.2, z: 1.2 } },

    // 13. Campfire và stumps
    { modelPath: M('nature/campfire_logs.glb'), position: { x: 0, y: 0, z: 2.2 }, scale: { x: 1.2, y: 1.2, z: 1.2 } },
    { modelPath: M('nature/stump_round.glb'), position: { x: -8, y: 0, z: 8 }, scale: { x: 1.0, y: 1.0, z: 1.0 } },
    { modelPath: M('nature/stump_old.glb'), position: { x: 8, y: 0, z: 8 }, scale: { x: 1.0, y: 1.0, z: 1.0 } },

    // ===== 14. LẤP ĐẦY LÀNG (chống trống trải) =====
    // Đường lát đá: MỘT MẠNG LIỀN MẠCH — sân vuông + các nhánh 1-tile chạm cửa từng khu
    ...roadRect(-2, 2, -6, -2),     // sân quảng trường quanh đài phun
    ...roadRect(-1, 1, -1, -1),     // hàng nối sân xuống khu spawn
    ...roadRect(0, 0, 0, 0),        // ô spawn
    ...roadRect(3, 5, -6, -6),      // nhánh đông-bắc men sân → nhà About (tile (5,-6) chạm cửa biệt thự)
    ...roadRect(-5, -3, -6, -6),    // nhánh tây-bắc → thư viện
    ...roadRect(-4, -4, -7, -7),    // ô chạm cửa thư viện
    ...roadRect(-6, -2, -1, -1),    // nhánh tây → xưởng (dừng ở -6 để bàn làm việc x=-7 thành sạp VEN đường)
    ...roadRect(2, 7, -1, -1),      // nhánh đông → bưu điện

    // Nhà dân phụ (KHÔNG tương tác) + sân vườn riêng để không trơ trọi
    ...stampCottage(11, -8, 'S'),
    { modelPath: M('nature/log.glb'), position: { x: 10, y: 0, z: -7.1 }, rotation: { y: 0.7 } },
    { modelPath: M('nature/flower_redA.glb'), position: { x: 11.9, y: 0, z: -7.0 } },
    // (dừa sân NE đã bỏ — dừa rìa tại (12.8,-8.5) đứng ngay đó rồi, 2 thân dính nhau)
    ...stampCottage(-11.5, 6.5, 'N'),
    { modelPath: M('nature/crop_pumpkin.glb'), position: { x: -10.4, y: 0, z: 8.0 } },
    { modelPath: M('nature/fence_simple.glb'), position: { x: -10.2, y: 0, z: 8.6 } },
    ...stampCottage(11.5, 6.5, 'N'),
    { modelPath: M('nature/pot_large.glb'), position: { x: 10.3, y: 0, z: 8.1 } },
    { modelPath: M('nature/grass_large.glb'), position: { x: 12.4, y: 0, z: 7.5 } },

    // Thảm cỏ hoa rải toàn làng
    ...grassScatter,

    // ⚓ BẾN TÀU thật (dock platform cao 1.31, đặt y=-1.4 → mặt sàn ngang mặt đảo)
    // Bãi cát trũng (beachDepth) → bến hạ xuống cho mặt sàn (~y+1.31) ngang nền cát ~−0.9 ở chân bến
    { modelPath: M('pirate/structure-platform-dock.glb'), position: { x: 0, y: -2.2, z: 16.6 } },
    { modelPath: M('pirate/structure-platform-dock.glb'), position: { x: 0, y: -2.2, z: 19.1 } },
    { modelPath: M('pirate/barrel.glb'), position: { x: 0.85, y: -0.89, z: 16.4 }, scale: { x: 0.6, y: 0.6, z: 0.6 } },
    { modelPath: M('pirate/crate.glb'), position: { x: -0.85, y: -0.89, z: 19.0 }, scale: { x: 0.6, y: 0.6, z: 0.6 }, rotation: { y: 0.4 } },
    // ⛵ TÀU LỚN neo ngay cạnh bãi (mắc cạn nhẹ trên doi cát ngầm — user muốn tàu to ở bãi, bỏ xuồng nhỏ)
    { modelPath: M('pirate/ship-small.glb'), position: { x: 8.2, y: -1.15, z: 20.8 }, rotation: { y: 0.9 } },
    { modelPath: M('nature/campfire_logs.glb'), position: { x: -2.5, y: 0, z: 12.2 } },
    // Cây ôn đới đôi bên lối xuống bãi
    // 🌴 Dừa đôi nghiêng hai bên lối xuống bãi (y âm = đứng trên dốc cát, khớp beachDepth)
    { modelPath: M('pirate/palm-bend.glb'), position: { x: -3.6, y: -0.18, z: 13.4 }, scale: { x: 1.15, y: 1.15, z: 1.15 }, rotation: { y: 1.1 } },
    { modelPath: M('pirate/palm-detailed-bend.glb'), position: { x: 3.6, y: -0.22, z: 13.6 }, scale: { x: 1.15, y: 1.15, z: 1.15 }, rotation: { y: 3.6 } },

    // 🚢 XÁC TÀU ĐẮM ngoài khơi phía tây (tàu buồm lớn đã chuyển về neo cạnh bãi cát nam)
    { modelPath: M('pirate/ship-wreck.glb'), position: { x: -22, y: -1.0, z: -3 }, rotation: { y: 0.7 } },

    // Mảng cát + cỏ decal làm nền đỡ đơn điệu
    // (Gò patch-sand đã BỎ: tấm phẳng cứng không nằm được trên dốc vịnh — mép thò lơ lửng.
    //  Bãi dốc tự nó là cát rồi. Gò patch-grass trong làng nền phẳng thì giữ.)
    { modelPath: M('pirate/patch-grass.glb'), position: { x: -7, y: 0.015, z: 6 }, rotation: { y: 0.8 } },
    { modelPath: M('pirate/patch-grass.glb'), position: { x: 8, y: 0.015, z: 5 }, rotation: { y: 2.7 } },
    { modelPath: M('pirate/grass-plant.glb'), position: { x: -12.5, y: 0, z: -3 } },
    { modelPath: M('pirate/grass-plant.glb'), position: { x: 12.3, y: 0, z: -5.5 } },

    // 🧰 Thùng rượu + rương ở xưởng và rìa đảo
    { modelPath: M('pirate/barrel.glb'), position: { x: -7.0, y: 0, z: -2.0 }, scale: { x: 0.6, y: 0.6, z: 0.6 } },
    { modelPath: M('pirate/crate-bottles.glb'), position: { x: -9.6, y: 0, z: 0.9 }, scale: { x: 0.6, y: 0.6, z: 0.6 }, rotation: { y: 0.9 } },
    { modelPath: M('pirate/chest.glb'), position: { x: -13.2, y: 0, z: 1.8 }, scale: { x: 0.7, y: 0.7, z: 0.7 }, rotation: { y: 1.2 } },

    // 🪨 Đá ngầm nhô khỏi mặt biển quanh đảo (ngoài tầm với, chỉ để ngắm)
    { modelPath: M('town/rock-large.glb'), position: { x: 21, y: -1.2, z: -6 }, scale: { x: 1.6, y: 1.6, z: 1.6 }, rotation: { y: 0.8 } },
    { modelPath: M('town/rock-wide.glb'), position: { x: -20.5, y: -1.25, z: 8 }, scale: { x: 1.8, y: 1.8, z: 1.8 }, rotation: { y: 2.1 } },
    { modelPath: M('town/rock-small.glb'), position: { x: -19, y: -1.15, z: -12 }, scale: { x: 1.5, y: 1.5, z: 1.5 } },
    { modelPath: M('town/rock-wide.glb'), position: { x: 14, y: -1.3, z: 22 }, scale: { x: 1.4, y: 1.4, z: 1.4 }, rotation: { y: 1.3 } },
    { modelPath: M('town/rock-large.glb'), position: { x: -6, y: -1.28, z: -20.5 }, scale: { x: 1.3, y: 1.3, z: 1.3 }, rotation: { y: 2.8 } },

    // Góc chợ nhỏ cạnh quảng trường
    { modelPath: M('town/stall-green.glb'), position: { x: 3.0, y: 0, z: 1.8 }, scale: { x: 1.3, y: 1.3, z: 1.3 }, rotation: { y: 2.6 } },
    { modelPath: M('town/stall-stool.glb'), position: { x: 2.2, y: 0, z: 2.6 }, scale: { x: 1.2, y: 1.2, z: 1.2 } },

    // Đèn lồng trước mỗi khu (đêm có điểm sáng ấm)
    { modelPath: M('town/lantern.glb'), position: { x: 4.5, y: 0, z: -6.6 } },
    { modelPath: M('town/lantern.glb'), position: { x: -4.5, y: 0, z: -6.6 } },
    { modelPath: M('town/lantern.glb'), position: { x: -6.6, y: 0, z: 0.7 } },
    { modelPath: M('town/lantern.glb'), position: { x: 9.8, y: 0, z: 1.0 } },

    // Luống hoa nối giữa 2 nhà lớn phía bắc (hedge.glb trông như cột xám — đã bỏ)
    { modelPath: M('nature/fence_planks.glb'), position: { x: -1.5, y: 0, z: -8.2 } },
    { modelPath: M('nature/fence_planks.glb'), position: { x: 0.5, y: 0, z: -8.2 } },
    { modelPath: M('nature/flower_redA.glb'), position: { x: -1.5, y: 0, z: -7.7 } },
    { modelPath: M('nature/flower_yellowA.glb'), position: { x: -0.5, y: 0, z: -7.8 } },
    { modelPath: M('nature/flower_purpleA.glb'), position: { x: 0.6, y: 0, z: -7.7 } },
    { modelPath: M('nature/flower_redA.glb'), position: { x: 1.5, y: 0, z: -7.8 } },

    // Cây bổ sung trong làng
    { modelPath: M('pirate/palm-detailed-straight.glb'), position: { x: -9, y: 0, z: -6.5 }, scale: { x: 1.1, y: 1.1, z: 1.1 }, rotation: { y: 0.4 } },
    { modelPath: M('pirate/palm-straight.glb'), position: { x: 9, y: 0, z: -6.5 }, scale: { x: 1.1, y: 1.1, z: 1.1 }, rotation: { y: 2.9 } },

    // Decor nhỏ rải rác (không collider)
    { modelPath: M('nature/grass_large.glb'), position: { x: -6, y: 0, z: 5 } },
    { modelPath: M('nature/grass.glb'), position: { x: 6.5, y: 0, z: 5.5 } },
    { modelPath: M('nature/grass.glb'), position: { x: -9.5, y: 0, z: 3 } },
    { modelPath: M('nature/grass_large.glb'), position: { x: 10, y: 0, z: -4 } },
    { modelPath: M('nature/flower_redA.glb'), position: { x: 3.2, y: 0, z: -6.7 } },
    { modelPath: M('nature/flower_purpleA.glb'), position: { x: -3.2, y: 0, z: -6.7 } },
    { modelPath: M('nature/flower_yellowA.glb'), position: { x: -6.2, y: 0, z: -2.5 } },
    { modelPath: M('nature/flower_yellowB.glb'), position: { x: 6.5, y: 0, z: -2.5 } },
    { modelPath: M('nature/mushroom_red.glb'), position: { x: -10, y: 0, z: 0.5 } },
    { modelPath: M('nature/pot_large.glb'), position: { x: 9.3, y: 0, z: -2.3 } },
    { modelPath: M('nature/pot_small.glb'), position: { x: 6.2, y: 0, z: -6.9 } },
    // (khúc gỗ (-1.2,2.8) đã XÓA — nằm ngang đúng khe đi lại giữa biển hướng dẫn và campfire, chặn lối)
  ],

  colliders: [
    // Biên giới bảo vệ + cây rìa đảo
    ...boundaryColliders,
    ...rimTreeColliders,
    // Dừa lối xuống bãi + đồ pirate
    { minX: -4.0, maxX: -3.2, minZ: 13.0, maxZ: 13.8 },
    { minX: 3.2, maxX: 4.0, minZ: 13.2, maxZ: 14.0 },
    { minX: -7.4, maxX: -6.6, minZ: -2.4, maxZ: -1.6 },   // barrel xưởng
    { minX: -10.0, maxX: -9.2, minZ: 0.5, maxZ: 1.3 },    // crate-bottles
    { minX: -13.6, maxX: -12.8, minZ: 1.4, maxZ: 2.2 },   // rương kho báu

    // Các công trình lớn (khớp cấu trúc mới)
    { minX: 2.95, maxX: 6.05, minZ: -10.3, maxZ: -7.2 }, // 🏠 About (biệt thự 2×2 tâm 4.5,-8.75)
    { minX: 1.8, maxX: 3.1, minZ: -8.4, maxZ: -7.3 },   // vườn rau hông tây nhà About
    doubleHouseCollider(-4.5, -8),   // 📚 Blog (thư viện 2 tầng)
    { minX: -6.8, maxX: -6.0, minZ: -8.8, maxZ: -7.2 }, // bánh xe nước hông thư viện
    { minX: -3.0, maxX: -2.5, minZ: -7.4, maxZ: -6.9 }, // cột biển treo thư viện (blade tại x=-2.75, z=-7.15)
    // ⚒️ Projects (xưởng lộ thiên — cụm collider rời, đi xuyên giữa được cho tự nhiên)
    { minX: -9.4, maxX: -7.6, minZ: -1.9, maxZ: -0.1 }, // sạp mái bạt
    { minX: -7.6, maxX: -6.4, minZ: -1.5, maxZ: 1.5 },  // bàn làm việc + ghế
    { minX: -10.9, maxX: -9.7, minZ: -1.2, maxZ: 0.2 }, // xe kéo
    { minX: -10.5, maxX: -9.3, minZ: -2.7, maxZ: -1.5 },// đống gỗ
    // 📫 Contact (bưu điện đá 2×1)
    { minX: 6.95, maxX: 10.05, minZ: -1.8, maxZ: -0.2 },
    { minX: 6.55, maxX: 6.95, minZ: -0.4, maxZ: 0.0 },  // cột biển treo bưu điện (x1-1.0=6.75)
    { minX: 10.25, maxX: 11.05, minZ: -0.9, maxZ: 0.1 },// biển hòm thư (x2+1.4=10.65)

    // Fountain quảng trường
    { minX: -1.2, maxX: 1.2, minZ: -5.7, maxZ: -3.3 },

    // Quest Board
    { minX: -5.0, maxX: -3.0, minZ: -3.0, maxZ: -1.0 },

    // Giếng nước cổ (9.5, 2.8)
    { minX: 8.6, maxX: 10.4, minZ: 1.9, maxZ: 3.7 },

    // Biển điều khiển & Skip
    { minX: -2.7, maxX: -1.7, minZ: 1.7, maxZ: 2.7 },
    { minX: 3.7, maxX: 4.7, minZ: 2.7, maxZ: 3.7 },

    // Cây xanh lớn
    { minX: 4.5, maxX: 5.5, minZ: -5.5, maxZ: -4.5 },
    { minX: -5.5, maxX: -4.5, minZ: -5.5, maxZ: -4.5 },
    { minX: -6.6, maxX: -5.4, minZ: 2.4, maxZ: 3.6 },
    { minX: 5.5, maxX: 6.5, minZ: 2.5, maxZ: 3.5 },
    // (collider dừa (-2.5,6.2), (12,1), (2,-10.5) đã xóa cùng cây)
    
    // Đá-cát hai bên bãi biển (núi khổng lồ cũ + collider đã xóa sau audit bố cục)
    { minX: 7.5, maxX: 9.3, minZ: 11.6, maxZ: 13.4 },   // rocks-sand-a đông bãi
    { minX: -6.7, maxX: -4.9, minZ: 12.9, maxZ: 14.7 }, // rocks-sand-b tây bãi

    { minX: -2.5, maxX: -1.5, minZ: -11.0, maxZ: -10.0 }, // dừa bắc còn lại (cây (2,-10.5) đã bỏ)

    // Tảng đá lớn (vị trí mới)
    { minX: -8.1, maxX: -6.9, minZ: -5.6, maxZ: -4.4 },
    { minX: 6.9, maxX: 8.1, minZ: -5.6, maxZ: -4.4 },
    { minX: -11.7, maxX: -10.3, minZ: 3.3, maxZ: 4.7 },

    // Campfire
    { minX: -0.6, maxX: 0.6, minZ: 1.6, maxZ: 2.8 },

    // ===== Collider phần lấp đầy làng =====
    doubleHouseCollider(11, -8),       // cottage dân phụ 2×1
    doubleHouseCollider(-11.5, 6.5), doubleHouseCollider(11.5, 6.5),
    { minX: 2.3, maxX: 3.7, minZ: 1.1, maxZ: 2.5 },   // sạp chợ xanh
    { minX: -2.5, maxX: 2.5, minZ: -8.6, maxZ: -7.9 },// luống hoa + rào bắc
    { minX: -9.5, maxX: -8.5, minZ: -7.0, maxZ: -6.0 },// dừa tây giữa làng
    { minX: 8.5, maxX: 9.5, minZ: -7.0, maxZ: -6.0 }  // dừa đông giữa làng
  ],

  interactionZones: [
    // 10 zones hoàn toàn trùng khớp từ logic 2D hiện hữu:
    { name: 'npc_guide', minX: 0.8, maxX: 3.2, minZ: -2.5, maxZ: -0.5 },
    // Zone cửa = ô trước cửa (cửa luôn ở cell ĐÔNG của nhà đôi, hướng +Z)
    { name: 'door_about', minX: 3.9, maxX: 6.5, minZ: -7.2, maxZ: -5.8 },
    { name: 'door_projects', minX: -9.1, maxX: -6.5, minZ: -0.1, maxZ: 1.3 },
    { name: 'door_blog', minX: -5.1, maxX: -2.5, minZ: -7.2, maxZ: -5.8 },
    // Bánh xe nước (thác nước) hông tây thư viện là landmark của Blog. Collider watermill ở
    // x[-6.8,-6.0] z[-8.8,-7.2] → bao zone QUANH nó (tây + nam) để tới gần từ mọi hướng đều
    // kích hoạt được E mở Blog. Trước đây không có zone nào ở đây nên "event chết".
    { name: 'door_blog', minX: -7.9, maxX: -5.9, minZ: -8.9, maxZ: -6.3 },
    { name: 'board_quest', minX: -5.5, maxX: -2.5, minZ: -3.5, maxZ: -0.5 },
    { name: 'mailbox_contact', minX: 7.4, maxX: 9.3, minZ: -0.1, maxZ: 1.3 },
    { name: 'sign_controls', minX: -3.5, maxX: -0.5, minZ: 1.0, maxZ: 3.5 },
    { name: 'sign_skip', minX: 2.5, maxX: 5.5, minZ: 2.0, maxZ: 4.5 },
    // Giếng là vật đứng tự do (collider 1.8×1.8 tại x[8.6,10.4] z[1.9,3.7]). Người chơi hitbox 0.8
    // nên tâm dừng cách collider ~0.4 → zone PHẢI rộng hơn collider mỗi phía >0.4, nếu không
    // đứng sát giếng vẫn ngoài zone, E không ăn. minZ chừa >1.3 để không đè zone Contact.
    { name: 'well_easteregg', minX: 7.9, maxX: 10.9, minZ: 1.4, maxZ: 4.3 },
    // Vùng tạm của mèo (được cập nhật động theo vị trí mèo đi tuần tại game.component)
    { name: 'cat_npc', minX: -3.5, maxX: -0.5, minZ: -3.5, maxZ: -0.5 }
  ],

  // Marker kim cương vàng lơ lửng trên mỗi điểm event (đã thăm → mờ đi).
  // x/z PHẢI nằm trong interactionZone cùng tên: cột sáng đánh dấu ĐÚNG chỗ đứng nhấn E,
  // không phải nóc nhà — nếu lệch thì đứng dưới kim cương lại ngoài zone → E vô hiệu.
  eventMarkers: [
    { name: 'door_about', x: 5.2, y: 3.0, z: -6.5 },      // tâm zone x[3.9,6.5] z[-7.2,-5.8]
    { name: 'door_blog', x: -3.8, y: 4.4, z: -6.5 },      // tâm zone x[-5.1,-2.5] z[-7.2,-5.8]
    { name: 'door_projects', x: -7.8, y: 2.8, z: 0.6 },   // tâm zone x[-9.1,-6.5] z[-0.1,1.3]
    { name: 'mailbox_contact', x: 8.35, y: 2.8, z: 0.6 }, // tâm zone x[7.4,9.3] z[-0.1,1.3]
    { name: 'board_quest', x: -4, y: 2.3, z: -2 },
    { name: 'well_easteregg', x: 9.5, y: 2.1, z: 2.8 },
    { name: 'sign_controls', x: -2.2, y: 2.1, z: 2.2 },
    { name: 'sign_skip', x: 4.2, y: 2.1, z: 3.2 },
  ]
};
