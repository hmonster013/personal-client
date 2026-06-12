import { Camera } from './camera';

export interface AnimationConfig {
  row: number; // Row index in the spritesheet
  frames: number[]; // Columns to cycle through, e.g. [0, 1, 2, 1]
  frameDuration?: number; // Duration of each frame in ms, default is 120ms
}

export class AnimatedSprite {
  private image: HTMLCanvasElement | HTMLImageElement;
  private frameWidth: number;
  private frameHeight: number;
  
  private animations: Map<string, AnimationConfig> = new Map();
  private currentAnimName = '';
  private currentFrameIdx = 0;
  private frameTimer = 0;
  private defaultFrameDuration = 120; // in milliseconds
  private isPlaying = true;

  constructor(
    image: HTMLCanvasElement | HTMLImageElement,
    frameWidth: number,
    frameHeight: number
  ) {
    this.image = image;
    this.frameWidth = frameWidth;
    this.frameHeight = frameHeight;
  }

  addAnimation(name: string, config: AnimationConfig) {
    this.animations.set(name, config);
  }

  play(animName: string) {
    if (this.currentAnimName === animName) return;

    if (this.animations.has(animName)) {
      this.currentAnimName = animName;
      this.currentFrameIdx = 0;
      this.frameTimer = 0;
      this.isPlaying = true;
    }
  }

  stop() {
    this.isPlaying = false;
    this.currentFrameIdx = 0; // Return to standing/idle frame (usually index 0/1)
  }

  update(dt: number) {
    if (!this.isPlaying || !this.currentAnimName) return;

    const config = this.animations.get(this.currentAnimName);
    if (!config) return;

    const duration = config.frameDuration || this.defaultFrameDuration;
    this.frameTimer += dt * 1000; // convert to ms

    if (this.frameTimer >= duration) {
      this.frameTimer -= duration;
      this.currentFrameIdx = (this.currentFrameIdx + 1) % config.frames.length;
    }
  }

  draw(ctx: CanvasRenderingContext2D, x: number, y: number, camera: Camera) {
    if (!this.currentAnimName) return;

    const config = this.animations.get(this.currentAnimName);
    if (!config) return;

    const colIndex = config.frames[this.currentFrameIdx];
    const rowIndex = config.row;

    // Source rect coordinates in the spritesheet
    const sx = colIndex * this.frameWidth;
    const sy = rowIndex * this.frameHeight;

    // Destination coordinates in screen space
    const dx = Math.floor(x - camera.x);
    const dy = Math.floor(y - camera.y);

    ctx.drawImage(
      this.image,
      sx, sy, this.frameWidth, this.frameHeight,
      dx, dy, this.frameWidth, this.frameHeight
    );
  }
}
