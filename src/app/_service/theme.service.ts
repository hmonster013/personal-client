import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
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

  constructor() {}

  toggleTheme(isDarkMode: boolean): void {
    const theme = isDarkMode ? this.darkTheme : this.lightTheme;
    this.applyTheme(theme);
  }

  private applyTheme(theme: { [key: string]: string }): void {
    const root = document.documentElement;
    for (const key in theme) {
      root.style.setProperty(key, theme[key]);
    }
  }
}
