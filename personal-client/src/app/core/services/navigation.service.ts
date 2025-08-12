import { Injectable } from '@angular/core';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class NavigationService {

  constructor(private router: Router) { }

  /**
   * Navigate to contact section on home page
   * If already on home page, just scroll to contact
   * If on different page, navigate to home first then scroll
   */
  goToContact(): Promise<boolean> {
    return new Promise((resolve) => {
      const currentUrl = this.router.url;
      const urlPath = currentUrl.split('?')[0].split('#')[0]; // Remove query params and fragments
      const isHomePage = urlPath === '/' || urlPath === '' || urlPath === '/home';
      
      if (isHomePage) {
        // If already on home page, just scroll to contact
        this.scrollToContact();
        resolve(true);
      } else {
        // If on different page, navigate to home first then scroll
        this.router.navigate(['/'], { fragment: 'contact' }).then(() => {
          // Wait a bit for the page to load, then scroll
          setTimeout(() => {
            this.scrollToContact();
            resolve(true);
          }, 300);
        }).catch(error => {
          console.error('Navigation error:', error);
          // Fallback: try direct navigation without fragment
          this.router.navigate(['/']).then(() => {
            setTimeout(() => {
              this.scrollToContact();
              resolve(true);
            }, 500);
          }).catch(() => {
            resolve(false);
          });
        });
      }
    });
  }

  /**
   * Scroll to contact section with retry mechanism
   */
  private scrollToContact(): void {
    const maxRetries = 5;
    let retryCount = 0;
    
    const attemptScroll = (): boolean => {
      const contactElement = document.getElementById('contact');
      if (contactElement) {
        // Add a small offset to account for fixed header
        const headerHeight = 70; // Height of fixed header
        const elementPosition = contactElement.offsetTop - headerHeight;
        
        window.scrollTo({
          top: elementPosition,
          behavior: 'smooth'
        });
        
        return true; // Success
      }
      return false; // Element not found
    };
    
    // Try immediate scroll first
    if (attemptScroll()) {
      return;
    }
    
    // If element not found, retry with increasing delays
    const retryScroll = () => {
      if (retryCount < maxRetries) {
        retryCount++;
        setTimeout(() => {
          if (!attemptScroll()) {
            retryScroll(); // Retry again
          }
        }, retryCount * 100); // Increasing delay: 100ms, 200ms, 300ms, etc.
      } else {
        console.warn('Contact section not found after multiple attempts');
      }
    };
    
    retryScroll();
  }

  /**
   * Generic method to scroll to any element by ID
   */
  scrollToElement(elementId: string, offset: number = 70): void {
    const element = document.getElementById(elementId);
    if (element) {
      const elementPosition = element.offsetTop - offset;
      
      window.scrollTo({
        top: elementPosition,
        behavior: 'smooth'
      });
    }
  }
}
