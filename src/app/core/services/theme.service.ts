import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private isDarkMode = true; // Mặc định: dark (night) cho user mới
  private firstApply = true; // lần áp dụng đầu (load trang) không animate để tránh chớp

  constructor() {
    // Load saved theme from localStorage
    const savedTheme = localStorage.getItem('isDarkMode');
    if (savedTheme !== null) {
      this.isDarkMode = savedTheme === 'true';
    } else {
      this.isDarkMode = true; // Default: dark (night) cho user mới
      localStorage.setItem('isDarkMode', 'true');
    }
    this.applyTheme();
  }

  getCurrentTheme(): boolean {
    return this.isDarkMode;
  }

  toggleTheme(isDarkMode?: boolean): void {
    if (isDarkMode !== undefined) {
      this.isDarkMode = isDarkMode;
    } else {
      this.isDarkMode = !this.isDarkMode;
    }

    this.applyTheme();

    // Save theme preference to localStorage
    localStorage.setItem('isDarkMode', this.isDarkMode.toString());
  }

  private applyTheme(): void {
    // Use requestAnimationFrame for better performance
    requestAnimationFrame(() => {
      const root = document.documentElement;

      // Bật cross-fade ngày<->đêm (trừ lần load đầu). Gỡ class sau khi transition xong.
      if (!this.firstApply) {
        root.classList.add('theme-transitioning');
        window.setTimeout(() => root.classList.remove('theme-transitioning'), 500);
      }
      this.firstApply = false;

      // Set data-theme attribute for CSS variables in SCSS to handle
      root.setAttribute('data-theme', this.isDarkMode ? 'dark' : 'light');

      // Bỏ inject inline style để tránh bug cộng dồn cssText +=
      root.removeAttribute('style');
    });
  }
}
