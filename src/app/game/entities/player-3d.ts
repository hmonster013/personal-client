import { AnimationAction, AnimationClip, AnimationMixer, Object3D, Quaternion, Vector3, Group } from 'three';
import { CollisionSystem3D } from '../engine/collision-3d';
import { ColliderSpec } from '../world/world-spec';

export class Player3D {
  // Outermost group: handles world-space translation (X, Y, Z)
  readonly container = new Group();
  // Middle group: handles character facing direction (Y rotation only)
  readonly rotationGroup = new Group();
  // Innermost group: giữ lại cho hiệu ứng phụ (hiện không dùng — skeletal animation lo phần thân)
  readonly animGroup = new Group();

  readonly mesh: Object3D;
  readonly position = new Vector3(0, 0, 0);
  speed = 4.5;

  // Bounding box size on the XZ plane
  hitboxSize = { width: 0.8, depth: 0.8 };

  // Skeletal animation (clips có sẵn trong GLB Kenney: idle, walk, sprint, ...)
  private mixer: AnimationMixer | null = null;
  private walkAction: AnimationAction | null = null;
  private idleAction: AnimationAction | null = null;
  private isMoving = false;

  private targetRotation = Math.PI; // spawn quay mặt về -Z (phía làng), camera sau lưng ở +Z

  /** Hướng mặt hiện tại — camera dùng để lượn ra sau lưng */
  get facingYaw(): number {
    return this.targetRotation;
  }

  constructor(model: Object3D, animations: AnimationClip[] = []) {
    this.mesh = model;

    this.mesh.traverse((child: any) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    this.mesh.position.set(0, 0, 0);
    this.mesh.scale.set(1.0, 1.0, 1.0);
    this.mesh.rotation.set(0, 0, 0);

    this.animGroup.add(this.mesh);
    this.rotationGroup.add(this.animGroup);
    this.container.add(this.rotationGroup);
    this.rotationGroup.rotation.y = this.targetRotation; // khớp hướng mặt ban đầu, khỏi xoay giật lúc spawn

    // Bind skeletal animations nếu model có rig
    if (animations.length > 0) {
      this.mixer = new AnimationMixer(this.mesh);
      const walkClip = AnimationClip.findByName(animations, 'walk');
      const idleClip = AnimationClip.findByName(animations, 'idle');
      if (walkClip) {
        this.walkAction = this.mixer.clipAction(walkClip);
        this.walkAction.timeScale = 1.6; // khớp nhịp chân với speed 4.5
      }
      if (idleClip) {
        this.idleAction = this.mixer.clipAction(idleClip);
        this.idleAction.play();
      }
    }
  }

  setPosition(x: number, y: number, z: number) {
    this.position.set(x, y, z);
    this.container.position.copy(this.position);
  }

  update(dt: number, input: { x: number; y: number }, colliders: ColliderSpec[], cameraYaw: number) {
    // Input theo HƯỚNG CAMERA (chuẩn third-person): ↑ = tiến về trước mặt,
    // ←/→ = sang trái/phải màn hình — bất kể nhân vật đang quay hướng nào
    const fwdX = Math.sin(cameraYaw), fwdZ = Math.cos(cameraYaw);
    // right = forward × up (camera three.js nhìn theo -Z nên KHÔNG phải up × forward — đã từng lộn dấu)
    const rightX = -Math.cos(cameraYaw), rightZ = Math.sin(cameraYaw);
    let vx = fwdX * -input.y + rightX * input.x;
    let vz = fwdZ * -input.y + rightZ * input.x;
    const moving = vx !== 0 || vz !== 0;

    if (moving) {
      const len = Math.hypot(vx, vz);
      vx /= len;
      vz /= len;

      const nextPos = CollisionSystem3D.moveWithCollision(
        { x: this.position.x, z: this.position.z },
        vx * this.speed * dt,
        vz * this.speed * dt,
        this.hitboxSize,
        colliders
      );

      this.position.x = nextPos.x;
      this.position.z = nextPos.z;
      this.targetRotation = Math.atan2(vx, vz);
    }

    // Chuyển trạng thái animation walk <-> idle với crossfade
    if (moving !== this.isMoving) {
      this.isMoving = moving;
      const fadeIn = moving ? this.walkAction : this.idleAction;
      const fadeOut = moving ? this.idleAction : this.walkAction;
      if (fadeIn && fadeOut) {
        fadeOut.fadeOut(0.15);
        fadeIn.reset().fadeIn(0.15).play();
      }
    }

    if (this.mixer) {
      this.mixer.update(dt);
    }

    // Sync container's global X and Z position
    this.container.position.x = this.position.x;
    this.container.position.z = this.position.z;

    // Smoothly rotate facing direction
    const targetQ = new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), this.targetRotation);
    this.rotationGroup.quaternion.slerp(targetQ, 0.18);
  }
}
