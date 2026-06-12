import { NgZone } from '@angular/core';

export class GameLoop {
  private rafId: number | null = null;
  private lastTime = 0;
  private accumulatedTime = 0;
  private readonly timestep = 1000 / 60; // Fixed timestep: 16.67ms (60 updates per second)
  private isRunning = false;
  private isPaused = false;

  constructor(
    private ngZone: NgZone,
    private updateFn: (dt: number) => void,
    private renderFn: (interpolation: number) => void
  ) {
    this.handleVisibilityChange = this.handleVisibilityChange.bind(this);
  }

  start() {
    if (this.isRunning) return;

    this.isRunning = true;
    this.isPaused = false;
    this.lastTime = performance.now();
    this.accumulatedTime = 0;

    // Register visibility change listener
    document.addEventListener('visibilitychange', this.handleVisibilityChange);

    // Run requestAnimationFrame completely outside of Angular's zone to prevent change detection cycles
    this.ngZone.runOutsideAngular(() => {
      this.rafId = requestAnimationFrame(this.loop);
    });
  }

  stop() {
    this.isRunning = false;
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
  }

  pause() {
    this.isPaused = true;
  }

  resume() {
    if (!this.isPaused) return;
    this.isPaused = false;
    this.lastTime = performance.now();
  }

  togglePause() {
    if (this.isPaused) {
      this.resume();
    } else {
      this.pause();
    }
  }

  getPausedState(): boolean {
    return this.isPaused;
  }

  private loop = (currentTime: number) => {
    if (!this.isRunning) return;

    // Queue next frame first
    this.rafId = requestAnimationFrame(this.loop);

    if (this.isPaused) {
      // Just update last time so when we resume we don't have a giant delta
      this.lastTime = currentTime;
      return;
    }

    // Calculate delta time in ms
    let deltaTime = currentTime - this.lastTime;
    this.lastTime = currentTime;

    // Avoid spiral of death/extreme jumps (e.g. if tab was suspended/lagged)
    if (deltaTime > 250) {
      deltaTime = 250;
    }

    this.accumulatedTime += deltaTime;

    // Run fixed updates
    while (this.accumulatedTime >= this.timestep) {
      this.updateFn(this.timestep / 1000); // Pass dt in seconds
      this.accumulatedTime -= this.timestep;
    }

    // Render with interpolation for extra smoothness
    const interpolation = this.accumulatedTime / this.timestep;
    this.renderFn(interpolation);
  };

  private handleVisibilityChange() {
    if (document.hidden) {
      this.pause();
    } else {
      this.resume();
    }
  }
}
