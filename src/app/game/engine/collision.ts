import { Tilemap } from './tilemap';

export interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

export class CollisionSystem {
  /**
   * Check if a bounding box collides with any solid tile in the tilemap
   */
  static checkTilemapCollision(box: Box, tilemap: Tilemap): boolean {
    // Check four corners of the box, and also some mid-points to ensure no leaks
    const left = box.x;
    const right = box.x + box.width - 0.1; // small offset to avoid edge overlap glitches
    const top = box.y;
    const bottom = box.y + box.height - 0.1;

    // Check corners
    if (tilemap.hasCollisionTileAt(left, top)) return true;
    if (tilemap.hasCollisionTileAt(right, top)) return true;
    if (tilemap.hasCollisionTileAt(left, bottom)) return true;
    if (tilemap.hasCollisionTileAt(right, bottom)) return true;

    // Check midpoints for larger entities
    const midX = box.x + box.width / 2;
    const midY = box.y + box.height / 2;

    if (tilemap.hasCollisionTileAt(midX, top)) return true;
    if (tilemap.hasCollisionTileAt(midX, bottom)) return true;
    if (tilemap.hasCollisionTileAt(left, midY)) return true;
    if (tilemap.hasCollisionTileAt(right, midY)) return true;

    return false;
  }

  /**
   * Move an entity box with wall-sliding collision resolution
   * Updates coordinates in-place
   */
  static moveWithCollision(
    pos: { x: number; y: number },
    dx: number,
    dy: number,
    hitboxOffset: { x: number; y: number },
    hitboxSize: { width: number; height: number },
    tilemap: Tilemap
  ): { x: number; y: number } {
    // 1. Try X movement independently
    const nextX = pos.x + dx;
    const boxX: Box = {
      x: nextX + hitboxOffset.x,
      y: pos.y + hitboxOffset.y,
      width: hitboxSize.width,
      height: hitboxSize.height
    };

    let resolvedX = pos.x;
    if (!this.checkTilemapCollision(boxX, tilemap)) {
      resolvedX = nextX;
    }

    // 2. Try Y movement independently
    const nextY = pos.y + dy;
    const boxY: Box = {
      x: resolvedX + hitboxOffset.x,
      y: nextY + hitboxOffset.y,
      width: hitboxSize.width,
      height: hitboxSize.height
    };

    let resolvedY = pos.y;
    if (!this.checkTilemapCollision(boxY, tilemap)) {
      resolvedY = nextY;
    }

    return { x: resolvedX, y: resolvedY };
  }
}
