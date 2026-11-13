import * as THREE from 'three';

// ===== محرك صدة الرماد — Three.js 3D Engine =====

export interface EngineCallbacks {
  onEnemyDefeated: () => void;
  onPlayerDeath: () => void;
  updateHUD: (data: HUDData) => void;
  onObjectiveComplete: () => void;
}

export interface HUDData {
  hp: number;
  maxHp: number;
  stamina: number;
  maxStamina: number;
  ammo: number;
  maxAmmo: number;
  weapon: 'sword' | 'pistol';
  enemiesRemaining: number;
  objective: string;
}

export type ArenaType = 'forest' | 'city' | 'mines' | 'tower';

interface Enemy {
  mesh: THREE.Group;
  hp: number;
  maxHp: number;
  speed: number;
  damage: number;
  type: 'beast' | 'mercenary' | 'boss';
  cooldown: number;
  hpBar: THREE.Mesh;
  hpBarBg: THREE.Mesh;
  alive: boolean;
}

interface EnemyProjectile {
  mesh: THREE.Mesh;
  direction: THREE.Vector3;
  ttl: number;
}

const _v1 = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const _v3 = new THREE.Vector3();

/** Read stored input direction (x = strafe, z = forward) from mobile or keyboard */
export interface InputState {
  moveX: number;
  moveZ: number;
  sprint: boolean;
  attack: boolean;
  dodge: boolean;
}

export class GameEngine {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  clock: THREE.Clock;
  player: THREE.Group;
  playerSword: THREE.Group;
  playerPistol: THREE.Group;
  playerBody: THREE.Mesh;
  playerHead: THREE.Mesh;
  playerLegL: THREE.Mesh;
  playerLegR: THREE.Mesh;
  playerArmL: THREE.Mesh;
  playerArmR: THREE.Mesh;

  enemies: Enemy[] = [];
  enemyProjectiles: EnemyProjectile[] = [];
  tracers: { mesh: THREE.Line; ttl: number }[] = [];
  slashArcs: { mesh: THREE.Mesh; ttl: number }[] = [];

  keys: Record<string, boolean> = {};
  mobileInput: InputState = { moveX: 0, moveZ: 0, sprint: false, attack: false, dodge: false };

  hp = 100;
  maxHp = 100;
  stamina = 100;
  maxStamina = 100;
  ammo = 12;
  maxAmmo = 12;
  weapon: 'sword' | 'pistol' = 'sword';
  reloading = false;
  reloadTimer = 0;

  attackCooldown = 0;
  dodgeCooldown = 0;
  dodgeTimer = 0;
  dodgeDirection = new THREE.Vector3();
  invincible = false;

  walkTime = 0;
  playerFacing = new THREE.Vector3(0, 0, -1);
  isMoving = false;

  arena: ArenaType = 'forest';
  waypoint: THREE.Mesh | null = null;
  waypointPos = new THREE.Vector3();
  showWaypoint = false;
  objectiveComplete = false;
  gameOver = false;

  animationId = 0;
  disposed = false;

  callbacks: EngineCallbacks;
  enemyTypesForLevel: ('beast' | 'mercenary' | 'boss')[] = [];

  constructor(
    container: HTMLDivElement,
    callbacks: EngineCallbacks,
  ) {
    this.callbacks = callbacks;
    this.scene = new THREE.Scene();
    const width = Math.max(1, container.clientWidth);
    const height = Math.max(1, container.clientHeight);
    this.camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 500);
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    container.appendChild(this.renderer.domElement);

    this.clock = new THREE.Clock();
    this.clock.start();
    // Build player
    this.player = new THREE.Group();
    this.playerSword = new THREE.Group();
    this.playerPistol = new THREE.Group();
    this.buildPlayer();
    this.scene.add(this.player);
    this.player.position.set(0, 0, 0);

    this.camera.position.set(0, 5, 8);
    this.camera.lookAt(0, 1, 0);

