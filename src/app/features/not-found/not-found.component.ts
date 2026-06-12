import { Component } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

@Component({
  selector: 'app-not-found',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="not-found">
      <div class="not-found__box rpg-panel" style="--rpg-panel-bg: var(--bg-night); --rpg-panel-color: var(--text-light); text-align: center; max-width: 500px;">
        <div class="not-found__sign animate-bounce">⚠️</div>
        <h1 class="not-found__title">404 - KHU VỰC CHƯA MỞ KHÓA</h1>
        <p class="not-found__text">
          Tráng sĩ ơi! Bản đồ chưa mở rộng tới vùng đất hoang sơ này. 
          Có vẻ như bạn đã đi lạc quá xa ngoài ranh giới ngôi làng.
        </p>
        <div class="not-found__character">❓🧭🧙‍♂️</div>
        <button type="button" class="rpg-btn" routerLink="/">
          Về làng
        </button>
      </div>
    </div>
  `,
  styles: [`
    .not-found {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: calc(100vh - 140px);
      background-color: var(--bg-night);
      padding: var(--spacing-xl);
      box-sizing: border-box;

      &__sign {
        font-size: 5rem;
        margin-bottom: var(--spacing-md);
        display: inline-block;
        animation: bounce 1.2s infinite steps(2);
      }

      &__title {
        font-family: var(--font-pixel);
        font-size: 1.8rem;
        color: var(--gold);
        text-shadow: 2px 2px 0 var(--ui-border-dark);
        margin-top: 0;
        margin-bottom: var(--spacing-lg);
        letter-spacing: 1px;
      }

      &__text {
        font-family: var(--font-pixel-body);
        font-size: 1.35rem;
        line-height: 1.4;
        color: var(--text-light);
        margin-bottom: var(--spacing-xl);
      }

      &__character {
        font-size: 3rem;
        margin-bottom: var(--spacing-xl);
        letter-spacing: var(--spacing-sm);
      }
    }

    @keyframes bounce {
      0%, 100% {
        transform: translateY(0);
      }
      50% {
        transform: translateY(-8px);
      }
    }
  `]
})
export class NotFoundComponent {
  constructor(private router: Router) {}
}
