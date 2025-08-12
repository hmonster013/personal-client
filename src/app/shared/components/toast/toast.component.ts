import { CommonModule } from '@angular/common';
import { Component, Input, Output, EventEmitter, OnInit, OnDestroy } from '@angular/core';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

@Component({
  selector: 'app-toast',
  imports: [CommonModule],
  templateUrl: './toast.component.html',
  styleUrl: './toast.component.scss'
})
export class ToastComponent implements OnInit, OnDestroy {
  @Input() message: string = '';
  @Input() title?: string;
  @Input() type: ToastType = 'info';
  @Input() duration: number = 5000;
  @Input() closable: boolean = true;
  @Input() autoClose: boolean = true;

  @Output() close = new EventEmitter<void>();

  private autoCloseTimer?: number;
  isVisible = false;

  ngOnInit(): void {
    // Trigger slide-in animation
    setTimeout(() => {
      this.isVisible = true;
    }, 10);

    if (this.autoClose && this.duration > 0) {
      this.startAutoCloseTimer();
    }
  }

  ngOnDestroy(): void {
    this.clearAutoCloseTimer();
  }

  onClose(): void {
    this.isVisible = false;
    this.clearAutoCloseTimer();
    // Delay to allow animation to complete
    setTimeout(() => {
      this.close.emit();
    }, 300);
  }

  onMouseEnter(): void {
    this.clearAutoCloseTimer();
  }

  onMouseLeave(): void {
    if (this.autoClose && this.duration > 0) {
      this.startAutoCloseTimer();
    }
  }

  private startAutoCloseTimer(): void {
    this.clearAutoCloseTimer();
    this.autoCloseTimer = window.setTimeout(() => {
      this.onClose();
    }, this.duration);
  }

  private clearAutoCloseTimer(): void {
    if (this.autoCloseTimer) {
      clearTimeout(this.autoCloseTimer);
      this.autoCloseTimer = undefined;
    }
  }

  get iconClass(): string {
    switch (this.type) {
      case 'success': return 'fa-check-circle';
      case 'error': return 'fa-exclamation-circle';
      case 'warning': return 'fa-exclamation-triangle';
      case 'info':
      default: return 'fa-info-circle';
    }
  }

  get ariaRole(): string {
    return this.type === 'error' ? 'alert' : 'status';
  }

  get ariaLive(): string {
    return this.type === 'error' ? 'assertive' : 'polite';
  }
}
