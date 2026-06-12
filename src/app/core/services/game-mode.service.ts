import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class GameModeService {
  private modeSignal = signal<'game' | 'classic' | 'select'>('select');

  constructor() {
    this.initializeMode();
  }

  getModeSignal() {
    return this.modeSignal;
  }

  setMode(newMode: 'game' | 'classic') {
    this.modeSignal.set(newMode);
    localStorage.setItem('preferredMode', newMode);
  }

  clearMode() {
    this.modeSignal.set('select');
    localStorage.removeItem('preferredMode');
  }

  private initializeMode() {
    if (typeof window === 'undefined') {
      this.modeSignal.set('classic');
      return;
    }

    // 1. Check screen width < 360px
    const isMobileTooSmall = window.innerWidth < 360;

    // 2. Check prefers-reduced-motion
    const prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (isMobileTooSmall || prefersReducedMotion) {
      this.modeSignal.set('classic');
      return;
    }

    // 3. Check localStorage preferredMode
    const savedMode = localStorage.getItem('preferredMode');
    if (savedMode === 'game' || savedMode === 'classic') {
      this.modeSignal.set(savedMode);
    } else {
      this.modeSignal.set('select');
    }
  }
}
