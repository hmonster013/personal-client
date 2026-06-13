import { test, expect, Page } from '@playwright/test';

// Route THẬT (theo app.routes.ts + URI.ts): blog list = /blogs, detail = /blogs/:id.
// (Bản cũ test /blog, /blog/sample-post, /mode-selection — đều rơi vào 404 nên audit giả pass.)
const STATIC_ROUTES = [
  { path: '/', name: 'home', expectReal: true },
  { path: '/about', name: 'about', expectReal: true },
  { path: '/blogs', name: 'blogs', expectReal: true },
  { path: '/random-404-route', name: '404', expectReal: false }, // chủ đích test trang 404
];

const VIEWPORTS = [
  { width: 360, height: 800 },
  { width: 390, height: 844 },
  { width: 768, height: 1024 },
];

const THEMES = ['light', 'dark'];

// Dấu hiệu nhận diện trang NotFound — dùng để chặn "giả pass" khi route sai văng về 404.
const NOT_FOUND_MARKER = 'KHU VỰC CHƯA MỞ KHÓA';

async function setup(page: Page, viewport: { width: number; height: number }, theme: string) {
  await page.setViewportSize(viewport);
  await page.addInitScript((t) => {
    window.localStorage.setItem('preferredMode', 'classic');
    window.localStorage.setItem('theme', t);
  }, theme);
}

async function applyThemeAndSettle(page: Page, theme: string) {
  await page.evaluate((t) => document.documentElement.setAttribute('data-theme', t), theme);
  await page.waitForTimeout(1000);
}

async function measureOverflow(page: Page) {
  return page.evaluate(() => {
    const clientWidth = document.documentElement.clientWidth;
    const scrollWidth = document.documentElement.scrollWidth;
    const overflowingElements: Array<{ tag: string; class: string; right: number; width: number }> = [];
    // Phần tử nằm trong container cuộn/cắt ngang (overflow-x auto|scroll|hidden) là CỐ Ý
    // (vd <pre> code, breadcrumb nowrap): getBoundingClientRect của con không bị cắt nên
    // tràn "ảo" — không làm trang cuộn ngang. Bỏ qua chúng, chỉ bắt tràn trang THẬT.
    const isInsideClippedAncestor = (el: Element): boolean => {
      let p = el.parentElement;
      while (p && p !== document.documentElement) {
        const ox = getComputedStyle(p).overflowX;
        if (ox === 'auto' || ox === 'scroll' || ox === 'hidden') return true;
        p = p.parentElement;
      }
      return false;
    };
    document.querySelectorAll('*').forEach((el) => {
      if (el.tagName === 'SCRIPT' || el.tagName === 'STYLE') return;
      // Bỏ qua drawer off-canvas cố ý (đẩy ra ngoài mép bằng translateX)
      if (el.classList.contains('side-menu') || el.closest('.side-menu')) return;
      if (isInsideClippedAncestor(el)) return;
      const rect = el.getBoundingClientRect();
      if (rect.right > clientWidth + 1 && rect.width > 0) {
        overflowingElements.push({
          tag: el.tagName,
          class: typeof el.className === 'string' ? el.className : '',
          right: Math.round(rect.right),
          width: Math.round(rect.width),
        });
      }
    });
    return { clientWidth, scrollWidth, overflowingElements };
  });
}

async function auditCurrentPage(page: Page, label: string, expectReal: boolean) {
  // Chặn giả pass: route "thật" KHÔNG được render trang NotFound.
  const bodyText = await page.evaluate(() => document.body.innerText || '');
  if (expectReal) {
    expect(bodyText, `Route ${label} bị văng về trang 404 — audit sẽ giả pass`).not.toContain(NOT_FOUND_MARKER);
  }

  const info = await measureOverflow(page);
  if (info.overflowingElements.length > 0) {
    console.log(`[OVERFLOW] ${label}:`, JSON.stringify(info.overflowingElements, null, 2));
  }
  expect(info.scrollWidth, `${label}: scrollWidth tràn`).toBeLessThanOrEqual(info.clientWidth + 1);
  expect(info.overflowingElements.length, `${label}: có phần tử tràn ngang`).toBe(0);
}

test.describe('Responsive Audit (M6.5) — static routes', () => {
  for (const route of STATIC_ROUTES) {
    for (const viewport of VIEWPORTS) {
      for (const theme of THEMES) {
        test(`${route.path} @ ${viewport.width} ${theme}`, async ({ page }) => {
          const label = `${route.path} (${viewport.width}px, ${theme})`;
          await setup(page, viewport, theme);
          await page.goto(route.path);
          await applyThemeAndSettle(page, theme);
          await page.screenshot({
            path: `e2e/screenshots/${route.name}-${viewport.width}-${theme}.png`,
            fullPage: true,
          });
          await auditCurrentPage(page, label, route.expectReal);
        });
      }
    }
  }
});

// Blog detail: KHÔNG hardcode slug giả. Vào /blogs, lấy id bài thật từ card rồi audit.
// Nếu API rỗng/không có bài → FAIL có thông báo rõ (không âm thầm bỏ qua, vì đây là trang
// rủi ro tràn cao nhất: ảnh/<pre>/table trong safe-html-display).
test.describe('Responsive Audit (M6.5) — blog detail (id thật)', () => {
  for (const viewport of VIEWPORTS) {
    for (const theme of THEMES) {
      test(`blog-detail @ ${viewport.width} ${theme}`, async ({ page }) => {
        await setup(page, viewport, theme);
        await page.goto('/blogs');
        await page.waitForTimeout(1500); // chờ API trả bài

        const href = await page.evaluate(() => {
          const a = document.querySelector('a[href*="/blogs/"]') as HTMLAnchorElement | null;
          return a ? a.getAttribute('href') : null;
        });

        expect(
          href,
          'Không tìm thấy bài blog nào ở /blogs (API có thể không tới được hoặc không có dữ liệu) — ' +
            'không thể audit blog-detail. Kiểm tra apiUrl trong environments.ts và backend :8000.'
        ).toBeTruthy();

        await page.goto(href!);
        await applyThemeAndSettle(page, theme);
        const label = `blog-detail ${href} (${viewport.width}px, ${theme})`;
        await page.screenshot({
          path: `e2e/screenshots/blog-detail-${viewport.width}-${theme}.png`,
          fullPage: true,
        });
        await auditCurrentPage(page, label, true);
      });
    }
  }
});
