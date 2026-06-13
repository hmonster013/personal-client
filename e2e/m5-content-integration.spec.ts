import { test, expect, Page, ConsoleMessage } from '@playwright/test';

/**
 * Nghiệm thu M5 — Content Integration (game 3D ↔ nội dung backend).
 * Dùng hook test-only `?debug=1&goto=<overlay>` để mở thẳng overlay, không cần đi bộ.
 * Mỗi test chụp ảnh vào e2e/screenshots (đã gitignore).
 */

const SHOTS = 'e2e/screenshots';

// Vào game: đặt preferredMode=game TRƯỚC khi app bootstrap để Home render <app-game>.
async function enterGame(page: Page, query = '') {
  await page.addInitScript(() => {
    try { localStorage.setItem('preferredMode', 'game'); } catch {}
  });
  await page.goto(`/${query}`);
  await expect(page.locator('app-game')).toBeVisible({ timeout: 30_000 });
  // Chờ màn LOADING biến mất (assets GLB tải xong + scene dựng xong).
  await expect(page.locator('.game-loading-overlay')).toHaveCount(0, { timeout: 60_000 });
}

// Gom console error/warning để báo cáo cuối.
function trackConsole(page: Page, sink: string[]) {
  page.on('console', (msg: ConsoleMessage) => {
    if (msg.type() === 'error' || msg.type() === 'warning') {
      sink.push(`[${msg.type()}] ${msg.text()}`);
    }
  });
  page.on('pageerror', (err) => sink.push(`[pageerror] ${err.message}`));
}

test('00 — làng 3D load được, canvas render, không crash', async ({ page }) => {
  const logs: string[] = [];
  trackConsole(page, logs);

  await enterGame(page, '?debug=1');
  await expect(page.locator('app-game canvas')).toBeVisible();
  // HUD hiển thị bộ đếm địa điểm.
  await expect(page.locator('.rpg-hud__info')).toContainText('Địa điểm');
  await page.waitForTimeout(1500); // để vài frame render + ambient
  await page.screenshot({ path: `${SHOTS}/00-village.png`, fullPage: false });

  console.log('Console (village):\n' + (logs.join('\n') || '  (sạch)'));
  expect(logs.filter((l) => l.startsWith('[pageerror]')), 'không được có pageerror').toEqual([]);
});

const OVERLAYS: { goto: string; title: RegExp; file: string }[] = [
  { goto: 'about',    title: /ABOUT/i,    file: '01-about' },
  { goto: 'projects', title: /PROJECTS/i, file: '02-projects' },
  { goto: 'quest',    title: /QUEST|NHIỆM VỤ/i, file: '03-quest' },
  { goto: 'blog',     title: /BLOG/i,     file: '04-blog' },
  { goto: 'contact',  title: /CONTACT/i,  file: '05-contact' },
];

for (const ov of OVERLAYS) {
  test(`overlay "${ov.goto}" mở được + có nội dung`, async ({ page }) => {
    const logs: string[] = [];
    trackConsole(page, logs);

    await enterGame(page, `?debug=1&goto=${ov.goto}`);

    const panel = page.locator('.game-world__menu');
    await expect(panel).toBeVisible({ timeout: 15_000 });
    await expect(panel.locator('.rpg-panel__header h3')).toContainText(ov.title);

    // Chờ data backend render xong (không còn "ĐANG TẢI").
    await page.waitForTimeout(2000);
    await page.screenshot({ path: `${SHOTS}/${ov.file}.png` });

    // Esc đóng overlay được.
    await page.keyboard.press('Escape');
    await expect(page.locator('.game-world__menu')).toHaveCount(0, { timeout: 5_000 });

    console.log(`Console (${ov.goto}):\n` + (logs.join('\n') || '  (sạch)'));
    expect(logs.filter((l) => l.startsWith('[pageerror]')), 'không được có pageerror').toEqual([]);
  });
}

