import { Component, OnInit, HostListener, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GameModeService } from '../../core/services/game-mode.service';
import { ExperiencesService } from '../../core/services/experiences.service';
import { SkillsService } from '../../core/services/skills.service';
import { Skill } from '../../core/models';
import { JCode } from '../../shared/utils/JCode';

@Component({
  selector: 'app-game-placeholder',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="game-world">
      <!-- HUD -->
      <div class="game-world__hud rpg-hud">
        <div class="rpg-hud__avatar-frame">
          <img src="assets/img.png" alt="Avatar DE013" class="pixelated" (click)="toggleCharacterMenu()" style="cursor: pointer;" onerror="this.src='https://placehold.co/48x48/29366f/ffd75e?text=DE'"/>
        </div>
        <div class="rpg-hud__info">
          <div class="rpg-hud__name">DE013</div>
          <div class="rpg-hud__level">LV.{{ yearsOfExperience() }} (Developer)</div>
        </div>
      </div>

      <!-- Hint Control & Skip -->
      <div class="game-world__controls">
        <div class="game-world__hints">
          <span class="rpg-badge">WASD / 🡡🡢🡣🡠 Di chuyển</span>
          <span class="rpg-badge" style="cursor: pointer;" (click)="toggleCharacterMenu()">C / Click Avatar: Menu nhân vật</span>
        </div>
        <button type="button" class="rpg-btn rpg-btn--danger" (click)="skipGame()">
          ⏭ Skip game
        </button>
      </div>

      <!-- Character Menu / Stats Overlay -->
      <div class="game-world__menu-overlay" *ngIf="showMenu()" (click)="toggleCharacterMenu()">
        <div class="rpg-panel game-world__menu" (click)="$event.stopPropagation()">
          <div class="rpg-panel__header">
            <h3>🛡️ THÔNG TIN NHÂN VẬT (STATS)</h3>
            <button type="button" class="game-world__close-btn" (click)="toggleCharacterMenu()">✕</button>
          </div>
          <div class="rpg-panel__body">
            <div class="character-stats">
              <div class="character-stats__item">
                <span class="stats-label">Nghề nghiệp:</span>
                <span class="stats-value">Fullstack Developer</span>
              </div>
              <div class="character-stats__item">
                <span class="stats-label">Cấp độ (Kinh nghiệm):</span>
                <span class="stats-value">LV.{{ yearsOfExperience() }} ({{ yearsOfExperience() }} năm thực chiến)</span>
              </div>
            </div>

            <h4 style="font-family: var(--font-pixel); margin-top: var(--spacing-lg); color: var(--gold); border-bottom: 2px double var(--ui-border); padding-bottom: 4px;">🎯 KỸ NĂNG (XP BARS)</h4>
            <div class="skills-xp">
              <div class="skill-xp-item" *ngFor="let skill of skills()">
                <div class="skill-xp-name">{{ skill.name }}</div>
                <div class="rpg-progress">
                  <div class="rpg-progress__bar">
                    <div class="rpg-progress__fill" [style.width.%]="getSkillPercentage(skill)"></div>
                  </div>
                  <span class="rpg-progress__label">LV.{{ getSkillLevel(skill) }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Game Scene (Visual mockup) -->
      <div class="game-scene">
        <div class="pixel-grid"></div>
        <div class="game-scene__house">🏠</div>
        <div class="game-scene__sign">🪧</div>
        <div class="game-scene__character animate-bounce">
          <img src="assets/img.png" alt="DE013 Hero" class="pixelated" onerror="this.style.display='none'"/>
          <span class="hero-label">DE013</span>
        </div>
        <div class="game-scene__info">BẢN ĐỒ LÀNG GAME 2D CANVAS ĐANG ĐƯỢC XÂY DỰNG</div>
      </div>

      <!-- RPG Dialog Box at bottom -->
      <div class="rpg-dialog">
        <div class="rpg-dialog__speaker">NPC DE013</div>
        <p class="rpg-dialog__content">
          Chào mừng tráng sĩ! Bạn đã bước vào Pixel Village. Bản đồ 2D canvas đang được mài giũa ở các milestone tiếp theo. 
          Hãy nhấn nút <strong>"⏭ Skip game"</strong> (hoặc phím ESC) để khám phá classic mode ngay lập tức!
        </p>
        <span class="rpg-dialog__arrow">▼</span>
      </div>
    </div>
  `,
  styles: [`
    .game-world {
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      height: calc(100vh - 140px);
      background-color: #38b764; // Grass color
      background-image: radial-gradient(#2c9e52 20%, transparent 20%),
                        radial-gradient(#2c9e52 20%, transparent 20%);
      background-size: 16px 16px;
      background-position: 0 0, 8px 8px;
      padding: var(--spacing-xl);
      box-sizing: border-box;
      position: relative;
      overflow: hidden;

      &__hud {
        position: absolute;
        top: var(--spacing-lg);
        left: var(--spacing-lg);
        z-index: 10;
      }

      &__controls {
        position: absolute;
        top: var(--spacing-lg);
        right: var(--spacing-lg);
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        gap: var(--spacing-sm);
        z-index: 10;
      }

      &__hints {
        display: flex;
        flex-direction: column;
        gap: var(--spacing-xs);
        align-items: flex-end;
      }

      &__menu-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background-color: rgba(0, 0, 0, 0.75);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 100;
        padding: var(--spacing-xl);
      }

      &__menu {
        width: 100%;
        max-width: 500px;
        position: relative;
        box-sizing: border-box;
      }

      &__close-btn {
        background-color: var(--berry);
        color: var(--text-light);
        border: 2px solid var(--ui-border-dark);
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-family: var(--font-pixel);
        font-weight: bold;
        cursor: pointer;
        position: absolute;
        top: 12px;
        right: 12px;
        box-shadow: 2px 2px 0 var(--ui-border-dark);

        &:hover {
          transform: translateY(-1px);
          box-shadow: 2px 2px 0 var(--ui-border-dark), 1px 1px 0 var(--ui-border-dark);
        }
      }
    }

    .character-stats {
      font-family: var(--font-pixel-body);
      font-size: 1.3rem;
      color: var(--text-ink);
      display: flex;
      flex-direction: column;
      gap: var(--spacing-xs);

      &__item {
        display: flex;
        justify-content: space-between;
        border-bottom: 1px dashed var(--ui-border);
        padding-bottom: 4px;
      }

      .stats-label {
        font-weight: bold;
      }

      .stats-value {
        color: var(--ui-border-dark);
      }
    }

    [data-theme="dark"] .character-stats {
      color: var(--text-light);
      .stats-value {
        color: var(--gold);
      }
    }

    .skills-xp {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-md);
      max-height: 250px;
      overflow-y: auto;
      padding-right: var(--spacing-xs);
    }

    .skill-xp-item {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-xs);
    }

    .skill-xp-name {
      font-family: var(--font-pixel);
      font-size: 0.875rem;
      font-weight: 600;
    }

    .game-scene {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;

      &__house {
        font-size: 5rem;
        position: absolute;
        top: 25%;
        left: 20%;
        text-shadow: 4px 4px 0 rgba(0,0,0,0.15);
      }

      &__sign {
        font-size: 3rem;
        position: absolute;
        bottom: 30%;
        right: 25%;
        text-shadow: 3px 3px 0 rgba(0,0,0,0.15);
      }

      &__character {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: var(--spacing-xs);
        z-index: 5;
        
        img {
          width: 64px;
          height: 64px;
          border-radius: 50%;
          border: 3px solid var(--gold);
          box-shadow: 4px 4px 0 rgba(0,0,0,0.2);
          background-color: var(--bg-dusk);
        }

        .hero-label {
          background-color: rgba(26, 28, 44, 0.85);
          color: var(--gold);
          font-family: var(--font-pixel);
          font-size: 0.75rem;
          font-weight: bold;
          padding: 2px 6px;
          border: 1px solid var(--gold);
          white-space: nowrap;
        }
      }

      &__info {
        position: absolute;
        bottom: 12%;
        font-family: var(--font-pixel);
        font-size: 1.15rem;
        color: var(--text-light);
        background-color: rgba(0, 0, 0, 0.5);
        padding: 6px 12px;
        letter-spacing: 1px;
        text-transform: uppercase;
      }
    }

    .rpg-dialog {
      margin-top: auto;
      z-index: 10;
    }

    @media (max-width: 640px) {
      .game-world {
        padding: var(--spacing-sm);
        height: calc(100vh - 120px);

        &__controls {
          top: auto;
          bottom: calc(var(--spacing-xl) + 90px);
          right: var(--spacing-sm);
          align-items: center;
          width: calc(100% - var(--spacing-md));
        }

        &__hints {
          display: none;
        }

        &__hud {
          left: var(--spacing-sm);
          top: var(--spacing-sm);
        }

        .game-scene {
          &__house { font-size: 3.5rem; top: 15%; left: 10%; }
          &__sign { font-size: 2rem; bottom: 25%; right: 10%; }
        }

        .rpg-dialog {
          font-size: 1.15rem;
          padding: var(--spacing-md);
        }
      }
    }
  `]
})
export class GamePlaceholderComponent implements OnInit {
  skills = signal<Skill[]>([]);
  yearsOfExperience = signal<number>(4);
  showMenu = signal<boolean>(false);

  constructor(
    private gameModeService: GameModeService,
    private skillsService: SkillsService,
    private experiencesService: ExperiencesService
  ) {}

  ngOnInit() {
    this.loadSkills();
    this.calculateYearsOfExperience();
  }

  loadSkills() {
    this.skillsService.list({ noPagination: true }).subscribe({
      next: (res: any) => {
        if (res.status === JCode.SUCCESS) {
          this.skills.set(res.data?.data_list || []);
        }
      }
    });
  }

  calculateYearsOfExperience() {
    this.experiencesService.list({ page: 1, size: 100 }).subscribe({
      next: (res: any) => {
        if (res.status === JCode.SUCCESS) {
          const list = res.data?.data_list || [];
          if (list.length > 0) {
            // Find earliest experience join date and calculate years
            let earliestDate: Date | null = null;
            list.forEach((exp: any) => {
              if (exp.joinDate) {
                const d = new Date(exp.joinDate);
                if (!earliestDate || d < earliestDate) {
                  earliestDate = d;
                }
              }
            });
            if (earliestDate) {
              const diffMs = Date.now() - (earliestDate as Date).getTime();
              const diffYears = Math.floor(diffMs / (1000 * 60 * 60 * 24 * 365.25));
              this.yearsOfExperience.set(diffYears > 0 ? diffYears : 1);
            }
          }
        }
      }
    });
  }

  getSkillPercentage(skill: Skill): number {
    const val = 60 + ((skill.name.length * 7) % 36);
    return val;
  }

  getSkillLevel(skill: Skill): number {
    const percent = this.getSkillPercentage(skill);
    return Math.max(1, Math.min(10, Math.floor(percent / 10)));
  }

  skipGame() {
    this.gameModeService.setMode('classic');
  }

  toggleCharacterMenu() {
    this.showMenu.set(!this.showMenu());
  }

  @HostListener('window:keydown', ['$event'])
  handleKeyDown(event: KeyboardEvent) {
    const key = event.key.toLowerCase();
    if (key === 'escape') {
      event.preventDefault();
      this.skipGame();
    } else if (key === 'c') {
      event.preventDefault();
      this.toggleCharacterMenu();
    }
  }
}
