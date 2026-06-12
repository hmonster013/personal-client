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
}

export interface WorldSpec {
  objects: WorldObjectSpec[];
  colliders: ColliderSpec[];
  interactionZones: InteractionZoneSpec[];
  npcs: NPCSpec[];
  spawnPoint: { x: number; y: number; z: number };
}

const M = (p: string) => `assets/game3d/models/${p}`;
const S = 1.5; // Scale chung cho các module nhà

// ===== HELPERS GHÉP NHÀ QUY ƯỚC KÈM COLLIDER =====

/**
 * Ghép một nhà nhỏ 1x1 ô kín 4 mặt + mái chóp. Cửa quay về +Z (phía người chơi).
 * Mảnh wall/door/window là PANEL MỎNG nằm ở MÉP +X của ô 1x1.
 * Xoay quanh Y để đặt vào 4 cạnh: 0 → +X | π/2 → -Z | π → -X | -π/2 → +Z
 */
function stampHut(cx: number, cz: number, interactionName: string): WorldObjectSpec[] {
  const sc = { x: S, y: S, z: S };
  return [
    { modelPath: M('town/wall.glb'), position: { x: cx, y: 0, z: cz }, rotation: { y: 0 }, scale: sc, interactionName },
    { modelPath: M('town/wall-window-shutters.glb'), position: { x: cx, y: 0, z: cz }, rotation: { y: Math.PI }, scale: sc, interactionName },
    { modelPath: M('town/wall.glb'), position: { x: cx, y: 0, z: cz }, rotation: { y: Math.PI / 2 }, scale: sc, interactionName },
    { modelPath: M('town/wall-door.glb'), position: { x: cx, y: 0, z: cz }, rotation: { y: -Math.PI / 2 }, scale: sc, interactionName },
    { modelPath: M('town/roof-point.glb'), position: { x: cx, y: S, z: cz }, scale: sc, interactionName },
  ];
}

/**
 * Ghép nhà đôi 2x1 (About) - gồm 2 ô theo trục X
 * Cell 1 (West/Trái) và Cell 2 (East/Phải, có cửa)
 */
function stampDoubleHouse(cx: number, cz: number, interactionName: string): WorldObjectSpec[] {
  const sc = { x: S, y: S, z: S };
  const x1 = cx - S / 2;
  const x2 = cx + S / 2;
  return [
    // Cell 1 (Left / West)
    { modelPath: M('town/wall.glb'), position: { x: x1, y: 0, z: cz }, rotation: { y: Math.PI }, scale: sc, interactionName },
    { modelPath: M('town/wall-window-shutters.glb'), position: { x: x1, y: 0, z: cz }, rotation: { y: Math.PI / 2 }, scale: sc, interactionName },
    { modelPath: M('town/wall.glb'), position: { x: x1, y: 0, z: cz }, rotation: { y: -Math.PI / 2 }, scale: sc, interactionName },
    { modelPath: M('town/roof-point.glb'), position: { x: x1, y: S, z: cz }, scale: sc, interactionName },

    // Cell 2 (Right / East)
    { modelPath: M('town/wall-window-shutters.glb'), position: { x: x2, y: 0, z: cz }, rotation: { y: 0 }, scale: sc, interactionName },
    { modelPath: M('town/wall.glb'), position: { x: x2, y: 0, z: cz }, rotation: { y: Math.PI / 2 }, scale: sc, interactionName },
    { modelPath: M('town/wall-door.glb'), position: { x: x2, y: 0, z: cz }, rotation: { y: -Math.PI / 2 }, scale: sc, interactionName },
    { modelPath: M('town/roof-point.glb'), position: { x: x2, y: S, z: cz }, scale: sc, interactionName },

    // Chimney with banner Red
    { modelPath: M('town/chimney.glb'), position: { x: x1 + 0.3, y: S + 0.5, z: cz - 0.3 }, scale: { x: 1.1, y: 1.1, z: 1.1 }, interactionName }
  ];
}

/**
 * Ghép thư viện (Blog) bằng gỗ 2x1, sử dụng wall-wood và có cờ green đung đưa
 */
