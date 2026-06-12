import { AnimatedSprite } from '../engine/sprite';
import { Camera } from '../engine/camera';
import { Tilemap } from '../engine/tilemap';
import { CollisionSystem } from '../engine/collision';

export class Player {
  x = 100; // World coordinates in pixels
  y = 100;
  width = 16;
  height = 16;
  speed = 80; // px per second

  // Bounding box for collisions (half-bottom of player sprite, i.e. feet)
  hitboxOffset = { x: 2, y: 10 };
  hitboxSize = { width: 12, height: 6 };

  // Sprite engine
  sprite: AnimatedSprite;
  
  // Tracking state
  isMoving = false;
  facingDirection: 'down' | 'up' | 'left' | 'right' = 'down';

  constructor(image: HTMLCanvasElement | HTMLImageElement, startX = 100, startY = 100) {
    this.x = startX;
    this.y = startY;

    // Sprite is 16x16
    this.sprite = new AnimatedSprite(image, 16, 16);

    // Setup standard RPG movement rows (down, up, left, right)
    this.sprite.addAnimation('walk_down', { row: 0, frames: [0, 1, 2, 1] });
    this.sprite.addAnimation('walk_up', { row: 1, frames: [0, 1, 2, 1] });
    this.sprite.addAnimation('walk_left', { row: 2, frames: [0, 1, 2, 1] });
    this.sprite.addAnimation('walk_right', { row: 3, frames: [0, 1, 2, 1] });

    this.sprite.play('walk_down');
    this.sprite.stop(); // start as standing idle
  }

  update(dt: number, moveDir: { x: number; y: number }, tilemap: Tilemap) {
    let dx = moveDir.x;
    let dy = moveDir.y;

    this.isMoving = dx !== 0 || dy !== 0;

    if (this.isMoving) {
      // Normalize vector for diagonal movement
      if (dx !== 0 && dy !== 0) {
        const length = Math.hypot(dx, dy);
        dx /= length;
        dy /= length;
      }

      // Convert movement dir to pixels to move in this frame
      const stepX = dx * this.speed * dt;
      const stepY = dy * this.speed * dt;

      // Update position with collision resolution (allows wall sliding)
      const nextPos = CollisionSystem.moveWithCollision(
        { x: this.x, y: this.y },
        stepX,
        stepY,
        this.hitboxOffset,
        this.hitboxSize,
        tilemap
      );

      this.x = nextPos.x;
      this.y = nextPos.y;

      // Update facing direction and animation based on velocity
      // Prioritize vertical animations for a classic Zelda feel
      if (Math.abs(dy) >= Math.abs(dx)) {
        if (dy > 0) {
          this.facingDirection = 'down';
          this.sprite.play('walk_down');
        } else {
          this.facingDirection = 'up';
          this.sprite.play('walk_up');
        }
      } else {
        if (dx > 0) {
          this.facingDirection = 'right';
          this.sprite.play('walk_right');
        } else {
          this.facingDirection = 'left';
          this.sprite.play('walk_left');
        }
      }
    } else {
      // Idle state
      this.sprite.stop();
      // Ensure we face the correct idle row
      if (this.facingDirection === 'down') this.sprite.play('walk_down');
      else if (this.facingDirection === 'up') this.sprite.play('walk_up');
      else if (this.facingDirection === 'left') this.sprite.play('walk_left');
      else if (this.facingDirection === 'right') this.sprite.play('walk_right');
    }

    this.sprite.update(dt);
  }

  draw(ctx: CanvasRenderingContext2D, camera: Camera) {
    this.sprite.draw(ctx, this.x, this.y, camera);
  }
}
