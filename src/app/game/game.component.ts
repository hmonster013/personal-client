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
  HostListener
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { GameStateService } from './services/game-state.service';
import { GameBridgeService } from './services/game-bridge.service';
import { InputService } from './engine/input.service';
import { GameLoop } from './engine/game-loop';
import { Camera } from './engine/camera';
import { Tilemap, TiledMapJSON } from './engine/tilemap';
import { Player } from './entities/player';
import { NPC } from './entities/npc';
import { InteractionSystem, InteractionObject } from './engine/interaction';
import { SkillsService } from '../core/services/skills.service';
import { ExperiencesService } from '../core/services/experiences.service';
import { Skill } from '../core/models';
import { JCode } from '../shared/utils/JCode';
import { Subscription } from 'rxjs';

// Import map JSON directly
import * as mapDataRaw from './world/village.map.json';
const mapData = (mapDataRaw as any).default || mapDataRaw;

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

  // Stats signals for character menu
  skills = signal<Skill[]>([]);
  yearsOfExperience = signal<number>(4);

  // Engine objects
  private canvas!: HTMLCanvasElement;
  private ctx!: CanvasRenderingContext2D;
  private loop!: GameLoop;
  private camera!: Camera;
  private tilemap!: Tilemap;
  private player!: Player;
  private npcs: NPC[] = [];
  private interactionSystem!: InteractionSystem;

  // Asset canvases (generated dynamically)
  private tilesetCanvas!: HTMLCanvasElement;
  private playerCanvas!: HTMLCanvasElement;

  // Overlap tracking
  currentInteractionObj = signal<InteractionObject | null>(null);

  // Subscriptions
  private subs = new Subscription();

  // ResizeObserver to handle canvas resizing
  private resizeObserver!: ResizeObserver;

  ngOnInit() {
    this.loadSkills();
    this.calculateYearsOfExperience();
    this.generateAssets();

    // Listen to Keyboard and Touch interactions.
    // Đăng ký NGOÀI zone: phím giữ di chuyển auto-repeat liên tục, nếu listener nằm trong zone
    // thì mỗi keydown/keyup đều trigger change detection. Các handler bên dưới tự ngZone.run()
    // ở đúng chỗ cần cập nhật UI.
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
    const context = this.canvas.getContext('2d');
    if (!context) {
      console.error('Could not get 2D context for canvas');
      return;
    }
    this.ctx = context;
    this.ctx.imageSmoothingEnabled = false;

    // Initialize systems
    this.tilemap = new Tilemap();
    this.tilemap.loadMap(mapData as TiledMapJSON, this.tilesetCanvas);

    // Load real tileset asynchronously, fallback to this.tilesetCanvas on error
    const realTileset = new Image();
    realTileset.src = 'assets/game/tileset-village.png';
    realTileset.onload = () => {
      this.ngZone.runOutsideAngular(() => {
        this.tilemap.loadMap(mapData as TiledMapJSON, realTileset);
      });
    };
    realTileset.onerror = (err) => {
      console.warn('Failed to load real tileset image, falling back to code-generated tileset canvas.', err);
    };

    // Camera will be properly configured on resize
    this.camera = new Camera(320, 240, 3);
    this.camera.setMapSize(this.tilemap.pixelWidth, this.tilemap.pixelHeight);

    // Spawn Player near center (320, 240 is central plaza spawn)
    this.player = new Player(this.playerCanvas, 320, 240);
    this.camera.snapTo(this.player.x, this.player.y);

    // Spawn NPCs
    this.spawnNPCs();

    // Spawn Interaction System
    this.interactionSystem = new InteractionSystem(this.gameState, this.gameBridge);

    // Initialize loop outside Angular Zone
    this.loop = new GameLoop(
      this.ngZone,
      (dt) => this.update(dt),
      (interpolation) => this.render(interpolation)
    );

    // Setup responsive canvas resizing
    this.setupResizing();

    // Start loop
    this.loop.start();
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

    // Zoom phải là bội số nguyên theo PIXEL VẬT LÝ, không phải CSS px —
    // Windows scaling 125%/150% làm 1 CSS px = 1.25/1.5 pixel thật, zoom nguyên
    // theo CSS px vẫn cho ô pixel lệch nhau (vỡ pixel).
    const dpr = window.devicePixelRatio || 1;
    // Nhắm tầm nhìn dọc ~240 game px (~15 tile). Giảm = zoom gần hơn, tăng = xa hơn.
    const deviceZoom = Math.max(2, Math.floor((containerHeight * dpr) / 240));
    const cssZoom = deviceZoom / dpr;

    // Canvas không cần to hơn map — thừa chỉ là dải nền đen hai bên
    let internalWidth = Math.ceil(containerWidth / cssZoom);
    let internalHeight = Math.ceil(containerHeight / cssZoom);
    if (this.tilemap) {
      internalWidth = Math.min(internalWidth, this.tilemap.pixelWidth);
      internalHeight = Math.min(internalHeight, this.tilemap.pixelHeight);
    }

    this.canvas.width = internalWidth;
    this.canvas.height = internalHeight;
    // Kích thước hiển thị = nội bộ × zoom; flex container tự căn giữa phần dư
    this.canvas.style.width = `${internalWidth * cssZoom}px`;
    this.canvas.style.height = `${internalHeight * cssZoom}px`;

    if (this.camera) {
      this.camera.setViewportSize(internalWidth, internalHeight, cssZoom);
    }

    if (this.ctx) {
      this.ctx.imageSmoothingEnabled = false;
    }
  }

  private spawnNPCs() {
    // Guide standing near spawn point (no linear patrol)
    const guideNPC = new NPC(this.playerCanvas, 288, 240, 'Guide DE013', false);
    this.npcs.push(guideNPC);

    // Roaming Cat
    const catCanvas = this.generateCatCanvas();
    const catNPC = new NPC(catCanvas, 340, 230, 'Cat', true);
    catNPC.speed = 15; // Slow cat speed
    this.npcs.push(catNPC);
  }

  private update(dt: number) {
    // If dialog is open, pause entity updating
    if (this.gameState.isDialogOpen() || this.gameState.isCharacterMenuOpen()) {
      return;
    }

    // Update Player movement
    const currentDir = this.inputService.direction();
    this.player.update(dt, currentDir, this.tilemap);

    // Update NPCs with collision support
    this.npcs.forEach(npc => npc.update(dt, this.tilemap));

    // Sync cat interaction zone in tilemap with cat NPC's position
    const catInteraction = this.tilemap.interactions.find(obj => obj.name === 'cat_npc');
    const catNPC = this.npcs.find(n => n.name === 'Cat');
    if (catInteraction && catNPC) {
      catInteraction.x = catNPC.x;
      catInteraction.y = catNPC.y;
    }

    // Update Camera
    this.camera.update(this.player.x, this.player.y);

    // Check interaction overlaps
    const currentOverlap = this.interactionSystem.checkOverlaps(
      { x: this.player.x, y: this.player.y },
      this.player.hitboxOffset,
      this.player.hitboxSize,
      this.tilemap
    );

    // Update component property inside zone only if overlap changed
    if (this.currentInteractionObj() !== currentOverlap) {
      this.ngZone.run(() => {
        this.currentInteractionObj.set(currentOverlap);
      });
    }
  }

  private render(interpolation: number) {
    if (!this.ctx) return;

    // Clear background
    this.ctx.fillStyle = '#1A1C2C'; // background night color
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw Ground
    this.tilemap.drawGround(this.ctx, this.camera);

    // Draw Entities sorted by their Y position (classic RPG depth sorting)
    const entities: { y: number; draw: (ctx: CanvasRenderingContext2D) => void }[] = [];
    
    entities.push({
      y: this.player.y + this.player.height,
      draw: (c) => this.player.draw(c, this.camera)
    });

    this.npcs.forEach(npc => {
      entities.push({
        y: npc.y + npc.height,
        draw: (c) => npc.draw(c, this.camera)
      });
    });

    // Sort ascending by Y coordinate
    entities.sort((a, b) => a.y - b.y);

    // Render sorted entities
    entities.forEach(entity => entity.draw(this.ctx));

    // Draw Above Layer (roofs, tree leaves drawn OVER the player/npcs)
    this.tilemap.drawAbove(this.ctx, this.camera);
  }

  // --- Handlers ---

  handleInteract() {
    if (this.gameState.isDialogOpen()) {
      const activeName = this.gameState.activeInteraction();
      if (activeName === 'sign_skip') {
        this.skipGame();
      }
      if (activeName === 'npc_guide') {
        if (typeof window !== 'undefined') {
          localStorage.setItem('talked_to_guide', 'true');
        }
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
        this.interactionSystem.handleInteractionKey();
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
        return 'Chào mừng bạn đến với Ngôi Làng Pixel của DE013! Hãy dùng các phím WASD hoặc phím Mũi tên để di chuyển. Bạn có thể ghé thăm Nhà của tôi (About), Xưởng chế tác (Projects), Thư viện (Blog) hoặc Bảng nhiệm vụ (Experiences) bằng cách đến gần cửa và nhấn phím E nhé!';
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
      case 'npc_guide': return '💬 NPC HƯỚNG DẪN';
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

  // --- Dynamic Asset Generation ---

  private generateAssets() {
    this.tilesetCanvas = document.createElement('canvas');
    this.tilesetCanvas.width = 192;
    this.tilesetCanvas.height = 176;
    const ctx = this.tilesetCanvas.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;

    // Default fill the whole fallback canvas with Grass (green GID 1)
    ctx.fillStyle = '#38B764';
    ctx.fillRect(0, 0, 192, 176);

    // Draw little grass details on GID 1 (Col 0, Row 0)
    ctx.fillStyle = '#2c9e52';
    ctx.fillRect(2, 3, 2, 2);
    ctx.fillRect(10, 6, 2, 2);
    ctx.fillRect(6, 12, 2, 2);

    // Path tile (GID 9) at Col 8, Row 0
    ctx.fillStyle = '#F4E4BC'; // beige
    ctx.fillRect(8 * 16, 0, 16, 16);
    ctx.fillStyle = '#D6C094';
    ctx.fillRect(8 * 16 + 2, 5, 2, 2);
    ctx.fillRect(8 * 16 + 10, 10, 2, 1);

    // Water tile (GID 21) at Col 8, Row 1
    ctx.fillStyle = '#41A6F6'; // blue
    ctx.fillRect(8 * 16, 16, 16, 16);
    ctx.fillStyle = '#29366F';
    ctx.fillRect(8 * 16 + 4, 20, 8, 2);

    // Wood bridge horizontal (GID 26) at Col 1, Row 2
    ctx.fillStyle = '#73452C'; // wooden brown
    ctx.fillRect(1 * 16, 32, 16, 16);
    ctx.fillStyle = '#3E2731'; // borders
    ctx.fillRect(1 * 16, 32, 16, 2);
    ctx.fillRect(1 * 16, 46, 16, 2);

    // Tree Trunk / Collision GID 25 at Col 0, Row 2
    ctx.fillStyle = '#73452C'; // wood
    ctx.fillRect(0, 32, 16, 16);
    ctx.fillStyle = '#3E2731';
    ctx.fillRect(4, 32, 8, 16);

    // Tree canopy / Roof GID 29 at Col 4, Row 2
    ctx.fillStyle = '#227B42'; // deep green
    ctx.fillRect(4 * 16, 32, 16, 16);
    ctx.fillStyle = '#38B764'; // highlight
    ctx.fillRect(4 * 16 + 2, 34, 4, 4);
    ctx.fillRect(4 * 16 + 8, 36, 4, 4);


    // Create player character sheet
    this.playerCanvas = document.createElement('canvas');
    this.playerCanvas.width = 48; // 3 frames * 16
    this.playerCanvas.height = 64; // 4 rows * 16
    const pCtx = this.playerCanvas.getContext('2d')!;
    pCtx.imageSmoothingEnabled = false;

    const skinColor = '#F4D0A4';
    const shirtColor = '#EF7D57'; // Berry accent
    const pantsColor = '#29366F'; // Ink text color
    const hairColor = '#73452C'; // wood border
    const outlineColor = '#3E2731'; // dark outline

    // Draw 4 rows: Down, Up, Left, Right
    for (let r = 0; r < 4; r++) {
      for (let f = 0; f < 3; f++) {
        const ox = f * 16;
        const oy = r * 16;

        pCtx.save();
        
        // Head
        if (r === 0) { // DOWN
          pCtx.fillStyle = hairColor;
          pCtx.fillRect(ox + 4, oy + 1, 8, 4);
          pCtx.fillStyle = skinColor;
          pCtx.fillRect(ox + 4, oy + 4, 8, 4);
          pCtx.fillStyle = outlineColor; // Eyes
          pCtx.fillRect(ox + 5, oy + 5, 2, 2);
          pCtx.fillRect(ox + 9, oy + 5, 2, 2);
        } else if (r === 1) { // UP (Back of head)
          pCtx.fillStyle = hairColor;
          pCtx.fillRect(ox + 4, oy + 1, 8, 7);
        } else if (r === 2) { // LEFT
          pCtx.fillStyle = hairColor;
          pCtx.fillRect(ox + 5, oy + 1, 7, 4);
          pCtx.fillStyle = skinColor;
          pCtx.fillRect(ox + 5, oy + 4, 6, 4);
          pCtx.fillStyle = hairColor; // back hair
          pCtx.fillRect(ox + 8, oy + 1, 3, 4);
          pCtx.fillStyle = outlineColor; // Eye
          pCtx.fillRect(ox + 6, oy + 5, 1, 2);
        } else { // RIGHT
          pCtx.fillStyle = hairColor;
          pCtx.fillRect(ox + 4, oy + 1, 7, 4);
          pCtx.fillStyle = skinColor;
          pCtx.fillRect(ox + 5, oy + 4, 6, 4);
          pCtx.fillStyle = hairColor; // back hair
          pCtx.fillRect(ox + 5, oy + 1, 3, 4);
          pCtx.fillStyle = outlineColor; // Eye
          pCtx.fillRect(ox + 9, oy + 5, 1, 2);
        }

        // Shirt
        pCtx.fillStyle = shirtColor;
        pCtx.fillRect(ox + 4, oy + 8, 8, 4);

        // Legs/Pants (animating leg cycles)
        pCtx.fillStyle = pantsColor;
        if (f === 1) { // Standing
          pCtx.fillRect(ox + 4, oy + 12, 3, 4);
          pCtx.fillRect(ox + 9, oy + 12, 3, 4);
        } else if (f === 0) { // Left leg up
          pCtx.fillRect(ox + 3, oy + 12, 3, 4);
          pCtx.fillRect(ox + 9, oy + 12, 2, 2);
        } else { // Right leg up
          pCtx.fillRect(ox + 5, oy + 12, 2, 2);
          pCtx.fillRect(ox + 10, oy + 12, 3, 4);
        }
        pCtx.restore();
      }
    }
  }

  private generateCatCanvas(): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = 48;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;

    const furColor = '#EF7D57'; // Orange fur
    const bellyColor = '#F4E4BC'; // Light beige belly
    const eyeColor = '#29366F'; // Dark ink eyes

    for (let r = 0; r < 4; r++) {
      for (let f = 0; f < 3; f++) {
        const ox = f * 16;
        const oy = r * 16;

        ctx.save();
        
        if (r === 0) { // DOWN
          // Ears
          ctx.fillStyle = furColor;
          ctx.fillRect(ox + 4, oy + 2, 2, 2);
          ctx.fillRect(ox + 10, oy + 2, 2, 2);
          // Head
          ctx.fillRect(ox + 4, oy + 4, 8, 5);
          // Eyes
          ctx.fillStyle = eyeColor;
          ctx.fillRect(ox + 5, oy + 6, 1, 1);
          ctx.fillRect(ox + 10, oy + 6, 1, 1);
          // Body
          ctx.fillStyle = furColor;
          ctx.fillRect(ox + 5, oy + 9, 6, 4);
          ctx.fillStyle = bellyColor;
          ctx.fillRect(ox + 6, oy + 10, 4, 3);
        } else if (r === 1) { // UP
          // Ears
          ctx.fillStyle = furColor;
          ctx.fillRect(ox + 4, oy + 2, 2, 2);
          ctx.fillRect(ox + 10, oy + 2, 2, 2);
          // Head
          ctx.fillRect(ox + 4, oy + 4, 8, 5);
          // Body
          ctx.fillRect(ox + 5, oy + 9, 6, 5);
          // Tail
          ctx.fillRect(ox + 7, oy + 7, 2, 2);
        } else if (r === 2) { // LEFT
          // Ear
          ctx.fillStyle = furColor;
          ctx.fillRect(ox + 5, oy + 2, 2, 2);
          // Head
          ctx.fillRect(ox + 4, oy + 4, 7, 5);
          // Eye
          ctx.fillStyle = eyeColor;
          ctx.fillRect(ox + 5, oy + 6, 1, 1);
          // Body
          ctx.fillStyle = furColor;
          ctx.fillRect(ox + 6, oy + 9, 7, 4);
          // Tail
          ctx.fillRect(ox + 13, oy + 9, 2, 2);
        } else { // RIGHT
          // Ear
          ctx.fillStyle = furColor;
          ctx.fillRect(ox + 9, oy + 2, 2, 2);
          // Head
          ctx.fillRect(ox + 5, oy + 4, 7, 5);
          // Eye
          ctx.fillStyle = eyeColor;
          ctx.fillRect(ox + 10, oy + 6, 1, 1);
          // Body
          ctx.fillStyle = furColor;
          ctx.fillRect(ox + 3, oy + 9, 7, 4);
          // Tail
          ctx.fillRect(ox + 1, oy + 9, 2, 2);
        }

        // Paws (walking animation)
        ctx.fillStyle = furColor;
        if (f === 1) { // Standing
          ctx.fillRect(ox + 5, oy + 13, 1, 2);
          ctx.fillRect(ox + 10, oy + 13, 1, 2);
        } else if (f === 0) {
          ctx.fillRect(ox + 4, oy + 13, 1, 2);
          ctx.fillRect(ox + 10, oy + 13, 1, 1);
        } else {
          ctx.fillRect(ox + 5, oy + 13, 1, 1);
          ctx.fillRect(ox + 11, oy + 13, 1, 2);
        }

        ctx.restore();
      }
    }

    return canvas;
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
