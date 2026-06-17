import { Tilemap } from './tilemap';
import { GameStateService } from '../services/game-state.service';
import { GameBridgeService } from '../services/game-bridge.service';

export interface InteractionObject {
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export class InteractionSystem {
  private currentOverlap: InteractionObject | null = null;
  private range = 12; // Activation range in pixels

  constructor(
    private gameStateService: GameStateService,
    private gameBridgeService: GameBridgeService
  ) {}

  getCurrentOverlap(): InteractionObject | null {
    return this.currentOverlap;
  }

  /**
   * Check if player's hitbox (expanded by range) overlaps with any interaction area
   */
  checkOverlaps(
    playerPos: { x: number; y: number },
    hitboxOffset: { x: number; y: number },
    hitboxSize: { width: number; height: number },
    tilemap: Tilemap
  ): InteractionObject | null {
    const sensor = {
      x: playerPos.x + hitboxOffset.x - this.range,
      y: playerPos.y + hitboxOffset.y - this.range,
      width: hitboxSize.width + this.range * 2,
      height: hitboxSize.height + this.range * 2
    };

    let closestObject: InteractionObject | null = null;
    let minDistance = Infinity;

    for (const obj of tilemap.interactions) {
      // Check AABB overlap between sensor and interaction object
      const overlaps = 
        sensor.x < obj.x + obj.width &&
        sensor.x + sensor.width > obj.x &&
        sensor.y < obj.y + obj.height &&
        sensor.y + sensor.height > obj.y;

      if (overlaps) {
        // Calculate distance from player center to object center to find the closest one
        const playerCenterX = playerPos.x + hitboxOffset.x + hitboxSize.width / 2;
        const playerCenterY = playerPos.y + hitboxOffset.y + hitboxSize.height / 2;
        const objCenterX = obj.x + obj.width / 2;
        const objCenterY = obj.y + obj.height / 2;

        const dist = Math.hypot(playerCenterX - objCenterX, playerCenterY - objCenterY);
        if (dist < minDistance) {
          minDistance = dist;
          closestObject = obj;
        }
      }
    }

    this.currentOverlap = closestObject;

    // Update game state service so Angular UI overlay can show prompt
    if (closestObject) {
      this.gameStateService.activeInteraction.set(closestObject.name);
    } else {
      this.gameStateService.activeInteraction.set(null);
    }

    return closestObject;
  }

  /**
   * Trigger interaction if there is an active overlap
   */
  handleInteractionKey() {
    if (this.currentOverlap && !this.gameStateService.isDialogOpen()) {
      this.gameBridgeService.triggerInteraction(this.currentOverlap.name);
      return true;
    }
    return false;
  }
}