function stampLibrary(cx: number, cz: number, interactionName: string): WorldObjectSpec[] {
  const sc = { x: S, y: S, z: S };
  const x1 = cx - S / 2;
  const x2 = cx + S / 2;
  return [
    // Cell 1 (Left / West)
    { modelPath: M('town/wall-wood.glb'), position: { x: x1, y: 0, z: cz }, rotation: { y: Math.PI }, scale: sc, interactionName },
    { modelPath: M('town/wall-wood-window-shutters.glb'), position: { x: x1, y: 0, z: cz }, rotation: { y: Math.PI / 2 }, scale: sc, interactionName },
    { modelPath: M('town/wall-wood.glb'), position: { x: x1, y: 0, z: cz }, rotation: { y: -Math.PI / 2 }, scale: sc, interactionName },
    { modelPath: M('town/roof-point.glb'), position: { x: x1, y: S, z: cz }, scale: sc, interactionName },

    // Cell 2 (Right / East)
    { modelPath: M('town/wall-wood-window-shutters.glb'), position: { x: x2, y: 0, z: cz }, rotation: { y: 0 }, scale: sc, interactionName },
    { modelPath: M('town/wall-wood.glb'), position: { x: x2, y: 0, z: cz }, rotation: { y: Math.PI / 2 }, scale: sc, interactionName },
    { modelPath: M('town/wall-wood-door.glb'), position: { x: x2, y: 0, z: cz }, rotation: { y: -Math.PI / 2 }, scale: sc, interactionName },
    { modelPath: M('town/roof-point.glb'), position: { x: x2, y: S, z: cz }, scale: sc, interactionName },

    // Chimney for smoke
    { modelPath: M('town/chimney.glb'), position: { x: x1 - 0.3, y: S + 0.5, z: cz - 0.3 }, scale: { x: 1.1, y: 1.1, z: 1.1 }, interactionName }
  ];
}

/**
 * Ghép xưởng chế tác (Projects) bằng gỗ 2x1 kèm cờ Red và các thùng gỗ xung quanh
 */
function stampWorkshop(cx: number, cz: number, interactionName: string): WorldObjectSpec[] {
  const sc = { x: S, y: S, z: S };
  const x1 = cx - S / 2;
  const x2 = cx + S / 2;
  return [
    // Cell 1 (Left / West)
    { modelPath: M('town/wall-wood.glb'), position: { x: x1, y: 0, z: cz }, rotation: { y: Math.PI }, scale: sc, interactionName },
    { modelPath: M('town/wall-wood-window-shutters.glb'), position: { x: x1, y: 0, z: cz }, rotation: { y: Math.PI / 2 }, scale: sc, interactionName },
    { modelPath: M('town/wall-wood.glb'), position: { x: x1, y: 0, z: cz }, rotation: { y: -Math.PI / 2 }, scale: sc, interactionName },
    { modelPath: M('town/roof-point.glb'), position: { x: x1, y: S, z: cz }, scale: sc, interactionName },

    // Cell 2 (Right / East)
    { modelPath: M('town/wall-wood-window-shutters.glb'), position: { x: x2, y: 0, z: cz }, rotation: { y: 0 }, scale: sc, interactionName },
    { modelPath: M('town/wall-wood.glb'), position: { x: x2, y: 0, z: cz }, rotation: { y: Math.PI / 2 }, scale: sc, interactionName },
    { modelPath: M('town/wall-wood-door.glb'), position: { x: x2, y: 0, z: cz }, rotation: { y: -Math.PI / 2 }, scale: sc, interactionName },
    { modelPath: M('town/roof-point.glb'), position: { x: x2, y: S, z: cz }, scale: sc, interactionName },

    // Workshop props
    { modelPath: M('town/cart.glb'), position: { x: x2 + 1.2, y: 0, z: cz + 0.3 }, scale: { x: 0.9, y: 0.9, z: 0.9 }, rotation: { y: 0.6 } },
    { modelPath: M('nature/log_stack.glb'), position: { x: x1 - 1.2, y: 0, z: cz }, scale: { x: 0.9, y: 0.9, z: 0.9 }, rotation: { y: -0.2 } },
  ];
}

/**
 * Ghép hòm thư liên hệ (Contact) kèm vườn rào + quả bí ngô, cà rốt
 */
