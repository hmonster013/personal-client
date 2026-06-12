import { 
  Scene, 
  WebGLRenderer, 
  HemisphereLight, 
  DirectionalLight, 
  Color, 
  Fog, 
  PlaneGeometry, 
  MeshStandardMaterial, 
  Mesh, 
  Object3D 
} from 'three';
import { FollowCamera } from './follow-camera';

export class SceneManager {
  readonly scene: Scene;
  readonly renderer: WebGLRenderer;
  private dirLight!: DirectionalLight;
  private hemiLight!: HemisphereLight;
  private ground!: Mesh;

  // Track interactive 3D models and their current emissive intensities (supports multiple models per zone)
  private interactiveObjects: Map<string, { model: Object3D; currentGlow: number }[]> = new Map();

  constructor(canvas: HTMLCanvasElement) {
    this.scene = new Scene();

    // Consistent night/sunset background color
    const nightColor = new Color('#1A1C2C');
    this.scene.background = nightColor;

    // Fog for depth and masking world edge (làng gọn ±14 → fog ôm sát viền rừng)
    this.scene.fog = new Fog(nightColor, 14, 32);

    // Renderer setup
    this.renderer = new WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: 'high-performance',
      alpha: false
    });
    
    // CAP pixel ratio to maximum of 2 for mobile performance
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = 2; // PCFSoftShadowMap

    this.setupLights();
    this.setupGround();
  }

  private setupLights() {
    // Hemisphere light - simulates blue sky dome light + soft grey ground reflections.
    // Extremely effective at making Kenney CC0 assets look rich and colorful.
    this.hemiLight = new HemisphereLight('#8a9bd4', '#3a4a3e', 1.7);
    this.scene.add(this.hemiLight);

    // Sunset/afternoon directional light casting shadows
    this.dirLight = new DirectionalLight('#ffd59a', 1.9);
    this.dirLight.position.set(8, 14, 6);
    this.dirLight.castShadow = true;

    // High quality shadow maps as specified
    this.dirLight.shadow.mapSize.width = 2048;
    this.dirLight.shadow.mapSize.height = 2048;
    this.dirLight.shadow.camera.near = 0.5;
    this.dirLight.shadow.camera.far = 40;

    const d = 16;
    this.dirLight.shadow.camera.left = -d;
    this.dirLight.shadow.camera.right = d;
    this.dirLight.shadow.camera.top = d;
    this.dirLight.shadow.camera.bottom = -d;
    this.dirLight.shadow.bias = -0.0006;

    this.scene.add(this.dirLight);
  }

  private setupGround() {
    const geometry = new PlaneGeometry(120, 120);
    const material = new MeshStandardMaterial({
      color: '#3a5741', // Cỏ xanh đêm — nền đen cũ nuốt hết màu của model
      roughness: 0.9,
      metalness: 0.0
    });
    this.ground = new Mesh(geometry, material);
    this.ground.rotation.x = -Math.PI / 2;
    this.ground.receiveShadow = true;
    this.scene.add(this.ground);
  }

  /**
   * Register a 3D model as interactive so it glows when active
   */
  registerInteractiveObject(interactionName: string, model: Object3D) {
    // Clone materials to avoid shared state glowing other objects
    model.traverse((child: any) => {
      if (child.isMesh && child.material) {
        if (Array.isArray(child.material)) {
          child.material = child.material.map((mat: any) => mat.clone());
        } else {
          child.material = child.material.clone();
        }
      }
    });

    const list = this.interactiveObjects.get(interactionName) || [];
    list.push({ model, currentGlow: 0 });
    this.interactiveObjects.set(interactionName, list);
  }

  /**
   * Update the emissive glow color of registered interactive models
   */
  updateGlows(activeInteraction: string | null, dt: number) {
    const targetGlowMax = 0.28; // Max emissive lerp
    const glowSpeed = 7.0;      // Lerp speed

    this.interactiveObjects.forEach((list, name) => {
      const isTarget = name === activeInteraction;
      const targetGlow = isTarget ? targetGlowMax : 0.0;
      
      list.forEach((data) => {
        // Smoothly lerp intensity
        data.currentGlow += (targetGlow - data.currentGlow) * glowSpeed * dt;

        // Apply emissive color
        data.model.traverse((child: any) => {
          if (child.isMesh && child.material) {
            const materials = Array.isArray(child.material) ? child.material : [child.material];
            materials.forEach((mat: any) => {
              if ('emissive' in mat) {
                mat.emissive.setHex(0xffaa22); // Soft golden sunset emissive glow
                mat.emissiveIntensity = data.currentGlow;
              }
            });
          }
        });
      });
    });
  }

  resize(width: number, height: number, camera: FollowCamera) {
    this.renderer.setSize(width, height, false);
    camera.setAspect(width / height);
  }

  render(camera: FollowCamera) {
    this.renderer.render(this.scene, camera.camera);
  }

  add(object: Object3D) {
    this.scene.add(object);
  }

  remove(object: Object3D) {
    this.scene.remove(object);
  }

  /**
   * Completely dispose WebGL objects to prevent context leaks
   */
  dispose() {
    this.renderer.dispose();
    this.interactiveObjects.clear();
    this.scene.traverse((object: any) => {
      if (object.geometry) {
        object.geometry.dispose();
      }
      if (object.material) {
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        materials.forEach((mat: any) => mat.dispose());
      }
    });
  }
}
