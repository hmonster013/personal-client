import { Component, HostListener, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GameModeService } from '../../core/services/game-mode.service';

@Component({
  selector: 'app-mode-selection',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="mode-selection">
      <div class="mode-selection__box">
        <h1 class="mode-selection__title">DE013 QUEST</h1>
        
        <div class="mode-selection__options">
          <button 
            type="button"
            class="mode-selection__option" 
            [class.is-active]="activeIndex() === 0"
            (mouseenter)="setActiveIndex(0)"
            (click)="selectOption('game')">
            <span class="mode-selection__cursor" *ngIf="activeIndex() === 0">▸</span>
            <span class="mode-selection__cursor-placeholder" *ngIf="activeIndex() !== 0"></span>
            <div class="mode-selection__text">
              START GAME <span class="mode-selection__subtext">(chơi!)</span>
            </div>
          </button>

          <button 
            type="button"
            class="mode-selection__option" 
            [class.is-active]="activeIndex() === 1"
            (mouseenter)="setActiveIndex(1)"
            (click)="selectOption('classic')">
            <span class="mode-selection__cursor" *ngIf="activeIndex() === 1">▸</span>
            <span class="mode-selection__cursor-placeholder" *ngIf="activeIndex() !== 1"></span>
            <div class="mode-selection__text">
              STORY MODE <span class="mode-selection__subtext">(classic)</span>
            </div>
          </button>
        </div>

        <div class="mode-selection__footer">
          Sử dụng phím W/S hoặc phím mũi tên và Enter để lựa chọn
        </div>
      </div>
    </div>
  `,
  styles: [`
    .mode-selection {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: calc(100vh - 140px);
      background-color: var(--bg-night);
      color: var(--text-light);
      font-family: var(--font-pixel);
      padding: var(--spacing-xl);
      box-sizing: border-box;

      &__box {
        background-color: var(--bg-night);
        box-shadow: var(--pixel-border);
        padding: var(--spacing-3xl) var(--spacing-4xl);
        width: 100%;
        max-width: 480px;
        text-align: center;
        position: relative;
        border: none;
        box-sizing: border-box;
      }

      &__title {
        font-size: 2.5rem;
        color: var(--gold);
        margin-top: 0;
        margin-bottom: var(--spacing-3xl);
        text-shadow: 4px 4px 0px var(--ui-border);
        letter-spacing: 2px;
        animation: pulse 1.5s infinite steps(4);
      }

      &__options {
        display: flex;
        flex-direction: column;
        gap: var(--spacing-lg);
        align-items: center;
        justify-content: center;
        margin-bottom: var(--spacing-2xl);
      }

      &__option {
        display: flex;
        align-items: center;
        gap: var(--spacing-md);
        font-size: 1.5rem;
        cursor: pointer;
        background: none;
        border: none;
        color: var(--text-light);
        font-family: var(--font-pixel);
        width: 100%;
        justify-content: flex-start;
        padding: var(--spacing-sm) var(--spacing-lg);
        transition: color 0.15s steps(2);
        outline: none;
        box-sizing: border-box;

        &.is-active {
          color: var(--gold);
        }
      }

      &__cursor {
        width: 24px;
        height: 24px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        font-size: 1.5rem;
        color: var(--gold);
        animation: blink 0.6s infinite steps(2);
      }

      &__cursor-placeholder {
        width: 24px;
        height: 24px;
        display: inline-block;
      }

      &__text {
        text-align: left;
        flex: 1;
      }

      &__subtext {
        font-size: 1.1rem;
        color: var(--text-muted);
        font-family: var(--font-pixel-body);
      }

      &__footer {
        margin-top: var(--spacing-xl);
        font-family: var(--font-pixel-body);
        font-size: 1.2rem;
        color: var(--text-muted);
      }
    }

    @keyframes pulse {
      0%, 100% {
        transform: scale(1);
      }
      50% {
        transform: scale(1.03);
      }
    }

    @keyframes blink {
      0%, 100% {
        opacity: 1;
      }
      50% {
        opacity: 0;
      }
    }
  `]
})
export class ModeSelectionComponent {
  activeIndex = signal<number>(0);

  constructor(private gameModeService: GameModeService) {}

  setActiveIndex(index: number) {
    this.activeIndex.set(index);
  }

  selectOption(mode: 'game' | 'classic') {
    this.gameModeService.setMode(mode);
  }

  @HostListener('window:keydown', ['$event'])
  handleKeyDown(event: KeyboardEvent) {
    const key = event.key.toLowerCase();
    if (key === 'arrowup' || key === 'w') {
      event.preventDefault();
      this.activeIndex.set((this.activeIndex() - 1 + 2) % 2);
    } else if (key === 'arrowdown' || key === 's') {
      event.preventDefault();
      this.activeIndex.set((this.activeIndex() + 1) % 2);
    } else if (key === 'enter' || key === ' ') {
      event.preventDefault();
      const mode = this.activeIndex() === 0 ? 'game' : 'classic';
      this.selectOption(mode);
    }
  }
}