    this.bindKeys();
    this.animate = this.animate.bind(this);
    this.animate();
  }

  private bindKeys() {
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
  }

  private onKeyDown = (e: KeyboardEvent) => {
    this.keys[e.code] = true;
    if (e.code === 'Digit1') this.setWeapon('sword');
    if (e.code === 'Digit2') this.setWeapon('pistol');
    if (e.code === 'KeyQ') this.setWeapon(this.weapon === 'sword' ? 'pistol' : 'sword');
  };

  private onKeyUp = (e: KeyboardEvent) => {
    this.keys[e.code] = false;
  };

  setWeapon(w: 'sword' | 'pistol') {
    this.weapon = w;
    this.playerSword.visible = w === 'sword';
    this.playerPistol.visible = w === 'pistol';
  }

  private buildPlayer() {
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x3a3f4a, roughness: 0.7 });
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xc4a882, roughness: 0.6 });
    const coatMat = new THREE.MeshStandardMaterial({ color: 0x2a2d35, roughness: 0.8 });
    const legMat = new THREE.MeshStandardMaterial({ color: 0x1e1f26, roughness: 0.8 });

    this.playerBody = new THREE.Mesh(new THREE.CapsuleGeometry(0.3, 0.8, 4, 8), coatMat);
    this.playerBody.position.y = 1.1;
    this.playerBody.castShadow = true;
    this.player.add(this.playerBody);

    this.playerHead = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 8), skinMat);
    this.playerHead.position.y = 1.85;
    this.playerHead.castShadow = true;
    this.player.add(this.playerHead);

    // Legs
    this.playerLegL = new THREE.Mesh(new THREE.CapsuleGeometry(0.1, 0.5, 4, 6), legMat);
    this.playerLegL.position.set(-0.15, 0.4, 0);
    this.playerLegL.castShadow = true;
    this.player.add(this.playerLegL);

    this.playerLegR = this.playerLegL.clone();
    this.playerLegR.position.x = 0.15;
    this.player.add(this.playerLegR);

    // Arms
    this.playerArmL = new THREE.Mesh(new THREE.CapsuleGeometry(0.08, 0.4, 4, 6), bodyMat);
    this.playerArmL.position.set(-0.42, 1.1, 0);
    this.playerArmL.castShadow = true;
    this.player.add(this.playerArmL);

    this.playerArmR = this.playerArmL.clone();
    this.playerArmR.position.x = 0.42;
    this.player.add(this.playerArmR);

    // Sword
    const bladeMat = new THREE.MeshStandardMaterial({ color: 0xaabbcc, metalness: 0.9, roughness: 0.2 });
    const hiltMat = new THREE.MeshStandardMaterial({ color: 0x5a3a1a, roughness: 0.8 });
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.2, 0.02), bladeMat);
    blade.position.y = 0.6;
    const guard = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.04, 0.04), hiltMat);
    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.2, 0.04), hiltMat);
    grip.position.y = -0.15;
    this.playerSword.add(blade, guard, grip);
    this.playerSword.position.set(0.5, 1.2, -0.2);
    this.playerSword.rotation.z = -0.3;
    this.player.add(this.playerSword);

    // Pistol
    const gunMat = new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.7, roughness: 0.3 });
    const barrel = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.06, 0.35), gunMat);
    barrel.position.z = -0.15;
    const gripGun = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.15, 0.06), gunMat);
    gripGun.position.set(0, -0.08, 0.02);
    this.playerPistol.add(barrel, gripGun);
    this.playerPistol.position.set(0.5, 1.15, -0.15);
    this.playerPistol.visible = false;
    this.player.add(this.playerPistol);
  }

  loadArena(arena: ArenaType, enemyCount: number, enemyTypes?: string[]) {
    // Clear previous
    this.clearScene();
    this.arena = arena;
    this.hp = this.maxHp;
    this.stamina = this.maxStamina;
    this.ammo = this.maxAmmo;
    this.gameOver = false;
    this.objectiveComplete = false;
    this.player.position.set(0, 0, 8);
    this.enemyTypesForLevel = (enemyTypes ?? []) as ('beast' | 'mercenary' | 'boss')[];

    // Lighting
    const hemiColor = arena === 'forest' ? 0x87ceeb : arena === 'mines' ? 0x554433 : 0x334466;
    const groundColor = arena === 'forest' ? 0x224422 : arena === 'mines' ? 0x332211 : 0x222233;
    const sunColor = arena === 'tower' ? 0xff8844 : 0xffeedd;
    const fogColor = arena === 'forest' ? 0x1a3320 : arena === 'mines' ? 0x221100 : arena === 'tower' ? 0x331100 : 0x112233;

    this.scene.background = new THREE.Color(fogColor);
    this.scene.fog = new THREE.FogExp2(fogColor, arena === 'mines' ? 0.04 : 0.025);

    const hemiLight = new THREE.HemisphereLight(hemiColor, groundColor, 0.6);
    this.scene.add(hemiLight);

    const dirLight = new THREE.DirectionalLight(sunColor, 1.2);
    dirLight.position.set(10, 20, 10);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.set(1024, 1024);
    dirLight.shadow.camera.far = 80;
    dirLight.shadow.camera.left = -25;
    dirLight.shadow.camera.right = 25;
    dirLight.shadow.camera.top = 25;
    dirLight.shadow.camera.bottom = -25;
    this.scene.add(dirLight);

    if (arena === 'tower') {
      const pointLight = new THREE.PointLight(0xff4400, 2, 30);
      pointLight.position.set(0, 15, 0);
      this.scene.add(pointLight);
    }

    // Ground
    const groundSize = 80;
    const groundGeo = new THREE.PlaneGeometry(groundSize, groundSize, 40, 40);
    const groundMat = new THREE.MeshStandardMaterial({
      color: groundColor,
      roughness: 0.9,
      metalness: 0,
    });
    // Vertex color variation
    const colors = new Float32Array(groundGeo.attributes.position.count * 3);
    for (let i = 0; i < groundGeo.attributes.position.count; i++) {
      const v = Math.random() * 0.15 + 0.85;
      colors[i * 3] = v;
      colors[i * 3 + 1] = v + (arena === 'forest' ? Math.random() * 0.1 : 0);
      colors[i * 3 + 2] = v;
    }
    groundGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    groundMat.vertexColors = true;
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);

    // Environment objects
    if (arena === 'forest') {
      this.buildForest();
    } else if (arena === 'city') {
      this.buildCity();
    } else if (arena === 'mines') {
      this.buildMines();
    } else if (arena === 'tower') {
      this.buildTower();
    }

    // Spawn enemies
    for (let i = 0; i < enemyCount; i++) {
      const eType = this.enemyTypesForLevel[i] ?? (Math.random() < 0.6 ? 'beast' : 'mercenary');
      const angle = (i / enemyCount) * Math.PI * 2;
      const dist = 12 + Math.random() * 10;
      this.spawnEnemy(
        eType,
        Math.cos(angle) * dist,
        Math.sin(angle) * dist,
      );
    }

    // Waypoint
    this.spawnWaypoint();
  }

  private buildForest() {
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x4a3020, roughness: 0.9 });
    const leafMat1 = new THREE.MeshStandardMaterial({ color: 0x1a4a2a, roughness: 0.8 });
    const leafMat2 = new THREE.MeshStandardMaterial({ color: 0x2a6a3a, roughness: 0.8 });

    for (let i = 0; i < 40; i++) {
      const x = (Math.random() - 0.5) * 70;
      const z = (Math.random() - 0.5) * 70;
      if (Math.abs(x) < 4 && Math.abs(z) < 10) continue; // clear spawn

      const h = 3 + Math.random() * 4;
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.35, h, 6), trunkMat);
      trunk.position.set(x, h / 2, z);
      trunk.castShadow = true;
      this.scene.add(trunk);

      const r = 1.5 + Math.random() * 1.5;
      const canopy = new THREE.Mesh(new THREE.SphereGeometry(r, 6, 6), Math.random() > 0.5 ? leafMat1 : leafMat2);
      canopy.position.set(x, h + r * 0.5, z);
      canopy.castShadow = true;
      this.scene.add(canopy);
    }

    // Rocks
    const rockMat = new THREE.MeshStandardMaterial({ color: 0x555555, roughness: 0.95 });
    for (let i = 0; i < 12; i++) {
      const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.3 + Math.random() * 0.5), rockMat);
      rock.position.set((Math.random() - 0.5) * 60, 0.2, (Math.random() - 0.5) * 60);
      rock.castShadow = true;
      rock.receiveShadow = true;
      this.scene.add(rock);
    }
  }

  private buildCity() {
    const buildingMat = new THREE.MeshStandardMaterial({ color: 0x2a3040, roughness: 0.7, metalness: 0.3 });
    const windowMat = new THREE.MeshStandardMaterial({ color: 0xffff88, emissive: 0xffcc44, emissiveIntensity: 0.5 });

    for (let i = 0; i < 30; i++) {
      const x = (Math.random() - 0.5) * 60;
      const z = (Math.random() - 0.5) * 60;
      if (Math.abs(x) < 5 && Math.abs(z) < 10) continue;
      const h = 5 + Math.random() * 15;
      const w = 2 + Math.random() * 3;
      const d = 2 + Math.random() * 3;
      const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), buildingMat);
      b.position.set(x, h / 2, z);
      b.castShadow = true;
      b.receiveShadow = true;
      this.scene.add(b);

      // Windows
      for (let wy = 1; wy < h - 1; wy += 2) {
        const win = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.8, 0.6), windowMat);
        win.position.set(x, wy, z + d / 2 + 0.01);
        this.scene.add(win);
      }
    }

    // Neon accents
    for (let i = 0; i < 8; i++) {
      const light = new THREE.PointLight(
        [0xff0066, 0x00ffaa, 0x6644ff, 0xffaa00][i % 4],
        0.8, 12
      );
      light.position.set((Math.random() - 0.5) * 40, 3 + Math.random() * 5, (Math.random() - 0.5) * 40);
      this.scene.add(light);
    }
  }

  private buildMines() {
    const rockMat = new THREE.MeshStandardMaterial({ color: 0x3a2a1a, roughness: 0.95 });
    const metalMat = new THREE.MeshStandardMaterial({ color: 0x555555, metalness: 0.8, roughness: 0.4 });

    // Walls
    for (let i = 0; i < 20; i++) {
      const angle = (i / 20) * Math.PI * 2;
      const dist = 20 + Math.random() * 10;
      const rock = new THREE.Mesh(
        new THREE.DodecahedronGeometry(2 + Math.random() * 2, 0),
        rockMat,
      );
      rock.position.set(Math.cos(angle) * dist, 1, Math.sin(angle) * dist);
      rock.castShadow = true;
      this.scene.add(rock);
    }

    // Metal structures
    for (let i = 0; i < 8; i++) {
      const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.3, 5, 0.3), metalMat);
      pillar.position.set((Math.random() - 0.5) * 30, 2.5, (Math.random() - 0.5) * 30);
      pillar.castShadow = true;
      this.scene.add(pillar);
    }

    // Glowing crystals
    const crystalMat = new THREE.MeshStandardMaterial({ color: 0x44ff88, emissive: 0x22ff66, emissiveIntensity: 1 });
    for (let i = 0; i < 10; i++) {
      const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.3 + Math.random() * 0.3), crystalMat);
      crystal.position.set((Math.random() - 0.5) * 30, 0.5, (Math.random() - 0.5) * 30);
      this.scene.add(crystal);
      const pl = new THREE.PointLight(0x44ff88, 0.5, 6);
      pl.position.copy(crystal.position);
      this.scene.add(pl);
    }
  }

  private buildTower() {
    const platformMat = new THREE.MeshStandardMaterial({ color: 0x333344, roughness: 0.5, metalness: 0.4 });
    const platform = new THREE.Mesh(new THREE.CylinderGeometry(15, 15, 0.5, 16), platformMat);
    platform.position.y = -0.25;
    platform.receiveShadow = true;
    this.scene.add(platform);

    // Pillars
    const pillarMat = new THREE.MeshStandardMaterial({ color: 0x444455, roughness: 0.6 });
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 8, 6), pillarMat);
      pillar.position.set(Math.cos(angle) * 12, 4, Math.sin(angle) * 12);
      pillar.castShadow = true;
      this.scene.add(pillar);
    }

    // Glowing core
    const coreMat = new THREE.MeshStandardMaterial({ color: 0xff6600, emissive: 0xff4400, emissiveIntensity: 2 });
    const core = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 16), coreMat);
    core.position.set(0, 3, -5);
    this.scene.add(core);
  }

  private spawnEnemy(type: 'beast' | 'mercenary' | 'boss', x: number, z: number) {
    const group = new THREE.Group();
    let color = type === 'beast' ? 0x881133 : type === 'boss' ? 0x440088 : 0x333366;
    const bodyGeo: THREE.BufferGeometry;
    const hp = type === 'boss' ? 100 : type === 'mercenary' ? 40 : 30;
    const speed = type === 'boss' ? 2.2 : type === 'mercenary' ? 1.5 : 2.5;
    const damage = type === 'boss' ? 20 : type === 'mercenary' ? 15 : 10;

    // mixed wave: ranged mercenaries guard ranged districts
    if (type === 'beast') {
      bodyGeo = new THREE.CapsuleGeometry(0.25, 0.6, 4, 6);
    } else if (type === 'boss') {
      bodyGeo = new THREE.CapsuleGeometry(0.45, 1.0, 4, 8);
    } else {
      bodyGeo = new THREE.CapsuleGeometry(0.3, 0.7, 4, 6);
    }

    const bodyMat = new THREE.MeshStandardMaterial({ color, roughness: 0.6 });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = type === 'boss' ? 1.3 : 0.9;
    body.castShadow = true;
    group.add(body);

    // Eyes
    const eyeMat = new THREE.MeshStandardMaterial({ color: type === 'beast' ? 0xff0000 : 0xffaa00, emissive: type === 'beast' ? 0xff0000 : 0xffaa00, emissiveIntensity: 1 });
    const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.06, 4, 4), eyeMat);
    eyeL.position.set(-0.1, body.position.y + 0.15, -0.2);
    const eyeR = eyeL.clone();
    eyeR.position.x = 0.1;
    group.add(eyeL, eyeR);

    // HP bar
    const hpBarBgGeo = new THREE.PlaneGeometry(1, 0.12);
    const hpBarBgMat = new THREE.MeshBasicMaterial({ color: 0x333333, side: THREE.DoubleSide });
    const hpBarBg = new THREE.Mesh(hpBarBgGeo, hpBarBgMat);
    hpBarBg.position.y = body.position.y + 0.7;
    group.add(hpBarBg);

    const hpBarGeo = new THREE.PlaneGeometry(1, 0.1);
    const hpBarMat = new THREE.MeshBasicMaterial({ color: 0xff3333, side: THREE.DoubleSide });
    const hpBar = new THREE.Mesh(hpBarGeo, hpBarMat);
    hpBar.position.y = body.position.y + 0.7;
    hpBar.position.z = 0.01;
    group.add(hpBar);

    group.position.set(x, 0, z);
    this.scene.add(group);

    this.enemies.push({
      mesh: group,
      hp,
      maxHp: hp,
      speed,
      damage,
      type,
      cooldown: 0,
      hpBar,
      hpBarBg,
      alive: true,
    });
  }

  private spawnWaypoint() {
    const geo = new THREE.ConeGeometry(0.3, 1, 4);
    const mat = new THREE.MeshBasicMaterial({ color: 0xffcc44, transparent: true, opacity: 0.7 });
    this.waypoint = new THREE.Mesh(geo, mat);
    this.waypoint.rotation.x = Math.PI;
    this.waypointPos.set(0, 0, -30);
    this.waypoint.position.copy(this.waypointPos);
    this.waypoint.position.y = 3;
    this.scene.add(this.waypoint);
    this.showWaypoint = true;
  }

  private clearScene() {
    const childrenToRemove: THREE.Object3D[] = [];
    for (const child of this.scene.children) {
      if (child !== this.player) childrenToRemove.push(child);
    }
    for (const child of childrenToRemove) {
      this.scene.remove(child);
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        if (Array.isArray(child.material)) child.material.forEach(m => m.dispose());
        else child.material.dispose();
      }
    }
    this.enemies = [];
    this.enemyProjectiles = [];
    this.tracers = [];
    this.slashArcs = [];
    this.waypoint = null;
    this.showWaypoint = false;
  }

  attack() {
    if (this.attackCooldown > 0 || this.gameOver) return;

    if (this.weapon === 'sword') {
      this.attackCooldown = 0.5;
      this.swordAttack();
    } else {
      if (this.ammo <= 0 && !this.reloading) {
        this.reload();
        return;
      }
      if (this.reloading) return;
      this.attackCooldown = 0.3;
      this.pistolAttack();
    }
  }

  private swordAttack() {
    // Arc VFX
    const arcAngle = Math.PI * 0.7;
    const arcRadius = 2;
    const arcGeo = new THREE.RingGeometry(arcRadius - 0.3, arcRadius, 8, 1, 0, arcAngle);
    const arcMat = new THREE.MeshBasicMaterial({ color: 0xccddff, transparent: true, opacity: 0.7, side: THREE.DoubleSide });
    const arc = new THREE.Mesh(arcGeo, arcMat);
    const pos = this.player.position.clone();
    pos.y = 1.0;
    arc.position.copy(pos);
    // Orient toward player facing
    const facingAngle = Math.atan2(this.playerFacing.x, this.playerFacing.z);
    arc.rotation.y = facingAngle - arcAngle / 2;
    this.scene.add(arc);
    this.slashArcs.push({ mesh: arc, ttl: 0.15 });

    // Sword swing animation
    this.playerSword.rotation.z = -1.5;

    // No unused ray for melee
    // Hit detection
    for (const enemy of this.enemies) {
      if (!enemy.alive) continue;
      _v1.copy(enemy.mesh.position).sub(this.player.position);
      _v1.y = 0;
      const dist = _ Length: _v1.length();
      if (dist < 2.5) {
        _v1.normalize();
        const dot = _v1.dot(this.playerFacing);
        if (dot > 0.3) {
          this.damageEnemy(enemy, 25);
        }
      }
    }
  }

  private pistolAttack() {
    this.ammo--;

    // Muzzle flash
    const flashGeo = new THREE.SphereGeometry(0.1, 4, 4);
    const flashMat = new THREE.MeshBasicMaterial({ color: 0xffaa33 });
    const flash = new THREE.Mesh(flashGeo, flashMat);
    const muzzlePos = this.player.position.clone();
    muzzlePos.y = 1.15;
    muzzlePos.add(_v1.copy(this.playerFacing).multiplyScalar(0.6));
    flash.position.copy(muzzlePos);
    this.scene.add(flash);
    this.slashArcs.push({ mesh: flash, ttl: 0.08 });

    const aimDirection = this.playerFacing.clone().normalize();

    let hitEnemy: Enemy | null = null;
    let hitDist = 30;

    for (const enemy of this.enemies) {
      if (!enemy.alive) continue;
      const dir = enemy.mesh.position.clone().sub(this.player.position);
      const proj = dir.dot(aimDirection);
      if (proj < 0) continue;
      _v1.copy(aimDirection).multiplyScalar(proj);
      const perp = dir.clone().sub(_v1).length();
      if (perp < 0.8 && proj < hitDist) {
        hitDist = proj;
        hitEnemy = enemy;
      }
    }

    const endPos = this.player.position.clone();
    endPos.y = 1.1;
    endPos.add(aimDirection.clone().multiplyScalar(hitEnemy ? hitDist : 30));

    // Tracer
    const tracerGeo = new THREE.BufferGeometry().setFromPoints([
      this.player.position.clone().setY(1.15),
      endPos,
    ]);
    const tracerMat = new THREE.LineBasicMaterial({ color: 0xffcc66, transparent: true, opacity: 0.8 });
    const tracer = new THREE.Line(tracerGeo, tracerMat);
    this.scene.add(tracer);
    this.tracers.push({ mesh: tracer, ttl: 0.1 });

    if (hitEnemy) {
      this.damageEnemy(hitEnemy, 35);
    }

    if (this.ammo <= 0) this.reload();
  }

  private reload() {
    this.reloading = true;
    this.reloadTimer = 1.5;
  }

  private damageEnemy(enemy: Enemy, amount: number) {
    enemy.hp -= amount;
    enemy.hpBar.scale.x = Math.max(0, enemy.hp / enemy.maxHp);
    // Flash
    const bodyMesh = enemy.mesh.children[0] as THREE.Mesh;
    if (bodyMesh instanceof THREE.Mesh) {
      const mat = bodyMesh.material as THREE.MeshStandardMaterial;
      const origColor = mat.color.getHex();
      mat.color.setHex(0xffffff);
      setTimeout(() => { mat.color.setHex(origColor); }, 80);
    }

    if (enemy.hp <= 0 && enemy.alive) {
      enemy.alive = false;
      enemy.mesh.visible = false;
      this.callbacks.onEnemyDefeated();
      this.updateHUDData();
    }
  }

  dodge() {
    if (this.dodgeCooldown > 0 || this.dodgeTimer > 0 || this.stamina < 20) return;
    this.stamina -= 20;
    this.dodgeTimer = 0.35;
    this.dodgeCooldown = 0.8;
    this.invincible = true;
    this.dodgeDirection.copy(this.playerFacing).multiplyScalar(1);
  }

  private updatePlayer(dt: number) {
    if (this.gameOver) return;

    let mx = 0, mz = 0;
    if (this.keys['KeyW'] || this.keys['ArrowUp']) mz = -1;
    if (this.keys['KeyS'] || this.keys['ArrowDown']) mz = 1;
    if (this.keys['KeyA'] || this.keys['ArrowLeft']) mx = -1;
    if (this.keys['KeyD'] || this.keys['ArrowRight']) mx = 1;

    mx += this.mobileInput.moveX;
    mz += this.mobileInput.moveZ;

    const sprinting = (this.keys['ShiftLeft'] || this.keys['ShiftRight'] || this.mobileInput.sprint) && this.stamina > 0;
    const speed = sprinting ? 6 : 3.5;
    const len = Math.sqrt(mx * mx + mz * mz);
    if (len > 1) { mx /= len; mz /= len; }

    this.isMoving = len > 0.1;

    if (this.dodgeTimer > 0) {
      this.dodgeTimer -= dt;
      this.player.position.add(this.dodgeDirection.clone().multiplyScalar(10 * dt));
      if (this.dodgeTimer <= 0) this.invincible = false;
    } else if (this.isMoving) {
      const movement = new THREE.Vector3(mx, 0, mz).normalize().multiplyScalar(speed * dt);
      this.player.position.add(movement);
      this.playerFacing.set(mx, 0, mz).normalize();
      // Smooth body rotation
      const targetAngle = Math.atan2(mx, mz);
      this.player.rotation.y = THREE.MathUtils.lerp(this.player.rotation.y, targetAngle, dt * 10);

      if (sprinting) this.stamina = Math.max(0, this.stamina - dt * 15);
    } else {
      this.stamina = Math.min(this.maxStamina, this.stamina + dt * 25);
    }

    if (!sprinting && this.isMoving) {
      this.stamina = Math.min(this.maxStamina, this.stamina + dt * 10);
    }

    // Clamp bounds
    this.player.position.x = THREE.MathUtils.clamp(this.player.position.x, -35, 35);
    this.player.position.z = THREE.MathUtils.clamp(this.player.position.z, -35, 35);

    // Walk animation
    if (this.isMoving) {
      this.walkTime += dt * (sprinting ? 12 : 8);
      this.playerLegL.rotation.x = Math.sin(this.walkTime) * 0.4;
      this.playerLegR.rotation.x = -Math.sin(this.walkTime) * 0.4;
      this.playerArmL.rotation.x = -Math.sin(this.walkTime) * 0.3;
      this.playerArmR.rotation.x = Math.sin(this.walkTime) * 0.3;
    } else {
      this.playerLegL.rotation.x *= 0.9;
      this.playerLegR.rotation.x *= 0.9;
      this.playerArmL.rotation.x *= 0.9;
      this.playerArmR.rotation.x *= 0.9;
    }

    // Attack inputs
    if ((this.keys['Space'] || this.keys['KeyF'] || this.mobileInput.attack) && this.attackCooldown <= 0) {
      this.attack();
    }
    if ((this.keys['KeyE'] || this.mobileInput.dodge) && this.dodgeCooldown <= 0) {
      this.dodge();
    }
    this.mobileInput.attack = false;
    this.mobileInput.dodge = false;

    // Timers
    this.attackCooldown = Math.max(0, this.attackCooldown - dt);
    // Sword rotation reset
    this.playerSword.rotation.z = THREE.MathUtils.lerp(this.playerSword.rotation.z, -0.3, dt * 8);

    if (this.reloading) {
      this.reloadTimer -= dt;
      if (this.reloadTimer <= 0) {
        this.reloading = false;
        this.ammo = this.maxAmmo;
      }
    }

    this.dodgeCooldown = Math.max(0, this.dodgeCooldown - dt);

    // HP regen
    if (this.hp < this.maxHp) {
      this.hp = Math.min(this.maxHp, this.hp + dt * 2);
    }
  }

  private updateEnemies(dt: number) {
    const playerPos = this.player.position;

    for (const enemy of this.enemies) {
      if (!enemy.alive) continue;

      const enemyPos = enemy.mesh.position;
      _v1.copy(playerPos).sub(enemyPos);
      _v1.y = 0;
      const dist = _v1.length();

      // Face player
      enemy.mesh.lookAt(playerPos.x, enemyPos.y, playerPos.z);

      // HP bar face camera
      enemy.hpBar.lookAt(this.camera.position);
      enemy.hpBarBg.lookAt(this.camera.position);

      if (enemy.cooldown > 0) enemy.cooldown -= dt;

      // AI
      if (enemy.type === 'mercenary') {
        // Keep distance and shoot
        if (dist < 6) {
          _v2.copy(_v1).normalize().multiplyScalar(-enemy.speed * dt);
          enemyPos.add(_v2);
        } else if (dist < 20) {
          _v2.copy(_v1).normalize().multiplyScalar(enemy.speed * dt * 0.5);
          enemyPos.add(_v2);
        }
        if (dist < 15 && enemy.cooldown <= 0) {
          enemy.cooldown = 2;
          this.spawnEnemyProjectile(enemyPos, playerPos);
        }
      } else {
        // Chase (beast or boss)
        if (dist > 1.5) {
          _v2.copy(_v1).normalize().multiplyScalar(enemy.speed * dt);
          enemyPos.add(_v2);
        }
        if (dist < 2 && enemy.cooldown <= 0) {
          enemy.cooldown = 1;
          if (!this.invincible) {
            this.hp = Math.max(0, this.hp - enemy.damage);
            this.updateHUDData();
            if (this.hp <= 0 && !this.gameOver) {
              this.gameOver = true;
              this.callbacks.onPlayerDeath();
            }
          }
        }
      }
    }
  }

  private spawnEnemyProjectile(from: THREE.Vector3, to: THREE.Vector3) {
    const geo = new THREE.SphereGeometry(0.08, 4, 4);
    const mat = new THREE.MeshBasicMaterial({ color: 0xff4444 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(from).setY(1.0);
    this.scene.add(mesh);

    const dir = to.clone().sub(from).normalize();
    this.enemyProjectiles.push({ mesh, direction: dir, ttl: 3 });
  }

  private updateProjectiles(dt: number) {
    // Enemy projectiles
    for (let i = this.enemyProjectiles.length - 1; i >= 0; i--) {
      const proj = this.enemyProjectiles[i];
      proj.ttl -= dt;
      proj.mesh.position.add(_v3.copy(proj.direction).multiplyScalar(10 * dt));

      const dist = proj.mesh.position.distanceTo(this.player.position.clone().setY(1.0));
      if (dist < 0.6 && !this.invincible) {
        this.hp = Math.max(0, this.hp - 10);
        this.updateHUDData();
        proj.ttl = 0;
        this.scene.remove(proj.mesh);
        proj.mesh.geometry.dispose();
        (proj.mesh.material as THREE.Material).dispose();
        this.enemyProjectiles.splice(i, 1);
        if (this.hp <= 0 && !this.gameOver) {
          this.gameOver = true;
          this.callbacks.onPlayerDeath();
        }
        continue;
      }

      if (proj.ttl <= 0) {
        this.scene.remove(proj.mesh);
        proj.mesh.geometry.dispose();
        (proj.mesh.material as THREE.Material).dispose();
        this.enemyProjectiles.splice(i, 1);
      }
    }

    // Tracers
    for (let i = this.tracers.length - 1; i >= 0; i--) {
      this.tracers[i].ttl -= dt;
      if (this.tracers[i].ttl <= 0) {
        this.scene.remove(this.tracers[i].mesh);
        this.tracers[i].mesh.geometry.dispose();
        (this.tracers[i].mesh.material as THREE.Material).dispose();
        this.tracers.splice(i, 1);
      }
    }

    // Slash arcs / VFX
    for (let i = this.slashArcs.length - 1; i >= 0; i--) {
      this.slashArcs[i].ttl -= dt;
      if (this.slashArcs[i].ttl <= 0) {
        this.scene.remove(this.slashArcs[i].mesh);
        this.slashArcs[i].mesh.geometry.dispose();
        (this.slashArcs[i].mesh.material as THREE.Material).dispose();
        this.slashArcs.splice(i, 1);
      }
    }
  }

  private updateCamera(dt: number) {
    const target = this.player.position.clone();
    target.y += 1.5;
    const behindPlayer = this.playerFacing.clone().multiplyScalar(-5);
    behindPlayer.y = 4;
    const camTarget = this.player.position.clone().add(behindPlayer);

    this.camera.position.lerp(camTarget, dt * 5);
    this.camera.lookAt(target);
  }

  private updateWaypoint() {
    if (!this.waypoint || !this.showWaypoint) return;
    this.waypoint.position.y = 3 + Math.sin(Date.now() * 0.002) * 0.3;
    this.waypoint.rotation.y += 0.02;

    // Check if all enemies defeated
    const aliveCount = this.enemies.filter(e => e.alive).length;
    if (aliveCount === 0 && !this.objectiveComplete) {
      this.objectiveComplete = true;
      this.callbacks.onObjectiveComplete();
    }
  }

  updateHUDData() {
    const aliveCount = this.enemies.filter(e => e.alive).length;
    this.callbacks.updateHUD({
      hp: Math.round(this.hp),
      maxHp: this.maxHp,
      stamina: Math.round(this.stamina),
      maxStamina: this.maxStamina,
      ammo: this.ammo,
      maxAmmo: this.maxAmmo,
      weapon: this.weapon,
      enemiesRemaining: aliveCount,
      objective: aliveCount > 0 ? `هاجم الأعداء! (${aliveCount} متبقي)` : 'تم القضاء على الأعداء',
    });
  }

  getAliveCount() {
    return this.enemies.filter(e => e.alive).length;
  }

  private animate() {
    if (this.disposed) return;
    this.animationId = requestAnimationFrame(this.animate);
    const dt = Math.min(this.clock.getDelta(), 0.05);

    if (!this.gameOver && this.enemies.length > 0) {
      this.updatePlayer(dt);
      this.updateEnemies(dt);
      this.updateProjectiles(dt);
      this.updateCamera(dt);
      this.updateWaypoint();
      this.updateHUDData();
    }

    this.renderer.render(this.scene, this.camera);
  }

  resize(w: number, h: number) {
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.animationId);
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    this.clearScene();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
