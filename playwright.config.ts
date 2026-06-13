import { defineConfig, devices } from '@playwright/test';

// Lưu ý: browser được cài LOCAL trong node_modules (PLAYWRIGHT_BROWSERS_PATH=0 lúc install).
// Khi chạy test cũng phải đặt PLAYWRIGHT_BROWSERS_PATH=0 để Playwright tìm đúng chỗ đó.
export default defineConfig({
  testDir: './e2e',
  timeout: 90_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:4200',
    headless: true,
    screenshot: 'off', // tự chụp trong spec để đặt tên rõ ràng
    launchOptions: {
      // Bật WebGL qua SwiftShader cho Three.js chạy được trong headless Chromium 148.
      args: [
        '--use-gl=angle',
        '--use-angle=swiftshader',
        '--enable-unsafe-swiftshader',
        '--ignore-gpu-blocklist',
        '--enable-webgl',
      ],
    },
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  // Tận dụng dev server đang chạy; nếu chưa có thì tự khởi động ng serve.
  webServer: {
    command: 'npm start',
    url: 'http://localhost:4200',
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
