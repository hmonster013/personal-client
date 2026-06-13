import { PerspectiveCamera, Vector3 } from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export class FollowCamera {
  readonly camera: PerspectiveCamera;
  // Third-person: camera lượn ra SAU LƯNG nhân vật theo yaw, không còn diorama cố định
  private distance = 5.5; // khoảng cách sau lưng
  private height = 3.6;   // độ cao vai camera
  private yaw = 0;        // góc xoay hiện tại quanh nhân vật (rad)
  private yawSpeed = 2.5; // tốc độ camera xoay đuổi theo hướng nhân vật
  private lerpFactor = 0.12;
  private controls: OrbitControls | null = null;
  private isDebug = false;

  constructor(fov = 45, aspect = 1, near = 0.1, far = 100) {
    this.camera = new PerspectiveCamera(fov, aspect, near, far);
    this.checkDebugMode();
  }

  private checkDebugMode() {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      this.isDebug = urlParams.get('debug') === '1';
    }
  }

  /**
   * Initialize OrbitControls if in debug mode
   */
  initControls(domElement: HTMLCanvasElement) {
    if (this.isDebug) {
      this.controls = new OrbitControls(this.camera, domElement);
      this.camera.position.set(0, 12, 10);
      this.controls.update();
      console.log('FollowCamera: OrbitControls enabled (?debug=1)');
    }
  }

  /** Yaw hiện tại — game.component dùng để quy đổi input theo hướng camera */
  getYaw(): number {
    return this.yaw;
  }

  /**
   * Update aspect ratio and projection matrix on window resize
   */
  setAspect(aspect: number) {
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();

    // Viewport game trên mobile: zoom nhỏ hơn (thấy nhiều map hơn vì màn dọc)
    if (aspect < 1.0) {
      const factor = Math.min(1.4, 1.0 / aspect);
      this.distance = 5.5 * factor;
      this.height = 3.6 * factor;
    } else {
      this.distance = 5.5;
      this.height = 3.6;
    }
  }

  /**
   * Third-person follow: xoay mượt ra sau lưng nhân vật (targetYaw = hướng mặt nhân vật)
   */
  update(targetPos: { x: number; y: number; z: number }, targetYaw: number, dt: number) {
    if (this.isDebug && this.controls) {
      this.controls.update();
      return;
    }

    // Xoay yaw theo cung ngắn nhất, tốc độ giới hạn để không giật khi quay đầu 180°
    let diff = targetYaw - this.yaw;
    diff = Math.atan2(Math.sin(diff), Math.cos(diff));
    this.yaw += diff * Math.min(1, this.yawSpeed * dt);

    // Vị trí mong muốn: sau lưng nhân vật theo yaw
    const fx = Math.sin(this.yaw);
    const fz = Math.cos(this.yaw);
    const desiredX = targetPos.x - fx * this.distance;
    const desiredY = targetPos.y + this.height;
    const desiredZ = targetPos.z - fz * this.distance;

    this.camera.position.x += (desiredX - this.camera.position.x) * this.lerpFactor;
    this.camera.position.y += (desiredY - this.camera.position.y) * this.lerpFactor;
    this.camera.position.z += (desiredZ - this.camera.position.z) * this.lerpFactor;

    // Nhìn vào tầm đầu nhân vật để chân trời cao, thấy được làng phía trước
    this.camera.lookAt(targetPos.x, targetPos.y + 1.3, targetPos.z);
  }

  /**
   * Snap camera directly behind target without smoothing
   */
  snapTo(targetPos: { x: number; y: number; z: number }, targetYaw = 0) {
    this.yaw = targetYaw;
    const fx = Math.sin(this.yaw);
    const fz = Math.cos(this.yaw);
    this.camera.position.set(
      targetPos.x - fx * this.distance,
      targetPos.y + this.height,
      targetPos.z - fz * this.distance
    );
    this.camera.lookAt(targetPos.x, targetPos.y + 1.3, targetPos.z);
    if (this.controls) {
      this.controls.update();
    }
  }

  /**
   * Clean up controls
   */
  dispose() {
    if (this.controls) {
      this.controls.dispose();
      this.controls = null;
    }
  }
}
