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

  // Character Menu visibility
  isCharacterMenuOpen = signal<boolean>(false);

  constructor() {}

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
