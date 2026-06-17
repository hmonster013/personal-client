import { ColliderSpec } from '../world/world-spec';

export interface BoundingBox3D {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export class CollisionSystem3D {
  /**
   * Check if a 3D bounding box overlaps with any 3D colliders from world-spec (projected on XZ plane)
   */
  static checkCollision(box: BoundingBox3D, colliders: ColliderSpec[]): boolean {
    for (const col of colliders) {
      if (
        box.minX < col.maxX &&
        box.maxX > col.minX &&
        box.minZ < col.maxZ &&
        box.maxZ > col.minZ
      ) {
        return true;
      }
    }
    return false;
  }

  /**
   * Move on XZ plane with sliding collision resolution against world colliders
   */
  static moveWithCollision(
    pos: { x: number; z: number },
    dx: number,
    dz: number,
    hitboxSize: { width: number; depth: number },
    colliders: ColliderSpec[]
  ): { x: number; z: number } {
    const hw = hitboxSize.width / 2;
    const hd = hitboxSize.depth / 2;

    // 1. Try X movement independently
    const nextX = pos.x + dx;
    const boxX: BoundingBox3D = {
      minX: nextX - hw,
      maxX: nextX + hw,
      minZ: pos.z - hd,
      maxZ: pos.z + hd
    };

    let resolvedX = pos.x;
    if (!this.checkCollision(boxX, colliders)) {
      resolvedX = nextX;
    }

    // 2. Try Z movement independently
    const nextZ = pos.z + dz;
    const boxZ: BoundingBox3D = {
      minX: resolvedX - hw,
      maxX: resolvedX + hw,
      minZ: nextZ - hd,
      maxZ: nextZ + hd
    };

    let resolvedZ = pos.z;
    if (!this.checkCollision(boxZ, colliders)) {
      resolvedZ = nextZ;
    }

    return { x: resolvedX, z: resolvedZ };
  }
}
