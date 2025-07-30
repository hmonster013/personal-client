import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private lightTheme = {
    '--primary': '#2563EB',
    '--primary-light': '#497DEE',
    '--primary-dark': '#134FD2',

    '--secondary': '#111827',
    '--secondary-light': '#172135',
    '--secondary-dark': '#090D15',

    '--white': '#F7F3F3',
    '--white-light': '#FFFFFF',
    '--white-dark': '#E3E8ED',

    '--black': '#060504',
    '--black-light': '#120F0C',
    '--black-dark': '#000000',
  };

  private darkTheme = {
    '--primary': '#3B82F6',
    '--primary-light': '#60A5FA',
    '--primary-dark': '#1D4ED8',

    '--secondary': '#E5E7EB',
    '--secondary-light': '#F3F4F6',
    '--secondary-dark': '#D1D5DB',

    '--white': '#1F2937',
    '--white-light': '#111827',
    '--white-dark': '#374151',

    '--black': '#F9FAFB',
    '--black-light': '#F3F4F6',
    '--black-dark': '#E5E7EB',
  };

  private isDarkMode = false;

  constructor() {
    // Load saved theme from localStorage
    const savedTheme = localStorage.getItem('isDarkMode');
    this.isDarkMode = savedTheme === 'true';
    this.applyTheme(this.isDarkMode ? this.darkTheme : this.lightTheme);
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

    const theme = this.isDarkMode ? this.darkTheme : this.lightTheme;
    this.applyTheme(theme);

    // Save theme preference to localStorage
    localStorage.setItem('isDarkMode', this.isDarkMode.toString());
  }

  private applyTheme(theme: { [key: string]: string }): void {
    // Use requestAnimationFrame for better performance
    requestAnimationFrame(() => {
      const root = document.documentElement;

      // Set data-theme attribute for CSS
      root.setAttribute('data-theme', this.isDarkMode ? 'dark' : 'light');

      // Batch CSS custom properties updates
      const cssText = Object.entries(theme)
        .map(([key, value]) => `${key}: ${value}`)
        .join('; ');

      // Apply all properties at once
      root.style.cssText += '; ' + cssText;
    });
  }
}
