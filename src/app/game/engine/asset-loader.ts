import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { AnimationClip, Object3D } from 'three';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';

export class AssetLoader {
  private loader = new GLTFLoader();
  private cache = new Map<string, any>();

  constructor() {}

  /**
   * Load multiple GLB files asynchronously and update progress
   */
  async loadAll(paths: string[], onProgress: (progress: number) => void): Promise<void> {
    if (paths.length === 0) {
      onProgress(100);
      return;
    }

    const loadedCounts = new Map<string, number>();
    const totalCount = paths.length;

    const promises = paths.map(async (path) => {
      if (this.cache.has(path)) {
        loadedCounts.set(path, 1);
        this.updateOverallProgress(loadedCounts, totalCount, onProgress);
        return;
      }

      return new Promise<void>((resolve, reject) => {
        this.loader.load(
          path,
          (gltf) => {
            this.cache.set(path, gltf);
            loadedCounts.set(path, 1);
            this.updateOverallProgress(loadedCounts, totalCount, onProgress);
            resolve();
          },
          (xhr) => {
            if (xhr.total > 0) {
              const fileProgress = xhr.loaded / xhr.total;
              loadedCounts.set(path, fileProgress);
              this.updateOverallProgress(loadedCounts, totalCount, onProgress);
            }
          },
          (error) => {
            console.error(`Error loading asset: ${path}`, error);
            // Even if it fails, mark as 1 to avoid blocking the loader completely
            loadedCounts.set(path, 1);
            this.updateOverallProgress(loadedCounts, totalCount, onProgress);
            resolve();
          }
        );
      });
    });

    await Promise.all(promises);
  }

  private updateOverallProgress(
    loadedCounts: Map<string, number>,
    totalCount: number,
    onProgress: (progress: number) => void
  ) {
    let sum = 0;
    loadedCounts.forEach((val) => {
      sum += val;
    });
    const totalProgress = Math.min(100, Math.round((sum / totalCount) * 100));
    onProgress(totalProgress);
  }

  /**
   * Retrieve a deep cloned instance of a cached GLTF model (using SkeletonUtils)
   */
  get(path: string): Object3D {
    const gltf = this.cache.get(path);
    if (!gltf) {
      throw new Error(`Asset not found in cache: ${path}. Make sure it is preloaded.`);
    }
    // Deep clone utilizing SkeletonUtils to ensure rigged SkinnedMeshes are correctly bound to their cloned skeletons
    return SkeletonUtils.clone(gltf.scene);
  }

  /**
   * Lấy animation clips gốc của GLTF (clips dùng chung được giữa các clone —
   * AnimationMixer bind theo tên node nên không cần clone clip)
   */
  getAnimations(path: string): AnimationClip[] {
    const gltf = this.cache.get(path);
    return gltf?.animations || [];
  }

  /**
   * Check if an asset is already cached
   */
  has(path: string): boolean {
    return this.cache.has(path);
  }

  /**
   * Clear all cached assets to release memory
   */
  clear() {
    this.cache.clear();
  }
}
