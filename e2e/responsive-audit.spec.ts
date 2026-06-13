import { test, expect } from '@playwright/test';

const ROUTES = [
  '/',
  '/about',
  '/blog',
  // Try a random slug for blog detail (assuming there's a fallback or we can test one)
  '/blog/sample-post', 
  '/mode-selection',
  '/random-404-route'
];

const VIEWPORTS = [
  { width: 360, height: 800 },
  { width: 390, height: 844 },
  { width: 768, height: 1024 }
];

const THEMES = ['light', 'dark'];

test.describe('Responsive Audit (M6.5)', () => {
  for (const route of ROUTES) {
    for (const viewport of VIEWPORTS) {
      for (const theme of THEMES) {
        test(`Audit route ${route} at ${viewport.width}x${viewport.height} in ${theme} mode`, async ({ page }) => {
          await page.setViewportSize(viewport);
          
          // Set preferredMode and theme in localStorage before navigating
          await page.addInitScript(({ theme }) => {
            window.localStorage.setItem('preferredMode', 'classic');
            window.localStorage.setItem('theme', theme);
          }, { theme });

          await page.goto(route);

          // Force theme attribute on document
          await page.evaluate((t) => {
            document.documentElement.setAttribute('data-theme', t);
          }, theme);

          // Wait for a moment to ensure rendering is stable
          await page.waitForTimeout(1000);

          // Take a screenshot
          const safeRouteName = route === '/' ? 'home' : route.replace(/\//g, '-').replace(/^-/, '');
          await page.screenshot({ path: `e2e/screenshots/${safeRouteName}-${viewport.width}-${theme}.png`, fullPage: true });

          // Measure width and find overflows
          const overflowInfo = await page.evaluate(() => {
            const clientWidth = document.documentElement.clientWidth;
            const scrollWidth = document.documentElement.scrollWidth;
            
            const allElements = document.querySelectorAll('*');
            const overflowingElements: Array<{ tag: string, class: string, right: number, width: number }> = [];
            
            allElements.forEach(el => {
              // Ignore script, style, and known off-canvas drawer
              if (el.tagName === 'SCRIPT' || el.tagName === 'STYLE') return;
              if (el.classList.contains('side-menu') || el.closest('.side-menu')) {
                // Heuristic to ignore off-canvas
                return;
              }
              
              const rect = el.getBoundingClientRect();
              if (rect.right > clientWidth + 1 && rect.width > 0) {
                overflowingElements.push({
                  tag: el.tagName,
                  class: el.className,
                  right: rect.right,
                  width: rect.width
                });
              }
            });
            
            return {
              clientWidth,
              scrollWidth,
              overflowingElements
            };
          });

          // Print out any overflowing elements for debugging
          if (overflowInfo.overflowingElements.length > 0) {
            console.log(`[OVERFLOW] Route ${route} (${viewport.width}px, ${theme}):`, overflowInfo.overflowingElements);
          }

          // Assert document.scrollWidth <= clientWidth + 1
          expect(overflowInfo.scrollWidth).toBeLessThanOrEqual(overflowInfo.clientWidth + 1);
          // And also expect zero overflowing elements
          expect(overflowInfo.overflowingElements.length).toBe(0);
        });
      }
    }
  }
});