function stampContactArea(cx: number, cz: number, interactionName: string): WorldObjectSpec[] {
  const sc = { x: S, y: S, z: S };
  return [
    { modelPath: M('town/wall.glb'), position: { x: cx, y: 0, z: cz }, rotation: { y: 0 }, scale: sc, interactionName },
    { modelPath: M('town/wall-window-shutters.glb'), position: { x: cx, y: 0, z: cz }, rotation: { y: Math.PI }, scale: sc, interactionName },
    { modelPath: M('town/wall.glb'), position: { x: cx, y: 0, z: cz }, rotation: { y: Math.PI / 2 }, scale: sc, interactionName },
    { modelPath: M('town/wall-door.glb'), position: { x: cx, y: 0, z: cz }, rotation: { y: -Math.PI / 2 }, scale: sc, interactionName },
    { modelPath: M('town/roof-point.glb'), position: { x: cx, y: S, z: cz }, scale: sc, interactionName },

    // Mailbox sign + vườn đặt LỆCH ĐÔNG để không chắn lối vào cửa (+Z)
    { modelPath: M('nature/sign.glb'), position: { x: cx + 1.4, y: 0, z: cz + 0.5 }, scale: { x: 1.5, y: 1.5, z: 1.5 }, rotation: { y: -0.5 }, interactionName },
    { modelPath: M('nature/fence_simple.glb'), position: { x: cx + 1.6, y: 0, z: cz + 1.4 }, scale: { x: 1.0, y: 1.0, z: 1.0 }, rotation: { y: 0 } },
    { modelPath: M('nature/crop_pumpkin.glb'), position: { x: cx + 1.5, y: 0, z: cz + 2.1 }, scale: { x: 1.0, y: 1.0, z: 1.0 } },
    { modelPath: M('nature/crop_carrot.glb'), position: { x: cx + 2.1, y: 0, z: cz + 1.8 }, scale: { x: 1.0, y: 1.0, z: 1.0 } },
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

// ===== SINH BẢN ĐỒ VỚI BORDER TREES VÀ COLLIDERS TUYỆT ĐỐI KHÔNG LỌT NƯỚC =====

const borderSize = 14; // Bản đồ 28x28 — làng GỌN, rừng viền nhìn thấy từ spawn, fog ôm vừa khít
const boundaryTrees: WorldObjectSpec[] = [];

// Trồng cây dày đặc bao quanh viền
for (let x = -borderSize; x <= borderSize; x += 3.5) {
  // Biên phía Bắc (Z = -25)
  boundaryTrees.push({
    modelPath: M('nature/tree_pineDefaultA.glb'),
    position: { x, y: 0, z: -borderSize },
    scale: { x: 1.4, y: 1.4, z: 1.4 }
  });
  // Biên phía Nam (Z = 25)
  boundaryTrees.push({
    modelPath: M('nature/tree_pineDefaultB.glb'),
    position: { x, y: 0, z: borderSize },
    scale: { x: 1.4, y: 1.4, z: 1.4 }
  });
}

for (let z = -borderSize + 3.5; z < borderSize; z += 3.5) {
  // Biên phía Tây (X = -25)
  boundaryTrees.push({
    modelPath: M('nature/tree_pineDefaultA.glb'),
    position: { x: -borderSize, y: 0, z },
    scale: { x: 1.4, y: 1.4, z: 1.4 }
  });
  // Biên phía Đông (X = 25)
  boundaryTrees.push({
    modelPath: M('nature/tree_pineDefaultB.glb'),
    position: { x: borderSize, y: 0, z },
    scale: { x: 1.4, y: 1.4, z: 1.4 }
  });
}

// Colliders vành đai cứng ngăn lọt thế giới
const boundaryColliders: ColliderSpec[] = [
  { minX: -borderSize - 2, maxX: borderSize + 2, minZ: -borderSize - 2, maxZ: -borderSize + 0.8 },
  { minX: -borderSize - 2, maxX: borderSize + 2, minZ: borderSize - 0.8, maxZ: borderSize + 2 },
  { minX: -borderSize - 2, maxX: -borderSize + 0.8, minZ: -borderSize - 2, maxZ: borderSize + 2 },
  { minX: borderSize - 0.8, maxX: borderSize + 2, minZ: -borderSize - 2, maxZ: borderSize + 2 }
];

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
      name: 'cat_npc',
      modelPath: M('chars/character-male-c.glb'), // Scaled down character as roaming animal
      position: { x: -2.0, y: 0, z: -2.0 },
      roam: true,
      roamRadius: 4.5
    }
  ],

  objects: [
    // 1. Vành đai cây viền ngoài
    ...boundaryTrees,

    // 2. Các công trình chính — VÒNG CUNG QUANH QUẢNG TRƯỜNG, đứng ở spawn thấy đủ 4 cái,
    //    mọi cửa quay về phía người chơi (+Z). KHÔNG ném ra 4 góc map.
    ...stampDoubleHouse(4.5, -8, 'door_about'),      // Bắc-Đông, cách spawn ~9
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

    // 9. Cầu gỗ xinh xắn trang trí
    { modelPath: M('nature/bridge_wood.glb'), position: { x: 0, y: 0, z: -1.5 }, scale: { x: 1.1, y: 1.1, z: 1.1 }, rotation: { y: Math.PI / 2 } },

    // 10. Các cây xanh trang trí phân bổ trong làng
    { modelPath: M('nature/tree_default_fall.glb'), position: { x: 5, y: 0, z: -5 }, scale: { x: 1.2, y: 1.2, z: 1.2 } },
    { modelPath: M('nature/tree_pineDefaultA.glb'), position: { x: -5, y: 0, z: -5 }, scale: { x: 1.2, y: 1.2, z: 1.2 } },
    { modelPath: M('nature/tree_oak.glb'), position: { x: -6, y: 0, z: 3 }, scale: { x: 1.3, y: 1.3, z: 1.3 } },
    { modelPath: M('nature/tree_pineTallA.glb'), position: { x: 6, y: 0, z: 3 }, scale: { x: 1.2, y: 1.2, z: 1.2 } },
    { modelPath: M('town/tree-crooked.glb'), position: { x: 0, y: 0, z: 6.5 }, scale: { x: 1.1, y: 1.1, z: 1.1 } },
    { modelPath: M('nature/tree_thin.glb'), position: { x: -2, y: 0, z: -10.5 }, scale: { x: 1.2, y: 1.2, z: 1.2 } },
    { modelPath: M('nature/tree_thin_fall.glb'), position: { x: 2, y: 0, z: -10.5 }, scale: { x: 1.2, y: 1.2, z: 1.2 } },

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
  ],

  colliders: [
    // Biên giới bảo vệ
    ...boundaryColliders,

    // Các công trình lớn (khớp vị trí vòng cung mới)
    doubleHouseCollider(4.5, -8),    // About
    doubleHouseCollider(-4.5, -8),   // Blog
    doubleHouseCollider(-8.5, -1),   // Projects
    hutCollider(8.5, -1),            // Contact (nhà)
    { minX: 9.4, maxX: 11.2, minZ: -0.9, maxZ: 1.4 }, // Contact (vườn + biển phía đông)

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
    { minX: -0.5, maxX: 0.5, minZ: 6.0, maxZ: 7.0 },
    { minX: -2.5, maxX: -1.5, minZ: -11.0, maxZ: -10.0 },
    { minX: 1.5, maxX: 2.5, minZ: -11.0, maxZ: -10.0 },

    // Tảng đá lớn (vị trí mới)
    { minX: -8.1, maxX: -6.9, minZ: -5.6, maxZ: -4.4 },
    { minX: 6.9, maxX: 8.1, minZ: -5.6, maxZ: -4.4 },
    { minX: -11.7, maxX: -10.3, minZ: 3.3, maxZ: 4.7 },

    // Campfire
    { minX: -0.6, maxX: 0.6, minZ: 1.6, maxZ: 2.8 }
  ],

  interactionZones: [
    // 10 zones hoàn toàn trùng khớp từ logic 2D hiện hữu:
    { name: 'npc_guide', minX: 0.8, maxX: 3.2, minZ: -2.5, maxZ: -0.5 },
    // Zone cửa = ô trước cửa (cửa luôn ở cell ĐÔNG của nhà đôi, hướng +Z)
    { name: 'door_about', minX: 3.9, maxX: 6.5, minZ: -7.2, maxZ: -5.8 },
    { name: 'door_projects', minX: -9.1, maxX: -6.5, minZ: -0.1, maxZ: 1.3 },
    { name: 'door_blog', minX: -5.1, maxX: -2.5, minZ: -7.2, maxZ: -5.8 },
    { name: 'board_quest', minX: -5.5, maxX: -2.5, minZ: -3.5, maxZ: -0.5 },
    { name: 'mailbox_contact', minX: 7.4, maxX: 9.3, minZ: -0.1, maxZ: 1.3 },
    { name: 'sign_controls', minX: -3.5, maxX: -0.5, minZ: 1.0, maxZ: 3.5 },
    { name: 'sign_skip', minX: 2.5, maxX: 5.5, minZ: 2.0, maxZ: 4.5 },
    { name: 'well_easteregg', minX: 8.4, maxX: 10.6, minZ: 1.7, maxZ: 3.9 },
    // Vùng tạm của mèo (được cập nhật động theo vị trí mèo đi tuần tại game.component)
    { name: 'cat_npc', minX: -3.5, maxX: -0.5, minZ: -3.5, maxZ: -0.5 }
  ]
};
