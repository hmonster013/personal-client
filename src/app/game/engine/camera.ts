export class Camera {
  x = 0; // Top-left X coordinate in world pixels
  y = 0; // Top-left Y coordinate in world pixels
  width = 320; // Viewport width in game pixels
  height = 240; // Viewport height in game pixels
  mapWidth = 0; // Map width in world pixels
  mapHeight = 0; // Map height in world pixels
  zoom = 3; // Game scale factor
  lerpSpeed = 0.1; // Smooth follow speed

  constructor(width: number, height: number, zoom: number) {
    this.width = width;
    this.height = height;
    this.zoom = zoom;
  }

  setViewportSize(width: number, height: number, zoom: number) {
    this.width = width;
    this.height = height;
    this.zoom = zoom;
  }

  setMapSize(width: number, height: number) {
    this.mapWidth = width;
    this.mapHeight = height;
  }

  /**
   * Instantly snap camera to target
   */
  snapTo(targetX: number, targetY: number) {
    let desiredX = targetX - this.width / 2;
    let desiredY = targetY - this.height / 2;

    this.x = this.clamp(desiredX, 0, this.mapWidth - this.width);
    this.y = this.clamp(desiredY, 0, this.mapHeight - this.height);
  }

  /**
   * Smoothly follow player
   */
  update(targetX: number, targetY: number) {
    // Desired camera position (centered on player)
    let desiredX = targetX - this.width / 2;
    let desiredY = targetY - this.height / 2;

    // Smoothly interpolate (lerp) towards desired position
    this.x += (desiredX - this.x) * this.lerpSpeed;
    this.y += (desiredY - this.y) * this.lerpSpeed;

    // Clamp camera to map bounds.
    // If the map is smaller than the viewport, center it.
    if (this.mapWidth <= this.width) {
      this.x = (this.mapWidth - this.width) / 2;
    } else {
      this.x = this.clamp(this.x, 0, this.mapWidth - this.width);
    }

    if (this.mapHeight <= this.height) {
      this.y = (this.mapHeight - this.height) / 2;
    } else {
      this.y = this.clamp(this.y, 0, this.mapHeight - this.height);
    }
  }

  private clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  }
}