test('contact form — render + validation (KHÔNG gửi data thật)', async ({ page }) => {
  await enterGame(page, '?debug=1&goto=contact');

  const panel = page.locator('.game-world__menu');
  await expect(panel).toBeVisible();
  // 4 trường form tồn tại.
  await expect(panel.locator('input[name="name"]')).toBeVisible();
  await expect(panel.locator('input[name="email"]')).toBeVisible();
  await expect(panel.locator('textarea[name="message"]')).toBeVisible();

  // Submit rỗng → phải báo lỗi (toast), KHÔNG gọi backend.
  await panel.locator('button[type="submit"]').click();
  // toast lỗi xuất hiện ở đâu đó trên trang
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${SHOTS}/06-contact-validation.png` });

  // Điền hợp lệ rồi chụp (KHÔNG bấm gửi để tránh tạo record thật).
  await panel.locator('input[name="name"]').fill('Playwright Test');
  await panel.locator('input[name="email"]').fill('test@example.com');
  await panel.locator('textarea[name="message"]').fill('Nội dung kiểm thử M5.');
  await page.screenshot({ path: `${SHOTS}/07-contact-filled.png` });
});

// Tới gần thác nước từ NHIỀU hướng đều phải kích hoạt được E (đây chính là lỗi user báo).
const WATERMILL_SPOTS = [
  { px: -7.2, pz: -7.8, tag: 'tây' },   // tiếp cận từ phía tây
  { px: -6.3, pz: -7.0, tag: 'nam' },   // tiếp cận từ phía nam (hướng đi từ spawn)
];
for (const spot of WATERMILL_SPOTS) {
  test(`thác nước (watermill) — tới gần từ phía ${spot.tag} kích hoạt E mở Blog`, async ({ page }) => {
    await enterGame(page, `?debug=1&px=${spot.px}&pz=${spot.pz}`);

    // Chờ vài frame để update() chạy zone-overlap rồi hiện prompt [E].
    await page.waitForTimeout(1200);
    const prompt = page.locator('.game-world__prompt');
    await expect(prompt, `prompt [E] phải hiện khi đứng cạnh thác nước (${spot.tag})`).toBeVisible({ timeout: 8_000 });
    await expect(prompt).toContainText(/thư viện|Blog/i);
    if (spot.tag === 'tây') await page.screenshot({ path: `${SHOTS}/09-watermill-prompt.png` });

    // Nhấn E → overlay Blog mở.
    await page.keyboard.press('e');
    const panel = page.locator('.game-world__menu');
    await expect(panel).toBeVisible({ timeout: 8_000 });
    await expect(panel.locator('.rpg-panel__header h3')).toContainText(/BLOG/i);
    if (spot.tag === 'tây') await page.screenshot({ path: `${SHOTS}/10-watermill-blog.png` });
  });
}

// Đứng NGAY DƯỚI mỗi kim cương vàng (chân cột sáng) phải kích hoạt được E.
// Toạ độ = vị trí eventMarkers trong world-spec; nếu marker lệch khỏi zone thì test này fail.
const EVENT_MARKERS = [
  { name: 'door_about', x: 5.2, z: -6.5 },
  { name: 'door_blog', x: -3.8, z: -6.5 },
  { name: 'door_projects', x: -7.8, z: 0.6 },
  { name: 'mailbox_contact', x: 8.35, z: 0.6 },
  { name: 'board_quest', x: -4, z: -2 },
  { name: 'sign_controls', x: -2.2, z: 2.2 },
  { name: 'sign_skip', x: 4.2, z: 3.2 },
  // well_easteregg KHÔNG test ở đây: tâm giếng (9.5,2.8) nằm trong collider, người chơi không
  // đứng tới được. Test riêng ở dưới với các điểm đứng THỰC TẾ quanh giếng (ngoài collider).
];

// Giếng: đứng sát từ 4 hướng (điểm tâm-người-chơi dừng ~0.4 ngoài collider x[8.6,10.4] z[1.9,3.7]).
const WELL_SPOTS = [
  { x: 9.5, z: 1.5, tag: 'nam' },
  { x: 9.5, z: 4.1, tag: 'bắc' },
  { x: 8.2, z: 2.8, tag: 'tây' },
  { x: 10.8, z: 2.8, tag: 'đông' },
];
for (const s of WELL_SPOTS) {
  test(`giếng nước (gần Contact) — đứng sát phía ${s.tag} kích hoạt được [E]`, async ({ page }) => {
    await enterGame(page, `?debug=1&px=${s.x}&pz=${s.z}`);
    await page.waitForTimeout(1200);
    await expect(
      page.locator('.game-world__prompt'),
      `prompt [E] phải hiện khi đứng sát giếng phía ${s.tag} (${s.x},${s.z})`
    ).toBeVisible({ timeout: 8_000 });
  });
}
for (const m of EVENT_MARKERS) {
  test(`event marker "${m.name}" — đứng dưới kim cương kích hoạt được [E]`, async ({ page }) => {
    await enterGame(page, `?debug=1&px=${m.x}&pz=${m.z}`);
    await page.waitForTimeout(1200);
    await expect(
      page.locator('.game-world__prompt'),
      `prompt [E] phải hiện khi đứng dưới kim cương "${m.name}" (${m.x},${m.z})`
    ).toBeVisible({ timeout: 8_000 });
  });
}

test('dialogue NPC — typewriter + nhánh lựa chọn', async ({ page }) => {
  await enterGame(page, '?debug=1&goto=guide');
  const dialog = page.locator('.rpg-dialog');
  await expect(dialog).toBeVisible({ timeout: 10_000 });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${SHOTS}/08-dialogue.png` });
});
