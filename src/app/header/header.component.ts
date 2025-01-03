import { Component } from '@angular/core';
import { ThemeService } from '../_services/theme.service';
import { flatMap } from 'rxjs';

@Component({
  selector: 'app-header',
  imports: [],
  templateUrl: './header.component.html',
  styleUrl: './header.component.css'
})
export class HeaderComponent {
  isDarkMode = false;
  isMenuOpen = false;

  constructor(private themeService: ThemeService) {}

  toggleTheme(): void {
    this.isDarkMode = !this.isDarkMode;
    this.themeService.toggleTheme(this.isDarkMode);
  }

  toggleMenu() {
    this.isMenuOpen = !this.isMenuOpen;
    const sideMenu = document.getElementById('sideMenu');
    if (sideMenu) {
      sideMenu.classList.toggle('open', this.isMenuOpen);
    }
  }

  closeMenu() {
    this.isMenuOpen = false;
    const sideMenu = document.getElementById('sideMenu');
    if (sideMenu) {
      sideMenu.classList.remove('open');
    }
  }
}
