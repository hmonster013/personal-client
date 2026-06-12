import { 
  Component, 
  OnInit, 
  OnDestroy, 
  AfterViewInit, 
  ElementRef, 
  ViewChild, 
  NgZone, 
  inject, 
  signal
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { GameStateService } from './services/game-state.service';
import { GameBridgeService } from './services/game-bridge.service';
import { InputService } from './engine/input.service';
import { GameLoop } from './engine/game-loop';
import { SceneManager } from './engine/scene-manager';
import { FollowCamera } from './engine/follow-camera';
import { AssetLoader } from './engine/asset-loader';
import { Player3D } from './entities/player-3d';
import { NPC3D } from './entities/npc-3d';
import { Vector3, SphereGeometry, MeshStandardMaterial, Mesh } from 'three';
import { WORLD_SPEC } from './world/world-spec';
import { SkillsService } from '../core/services/skills.service';
import { ExperiencesService } from '../core/services/experiences.service';
import { Skill } from '../core/models';
import { JCode } from '../shared/utils/JCode';
import { Subscription } from 'rxjs';

const PLAYER_MODEL = 'assets/game3d/models/chars/character-male-a.glb';

@Component({
  selector: 'app-game',
  standalone: true,
  imports: [CommonModule],
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

  // Loading signals
  isLoading = signal<boolean>(true);
  loadingProgress = signal<number>(0);

  // Stats signals for character menu
  skills = signal<Skill[]>([]);
  yearsOfExperience = signal<number>(4);

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

        if (npcSpec.name === 'cat_npc') {
          // Adjust cat scale and speed to make it look like a small cute animal
          npc.mesh.scale.set(0.24, 0.24, 0.24);
          npc.hitboxSize = { width: 0.3, depth: 0.3 };
          npc.speed = 1.2; // slow cute pacing
          this.catNPC = npc;
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
    });
  }

  ngOnDestroy() {
    this.inputService.stopListening();
    this.subs.unsubscribe();

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

    // Simply delegate sizing and pixel ratios entirely to Three.js!
    if (this.sceneManager && this.camera) {
      this.sceneManager.resize(containerWidth, containerHeight, this.camera);
    }
  }

  /**
   * Request game input focus (triggered on click/pointerdown or setupScene)
   */
  focusGame() {
    this.inputService.setGameFocus(true);
  }

  private update(dt: number) {
    if (this.isLoading()) return;

    // --- MILESTONE M4: Update NPCs and ambient animations ALWAYS for a lively world ---
    this.npcs.forEach((npc) => {
      npc.update(dt, WORLD_SPEC.colliders);
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

    // If dialog is open or menu open, pause player update
    if (this.gameState.isDialogOpen() || this.gameState.isCharacterMenuOpen()) {
      return;
    }

    // Update Player movement (input quy đổi theo hướng camera — third person)
    const currentDir = this.inputService.direction();
    this.player.update(dt, currentDir, WORLD_SPEC.colliders, this.camera.getYaw());

    // Camera lượn ra sau lưng nhân vật
    this.camera.update(this.player.position, this.player.facingYaw, dt);

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
      const activeName = this.gameState.activeInteraction();
      if (activeName === 'sign_skip') {
        this.skipGame();
      }
      // Close active dialog
      this.ngZone.run(() => {
        this.gameState.closeDialog();
      });
    } else if (this.gameState.isCharacterMenuOpen()) {
      // Close active stats menu
      this.ngZone.run(() => {
        this.gameState.setCharacterMenuOpen(false);
      });
    } else {
      // Trigger interaction overlap if available
      this.ngZone.run(() => {
        if (this.currentInteractionObj() && !this.gameState.isDialogOpen()) {
          this.gameBridge.triggerInteraction(this.currentInteractionObj()!.name);
        }
      });
    }
  }

  private handleEscape() {
    this.ngZone.run(() => {
      if (this.gameState.isDialogOpen()) {
        this.gameState.closeDialog();
      } else if (this.gameState.isCharacterMenuOpen()) {
        this.gameState.setCharacterMenuOpen(false);
      } else {
        this.skipGame();
      }
    });
  }

  // Mobile virtual buttons
  setMobileDirection(x: -1 | 0 | 1, y: -1 | 0 | 1) {
    this.inputService.setMobileDirection(x, y);
  }

  triggerMobileInteract() {
    this.inputService.triggerInteraction();
  }

  skipGame() {
    this.gameBridge.skipGame();
  }

  toggleCharacterMenu() {
    this.gameState.toggleCharacterMenu();
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
      case 'cat_npc': return 'Chơi với mèo 🐱';
      default: return 'Tương tác [E]';
    }
  }

  getInteractionDialogText(name: string): string {
    switch (name) {
      case 'npc_guide':
        return 'Chào mừng bạn đến với Ngôi Làng 3D của DE013! Hãy dùng các phím WASD hoặc phím Mũi tên để di chuyển. Bạn có thể ghé thăm Nhà của tôi (About), Xưởng chế tác (Projects), Thư viện (Blog) hoặc Bảng nhiệm vụ (Experiences) bằng cách đến gần tòa nhà và nhấn phím E nhé!';
      case 'door_about': 
        return 'Chào mừng đến với nhà của DE013! Tôi là Kỹ sư Hệ thống Thông tin tốt nghiệp xuất sắc. Đây là nơi chứa đựng các thông tin cơ bản về bản thân, các kỹ năng lập trình Angular, Python, và kinh nghiệm xử lý dữ liệu.';
      case 'door_projects':
      case 'desk_projects':
        return 'Bạn đang đứng trước Xưởng Chế Tác (Workshop). Nơi đây trưng bày các "món đồ" đặc biệt chính là các dự án của tôi. Hãy nhấn Xem Dự Án trong Classic Mode để đọc chi tiết hoặc xem code nhé!';
      case 'door_blog':
        return 'Thư viện tri thức của DE013! Nơi lưu giữ các bài viết chia sẻ về công nghệ, lập trình Web, Data Engineering và những kinh nghiệm quý báu tích lũy được trong quá trình học tập và làm việc.';
      case 'board_quest':
      case 'quest_board':
        return 'Bảng Nhiệm Vụ hiển thị các "quest" lớn tôi đã vượt qua: thực tập và làm việc tại các công ty công nghệ lớn, hoàn thành nhiệm vụ Fullstack & Data Engineer thực chiến.';
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
        return 'Meo meo... Chào bạn! Tôi là chú mèo đi tuần của ngôi làng. Website nào có mèo cũng sẽ trở nên đáng yêu hơn rất nhiều đúng không nào?';
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
      case 'cat_npc': return '🐱 MÈO CON LAN THANG';
      default: return '🔮 SỰ KIỆN';
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
    this.experiencesService.list({ page: 1, size: 100 }).subscribe({
      next: (res: any) => {
        if (res.status === JCode.SUCCESS) {
          const list = res.data?.data_list || [];
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
      }
    });
  }

  getSkillPercentage(skill: Skill): number {
    const val = 60 + ((skill.name.length * 7) % 36);
    return val;
  }

  getSkillLevel(skill: Skill): number {
    const percent = this.getSkillPercentage(skill);
    return Math.max(1, Math.min(10, Math.floor(percent / 10)));
  }
}
