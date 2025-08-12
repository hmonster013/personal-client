// ===================================
// PERFORMANCE UTILITIES
// ===================================

export class PerformanceUtil {

  /**
   * Debounce function to limit rapid function calls
   */
  static debounce<T extends (...args: any[]) => any>(
    func: T,
    wait: number
  ): (...args: Parameters<T>) => void {
    let timeout: any;
    return (...args: Parameters<T>) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), wait);
    };
  }

  /**
   * Throttle function to limit function calls to once per interval
   */
  static throttle<T extends (...args: any[]) => any>(
    func: T,
    limit: number
  ): (...args: Parameters<T>) => void {
    let inThrottle: boolean;
    return (...args: Parameters<T>) => {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  }

  /**
   * Optimize DOM operations with requestAnimationFrame
   */
  static optimizeDOM(callback: () => void): void {
    requestAnimationFrame(callback);
  }

  /**
   * Batch DOM operations for better performance
   */
  static batchDOM(operations: (() => void)[]): void {
    requestAnimationFrame(() => {
      operations.forEach(op => op());
    });
  }

  /**
   * Measure function execution time
   */
  static measureTime<T>(name: string, func: () => T): T {
    const start = performance.now();
    const result = func();
    const end = performance.now();
    console.log(`${name} took ${end - start} milliseconds`);
    return result;
  }

  /**
   * Check if user prefers reduced motion
   */
  static prefersReducedMotion(): boolean {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  /**
   * Get device performance tier (rough estimation)
   */
  static getPerformanceTier(): 'low' | 'medium' | 'high' {
    const memory = (navigator as any).deviceMemory || 4;
    const cores = navigator.hardwareConcurrency || 4;

    if (memory <= 2 || cores <= 2) return 'low';
    if (memory <= 4 || cores <= 4) return 'medium';
    return 'high';
  }

  /**
   * Optimize animations based on device performance
   */
  static getOptimalAnimationDuration(): number {
    const tier = this.getPerformanceTier();
    const reducedMotion = this.prefersReducedMotion();

    if (reducedMotion) return 0;

    switch (tier) {
      case 'low': return 150;
      case 'medium': return 200;
      case 'high': return 300;
      default: return 200;
    }
  }

  /**
   * Lazy load images with Intersection Observer
   */
  static lazyLoadImages(selector: string = 'img[data-src]'): void {
    if ('IntersectionObserver' in window) {
      const imageObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const img = entry.target as HTMLImageElement;
            const dataSrc = img.dataset['src'];
            if (dataSrc) {
              img.src = dataSrc;
              img.classList.remove('lazy');
              imageObserver.unobserve(img);
            }
          }
        });
      });

      document.querySelectorAll(selector).forEach(img => {
        imageObserver.observe(img);
      });
    }
  }

  /**
   * Preload critical resources
   */
  static preloadResource(href: string, as: string): void {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.href = href;
    link.as = as;
    document.head.appendChild(link);
  }

  /**
   * Monitor Core Web Vitals
   */
  static monitorWebVitals(): void {
    // Monitor LCP (Largest Contentful Paint)
    if ('PerformanceObserver' in window) {
      try {
        new PerformanceObserver((entryList) => {
          const entries = entryList.getEntries();
          const lastEntry = entries[entries.length - 1];
          console.log('LCP:', lastEntry.startTime);
        }).observe({ entryTypes: ['largest-contentful-paint'] });
      } catch (e) {
        console.warn('LCP monitoring not supported');
      }

      // Monitor FID (First Input Delay)
      try {
        new PerformanceObserver((entryList) => {
          const entries = entryList.getEntries();
          entries.forEach(entry => {
            const fidEntry = entry as any;
            if (fidEntry.processingStart) {
              console.log('FID:', fidEntry.processingStart - entry.startTime);
            }
          });
        }).observe({ entryTypes: ['first-input'] });
      } catch (e) {
        console.warn('FID monitoring not supported');
      }

      // Monitor CLS (Cumulative Layout Shift)
      try {
        new PerformanceObserver((entryList) => {
          let clsValue = 0;
          const entries = entryList.getEntries();
          entries.forEach(entry => {
            const clsEntry = entry as any;
            if (!clsEntry.hadRecentInput) {
              clsValue += clsEntry.value || 0;
            }
          });
          console.log('CLS:', clsValue);
        }).observe({ entryTypes: ['layout-shift'] });
      } catch (e) {
        console.warn('CLS monitoring not supported');
      }
    }
  }
}
