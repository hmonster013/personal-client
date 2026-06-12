import { AnimatedSprite } from '../engine/sprite';
import { Camera } from '../engine/camera';
import { Tilemap } from '../engine/tilemap';
import { CollisionSystem } from '../engine/collision';

export class NPC {
  x = 0;
  y = 0;
  width = 16;
  height = 16;
  name: string;
  sprite: AnimatedSprite;
  
  // Patrol behavior (optional)
  isPatrolling = false;
  patrolRange = 32;
  startX = 0;
  startY = 0;
  direction: 1 | -1 = 1; // 1 = right, -1 = left
  speed = 20; // slow speed

  // Cat behaviors
  private moveDir = { x: 0, y: 0 };
  private changeDirTimer = 0;
  private nextChangeTime = 0;

  constructor(
    image: HTMLCanvasElement | HTMLImageElement,
    x: number,
    y: number,
    name: string,
    isPatrolling = false
  ) {
    this.x = x;
    this.y = y;
    this.startX = x;
    this.startY = y;
    this.name = name;
    this.isPatrolling = isPatrolling;

    this.sprite = new AnimatedSprite(image, 16, 16);
    this.sprite.addAnimation('walk_down', { row: 0, frames: [0, 1, 2, 1] });
    this.sprite.addAnimation('walk_up', { row: 1, frames: [0, 1, 2, 1] });
    this.sprite.addAnimation('walk_left', { row: 2, frames: [0, 1, 2, 1] });
    this.sprite.addAnimation('walk_right', { row: 3, frames: [0, 1, 2, 1] });

    this.sprite.play('walk_down');
    if (!isPatrolling && name !== 'Cat') {
      this.sprite.stop();
    }
  }

  update(dt: number, tilemap?: Tilemap) {
    if (this.name === 'Cat') {
      this.changeDirTimer += dt;
      if (this.changeDirTimer >= this.nextChangeTime) {
        this.changeDirTimer = 0;
        this.nextChangeTime = 2 + Math.random() * 2;
        const dirs = [
          { x: 1, y: 0 },
          { x: -1, y: 0 },
          { x: 0, y: 1 },
          { x: 0, y: -1 },
          { x: 0, y: 0 }
        ];
        this.moveDir = dirs[Math.floor(Math.random() * dirs.length)];
      }

      if (this.moveDir.x !== 0 || this.moveDir.y !== 0) {
        if (tilemap) {
          const nextPos = CollisionSystem.moveWithCollision(
            { x: this.x, y: this.y },
            this.moveDir.x * this.speed * dt,
            this.moveDir.y * this.speed * dt,
            { x: 2, y: 10 },
            { width: 12, height: 6 },
            tilemap
          );

          // Constrain within 5x5 tiles (~40px radius from start)
          const rangeX = 40;
          const rangeY = 40;
          if (Math.abs(nextPos.x - this.startX) <= rangeX && Math.abs(nextPos.y - this.startY) <= rangeY) {
            this.x = nextPos.x;
            this.y = nextPos.y;
          } else {
            // Face back towards start point
            this.moveDir.x = Math.sign(this.startX - this.x);
            this.moveDir.y = Math.sign(this.startY - this.y);
          }
        } else {
          this.x += this.moveDir.x * this.speed * dt;
          this.y += this.moveDir.y * this.speed * dt;
        }

        if (Math.abs(this.moveDir.y) >= Math.abs(this.moveDir.x)) {
          if (this.moveDir.y > 0) this.sprite.play('walk_down');
          else this.sprite.play('walk_up');
        } else {
          if (this.moveDir.x > 0) this.sprite.play('walk_right');
          else this.sprite.play('walk_left');
        }
      } else {
        this.sprite.stop();
      }
    } else if (this.isPatrolling) {
      this.x += this.direction * this.speed * dt;

      // Reverse direction if out of patrol range
      if (Math.abs(this.x - this.startX) >= this.patrolRange) {
        this.direction = -this.direction as (1 | -1);
        this.x = this.startX + this.direction * this.patrolRange;
      }

      if (this.direction === 1) {
        this.sprite.play('walk_right');
      } else {
        this.sprite.play('walk_left');
      }
    }

    this.sprite.update(dt);
  }

  draw(ctx: CanvasRenderingContext2D, camera: Camera) {
    this.sprite.draw(ctx, this.x, this.y, camera);

    // Floating yellow exclamation point '!' for Guide DE013
    const hasTalkedToGuide = typeof window !== 'undefined' && localStorage.getItem('talked_to_guide') === 'true';
    if (this.name === 'Guide DE013' && !hasTalkedToGuide) {
      const bobY = this.y - camera.y - 18 + Math.sin(Date.now() / 150) * 3;
      const bobX = this.x - camera.x + this.width / 2;
      ctx.save();
      ctx.font = 'bold 12px monospace';
      ctx.textAlign = 'center';
      ctx.strokeStyle = '#3E2731';
      ctx.lineWidth = 3;
      ctx.strokeText('!', bobX, bobY);
      ctx.fillStyle = '#FFD75E';
      ctx.fillText('!', bobX, bobY);
      ctx.restore();
    }

    // Draw a small name tag above the NPC (retro style)
    ctx.save();
    ctx.font = '8px monospace';
    ctx.textAlign = 'center';
    
    // Background for text
    const textWidth = ctx.measureText(this.name).width;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(
      Math.floor(this.x - camera.x + this.width / 2 - textWidth / 2 - 2),
      Math.floor(this.y - camera.y - 11),
      Math.floor(textWidth + 4),
      9
    );

    ctx.fillStyle = '#FFD75E'; // Gold color
    ctx.fillText(
      this.name,
      Math.floor(this.x - camera.x + this.width / 2),
      Math.floor(this.y - camera.y - 4)
    );
    ctx.restore();
  }
}
