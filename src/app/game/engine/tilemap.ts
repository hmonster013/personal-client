import { Camera } from './camera';

export interface TiledMapJSON {
  width: number;
  height: number;
  tilewidth: number;
  tileheight: number;
  layers: {
    name: string;
    type: string;
    data?: number[];
    objects?: {
      name: string;
      type?: string;
      x: number;
      y: number;
      width: number;
      height: number;
      properties?: { name: string; type: string; value: any }[];
    }[];
    visible: boolean;
    opacity: number;
  }[];
  tilesets: {
    firstgid: number;
    image: string;
    imagewidth: number;
    imageheight: number;
    tilewidth: number;
    tileheight: number;
  }[];
}

export class Tilemap {
  width = 0; // In tiles
  height = 0; // In tiles
  tileWidth = 16;
  tileHeight = 16;
  
  // Real world pixel dimensions
  pixelWidth = 0;
  pixelHeight = 0;

  // Layer data
  private groundData: number[] = [];
  private aboveData: number[] = [];
  private collisionData: number[] = [];
  
  // Interaction objects
  interactions: { name: string; x: number; y: number; width: number; height: number }[] = [];

  // Offscreen canvases for pre-rendering
  private groundCanvas: HTMLCanvasElement | null = null;
  private aboveCanvas: HTMLCanvasElement | null = null;
  private tilesetImage: HTMLCanvasElement | HTMLImageElement | null = null;
  private firstGid = 1;

  constructor() {}

  /**
   * Parse the Tiled JSON and pre-render layers
   */
  loadMap(mapData: TiledMapJSON, tilesetImage: HTMLCanvasElement | HTMLImageElement) {
    this.width = mapData.width;
    this.height = mapData.height;
    this.tileWidth = mapData.tilewidth || 16;
    this.tileHeight = mapData.tileheight || 16;
    this.pixelWidth = this.width * this.tileWidth;
    this.pixelHeight = this.height * this.tileHeight;
    this.tilesetImage = tilesetImage;

    if (mapData.tilesets && mapData.tilesets.length > 0) {
      this.firstGid = mapData.tilesets[0].firstgid;
    }

    // Extract layer data
    mapData.layers.forEach(layer => {
      if (layer.type === 'tilelayer' && layer.data) {
        if (layer.name === 'ground') {
          this.groundData = layer.data;
        } else if (layer.name === 'above') {
          this.aboveData = layer.data;
        } else if (layer.name === 'collision') {
          this.collisionData = layer.data;
        }
      } else if (layer.type === 'objectgroup' && layer.name === 'interactions' && layer.objects) {
        this.interactions = layer.objects.map(obj => ({
          name: obj.name,
          x: obj.x,
          y: obj.y,
          width: obj.width,
          height: obj.height
        }));
      }
    });

    this.preRenderLayers();
  }

  private preRenderLayers() {
    if (!this.tilesetImage) return;

    const tilesetWidth = this.tilesetImage.width;
    const colsInTileset = Math.floor(tilesetWidth / this.tileWidth);

    // 1. Pre-render ground layer
    this.groundCanvas = document.createElement('canvas');
    this.groundCanvas.width = this.pixelWidth;
    this.groundCanvas.height = this.pixelHeight;
    const groundCtx = this.groundCanvas.getContext('2d');

    if (groundCtx) {
      groundCtx.imageSmoothingEnabled = false;
      this.renderTileData(groundCtx, this.groundData, colsInTileset);
    }

    // 2. Pre-render above layer
    this.aboveCanvas = document.createElement('canvas');
    this.aboveCanvas.width = this.pixelWidth;
    this.aboveCanvas.height = this.pixelHeight;
    const aboveCtx = this.aboveCanvas.getContext('2d');

    if (aboveCtx) {
      aboveCtx.imageSmoothingEnabled = false;
      this.renderTileData(aboveCtx, this.aboveData, colsInTileset);
    }
  }

  private renderTileData(ctx: CanvasRenderingContext2D, data: number[], colsInTileset: number) {
    if (!this.tilesetImage || data.length === 0) return;

    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const index = y * this.width + x;
        const gid = data[index];

        if (gid === 0 || gid === undefined) continue;

        const tileIdx = gid - this.firstGid;
        if (tileIdx < 0) continue;

        const tileX = tileIdx % colsInTileset;
        const tileY = Math.floor(tileIdx / colsInTileset);

        ctx.drawImage(
          this.tilesetImage,
          tileX * this.tileWidth,
          tileY * this.tileHeight,
          this.tileWidth,
          this.tileHeight,
          x * this.tileWidth,
          y * this.tileHeight,
          this.tileWidth,
          this.tileHeight
        );
      }
    }
  }

  /**
   * Draw pre-rendered ground layer
   */
  drawGround(ctx: CanvasRenderingContext2D, camera: Camera) {
    if (!this.groundCanvas) return;

    // Source rect from pre-rendered layer using camera view
    const sx = Math.max(0, Math.floor(camera.x));
    const sy = Math.max(0, Math.floor(camera.y));
    const sw = Math.min(this.pixelWidth - sx, camera.width);
    const sh = Math.min(this.pixelHeight - sy, camera.height);

    ctx.drawImage(
      this.groundCanvas,
      sx, sy, sw, sh,
      0, 0, sw, sh
    );
  }

  /**
   * Draw pre-rendered above (canopy/roof) layer
   */
  drawAbove(ctx: CanvasRenderingContext2D, camera: Camera) {
    if (!this.aboveCanvas) return;

    const sx = Math.max(0, Math.floor(camera.x));
    const sy = Math.max(0, Math.floor(camera.y));
    const sw = Math.min(this.pixelWidth - sx, camera.width);
    const sh = Math.min(this.pixelHeight - sy, camera.height);

    ctx.drawImage(
      this.aboveCanvas,
      sx, sy, sw, sh,
      0, 0, sw, sh
    );
  }

  /**
   * Check if a tile-based collision exists at coordinates in world space.
   */
  hasCollisionTileAt(worldX: number, worldY: number): boolean {
    if (worldX < 0 || worldX >= this.pixelWidth || worldY < 0 || worldY >= this.pixelHeight) {
      return true; // Map boundaries block movement
    }

    const tileX = Math.floor(worldX / this.tileWidth);
    const tileY = Math.floor(worldY / this.tileHeight);
    const index = tileY * this.width + tileX;

    const gid = this.collisionData[index];
    return gid !== undefined && gid !== 0;
  }
}
