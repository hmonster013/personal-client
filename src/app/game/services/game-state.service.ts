import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class GameStateService {
  // Coordinates of the player in the map
  playerPosition = signal<{ x: number; y: number }>({ x: 100, y: 100 });

  // Current active map
  currentMap = signal<string>('village');

  // Is a dialog currently open?
  isDialogOpen = signal<boolean>(false);

  // Active NPC or interaction point name
  activeInteraction = signal<string | null>(null);

  // Active overlay name: 'about' | 'projects' | 'blog' | 'quest' | 'contact' | 'char_menu' | null
  activeOverlay = signal<string | null>(null);

  // Visited locations list for exploration tracking
  visitedFlags = signal<string[]>([]);

  // Character Menu visibility
  isCharacterMenuOpen = signal<boolean>(false);

  // Selected player model
  selectedPlayerModel = signal<string>('assets/game3d/models/chars/character-male-a.glb');

  constructor() {
    this.loadVisitedFlags();
    this.loadSelectedModel();
  }

  private loadSelectedModel() {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('selected_player_model');
      if (stored) {
        this.selectedPlayerModel.set(stored);
      }
    }
  }

  setPlayerModel(path: string) {
    this.selectedPlayerModel.set(path);
    if (typeof window !== 'undefined') {
      localStorage.setItem('selected_player_model', path);
    }
  }

  private loadVisitedFlags() {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('visited_locations');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            this.visitedFlags.set(parsed);
          }
        }
      } catch (e) {
        console.error('Failed to load visited flags', e);
      }
    }
  }

  addVisitedLocation(loc: string) {
    const list = this.visitedFlags();
    if (!list.includes(loc)) {
      const updated = [...list, loc];
      this.visitedFlags.set(updated);
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('visited_locations', JSON.stringify(updated));
        } catch (e) {
          console.error('Failed to save visited flags', e);
        }
      }
    }
  }

  setPlayerPosition(x: number, y: number) {
    this.playerPosition.set({ x, y });
  }

  setCurrentMap(map: string) {
    this.currentMap.set(map);
  }

  openDialog(interactionName: string) {
    this.activeInteraction.set(interactionName);
    this.isDialogOpen.set(true);
  }

  closeDialog() {
    this.activeInteraction.set(null);
    this.isDialogOpen.set(false);
  }

  toggleCharacterMenu() {
    this.isCharacterMenuOpen.set(!this.isCharacterMenuOpen());
  }

  setCharacterMenuOpen(open: boolean) {
    this.isCharacterMenuOpen.set(open);
  }
}
