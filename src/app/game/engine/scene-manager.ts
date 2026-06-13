import {
  Scene,
  WebGLRenderer,
  HemisphereLight,
  DirectionalLight,
  Color,
  Fog,
  PlaneGeometry,
  Shape,
  ExtrudeGeometry,
  MeshStandardMaterial,
  Mesh,
  Object3D,
  CanvasTexture
} from 'three';
import { FollowCamera } from './follow-camera';
import { beachDepth } from '../world/world-spec';

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

    // GOLDEN HOUR — chiều vàng ấm áp: asset Kenney lên màu đẹp nhất ở ánh sáng ban ngày.
    // (Tông đêm cũ làm cả làng chìm trong xám xanh — user chê "tệ".)
    const skyColor = new Color('#a8c8e8');
    this.scene.background = skyColor;

    // Fog đẩy xa để thấy chân trời biển quanh đảo
    this.scene.fog = new Fog(skyColor, 18, 60);

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
    this.hemiLight = new HemisphereLight('#cfe2ff', '#6a7a58', 1.4);
    this.scene.add(this.hemiLight);

    // Sunset/afternoon directional light casting shadows
    this.dirLight = new DirectionalLight('#ffdfae', 2.0);
    this.dirLight.position.set(8, 14, 6);
    this.dirLight.castShadow = true;

    // High quality shadow maps as specified
    this.dirLight.shadow.mapSize.width = 2048;
    this.dirLight.shadow.mapSize.height = 2048;
    this.dirLight.shadow.camera.near = 0.5;
    this.dirLight.shadow.camera.far = 40;

    const d = 18; // phủ bóng toàn đảo (bán kính cỏ 17)
    this.dirLight.shadow.camera.left = -d;
    this.dirLight.shadow.camera.right = d;
    this.dirLight.shadow.camera.top = d;
    this.dirLight.shadow.camera.bottom = -d;
    this.dirLight.shadow.bias = -0.0006;

    this.scene.add(this.dirLight);
  }

  private setupGround() {
    // 🏝️ ĐẢO KHỐI 3D: slab đất dày 1.5 nhô lên khỏi biển, đường bờ GỒ GHỀ tự nhiên
    // (không phải đĩa phẳng — user chê "1 mặt phẳng nhìn thô").
    // Viền: bán kính 17.5 ± nhiễu sin (16.7..18.3). Đồng bộ collider octagon trong world-spec.ts.
    const shape = new Shape();
    const POINTS = 96;
    for (let i = 0; i <= POINTS; i++) {
      const theta = (i / POINTS) * Math.PI * 2;
      let r = 17.5 + Math.sin(theta * 3 + 1) * 0.5 + Math.sin(theta * 7 + 2) * 0.3;
      // 🏖️ Khoét VỊNH CÁT phía nam (shape θ≈3π/2 ↔ world z+): slab lùi vào tới z≈11.8,
      // hai vách đất ôm lấy vịnh; dải cát dốc (mesh riêng bên dưới) lấp vào chỗ khoét.
      const dCove = Math.abs(Math.atan2(Math.sin(theta - 4.712), Math.cos(theta - 4.712)));
      if (dCove < 0.46) {
        r -= 5.6 * Math.pow(Math.cos((dCove / 0.46) * (Math.PI / 2)), 1.2);
      }
      const x = Math.cos(theta) * r;
      const y = Math.sin(theta) * r;
      if (i === 0) shape.moveTo(x, y);
      else shape.lineTo(x, y);
    }

    const islandGeo = new ExtrudeGeometry(shape, { depth: 1.5, bevelEnabled: false });

    // 🎨 SƠN mặt đảo bằng CanvasTexture: bãi cát là MỘT PHẦN của mặt đất, loang dần cỏ→cát
    // (trước đây đè CircleGeometry cát lên nền cỏ → lộ 2 lớp, user chê đúng).
    // UV của ExtrudeGeometry = tọa độ shape thô (shapeY = −worldZ); repeat 1/40 + offset 0.5
    // đưa world [-20,20] về [0,1]; flipY mặc định triệt tiêu dấu âm của Z → toPx dùng chung.
    const TEX = 512;
    const EXTENT = 40;
    const cv = document.createElement('canvas');
    cv.width = cv.height = TEX;
    const g = cv.getContext('2d')!;
    const toPx = (w: number) => (w / EXTENT + 0.5) * TEX;
    const toR = (r: number) => (r / EXTENT) * TEX;

    g.fillStyle = '#5d8a4e';
    g.fillRect(0, 0, TEX, TEX);
    // Loang cỏ đậm/nhạt để mặt cỏ không phẳng lì một màu
    const grassBlobs: [number, number, number, string][] = [
      [-8, -6, 5, 'rgba(74,116,62,0.35)'], [7, -7, 4.5, 'rgba(74,116,62,0.30)'],
      [10, 6, 4, 'rgba(110,150,90,0.35)'], [-10, 7, 4.5, 'rgba(110,150,90,0.30)'],
      [0, -10, 5, 'rgba(74,116,62,0.25)'], [3, 8, 3.5, 'rgba(110,150,90,0.30)'],
    ];
    for (const [bx, bz, br, c] of grassBlobs) {
      const gr = g.createRadialGradient(toPx(bx), toPx(bz), 0, toPx(bx), toPx(bz), toR(br));
      gr.addColorStop(0, c);
      gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = gr;
      g.fillRect(0, 0, TEX, TEX);
    }
    // Bãi cát nam — tâm đặc, mép loang vào cỏ
    const paintSand = (bx: number, bz: number, br: number) => {
      const gr = g.createRadialGradient(toPx(bx), toPx(bz), 0, toPx(bx), toPx(bz), toR(br));
      gr.addColorStop(0, '#d9c389');
      gr.addColorStop(0.72, '#d9c389');
      gr.addColorStop(1, 'rgba(217,195,137,0)');
      g.fillStyle = gr;
      g.fillRect(0, 0, TEX, TEX);
    };
    paintSand(0, 12.3, 4.6); // viền cát trên mép cỏ NGAY TRƯỚC bậc xuống vịnh (vịnh là mesh dốc riêng)

    const groundTex = new CanvasTexture(cv);
    groundTex.repeat.set(1 / EXTENT, 1 / EXTENT);
    groundTex.offset.set(0.5, 0.5);

    const grassMat = new MeshStandardMaterial({ map: groundTex, roughness: 0.9, metalness: 0.0 });
    const cliffMat = new MeshStandardMaterial({ color: '#8b6b4f', roughness: 1.0, metalness: 0.0 }); // vách đất nâu
    const island = new Mesh(islandGeo, [grassMat, cliffMat]); // index 0 = mặt trên/dưới, 1 = vách hông
    island.rotation.x = -Math.PI / 2;
    island.position.y = -1.5; // đỉnh slab tại y=0, đáy chìm dưới nước
    island.receiveShadow = true;
    island.castShadow = true;
    this.ground = island;
    this.scene.add(island);

    // 🏖️ DẢI CÁT TRŨNG lấp vào vịnh đã khoét: dốc thoải từ mép cỏ (y≈0) xuống mặt nước (−1.0).
    // Cao độ lấy từ beachDepth (world-spec) — cùng hàm với logic đi lại, không bao giờ lệch nhau.
    // Hạ thêm 0.02 để mép ngoài vịnh chui xuống dưới mặt slab (tránh z-fighting, hở khe).
    const beachGeo = new PlaneGeometry(16, 9.5, 32, 19);
    beachGeo.rotateX(-Math.PI / 2);
    const beachPos = beachGeo.attributes['position'];
    for (let i = 0; i < beachPos.count; i++) {
      const wx = beachPos.getX(i);
      const wz = beachPos.getZ(i) + 15.25;
      let y = beachDepth(wx, wz) - 0.02;
      // Ngoài mép sóng (z>17.5, hết vùng đi lại): cát tiếp tục chúi xuống DƯỚI mặt nước (-1.4)
      // để không còn cạnh cát lơ lửng trên biển nhìn từ ngang.
      if (wz > 17.5) {
        y -= ((wz - 17.5) / 2.5) * 0.6;
      }
      beachPos.setY(i, y);
    }
    beachGeo.computeVertexNormals();
    const beach = new Mesh(
      beachGeo,
      new MeshStandardMaterial({ color: '#d9c389', roughness: 1.0 })
    );
    beach.position.set(0, 0, 15.25);
    beach.receiveShadow = true;
    this.scene.add(beach);

    // Mặt biển — thấp hơn đỉnh đảo 1.4 đơn vị để lộ vách đất
    const water = new Mesh(
      new PlaneGeometry(500, 500),
      new MeshStandardMaterial({ color: '#3f7fc4', roughness: 0.35, metalness: 0.1 })
    );
    water.rotation.x = -Math.PI / 2;
    water.position.y = -1.4;
    water.receiveShadow = true;
    this.scene.add(water);
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
