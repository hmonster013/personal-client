import { Component } from '@angular/core';
import { ThemeService } from '../_service/theme.service';
import { flatMap } from 'rxjs';

@Component({
  selector: 'app-header',
  imports: [],
  templateUrl: './header.component.html',
  styleUrl: './header.component.css'
})
export class HeaderComponent {
  isDarkMode = false;

  constructor(private themeService: ThemeService) {}

  toggleTheme(): void {
    this.isDarkMode = !this.isDarkMode;
    this.themeService.toggleTheme(this.isDarkMode);
  }
}
