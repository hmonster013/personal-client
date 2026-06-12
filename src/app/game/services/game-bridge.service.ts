import { Injectable, inject } from '@angular/core';
import { Subject } from 'rxjs';
import { GameStateService } from './game-state.service';
import { GameModeService } from '../../core/services/game-mode.service';

@Injectable({
  providedIn: 'root'
})
export class GameBridgeService {
  private gameStateService = inject(GameStateService);
  private gameModeService = inject(GameModeService);

  // Subject to notify when an interaction is triggered (by pressing E)
  private interactionTriggeredSource = new Subject<string>();
  interactionTriggered$ = this.interactionTriggeredSource.asObservable();

  constructor() {}

  /**
   * Called by the game engine when the player stands next to an interactive object and presses E / Space
   */
  triggerInteraction(name: string) {
    this.interactionTriggeredSource.next(name);
    this.gameStateService.openDialog(name);
  }

  /**
   * Skip game entirely and go to classic mode
   */
  skipGame() {
    this.gameModeService.setMode('classic');
  }
}
