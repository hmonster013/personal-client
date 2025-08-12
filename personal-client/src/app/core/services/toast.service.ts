import { Injectable, ApplicationRef, ComponentRef, createComponent, EnvironmentInjector } from '@angular/core';
import { ToastComponent, ToastType } from '../../shared/components/toast/toast.component';

export interface ToastConfig {
  message: string;
  title?: string;
  type?: ToastType;
  duration?: number;
  closable?: boolean;
  autoClose?: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class ToastService {
  private toasts: ComponentRef<ToastComponent>[] = [];
  private container: HTMLElement | null = null;
  private readonly maxToasts = 5;

  constructor(
    private appRef: ApplicationRef,
    private injector: EnvironmentInjector
  ) {
    this.createContainer();
  }

  // Main show method with config object
  show(config: ToastConfig): void;
  // Backward compatibility method
  show(message: string, type?: ToastType, duration?: number): void;
  show(configOrMessage: ToastConfig | string, type: ToastType = 'info', duration: number = 5000): void {
    let config: ToastConfig;

    if (typeof configOrMessage === 'string') {
      config = {
        message: configOrMessage,
        type,
        duration,
        closable: true,
        autoClose: true
      };
    } else {
      config = {
        closable: true,
        autoClose: true,
        duration: 5000,
        type: 'info',
        ...configOrMessage
      };
    }

    this.createToast(config);
  }

  // Convenience methods
  success(message: string, title?: string, duration: number = 4000): void {
    this.show({
      message,
      title,
      type: 'success',
      duration
    });
  }

  error(message: string, title?: string, duration: number = 6000): void {
    this.show({
      message,
      title,
      type: 'error',
      duration
    });
  }

  info(message: string, title?: string, duration: number = 5000): void {
    this.show({
      message,
      title,
      type: 'info',
      duration
    });
  }

  warning(message: string, title?: string, duration: number = 5000): void {
    this.show({
      message,
      title,
      type: 'warning',
      duration
    });
  }

  // Clear all toasts
  clear(): void {
    this.toasts.forEach(toast => this.removeToast(toast));
  }

  // Clear toasts by type
  clearByType(type: ToastType): void {
    this.toasts
      .filter(toast => toast.instance.type === type)
      .forEach(toast => this.removeToast(toast));
  }

  private createContainer(): void {
    if (!this.container) {
      this.container = document.createElement('div');
      this.container.className = 'toast-container';
      this.container.style.cssText = `
        position: fixed !important;
        top: 20px !important;
        right: 20px !important;
        z-index: 10000 !important;
        display: flex !important;
        flex-direction: column !important;
        gap: 12px !important;
        pointer-events: none !important;
        max-height: calc(100vh - 40px) !important;
        overflow-y: auto !important;
        width: auto !important;
        max-width: 420px !important;
        box-sizing: border-box !important;
      `;

      // Add responsive styles for mobile
      const mediaQuery = window.matchMedia('(max-width: 480px)');
      const updateStyles = () => {
        if (mediaQuery.matches) {
          this.container!.style.cssText += `
            left: 16px !important;
            right: 16px !important;
            max-width: none !important;
            width: calc(100vw - 32px) !important;
          `;
        }
      };

      updateStyles();
      mediaQuery.addEventListener('change', updateStyles);

      document.body.appendChild(this.container);
    }
  }

  private createToast(config: ToastConfig): void {
    // Limit number of toasts
    if (this.toasts.length >= this.maxToasts) {
      this.removeToast(this.toasts[0]);
    }

    const toastRef = createComponent(ToastComponent, {
      environmentInjector: this.injector,
    });

    // Configure toast instance
    toastRef.instance.message = config.message;
    toastRef.instance.title = config.title;
    toastRef.instance.type = config.type || 'info';
    toastRef.instance.duration = config.duration || 5000;
    toastRef.instance.closable = config.closable !== false;
    toastRef.instance.autoClose = config.autoClose !== false;

    // Subscribe to close event
    toastRef.instance.close.subscribe(() => {
      this.removeToast(toastRef);
    });

    // Add to container
    if (this.container) {
      this.container.appendChild(toastRef.location.nativeElement);
    }
    this.appRef.attachView(toastRef.hostView);

    // Add to list
    this.toasts.push(toastRef);
  }

  private removeToast(toastRef: ComponentRef<ToastComponent>): void {
    const index = this.toasts.indexOf(toastRef);
    if (index >= 0) {
      this.toasts.splice(index, 1);
      this.appRef.detachView(toastRef.hostView);

      // Remove from DOM
      const element = toastRef.location.nativeElement;
      if (element && element.parentNode) {
        element.parentNode.removeChild(element);
      }

      toastRef.destroy();
    }
  }

  // Get current toast count
  get count(): number {
    return this.toasts.length;
  }

  // Check if any toasts are visible
  get hasToasts(): boolean {
    return this.toasts.length > 0;
  }
}
