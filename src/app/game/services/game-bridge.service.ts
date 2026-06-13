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
    
    const overlayMap: { [key: string]: string } = {
      'door_about': 'about',
      'door_projects': 'projects',
      'desk_projects': 'projects',
      'door_blog': 'blog',
      'board_quest': 'quest',
      'quest_board': 'quest',
      'mailbox_contact': 'contact'
    };

    if (overlayMap[name]) {
      this.gameStateService.activeOverlay.set(overlayMap[name]);
      this.gameStateService.addVisitedLocation(name);
    } else {
      this.gameStateService.openDialog(name);
    }
  }

  /**
   * Skip game entirely and go to classic mode
   */
  skipGame() {
    this.gameModeService.setMode('classic');
  }
}
