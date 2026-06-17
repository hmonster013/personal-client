import { test, expect } from '@playwright/test';

// Chụp các trang chính ở cả 2 theme để review màu sau khi retune palette.
const PAGES = [
  { name: 'home', url: '/' },
  { name: 'blogs', url: '/blogs' },
  { name: 'about', url: '/about' },
];

for (const dark of [false, true]) {
  const mode = dark ? 'dark' : 'light';
  for (const p of PAGES) {
    test(`screenshot ${p.name} ${mode}`, async ({ page }) => {
      await page.addInitScript((isDark) => {
        localStorage.setItem('isDarkMode', String(isDark));
        localStorage.setItem('preferredMode', 'classic'); // Home hiện portfolio thay vì menu game
      }, dark);
      await page.setViewportSize({ width: 1280, height: 900 });
      await page.goto(p.url, { waitUntil: 'networkidle' });
      // chờ theme áp lên <html data-theme>
      await expect(page.locator('html')).toHaveAttribute('data-theme', mode, { timeout: 10_000 });
      await page.waitForTimeout(800);
      await page.screenshot({ path: `e2e/screenshots/theme-${p.name}-${mode}.png`, fullPage: true });
    });
  }
}
