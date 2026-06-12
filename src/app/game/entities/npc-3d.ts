import { 
  AnimationAction, 
  AnimationClip, 
  AnimationMixer, 
  Object3D, 
  Quaternion, 
  Vector3, 
  Group, 
  Sprite, 
  CanvasTexture, 
  SpriteMaterial 
} from 'three';
import { CollisionSystem3D } from '../engine/collision-3d';
import { ColliderSpec } from '../world/world-spec';

export class NPC3D {
  // Outermost group added to the scene, manages world position
  readonly container = new Group();
  // Middle group: handles character facing direction (Y rotation only)
  readonly rotationGroup = new Group();
  // Innermost group for scaling/bobbing
  readonly animGroup = new Group();

  readonly mesh: Object3D;
  readonly position = new Vector3(0, 0, 0);
  readonly name: string;
  
  // Speed for roaming
  speed = 1.8;
  hitboxSize = { width: 0.6, depth: 0.6 };

  // Skeletal animations
  private mixer: AnimationMixer | null = null;
  private walkAction: AnimationAction | null = null;
  private idleAction: AnimationAction | null = null;
  private isMoving = false;

  private targetRotation = 0;

  // Roaming states
  private roam = false;
  private roamRadius = 5;
  private spawnOrigin = new Vector3(0, 0, 0);
  private changeTimer = 0;
  private moveDir = new Vector2(0, 0);

  // Billboard "!"
  private exclamationSprite: Sprite | null = null;
  private bobTime = 0;

  constructor(model: Object3D, animations: AnimationClip[] = [], name: string) {
    this.mesh = model;
    this.name = name;

    // Configure shadows
    this.mesh.traverse((child: any) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    this.mesh.position.set(0, 0, 0);
    this.mesh.scale.set(1.0, 1.0, 1.0);
    this.mesh.rotation.set(0, 0, 0);

    // Assembly
    this.animGroup.add(this.mesh);
    this.rotationGroup.add(this.animGroup);
    this.container.add(this.rotationGroup);

    // Bind skeletal animations
    if (animations.length > 0) {
      this.mixer = new AnimationMixer(this.mesh);
      const walkClip = AnimationClip.findByName(animations, 'walk');
      const idleClip = AnimationClip.findByName(animations, 'idle');
      if (walkClip) {
        this.walkAction = this.mixer.clipAction(walkClip);
        this.walkAction.timeScale = 1.2;
      }
      if (idleClip) {
        this.idleAction = this.mixer.clipAction(idleClip);
        this.idleAction.play();
      }
    }
  }

  /**
   * Set position
   */
  setPosition(x: number, y: number, z: number) {
    this.position.set(x, y, z);
    this.spawnOrigin.copy(this.position);
    this.container.position.copy(this.position);
  }

  /**
   * Set roaming behavior
   */
  setRoaming(roam: boolean, radius: number = 5) {
    this.roam = roam;
    this.roamRadius = radius;
  }

  /**
   * Add interactive exclamation mark billboard above NPC's head
   */
  addExclamationMark() {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = 'rgba(0,0,0,0)';
      ctx.fillRect(0, 0, 64, 64);
      
      // Draw a gold/yellow text with dark stroke
      ctx.font = 'bold 54px "Arial Black", Gadget, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      // Stroke
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 6;
      ctx.strokeText('!', 32, 32);
      
      // Fill
      ctx.fillStyle = '#ffcc00'; // RPG Golden yellow
      ctx.fillText('!', 32, 32);
    }
    const texture = new CanvasTexture(canvas);
    const material = new SpriteMaterial({ map: texture, depthTest: false });
    this.exclamationSprite = new Sprite(material);
    
    // Scale and place above NPC head (Kenney character height is ~0.67)
    this.exclamationSprite.scale.set(0.65, 0.65, 1);
    this.exclamationSprite.position.set(0, 1.15, 0);
    this.container.add(this.exclamationSprite);
  }

  /**
   * Update method called each frame
   */
  update(dt: number, colliders: ColliderSpec[]) {
    this.bobTime += dt * 4.0;
    
    // Animate exclamation mark bobbing if present
    if (this.exclamationSprite) {
      this.exclamationSprite.position.y = 1.15 + Math.sin(this.bobTime) * 0.08;
    }

    let moving = false;
    let vx = 0;
    let vz = 0;

    if (this.roam) {
      this.changeTimer -= dt;
      if (this.changeTimer <= 0) {
        // Change direction every 2-4 seconds
        this.changeTimer = 2.0 + Math.random() * 2.0;
        
        // 70% chance to walk, 30% to idle
        if (Math.random() < 0.7) {
          const angle = Math.random() * Math.PI * 2;
          this.moveDir.set(Math.cos(angle), Math.sin(angle));
        } else {
          this.moveDir.set(0, 0);
        }
      }

      vx = this.moveDir.x;
      vz = this.moveDir.y;
      moving = vx !== 0 || vz !== 0;

      if (moving) {
        // Check next position
        const dx = vx * this.speed * dt;
        const dz = vz * this.speed * dt;
        
        const nextX = this.position.x + dx;
        const nextZ = this.position.z + dz;

        // Check if next position exceeds roam radius from origin
        const distToOrigin = Math.hypot(nextX - this.spawnOrigin.x, nextZ - this.spawnOrigin.z);
        if (distToOrigin < this.roamRadius) {
          // Normal movement with sliding collisions
          const nextPos = CollisionSystem3D.moveWithCollision(
            { x: this.position.x, z: this.position.z },
            dx,
            dz,
            this.hitboxSize,
            colliders
          );

          // If hit a wall (didn't move much), trigger direction change sooner
          if (Math.hypot(nextPos.x - this.position.x, nextPos.z - this.position.z) < 0.01) {
            this.changeTimer = 0; // recalculate dir next frame
          }

          this.position.x = nextPos.x;
          this.position.z = nextPos.z;
          this.targetRotation = Math.atan2(vx, vz);
        } else {
          // Out of radius, turn back towards origin next time
          const toOriginX = this.spawnOrigin.x - this.position.x;
          const toOriginZ = this.spawnOrigin.z - this.position.z;
          const len = Math.hypot(toOriginX, toOriginZ);
          if (len > 0.1) {
            this.moveDir.set(toOriginX / len, toOriginZ / len);
          }
          this.changeTimer = 1.0; // quickly steer back
        }
      }
    } else {
      // Guide NPC: gentle breathing if no skeletal idle, otherwise skeletal animation handles it
      if (!this.mixer) {
        const breath = 1.0 + Math.sin(this.bobTime * 0.6) * 0.015;
        this.animGroup.scale.set(1.0, breath, 1.0);
      }
    }

    // Handle skeletal walk <-> idle crossfade
    if (moving !== this.isMoving) {
      this.isMoving = moving;
      const fadeIn = moving ? this.walkAction : this.idleAction;
      const fadeOut = moving ? this.idleAction : this.walkAction;
      if (fadeIn && fadeOut) {
        fadeOut.fadeOut(0.15);
        fadeIn.reset().fadeIn(0.15).play();
      }
    }

    // Update animation mixer
    if (this.mixer) {
      this.mixer.update(dt);
    }

    // Sync container's global X and Z position
    this.container.position.x = this.position.x;
    this.container.position.z = this.position.z;

    // Smoothly rotate facing direction
    if (moving) {
      const targetQ = new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), this.targetRotation);
      this.rotationGroup.quaternion.slerp(targetQ, 0.18);
    }
  }
}

class Vector2 {
  x: number;
  y: number;
  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }
  set(x: number, y: number) {
    this.x = x;
    this.y = y;
  }
}
