import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ThemeService } from '../../core/services/theme.service';
import { JCode } from '../../shared/utils/JCode';
import { LinkNames } from '../../shared/utils/LinkNames';

import { ToastService } from '../../core/services/toast.service';
import { ToastStatus } from '../../shared/utils/ToastStatus';
import { Router } from '@angular/router';
import { CommonService } from 'src/app/core/services/common.service';
import { NavigationService } from '../../core/services/navigation.service';
import { PerformanceUtil } from '../../shared/utils/performance.util';

@Component({
  selector: 'app-header',
  imports: [CommonModule],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss'
})
export class HeaderComponent implements OnInit{
  isDarkMode = false;
  isMenuOpen = false;
  response: any;
  dictLinks: any;
  isMobile = false;

  // Cache DOM elements for better performance
  private sideMenuElement: HTMLElement | null = null;
  private overlayElement: HTMLElement | null = null;
  private menuIconElement: Element | null = null;

  constructor(
    private themeService: ThemeService,
    private commonService: CommonService,
    private toastService: ToastService,
    private router: Router,
    private navigationService: NavigationService
  ) {}

  ngOnInit(): void {
    this.getAllConfigs();
    // Get current theme state
    this.isDarkMode = this.themeService.getCurrentTheme();

    // Check screen size
    this.checkScreenSize();

    // Listen for window resize
    window.addEventListener('resize', () => {
      this.checkScreenSize();
    });

    // Cache DOM elements after view init
    setTimeout(() => {
      this.sideMenuElement = document.getElementById('sideMenu');
      this.overlayElement = document.getElementById('menuOverlay');
      this.menuIconElement = document.querySelector('.header__icon--menu');
    }, 0);
  }

  checkScreenSize(): void {
    const wasMobile = this.isMobile;
    this.isMobile = window.innerWidth <= 780;

    // Debug log
    console.log('Screen size check:', {
      width: window.innerWidth,
      isMobile: this.isMobile,
      wasMobile: wasMobile
    });

    // If switching from mobile to desktop, close menu
    if (wasMobile && !this.isMobile && this.isMenuOpen) {
      this.closeMenu();
    }
  }

  getAllConfigs() {
    this.commonService.getAllConfig().subscribe(res => {
      this.response = res;

      if (this.response.status == JCode.SUCCESS) {
        this.dictLinks = this.response.data.baseLinks;
      } else {
        this.toastService.show("Load project error", ToastStatus.ERROR);
      }
    })
  }

  goToHome() {
    this.router.navigate(['']);
  }

  get githubLink() {
    return this.dictLinks ? this.dictLinks[LinkNames.GITHUB] : "#";
  }

  toggleTheme = PerformanceUtil.debounce((): void => {
    this.themeService.toggleTheme();
    this.isDarkMode = this.themeService.getCurrentTheme();
  }, 100);

  toggleMenu() {
    this.isMenuOpen = !this.isMenuOpen;

    // Use cached elements for better performance
    const sideMenu = this.sideMenuElement || document.getElementById('sideMenu');
    const overlay = this.overlayElement || document.getElementById('menuOverlay');
    const menuIcon = this.menuIconElement || document.querySelector('.header__icon--menu');

    if (sideMenu && overlay) {
      // Batch DOM operations for better performance
      PerformanceUtil.batchDOM([
        () => {
          if (this.isMenuOpen) {
            sideMenu.classList.add('open');
            overlay.classList.add('active');
            menuIcon?.classList.add('active');
            document.body.style.overflow = 'hidden';
          } else {
            sideMenu.classList.remove('open');
            overlay.classList.remove('active');
            menuIcon?.classList.remove('active');
            document.body.style.overflow = 'auto';
          }
        }
      ]);
    }
  }

  closeMenu() {
    this.isMenuOpen = false;

    // Use cached elements for better performance
    const sideMenu = this.sideMenuElement || document.getElementById('sideMenu');
    const overlay = this.overlayElement || document.getElementById('menuOverlay');
    const menuIcon = this.menuIconElement || document.querySelector('.header__icon--menu');

    if (sideMenu && overlay) {
      requestAnimationFrame(() => {
        sideMenu.classList.remove('open');
        overlay.classList.remove('active');
        menuIcon?.classList.remove('active');
        document.body.style.overflow = 'auto';
      });
    }
  }

  scrollToContact(): void {
    this.navigationService.goToContact().then(success => {
      if (!success) {
        console.error('Failed to navigate to contact section');
        this.toastService.show('Unable to navigate to contact section', ToastStatus.ERROR);
      }
    });
  }
}
