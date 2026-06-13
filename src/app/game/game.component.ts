import { 
  Component, 
  OnInit, 
  OnDestroy, 
  AfterViewInit, 
  ElementRef, 
  ViewChild, 
  NgZone, 
  inject, 
  signal,
  effect,
  computed,
  HostListener
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { GameStateService } from './services/game-state.service';
import { GameBridgeService } from './services/game-bridge.service';
import { InputService } from './engine/input.service';
import { GameLoop } from './engine/game-loop';
import { SceneManager } from './engine/scene-manager';
import { FollowCamera } from './engine/follow-camera';
import { AssetLoader } from './engine/asset-loader';
import { Player3D } from './entities/player-3d';
import { NPC3D } from './entities/npc-3d';
import { Vector3, SphereGeometry, OctahedronGeometry, CylinderGeometry, MeshStandardMaterial, MeshBasicMaterial, Mesh, Group } from 'three';
import { WORLD_SPEC, beachDepth } from './world/world-spec';
import { SkillsService } from '../core/services/skills.service';
import { ExperiencesService } from '../core/services/experiences.service';
import { ProjectsService } from '../core/services/projects.service';
import { BlogService } from '../core/services/blog.service';
import { ContactService } from '../core/services/contact.service';
import { AnalyticsService } from '../core/services/analytics.service';
import { ToastService } from '../core/services/toast.service';
import { Skill } from '../core/models';
import { JCode } from '../shared/utils/JCode';
import { Subscription } from 'rxjs';

const PLAYER_MODEL = 'assets/game3d/models/chars/character-male-a.glb';

@Component({
  selector: 'app-game',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './game.component.html',
  styleUrl: './game.component.scss'
})
export class GameComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('gameCanvas', { static: true }) canvasRef!: ElementRef<HTMLCanvasElement>;

  // Angular Services
  private ngZone = inject(NgZone);
  gameState = inject(GameStateService);
  private gameBridge = inject(GameBridgeService);
  private inputService = inject(InputService);
  private skillsService = inject(SkillsService);
  private experiencesService = inject(ExperiencesService);
  private toastService = inject(ToastService);
  private projectsService = inject(ProjectsService);
  private blogService = inject(BlogService);
  private contactService = inject(ContactService);
  private analyticsService = inject(AnalyticsService);
  private router = inject(Router);

  // Loading signals
  isLoading = signal<boolean>(true);
  loadingProgress = signal<number>(0);

  // Stats signals for character menu & overlays
  skills = signal<Skill[]>([]);
  yearsOfExperience = signal<number>(1); // mặc định khớp CV (~1 năm), API tính lại từ join_date sớm nhất

  // Milestone M5 additions:
  projects = signal<any[]>([]);
  selectedProject = signal<any | null>(null);
  isLoadingProjects = signal<boolean>(false);

  experiences = signal<any[]>([]);
  selectedExperience = signal<any | null>(null);
  isLoadingExperiences = signal<boolean>(false);

  blogs = signal<any[]>([]);
  isLoadingBlogs = signal<boolean>(false);

  contactForm = {
    full_name: '',
    email: '',
    subject: '',
    message: ''
  };
  isSubmittingContact = signal<boolean>(false);

  // Visited count computed signal
  visitedCount = computed(() => this.gameState.visitedFlags().length);
  achievementDisplayed = false;

  // Dialogue overlay state
  dialogueQueue = signal<string[]>([]);
  dialogueIndex = signal<number>(0);
  showGuideOptions = signal<boolean>(false);
  activeGuideOptionIndex = signal<number>(0);
  activeItemIndex = signal<number>(0);
  showSizeWarning = signal<boolean>(false);
  
  fullDialogueText = signal<string>('');
  displayedDialogueText = signal<string>('');
  isDialogueTyping = signal<boolean>(false);
  private dialogueCharIndex = 0;
  private dialogueTimer: any = null;

  // Camera panning overrides
  cameraFocusOverride = signal<{ x: number; y: number; z: number } | null>(null);
  cameraYawOverride = signal<number | null>(null);
  isCameraPanning = false;
  private indicatorStar: Mesh | null = null;

  // Engine objects
  private canvas!: HTMLCanvasElement;
  private sceneManager!: SceneManager;
  private camera!: FollowCamera;
  private assetLoader!: AssetLoader;
  private player!: Player3D;
  private loop!: GameLoop;

  // Overlap tracking
  currentInteractionObj = signal<any | null>(null);

  // Subscriptions
  private subs = new Subscription();

  // ResizeObserver to handle canvas resizing
  private resizeObserver!: ResizeObserver;

  // Milestone M4 additions:
  npcs: NPC3D[] = [];
  catNPC: NPC3D | null = null;
  bannerMeshes: any[] = [];
  smokeParticles: any[] = [];
  elapsedTime = 0;

  // Marker kim cương vàng đánh dấu điểm event (xoay + nhấp nhô; đã thăm thì mờ)
  private eventMarkers: { mesh: Mesh; material: MeshStandardMaterial; baseY: number; name: string }[] = [];

  // Bướm bay lượn quanh các luống hoa (sinh khí)
  private butterflies: { mesh: Mesh; bx: number; bz: number; phase: number }[] = [];

  // Gò cát/cỏ (pirate patch-*) cao 0.25 — derive từ spec để nhân vật ĐI LÊN thay vì xuyên qua
  private terrainMounds: { x: number; z: number; r: number; h: number }[] = [];

  constructor() {
    effect(() => {
      const isDialogOpen = this.gameState.isDialogOpen();
      const isCharOpen = this.gameState.isCharacterMenuOpen();
      const activeOverlay = this.gameState.activeOverlay();
      
      const shouldPause = isDialogOpen || isCharOpen || !!activeOverlay;
      
      if (this.loop) {
        if (shouldPause) {
          this.loop.pause();
          this.inputService.setGameFocus(false);
        } else {
          this.loop.resume();
          this.inputService.setGameFocus(true);
        }
      }
    });

    effect(() => {
      const activeOverlay = this.gameState.activeOverlay();
      if (activeOverlay) {
        this.activeItemIndex.set(0);
      }
    });

    effect(() => {
      const exp = this.selectedExperience();
      const proj = this.selectedProject();
      this.activeItemIndex.set(0);
    });

    effect(() => {
      const count = this.visitedCount();
      if (count >= 5) {
        if (!this.achievementDisplayed) {
          this.achievementDisplayed = true;
          this.toastService.success('HOÀN THÀNH DEMO — Cảm ơn bạn đã khám phá! Hãy ghé hòm thư gửi lời nhắn cho tôi nhé!');
          this.analyticsService.trackEvent('completed_all', 'Game');
        }
      }
    });
  }

  ngOnInit() {
    this.loadSkills();
    this.calculateYearsOfExperience();

    // Listen to Keyboard and Touch interactions outside Angular zone
    this.ngZone.runOutsideAngular(() => {
      this.inputService.startListening();
    });

    this.subs.add(
      this.inputService.interact$.subscribe(() => {
        this.handleInteract();
      })
    );

    this.subs.add(
      this.inputService.menu$.subscribe(() => {
        this.ngZone.run(() => {
          this.gameState.toggleCharacterMenu();
        });
      })
    );

    this.subs.add(
      this.inputService.escape$.subscribe(() => {
        this.handleEscape();
      })
    );

    this.subs.add(
      this.gameBridge.interactionTriggered$.subscribe((name) => {
        this.ngZone.run(() => {
          this.startInteractionByName(name);
        });
      })
    );
  }

  ngAfterViewInit() {
    this.canvas = this.canvasRef.nativeElement;

    // Initialize 3D Core Systems
    this.sceneManager = new SceneManager(this.canvas);
    this.camera = new FollowCamera();
    this.assetLoader = new AssetLoader();

    // Setup responsive canvas resizing
    this.setupResizing();

    // Load assets asynchronously
    this.ngZone.runOutsideAngular(async () => {
      // Suy danh sách preload từ world-spec — bao gồm cả static objects và NPCs
      const assetsToLoad = Array.from(new Set([
        PLAYER_MODEL,
        ...WORLD_SPEC.objects.map(o => o.modelPath),
        ...WORLD_SPEC.npcs.map(n => n.modelPath)
      ]));

      await this.assetLoader.loadAll(assetsToLoad, (progress) => {
        this.ngZone.run(() => {
          this.loadingProgress.set(progress);
        });
      });

      this.ngZone.run(() => {
        this.isLoading.set(false);
      });

      // Build the 3D scene once loaded
      this.setupScene();
    });
  }

  private setupScene() {
    this.ngZone.runOutsideAngular(() => {
      // 0. Suy danh sách gò đất nhô cao từ spec (model patch-* đo được 0.25 cao,
      // patch-sand 7.7×6.0 / patch-grass 5.3×4.1 → bán kính hiệu dụng 3.2 / 2.3)
      this.terrainMounds = WORLD_SPEC.objects
        .filter((o) => o.modelPath.includes('/patch-'))
        .map((o) => ({
          x: o.position.x,
          z: o.position.z,
          r: (o.modelPath.includes('patch-sand') ? 3.2 : 2.3) * (o.scale?.x ?? 1),
          h: 0.25 * (o.scale?.y ?? 1),
        }));

      // 1. Spawn Player Container (adds player to scene)
      const playerModel = this.assetLoader.get(PLAYER_MODEL);
      this.player = new Player3D(playerModel, this.assetLoader.getAnimations(PLAYER_MODEL));
      this.player.setPosition(WORLD_SPEC.spawnPoint.x, WORLD_SPEC.spawnPoint.y, WORLD_SPEC.spawnPoint.z);
      this.sceneManager.add(this.player.container);

      // Temporary list of chimney positions for smoke generator
      const chimneyPositions: Vector3[] = [];

      // 2. Spawn Static World Objects (walls, roofs, tree)
      WORLD_SPEC.objects.forEach((objSpec) => {
        const model = this.assetLoader.get(objSpec.modelPath);
        
        // Position
        model.position.set(objSpec.position.x, objSpec.position.y, objSpec.position.z);
        
        // Rotation (convert to radians if supplied)
        if (objSpec.rotation) {
          if (objSpec.rotation.x) model.rotation.x = objSpec.rotation.x;
          if (objSpec.rotation.y) model.rotation.y = objSpec.rotation.y;
          if (objSpec.rotation.z) model.rotation.z = objSpec.rotation.z;
        }

        // Scale
        if (objSpec.scale) {
          model.scale.set(objSpec.scale.x, objSpec.scale.y, objSpec.scale.z);
        }

        // Gò cát/cỏ pirate dùng tông CAM của colormap pirate — chọi với màu đất tự vẽ.
        // Thay material trùng tông nền (cát bãi biển '#d9c389' / cỏ đảo '#5d8a4e' sáng hơn chút).
        if (objSpec.modelPath.includes('/patch-')) {
          const moundColor = objSpec.modelPath.includes('patch-sand') ? '#d9c389' : '#689b57';
          model.traverse((child: any) => {
            if (child.isMesh) {
              child.material = new MeshStandardMaterial({ color: moundColor, roughness: 1.0 });
            }
          });
        }

        // Traversal for casting shadows
        model.traverse((child: any) => {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
          }
        });

        this.sceneManager.add(model);

        // Track chimney positions
        if (objSpec.modelPath.includes('chimney.glb')) {
          chimneyPositions.push(new Vector3(objSpec.position.x, objSpec.position.y + 1.6, objSpec.position.z));
        }

        // Track banners for sway/wind animation
        if (objSpec.modelPath.includes('banner')) {
          this.bannerMeshes.push(model);
        }

        // Glow đọc từ spec — KHÔNG hardcode vị trí
        if (objSpec.interactionName) {
          this.sceneManager.registerInteractiveObject(objSpec.interactionName, model);
        }
      });

      // 2b. Spawn NPCs from spec (Guide, Cat, etc.)
      WORLD_SPEC.npcs.forEach((npcSpec) => {
        const npcModel = this.assetLoader.get(npcSpec.modelPath);
        const npcAnimations = this.assetLoader.getAnimations(npcSpec.modelPath);
        const npc = new NPC3D(npcModel, npcAnimations, npcSpec.name);
        
        npc.setPosition(npcSpec.position.x, npcSpec.position.y, npcSpec.position.z);
        
        if (npcSpec.rotationY !== undefined) {
          npc.rotationGroup.rotation.y = npcSpec.rotationY;
        }
        
        if (npcSpec.roam) {
          npc.setRoaming(true, npcSpec.roamRadius || 5);
        }

        if (npcSpec.name === 'npc_guide') {
          npc.addExclamationMark();
        }

        // Scale/speed đọc từ spec (thú cube-pets cần thu nhỏ, trẻ con chạy nhanh...)
        if (npcSpec.scale) {
          npc.mesh.scale.setScalar(npcSpec.scale);
          npc.hitboxSize = { width: 0.5 * npcSpec.scale + 0.2, depth: 0.5 * npcSpec.scale + 0.2 };
        }
        if (npcSpec.speed) {
          npc.speed = npcSpec.speed;
        }

        if (npcSpec.name === 'cat_npc') {
          this.catNPC = npc; // giữ ref để zone tương tác bám theo mèo đi tuần
        }

        this.sceneManager.add(npc.container);
        this.npcs.push(npc);
      });

      // 2c. Setup Chimney Smoke Particles
      const particleGeometry = new SphereGeometry(0.12, 5, 5); // small low-poly sphere
      chimneyPositions.forEach((pos) => {
        // Create 6 smoke particles per chimney
        for (let i = 0; i < 6; i++) {
          const particleMaterial = new MeshStandardMaterial({
            color: '#e5e7eb', // soft white-grey
            roughness: 0.9,
            metalness: 0.1,
            transparent: true,
            opacity: 0.0,
            flatShading: true
          });
          const mesh = new Mesh(particleGeometry, particleMaterial);
          mesh.position.copy(pos);
          this.sceneManager.add(mesh);

          this.smokeParticles.push({
            mesh,
            material: particleMaterial,
            velocity: new Vector3(0, 0, 0),
            life: Math.random() * 2.0, // spread starting life times
            maxLife: 2.0,
            origin: pos
          });
        }
      });

      // 2c. Marker điểm event: CỘT SÁNG vàng từ mặt đất + kim cương xoay trên đỉnh
      WORLD_SPEC.eventMarkers.forEach((spec) => {
        const group = new Group();

        // Cột sáng mờ từ đất lên tới kim cương — thấy rõ từ mọi góc camera
        const beamMat = new MeshBasicMaterial({
          color: 0xffd75e,
          transparent: true,
          opacity: 0.22,
          depthWrite: false, // không che vật phía sau khi trong suốt
        });
        const beam = new Mesh(new CylinderGeometry(0.1, 0.16, spec.y, 8, 1, true), beamMat);
        beam.position.set(spec.x, spec.y / 2, spec.z);
        group.add(beam);

        const material = new MeshStandardMaterial({
          color: 0xffd75e,
          emissive: 0xffc83d,
          emissiveIntensity: 0.85,
          roughness: 0.35,
        });
        const mesh = new Mesh(new OctahedronGeometry(0.28), material);
        mesh.position.set(spec.x, spec.y, spec.z);
        group.add(mesh);

        this.sceneManager.add(group);
        // beamMat mờ dần cùng gem khi đã thăm (đồng bộ trong update qua material chính)
        this.eventMarkers.push({ mesh, material, baseY: spec.y, name: spec.name, beamMat } as any);
      });

      // 2d. Bướm bay quanh các luống hoa
      const flowerSpots = [
        { x: 3.2, z: -6.7 }, { x: -3.2, z: -6.7 }, { x: 0, z: -7.7 },
        { x: 6.5, z: -2.5 }, { x: -6.2, z: -2.5 }, { x: 2.5, z: -7 },
      ];
      flowerSpots.forEach((spot, i) => {
        const mat = new MeshBasicMaterial({ color: i % 2 === 0 ? 0xfff3b0 : 0xffffff });
        const b = new Mesh(new SphereGeometry(0.06, 6, 4), mat);
        b.position.set(spot.x, 0.8, spot.z);
        this.sceneManager.add(b);
        this.butterflies.push({ mesh: b, bx: spot.x, bz: spot.z, phase: i * 1.9 });
      });

      // 3. Force logical resize before rendering to ensure perfect projection alignment
      const parent = this.canvas.parentElement;
      if (parent) {
        const rect = parent.getBoundingClientRect();
        this.resizeCanvas(rect.width, rect.height);
      }

      // 4. Position and snap the camera (sau lưng nhân vật đang quay mặt vào làng)
      this.camera.snapTo(this.player.position, Math.PI);
      this.camera.initControls(this.canvas);

      // 5. Force keyboard focus to the game area
      this.focusGame();

      // 6. Initialize loop outside Angular Zone
      this.loop = new GameLoop(
        this.ngZone,
        (dt) => this.update(dt),
        () => this.render()
      );

      this.loop.start();
      this.analyticsService.trackEvent('game_started', 'Game');

      if (this.gameState.isDialogOpen() || this.gameState.isCharacterMenuOpen() || this.gameState.activeOverlay()) {
        this.loop.pause();
      }

      // Hook test-only (e2e Playwright): chỉ chạy khi URL có CẢ ?debug=... & ?goto=...
      // → mở thẳng một overlay/đối thoại mà không cần đi bộ. Không lộ với người dùng thật.
      this.ngZone.run(() => this.handleTestGotoParam());
    });
  }

  /** Mở overlay/đối thoại theo query param phục vụ e2e — gated sau ?debug để không kích hoạt ở prod thường. */
  private handleTestGotoParam() {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    if (!params.get('debug')) return;

    // Teleport phục vụ e2e: đặt nhân vật tới (px,pz) để test phát hiện zone tương tác tại chỗ.
    const px = params.get('px');
    const pz = params.get('pz');
    if (px !== null && pz !== null && this.player) {
      this.player.setPosition(parseFloat(px), 0, parseFloat(pz));
    }

    const goto = params.get('goto');
    if (!goto) return;

    const aliasMap: { [key: string]: string } = {
      about: 'door_about',
      projects: 'door_projects',
      blog: 'door_blog',
      quest: 'board_quest',
      contact: 'mailbox_contact',
      guide: 'npc_guide',
      well: 'well_easteregg',
      cat: 'cat_npc',
      controls: 'sign_controls',
    };
    this.startInteractionByName(aliasMap[goto] || goto);
  }

  ngOnDestroy() {
    this.inputService.stopListening();
    this.subs.unsubscribe();

    if (this.dialogueTimer) {
      clearInterval(this.dialogueTimer);
      this.dialogueTimer = null;
    }

    if (this.loop) {
      this.loop.stop();
    }

    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }

    // Full memory disposal of WebGL resources to prevent context leak
    if (this.camera) {
      this.camera.dispose();
    }
    if (this.sceneManager) {
      this.sceneManager.dispose();
    }
    if (this.assetLoader) {
      this.assetLoader.clear();
    }

    // Clear Milestone M4 arrays
    this.npcs = [];
    this.catNPC = null;
    this.bannerMeshes = [];
    this.smokeParticles = [];
  }

  // Handle resizing of the canvas container to calculate viewport and zoom
  private setupResizing() {
    const parent = this.canvas.parentElement;
    if (!parent) return;

    this.resizeObserver = new ResizeObserver((entries) => {
      this.ngZone.runOutsideAngular(() => {
        for (const entry of entries) {
          const { width, height } = entry.contentRect;
          this.resizeCanvas(width, height);
        }
      });
    });

    this.resizeObserver.observe(parent);

    // Initial resize
    const rect = parent.getBoundingClientRect();
    this.resizeCanvas(rect.width, rect.height);
  }

  private resizeCanvas(containerWidth: number, containerHeight: number) {
    if (containerWidth <= 0 || containerHeight <= 0) return;

    // Màn < 360px hoặc landscape quá thấp (< 400px height): banner gợi ý
    const isTooSmall = containerWidth < 360 || containerHeight < 400;
    if (this.showSizeWarning() !== isTooSmall) {
      this.ngZone.run(() => {
        this.showSizeWarning.set(isTooSmall);
      });
    }

    // Simply delegate sizing and pixel ratios entirely to Three.js!
    if (this.sceneManager && this.camera) {
      this.sceneManager.resize(containerWidth, containerHeight, this.camera);
    }
  }

  /**
   * Request game input focus (triggered on click/pointerdown or setupScene)
   */
  focusGame() {
    if (!this.gameState.isDialogOpen() && !this.gameState.isCharacterMenuOpen() && !this.gameState.activeOverlay()) {
      this.inputService.setGameFocus(true);
      if (this.canvasRef && this.canvasRef.nativeElement) {
        this.canvasRef.nativeElement.focus();
      }
    }
  }

  private update(dt: number) {
    if (this.isLoading()) return;

    // --- MILESTONE M4: Update NPCs and ambient animations ALWAYS for a lively world ---
    this.npcs.forEach((npc) => {
      npc.update(dt, WORLD_SPEC.colliders);
      // NPC cũng leo gò như người chơi (con cua ở bãi cát đi quanh các gò cát)
      const npcY = this.getPlayerTargetHeight(npc.position.x, npc.position.z);
      npc.container.position.y += (npcY - npc.container.position.y) * 0.18;
    });

    // Update Cat Interaction Zone dynamically to follow the cat's position
    const catZone = WORLD_SPEC.interactionZones.find(z => z.name === 'cat_npc');
    if (catZone && this.catNPC) {
      const catPos = this.catNPC.position;
      catZone.minX = catPos.x - 1.2;
      catZone.maxX = catPos.x + 1.2;
      catZone.minZ = catPos.z - 1.2;
      catZone.maxZ = catPos.z + 1.2;
    }

    // Update ambient sway animations (banners/flags)
    this.elapsedTime += dt;
    this.bannerMeshes.forEach((banner) => {
      banner.rotation.z = Math.sin(this.elapsedTime * 2.2) * 0.08;
    });

    // Bướm: bay lượn quỹ đạo sin quanh luống hoa
    this.butterflies.forEach((b) => {
      const t = this.elapsedTime + b.phase;
      b.mesh.position.x = b.bx + Math.sin(t * 1.3) * 0.8;
      b.mesh.position.z = b.bz + Math.cos(t * 0.9) * 0.6;
      b.mesh.position.y = 0.75 + Math.sin(t * 2.1) * 0.25 + Math.sin(t * 7) * 0.06;
    });

    // Marker event: xoay + nhấp nhô; đã thăm thì lịm xuống xám-xanh và tắt cột sáng
    const visited = this.gameState.visitedFlags();
    this.eventMarkers.forEach((m: any, i) => {
      m.mesh.rotation.y += dt * 2.2;
      m.mesh.position.y = m.baseY + Math.sin(this.elapsedTime * 2.5 + i * 1.3) * 0.12;
      const isVisited = visited.includes(m.name);
      const targetIntensity = isVisited ? 0.12 : 0.85;
      m.material.emissiveIntensity += (targetIntensity - m.material.emissiveIntensity) * 4 * dt;
      if (m.beamMat) {
        const targetOpacity = isVisited ? 0.0 : 0.18 + Math.sin(this.elapsedTime * 3 + i) * 0.06;
        m.beamMat.opacity += (targetOpacity - m.beamMat.opacity) * 4 * dt;
      }
      if (isVisited) {
        m.material.color.setHex(0x8aa394);
      }
    });

    // Update chimney smoke particles rising and fading
    this.smokeParticles.forEach((p) => {
      p.life -= dt;
      if (p.life <= 0) {
        p.life = p.maxLife;
        p.mesh.position.copy(p.origin);
        p.mesh.scale.setScalar(0.18 + Math.random() * 0.25);
        p.velocity.set(
          (Math.random() - 0.5) * 0.35,
          0.7 + Math.random() * 0.5,
          (Math.random() - 0.5) * 0.35
        );
        p.material.opacity = 0.5;
      } else {
        p.mesh.position.addScaledVector(p.velocity, dt);
        const ratio = p.life / p.maxLife;
        p.mesh.scale.addScalar(dt * 0.04);
        p.material.opacity = ratio * 0.5;
      }
    });

    // Update camera and indicators during camera pan, but bypass other updates
    if (this.isCameraPanning) {
      const focusPos = this.cameraFocusOverride() || this.player.position;
      const focusYaw = this.cameraYawOverride() !== null ? this.cameraYawOverride()! : this.player.facingYaw;
      this.camera.update(focusPos, focusYaw, dt);
      
      if (this.indicatorStar) {
        this.indicatorStar.rotation.y += dt * 2;
        this.indicatorStar.position.y = 2.5 + Math.sin(this.elapsedTime * 4) * 0.25;
      }
      return;
    }

    // If dialog is open or menu open or overlay is open, pause player update
    if (this.gameState.isDialogOpen() || this.gameState.isCharacterMenuOpen() || this.gameState.activeOverlay()) {
      return;
    }

    // Update Player movement (input quy đổi theo hướng camera — third person)
    const currentDir = this.inputService.direction();
    this.player.update(dt, currentDir, WORLD_SPEC.colliders, this.camera.getYaw());

    // Calculate and smoothly update Player's Y position based on custom high-terrains (Lookout Hill, stairs, bridge)
    const targetY = this.getPlayerTargetHeight(this.player.position.x, this.player.position.z);
    this.player.position.y += (targetY - this.player.position.y) * 0.18;
    this.player.container.position.y = this.player.position.y;

    // Camera lượn ra sau lưng nhân vật
    const focusPos = this.cameraFocusOverride() || this.player.position;
    const focusYaw = this.cameraYawOverride() !== null ? this.cameraYawOverride()! : this.player.facingYaw;
    this.camera.update(focusPos, focusYaw, dt);

    if (this.indicatorStar) {
      this.indicatorStar.rotation.y += dt * 2;
      this.indicatorStar.position.y = 2.5 + Math.sin(this.elapsedTime * 4) * 0.25;
    }

    // Check interaction zone overlap
    let activeZone: any = null;
    for (const zone of WORLD_SPEC.interactionZones) {
      if (
        this.player.position.x >= zone.minX &&
        this.player.position.x <= zone.maxX &&
        this.player.position.z >= zone.minZ &&
        this.player.position.z <= zone.maxZ
      ) {
        activeZone = zone;
        break;
      }
    }

    // Update component property inside zone only if overlap changed
    if (this.currentInteractionObj() !== activeZone) {
      this.ngZone.run(() => {
        this.currentInteractionObj.set(activeZone);
        this.gameState.activeInteraction.set(activeZone ? activeZone.name : null);
      });
    }

    // Update 3D glow feedback
    if (this.sceneManager) {
      this.sceneManager.updateGlows(activeZone ? activeZone.name : null, dt);
    }
  }

  private render() {
    if (this.sceneManager && this.camera && !this.isLoading()) {
      this.sceneManager.render(this.camera);
    }
  }

  // --- Handlers ---

  handleInteract() {
    if (this.gameState.isDialogOpen()) {
      this.ngZone.run(() => {
        this.advanceDialogue();
      });
    } else if (this.gameState.activeOverlay()) {
      // Do nothing or let user interact with overlay buttons
    } else if (this.gameState.isCharacterMenuOpen()) {
      this.closeCharacterMenu();
    } else {
      // Trigger interaction overlap if available
      this.ngZone.run(() => {
        if (this.currentInteractionObj()) {
          this.startInteractionByName(this.currentInteractionObj()!.name);
        }
      });
    }
  }

  private handleEscape() {
    this.ngZone.run(() => {
      if (this.gameState.isDialogOpen()) {
        this.closeDialogue();
      } else if (this.gameState.isCharacterMenuOpen()) {
        this.closeCharacterMenu();
      } else if (this.gameState.activeOverlay()) {
        this.closeActiveOverlay();
      } else {
        this.skipGame();
      }
    });
  }

  // Quản lý và xử lý tất cả phím hệ thống khi tương tác hội thoại, menu và overlay.
  // Gộp tất cả HostListener keydown thành một bộ lắng nghe duy nhất để tránh xung đột sự kiện của Angular.
  @HostListener('document:keydown', ['$event'])
  handleGlobalKeyDown(event: KeyboardEvent) {
    const key = event.key.toLowerCase();
    const isEscape = event.key === 'Escape' || event.keyCode === 27;
    const isEnter = key === 'enter' || event.key === 'Enter' || event.keyCode === 13 || event.code === 'Enter' || event.code === 'NumpadEnter';
    const isE = key === 'e';
    const isSpace = key === ' ' || key === 'spacebar';
    const isTab = event.key === 'Tab' || event.keyCode === 9;

    // 1. Xử lý phím Escape (Bỏ qua hội thoại, menu, overlay hoặc thoát game)
    if (isEscape) {
      if (this.gameState.activeOverlay() || this.gameState.isDialogOpen() || this.gameState.isCharacterMenuOpen()) {
        event.preventDefault();
        event.stopPropagation();
        this.handleEscape();
        return;
      }
    }

    // 2. Xử lý phím trong hội thoại (Nhấn E, Enter hoặc Spacebar để tiếp tục thoại, hoặc di chuyển/chọn tùy chọn bằng phím)
    if (this.gameState.isDialogOpen()) {
      if (this.showGuideOptions()) {
        if (key === 'arrowup' || key === 'w') {
          event.preventDefault();
          event.stopPropagation();
          const prevIndex = (this.activeGuideOptionIndex() - 1 + 3) % 3;
          this.activeGuideOptionIndex.set(prevIndex);
          return;
        }
        if (key === 'arrowdown' || key === 's') {
          event.preventDefault();
          event.stopPropagation();
          const nextIndex = (this.activeGuideOptionIndex() + 1) % 3;
          this.activeGuideOptionIndex.set(nextIndex);
          return;
        }
        if (key === '1') {
          event.preventDefault();
          event.stopPropagation();
          this.selectGuideOption('projects');
          return;
        }
        if (key === '2') {
          event.preventDefault();
          event.stopPropagation();
          this.selectGuideOption('about');
          return;
        }
        if (key === '3') {
          event.preventDefault();
          event.stopPropagation();
          this.selectGuideOption('none');
          return;
        }
        if (isE || isEnter || isSpace) {
          event.preventDefault();
          event.stopPropagation();
          const currentIndex = this.activeGuideOptionIndex();
          if (currentIndex === 0) {
            this.selectGuideOption('projects');
          } else if (currentIndex === 1) {
            this.selectGuideOption('about');
          } else {
            this.selectGuideOption('none');
          }
          return;
        }
      } else {
        if (isE || isEnter || isSpace) {
          event.preventDefault();
          event.stopPropagation();
          this.advanceDialogue();
          return;
        }
      }
    }

    // 3. Xử lý mở/đóng Character Menu (phím C)
    if (this.gameState.isCharacterMenuOpen() && key === 'c') {
      event.preventDefault();
      event.stopPropagation();
      this.closeCharacterMenu();
      return;
    }

    // 4. Xử lý Tab Trap cho form và menu để tránh vỡ a11y focus
    if (isTab) {
      const activeOverlay = this.gameState.activeOverlay();
      const isCharOpen = this.gameState.isCharacterMenuOpen();
      if (activeOverlay || isCharOpen) {
        const overlayEl = document.querySelector('.game-world__menu-overlay');
        if (overlayEl) {
          const focusableElements = overlayEl.querySelectorAll('button, [href], input, select, textarea, [tabindex="0"]');
          if (focusableElements.length > 0) {
            const firstElement = focusableElements[0] as HTMLElement;
            const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;
            if (event.shiftKey) {
              if (document.activeElement === firstElement) {
                lastElement.focus();
                event.preventDefault();
                event.stopPropagation();
              }
            } else {
              if (document.activeElement === lastElement) {
                firstElement.focus();
                event.preventDefault();
                event.stopPropagation();
              }
            }
          } else {
            event.preventDefault();
            event.stopPropagation();
          }
        }
      }
    }

    // 5. Xử lý phím di chuyển và chọn trong các bảng hiển thị (Overlays)
    const activeOverlay = this.gameState.activeOverlay();
    const isBackspace = key === 'backspace';

    if (activeOverlay) {
      // 5.1. Nếu ở trang chi tiết, nhấn Escape, Backspace hoặc E để quay lại trang danh sách
      if (activeOverlay === 'quest' && this.selectedExperience() !== null) {
        if (isEscape || isBackspace || isE) {
          event.preventDefault();
          event.stopPropagation();
          this.selectedExperience.set(null);
          return;
        }
      }
      if (activeOverlay === 'projects' && this.selectedProject() !== null) {
        if (isEscape || isBackspace || isE) {
          event.preventDefault();
          event.stopPropagation();
          this.selectedProject.set(null);
          return;
        }
      }

      // Ngăn chặn cuộn trang mặc định của trình duyệt cho phím di chuyển khi bảng đang mở
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' ', 'spacebar', 'backspace'].includes(key)) {
        event.preventDefault();
        event.stopPropagation();
      }

      // 5.2. Trang danh sách nhiệm vụ (Quest List)
      if (activeOverlay === 'quest' && this.selectedExperience() === null) {
        const list = this.experiences();
        if (list.length > 0) {
          if (key === 'arrowup' || key === 'w') {
            const nextIdx = (this.activeItemIndex() - 1 + list.length) % list.length;
            this.activeItemIndex.set(nextIdx);
            return;
          }
          if (key === 'arrowdown' || key === 's') {
            const nextIdx = (this.activeItemIndex() + 1) % list.length;
            this.activeItemIndex.set(nextIdx);
            return;
          }
          if (isEnter || isSpace || isE) {
            this.selectedExperience.set(list[this.activeItemIndex()]);
            return;
          }
        }
      }

      // 5.3. Trang danh sách dự án (Project Grid List)
      if (activeOverlay === 'projects' && this.selectedProject() === null) {
        const list = this.projects();
        if (list.length > 0) {
          if (key === 'arrowup' || key === 'arrowleft' || key === 'w' || key === 'a') {
            const nextIdx = (this.activeItemIndex() - 1 + list.length) % list.length;
            this.activeItemIndex.set(nextIdx);
            return;
          }
          if (key === 'arrowdown' || key === 'arrowright' || key === 's' || key === 'd') {
            const nextIdx = (this.activeItemIndex() + 1) % list.length;
            this.activeItemIndex.set(nextIdx);
            return;
          }
          if (isEnter || isSpace || isE) {
            this.selectedProject.set(list[this.activeItemIndex()]);
            return;
          }
        }
      }

      // 5.4. Kệ sách thư viện (Blog Library)
      if (activeOverlay === 'blog') {
        const list = this.blogs().slice(0, 8); // Chỉ lấy 8 cuốn trên kệ
        if (list.length > 0) {
          if (key === 'arrowup' || key === 'arrowleft' || key === 'w' || key === 'a') {
            const nextIdx = (this.activeItemIndex() - 1 + list.length) % list.length;
            this.activeItemIndex.set(nextIdx);
            return;
          }
          if (key === 'arrowdown' || key === 'arrowright' || key === 's' || key === 'd') {
            const nextIdx = (this.activeItemIndex() + 1) % list.length;
            this.activeItemIndex.set(nextIdx);
            return;
          }
          if (isEnter || isSpace || isE) {
            this.navigateToRoute('/blogs/' + list[this.activeItemIndex()].id);
            return;
          }
        }
      }
    }
  }

  // Mobile virtual buttons
  setMobileDirection(x: -1 | 0 | 1, y: -1 | 0 | 1) {
    this.inputService.setMobileDirection(x, y);
  }

  triggerMobileInteract() {
    this.inputService.triggerInteraction();
  }

  skipGame() {
    this.analyticsService.trackEvent('skip_to_classic', 'Game');
    this.gameBridge.skipGame();
  }

  toggleCharacterMenu() {
    if (this.gameState.isCharacterMenuOpen()) {
      this.closeCharacterMenu();
    } else {
      this.openCharacterMenu();
    }
  }

  openCharacterMenu() {
    this.gameState.setCharacterMenuOpen(true);
  }

  closeCharacterMenu() {
    this.gameState.setCharacterMenuOpen(false);
    this.focusGame();
  }

  closeActiveOverlay() {
    this.gameState.activeOverlay.set(null);
    this.selectedProject.set(null);
    this.selectedExperience.set(null);
    this.focusGame();
  }

  navigateToRoute(path: string) {
    this.analyticsService.trackEvent('navigated_to_' + path, 'Game');
    this.gameBridge.skipGame(); // sets mode to 'classic'
    this.gameState.closeDialog();
    this.gameState.setCharacterMenuOpen(false);
    this.gameState.activeOverlay.set(null);
    this.router.navigate([path]);
  }

  getInteractionLabel(name: string): string {
    switch (name) {
      case 'npc_guide': return 'Nói chuyện với NPC Hướng Dẫn 💬';
      case 'door_about': return 'Vào nhà của DE013 🏠';
      case 'door_projects': 
      case 'desk_projects': 
        return 'Xem xưởng chế tác (Projects) ⚒️';
      case 'door_blog': return 'Vào thư viện (Blog) 📚';
      case 'board_quest': 
      case 'quest_board': 
        return 'Xem bảng nhiệm vụ (Experience) 🛡️';
      case 'mailbox_contact': return 'Gửi tin nhắn liên hệ (Contact) 📫';
      case 'sign_controls': 
      case 'signpost_help': 
        return 'Đọc biển hướng dẫn điều khiển 🪧';
      case 'sign_skip': return 'Sử dụng đường tắt (Skip Game) 🚪';
      case 'well_easteregg': return 'Xem giếng nước cổ ⛲';
      case 'cat_npc': return 'Vuốt ve chú mèo 🐱';
      default: return 'Tương tác [E]';
    }
  }

  getInteractionDialogText(name: string): string {
    switch (name) {
      case 'npc_guide':
        return 'Chào mừng bạn đến với Ngôi Làng 3D của DE013! Hãy dùng các phím WASD hoặc phím Mũi tên để di chuyển. Bạn có thể ghé thăm Nhà của tôi (About), Xưởng chế tác (Projects), Thư viện (Blog) hoặc Bảng nhiệm vụ (Experiences) bằng cách đến gần tòa nhà và nhấn phím E nhé!';
      case 'door_about':
        return 'Chào mừng đến với nhà của DE013! Tôi là Kỹ sư Hệ thống Thông tin với hơn 1 năm kinh nghiệm Fullstack, thiên về Backend. Đây là nơi chứa thông tin về bản thân và các kỹ năng: NestJS, Spring Boot, Angular, PostgreSQL, Docker.';
      case 'door_projects':
      case 'desk_projects':
        return 'Bạn đang đứng trước Xưởng Chế Tác (Workshop). Nơi đây trưng bày các "món đồ" đặc biệt chính là các dự án của tôi. Hãy nhấn Xem Dự Án trong Classic Mode để đọc chi tiết hoặc xem code nhé!';
      case 'door_blog':
        return 'Thư viện tri thức của DE013! Nơi lưu giữ các bài viết chia sẻ về công nghệ, lập trình Web, hệ thống Backend và những kinh nghiệm quý báu tích lũy được trong quá trình học tập và làm việc.';
      case 'board_quest':
      case 'quest_board':
        return 'Bảng Nhiệm Vụ hiển thị các "quest" lớn tôi đã vượt qua: từ CMS quản trị game (Spring Boot + Angular) đến hệ thống quản lý phòng kiểm nghiệm chuẩn ISO 17025 (NestJS + Next.js) — đầy đủ chiến tích Fullstack thực chiến.';
      case 'mailbox_contact':
        return 'Hòm thư liên lạc đã sẵn sàng! Gửi cho NPC DE013 một tin nhắn để cùng nhau tạo ra các sản phẩm công nghệ đột phá nhé. Đã liên kết form gửi mail tự động.';
      case 'sign_controls':
      case 'signpost_help':
        return 'HƯỚNG DẪN: Di chuyển bằng cụm phím WASD hoặc phím Mũi tên. Nhấn phím E / Enter / Spacebar để tương tác với các tòa nhà. Nhấn phím C để xem Menu Nhân Vật (Kỹ năng). Nhấn ESC để bỏ qua game!';
      case 'sign_skip':
        return 'ĐƯỜNG TẮT RA QUỐC LỘ: Bạn có muốn bỏ qua phần chơi game và chuyển sang giao diện danh sách truyền thống (Classic Mode) để xem nhanh thông tin không? Bấm phím E lần nữa để đi tiếp!';
      case 'well_easteregg':
        return 'Bạn nhìn xuống giếng nước sâu thẳm và nghe thấy tiếng vọng... Chúc mừng bạn đã mở khóa Easter Egg: Đạt danh hiệu "Tò mò"!';
      case 'cat_npc':
        return 'Meo meo... 🐱 (Chú mèo dụi đầu vào chân bạn. Hình như nó muốn dẫn bạn đến những nơi có cột sáng vàng.)';
      default:
        return 'Bạn vừa kích hoạt tương tác ' + name + '! Nội dung chi tiết của khu vực này đang được liên kết hoàn thiện.';
    }
  }

  getInteractionTitle(name: string): string {
    switch (name) {
      case 'npc_guide': return '💬 NPC HƯỚNG Dẫn';
      case 'door_about': return '🏠 NHÀ CỦA DE013 (ABOUT)';
      case 'door_projects':
      case 'desk_projects': 
        return '⚒️ XƯỞNG CHẾ TÁC (PROJECTS)';
      case 'door_blog': return '📚 THƯ VIỆN SÁCH (BLOG)';
      case 'board_quest':
      case 'quest_board': 
        return '🛡️ BẢNG NHIỆM VỤ (EXPERIENCE)';
      case 'mailbox_contact': return '📫 HÒM THƯ LIÊN LẠC (CONTACT)';
      case 'sign_controls':
      case 'signpost_help': 
        return '🪧 BẢNG ĐIỀU KHIỂN';
      case 'sign_skip': return '🚪 ĐƯỜNG TẮT RA QUỐC LỘ';
      case 'well_easteregg': return '⛲ GIẾNG NƯỚC CỔ TÍCH';
      case 'cat_npc': return '🐱 MÈO ĐẢO';
      default: return '🔮 SỰ KIỆN';
    }
  }

  // --- Dialogue Sequence Controller & Typewriter ---

  openDialogueSequence(name: string) {
    this.gameState.openDialog(name);
    this.showGuideOptions.set(false);
    this.activeGuideOptionIndex.set(0);
    
    let queue: string[] = [];
    if (name === 'npc_guide') {
      queue = [
        'Chào mừng bạn đến với Ngôi Làng 3D của DE013! Tôi là NPC Hướng Dẫn. 💬',
        'Hãy dùng các phím WASD hoặc phím Mũi tên để di chuyển.',
        'Bạn có thể ghé thăm Nhà của tôi (About), Xưởng chế tác (Projects), Thư viện (Blog) hoặc Bảng nhiệm vụ (Experiences) bằng cách đến gần tòa nhà và nhấn phím E nhé!',
        'Bạn muốn tôi hướng dẫn đi xem khu vực nào trước không?'
      ];
    } else if (name === 'well_easteregg') {
      queue = [
        'Bạn nhìn xuống giếng nước sâu thẳm... ⛲',
        'Và nghe thấy tiếng vọng vọng lại từ lòng đất...',
        'Chúc mừng bạn đã mở khóa Easter Egg: Đạt danh hiệu "Kẻ Tò Mò"!'
      ];
    } else if (name === 'cat_npc') {
      queue = [
        'Meo meo... 🐱',
        '(Chú mèo dụi đầu vào chân bạn, kêu gừ gừ hài lòng.)',
        '(Nó liếc về phía những CỘT SÁNG VÀNG như muốn nói: "đi xem đi!")'
      ];
    } else if (name === 'sign_controls' || name === 'signpost_help') {
      queue = [
        'HƯỚNG DẪN BẢN ĐỒ: 🪧',
        'Di chuyển: dùng các phím WASD hoặc phím Mũi tên.',
        'Tương tác: nhấn phím E / Enter / Spacebar khi đứng gần công trình.',
        'Menu nhân vật: nhấn phím C để xem thông tin kỹ năng.',
        'Đường tắt: nhấn ESC hoặc nút "Skip Game" để thoát game bất kỳ lúc nào.'
      ];
    } else if (name === 'sign_skip') {
      queue = [
        '🚪 ĐƯỜNG TẮT RA QUỐC LỘ:',
        'Bạn có muốn bỏ qua thế giới 3D và quay về giao diện Portfolio Classic không?',
        'Nhấn phím tương tác (E / Enter / Space) thêm một lần nữa để XÁC NHẬN BỎ QUA!'
      ];
    } else {
      queue = [this.getInteractionDialogText(name)];
    }

    this.dialogueQueue.set(queue);
    this.dialogueIndex.set(0);
    this.startDialogueTypewriter(queue[0]);
  }

  startDialogueTypewriter(text: string) {
    this.fullDialogueText.set(text);
    this.displayedDialogueText.set('');
    
    // Check prefers-reduced-motion to skip typewriter effect instantly
    const prefersReducedMotion = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      this.displayedDialogueText.set(text);
      this.isDialogueTyping.set(false);
      return;
    }

    this.isDialogueTyping.set(true);
    this.dialogueCharIndex = 0;
    if (this.dialogueTimer) {
      clearInterval(this.dialogueTimer);
    }
    this.dialogueTimer = setInterval(() => {
      if (this.dialogueCharIndex < text.length) {
        this.displayedDialogueText.set(text.substring(0, this.dialogueCharIndex + 1));
        this.dialogueCharIndex++;
      } else {
        this.finishDialogueTypewriter();
      }
    }, 30);
  }

  finishDialogueTypewriter() {
    if (this.dialogueTimer) {
      clearInterval(this.dialogueTimer);
      this.dialogueTimer = null;
    }
    this.displayedDialogueText.set(this.fullDialogueText());
    this.isDialogueTyping.set(false);
  }

  advanceDialogue() {
    if (this.isDialogueTyping()) {
      this.finishDialogueTypewriter();
      return;
    }

    const currentIndex = this.dialogueIndex();
    const queue = this.dialogueQueue();
    const activeName = this.gameState.activeInteraction();

    if (activeName === 'npc_guide' && currentIndex === queue.length - 1) {
      this.showGuideOptions.set(true);
      return;
    }

    if (activeName === 'sign_skip' && currentIndex === queue.length - 1) {
      this.skipGame();
      this.closeDialogue();
      return;
    }

    if (currentIndex < queue.length - 1) {
      const nextIndex = currentIndex + 1;
      this.dialogueIndex.set(nextIndex);
      this.startDialogueTypewriter(queue[nextIndex]);
    } else {
      this.closeDialogue();
    }
  }

  closeDialogue() {
    this.gameState.closeDialog();
    this.dialogueQueue.set([]);
    this.dialogueIndex.set(0);
    this.showGuideOptions.set(false);
    this.finishDialogueTypewriter();
    this.focusGame();
  }

  selectGuideOption(option: string) {
    this.closeDialogue();
    if (option === 'projects') {
      this.toastService.info('📷 Camera di chuyển đến Xưởng chế tác!');
      this.triggerCameraPan(-8.5, -1, -Math.PI / 2);
    } else if (option === 'about') {
      this.toastService.info('📷 Camera di chuyển đến Nhà DE013!');
      // yaw π → camera đứng phía nam (z lớn hơn) nhìn vào mặt tiền nhà (cửa hướng +Z)
      this.triggerCameraPan(4.5, -8, Math.PI);
    }
  }

  triggerCameraPan(targetX: number, targetZ: number, yaw: number) {
    this.isCameraPanning = true;
    this.cameraFocusOverride.set({ x: targetX, y: 0, z: targetZ });
    this.cameraYawOverride.set(yaw);
    
    // Spawn/activate indicator star for projects workshop
    if (targetX === -8.5) {
      if (!this.indicatorStar) {
        const starGeom = new SphereGeometry(0.25, 5, 5); // diamond style
        const starMat = new MeshStandardMaterial({ color: 0xffd700, emissive: 0x332200, roughness: 0.1 });
        this.indicatorStar = new Mesh(starGeom, starMat);
        this.indicatorStar.position.set(-8.5, 2.5, -1);
        this.sceneManager.add(this.indicatorStar);
      }
    }

    // Return control back after 4 seconds
    setTimeout(() => {
      this.isCameraPanning = false;
      this.cameraFocusOverride.set(null);
      this.cameraYawOverride.set(null);
      this.focusGame();
    }, 4000);
  }

  startInteractionByName(name: string) {
    const overlayMap: { [key: string]: string } = {
      'door_about': 'about',
      'door_projects': 'projects',
      'desk_projects': 'projects',
      'door_blog': 'blog',
      'board_quest': 'quest',
      'quest_board': 'quest',
      'mailbox_contact': 'contact'
    };

    if (overlayMap[name]) {
      this.gameState.activeOverlay.set(overlayMap[name]);
      this.gameState.addVisitedLocation(name);
      this.analyticsService.trackEvent('building_entered_' + name, 'Game');
      
      if (overlayMap[name] === 'projects') {
        this.loadProjects();
      } else if (overlayMap[name] === 'blog') {
        this.loadBlogs();
      }
    } else {
      this.openDialogueSequence(name);
      this.analyticsService.trackEvent('dialogue_started_' + name, 'Game');
    }
  }

  // --- API / Stats loaders ---

  private loadSkills() {
    this.skillsService.list({ noPagination: true }).subscribe({
      next: (res: any) => {
        if (res.status === JCode.SUCCESS) {
          this.skills.set(res.data?.data_list || []);
        }
      }
    });
  }

  private calculateYearsOfExperience() {
    this.isLoadingExperiences.set(true);
    this.experiencesService.list({ page: 1, size: 100 }).subscribe({
      next: (res: any) => {
        if (res.status === JCode.SUCCESS) {
          const list = res.data?.data_list || [];
          this.experiences.set(list);
          if (list.length > 0) {
            let earliestDate: Date | null = null;
            list.forEach((exp: any) => {
              if (exp.join_date) {
                const d = new Date(exp.join_date);
                if (!earliestDate || d < earliestDate) {
                  earliestDate = d;
                }
              }
            });
            if (earliestDate) {
              const diffMs = Date.now() - (earliestDate as Date).getTime();
              const diffYears = Math.floor(diffMs / (1000 * 60 * 60 * 24 * 365.25));
              this.yearsOfExperience.set(diffYears > 0 ? diffYears : 1);
            }
          }
        }
        this.isLoadingExperiences.set(false);
      },
      error: () => {
        this.isLoadingExperiences.set(false);
      }
    });
  }

  loadProjects() {
    this.isLoadingProjects.set(true);
    this.projectsService.list({ page: 1, size: 100 }).subscribe({
      next: (res: any) => {
        if (res.status === JCode.SUCCESS) {
          this.projects.set(res.data?.data_list || []);
        }
        this.isLoadingProjects.set(false);
      },
      error: () => {
        this.isLoadingProjects.set(false);
      }
    });
  }

  loadBlogs() {
    this.isLoadingBlogs.set(true);
    this.blogService.list({ page: 1, size: 50 }).subscribe({
      next: (res: any) => {
        if (res.status === JCode.SUCCESS || res.data) {
          this.blogs.set(res.data?.data_list || []);
        }
        this.isLoadingBlogs.set(false);
      },
      error: () => {
        this.isLoadingBlogs.set(false);
      }
    });
  }

  submitContactForm() {
    if (!this.contactForm.full_name || !this.contactForm.email || !this.contactForm.message) {
      this.toastService.error('Vui lòng điền đầy đủ các trường bắt buộc!');
      return;
    }
    
    this.isSubmittingContact.set(true);
    this.contactService.create(this.contactForm).subscribe({
      next: (res: any) => {
        this.toastService.success('Tin nhắn đã gửi! Cảm ơn bạn đã liên hệ.');
        this.analyticsService.trackEvent('contact_from_game', 'Game');
        this.contactForm = { full_name: '', email: '', subject: '', message: '' };
        this.isSubmittingContact.set(false);
        this.closeActiveOverlay();
      },
      error: () => {
        this.toastService.error('Có lỗi xảy ra khi gửi tin nhắn, vui lòng thử lại.');
        this.isSubmittingContact.set(false);
      }
    });
  }

  getBookSpineColor(id: string | number): string {
    const colors = [
      '#9e2a2b', // dark red
      '#3f5e5a', // green
      '#243e36', // forest green
      '#5f0f40', // purple
      '#0f4c5c', // blue
      '#e36414', // orange
      '#fb8b24', // light orange
      '#335c67'  // teal
    ];
    const hash = String(id).split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
  }

  formatDate(dateString: string): string {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('vi-VN', { year: 'numeric', month: 'short' });
    } catch {
      return dateString;
    }
  }

  getDateRange(joinDate: string, leaveDate: string): string {
    const start = this.formatDate(joinDate);
    const end = leaveDate ? this.formatDate(leaveDate) : 'Hiện tại';
    return `${start} - ${end}`;
  }

  getQuestRewards(exp: any): string {
    const base = '+500 XP Cổ điển';
    if (exp.skills && exp.skills.length > 0) {
      const skillRewards = exp.skills.map((s: any) => `+${300 + (s.name.length * 20) % 500} XP ${s.name}`);
      return [base, ...skillRewards].join(', ');
    }
    return `${base}, +300 XP Teamwork, +400 XP Soft Skills`;
  }

  getSkillPercentage(skill: Skill): number {
    const val = 60 + ((skill.name.length * 7) % 36);
    return val;
  }

  getSkillLevel(skill: Skill): number {
    const percent = this.getSkillPercentage(skill);
    return Math.max(1, Math.min(10, Math.floor(percent / 10)));
  }

  getPlayerTargetHeight(x: number, z: number): number {
    // Nền = đảo phẳng y=0 + VỊNH CÁT trũng dần ra biển (beachDepth — cùng hàm với mesh cát).
    // Cộng thêm GÒ cát/cỏ (patch-*) nhô 0.25 so với nền tại chỗ — dome cos cho dốc thoải.
    // (KHÔNG thêm địa hình nào không có trong world-spec — từng có "cây cầu ma" gây trôi lơ lửng.)
    const base = beachDepth(x, z);
    let dome = 0;
    for (const m of this.terrainMounds) {
      const d = Math.hypot(x - m.x, z - m.z);
      if (d < m.r) {
        dome = Math.max(dome, m.h * Math.cos((d / m.r) * (Math.PI / 2)));
      }
    }
    return base + dome;
  }
}
