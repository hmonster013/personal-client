import { Injectable, signal, Signal } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class InputService {
  // Signal of current directional input
  private directionSignal = signal<{ x: -1 | 0 | 1; y: -1 | 0 | 1 }>({ x: 0, y: 0 });
  readonly direction = this.directionSignal.asReadonly();

  // Interaction stream
  private interactSource = new Subject<void>();
  readonly interact$ = this.interactSource.asObservable();

  // Menu key stream
  private menuSource = new Subject<void>();
  readonly menu$ = this.menuSource.asObservable();

  // Escape key stream
  private escapeSource = new Subject<void>();
  readonly escape$ = this.escapeSource.asObservable();

  // Internal keyboard tracking
  private activeKeys = new Set<string>();
  private isListening = false;
  private isGameFocused = false;

  constructor() {}

  /**
   * Start listening to keyboard inputs
   */
  startListening() {
    if (this.isListening) return;
    
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    this.isListening = true;
    this.isGameFocused = true;
  }

  /**
   * Stop listening to keyboard inputs
   */
  stopListening() {
    if (!this.isListening) return;
    
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    this.isListening = false;
    this.isGameFocused = false;
    this.activeKeys.clear();
    this.updateDirection();
  }

  setGameFocus(focused: boolean) {
    this.isGameFocused = focused;
    if (!focused) {
      this.activeKeys.clear();
      this.updateDirection();
    }
  }

  /**
   * Set direction manually (for mobile D-pad)
   */
  setMobileDirection(x: -1 | 0 | 1, y: -1 | 0 | 1) {
    this.directionSignal.set({ x, y });
  }

  /**
   * Trigger interaction manually (for mobile action button)
   */
  triggerInteraction() {
    this.interactSource.next();
  }

  private handleKeyDown = (e: KeyboardEvent) => {
    if (!this.isGameFocused) return;

    const key = e.key.toLowerCase();

    // Prevent default scrolling behaviour only when in game focus for arrow keys / space
    // (so sánh bằng `key` đã lowercase — e.key gốc là 'ArrowUp' nên sẽ không bao giờ match list này)
    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' ', 'spacebar'].includes(key)) {
      e.preventDefault();
    }

    if (key === 'arrowup' || key === 'w') {
      this.activeKeys.add('up');
    } else if (key === 'arrowdown' || key === 's') {
      this.activeKeys.add('down');
    } else if (key === 'arrowleft' || key === 'a') {
      this.activeKeys.add('left');
    } else if (key === 'arrowright' || key === 'd') {
      this.activeKeys.add('right');
    } else if (key === 'e' || e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      this.interactSource.next();
    } else if (key === 'c') {
      e.preventDefault();
      this.menuSource.next();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      this.escapeSource.next();
    }

    this.updateDirection();
  };

  private handleKeyUp = (e: KeyboardEvent) => {
    const key = e.key.toLowerCase();

    if (key === 'arrowup' || key === 'w') {
      this.activeKeys.delete('up');
    } else if (key === 'arrowdown' || key === 's') {
      this.activeKeys.delete('down');
    } else if (key === 'arrowleft' || key === 'a') {
      this.activeKeys.delete('left');
    } else if (key === 'arrowright' || key === 'd') {
      this.activeKeys.delete('right');
    }

    this.updateDirection();
  };

  private updateDirection() {
    let x: -1 | 0 | 1 = 0;
    let y: -1 | 0 | 1 = 0;

    if (this.activeKeys.has('left')) x = -1;
    if (this.activeKeys.has('right')) x = 1;
    if (this.activeKeys.has('up')) y = -1;
    if (this.activeKeys.has('down')) y = 1;

    // Resolve conflicts if both are held (e.g. left and right cancel out)
    if (this.activeKeys.has('left') && this.activeKeys.has('right')) x = 0;
    if (this.activeKeys.has('up') && this.activeKeys.has('down')) y = 0;

    this.directionSignal.set({ x, y });
  }
}
