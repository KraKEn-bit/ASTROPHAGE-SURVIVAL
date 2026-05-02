import * as THREE from "https://esm.sh/three@0.161.0";
import { GLTFLoader } from "https://esm.sh/three@0.161.0/examples/jsm/loaders/GLTFLoader.js";

const params = new URLSearchParams(window.location.search);
const currentUsername = (params.get("username") || "PILOT").trim();
const username = currentUsername;

const SFX = {
  shoot: new Audio("assets/sounds/shoot.mp3"),
  destroy: new Audio("assets/sounds/destroy.mp3"),
  damage: new Audio("assets/sounds/damage.mp3"),
  bossDeath: new Audio("assets/sounds/boss_death.mp3"),
  start: new Audio("assets/sounds/start.mp3")
};
const bgm = new Audio("assets/sounds/space_cinematic.ogg");
bgm.loop = true;
const bgmBaseVolume = 0.58;
bgm.volume = bgmBaseVolume;
let bgmFadeTimer = null;

function fadeOutBgm(durationMs = 1000, onComplete) {
  if (bgmFadeTimer) {
    clearInterval(bgmFadeTimer);
    bgmFadeTimer = null;
  }
  const startVolume = bgm.volume;
  if (startVolume <= 0.001 || bgm.paused) {
    bgm.pause();
    bgm.currentTime = 0;
    if (onComplete) onComplete();
    return;
  }
  const stepMs = 50;
  const totalSteps = Math.max(1, Math.ceil(durationMs / stepMs));
  const volumeStep = startVolume / totalSteps;
  bgmFadeTimer = setInterval(() => {
    bgm.volume = Math.max(0, bgm.volume - volumeStep);
    if (bgm.volume <= 0.001) {
      clearInterval(bgmFadeTimer);
      bgmFadeTimer = null;
      bgm.pause();
      bgm.currentTime = 0;
      bgm.volume = bgmBaseVolume;
      if (onComplete) onComplete();
    }
  }, stepMs);
}

SFX.shoot.sfxKey = "shoot";
SFX.destroy.sfxKey = "destroy";
SFX.damage.sfxKey = "damage";
SFX.bossDeath.sfxKey = "bossDeath";
SFX.start.sfxKey = "start";

SFX.shoot.volume = 1.0;
SFX.destroy.volume = 1.0;
SFX.damage.volume = 1.0;
SFX.bossDeath.volume = 1.0;
SFX.start.volume = 1.0;

const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playBluePowerup() {
  if (!audioCtx) return;
  if (audioCtx.state === "suspended") audioCtx.resume();
  const now = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = "sine";
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.frequency.setValueAtTime(400, now);
  osc.frequency.linearRampToValueAtTime(800, now + 0.2);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.linearRampToValueAtTime(0.26, now + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.2);
  osc.start(now);
  osc.stop(now + 0.21);
}

function playYellowPowerup() {
  if (!audioCtx) return;
  if (audioCtx.state === "suspended") audioCtx.resume();
  const now = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = "sawtooth";
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.frequency.setValueAtTime(300, now);
  osc.frequency.exponentialRampToValueAtTime(100, now + 0.3);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.linearRampToValueAtTime(0.175, now + 0.04);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.3);
  osc.start(now);
  osc.stop(now + 0.32);
}

function playTankExplosion() {
  if (!audioCtx) return;
  if (audioCtx.state === "suspended") audioCtx.resume();
  const now = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = "square";
  osc.frequency.setValueAtTime(52, now);
  osc.frequency.linearRampToValueAtTime(48, now + 0.12);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.linearRampToValueAtTime(0.2, now + 0.03);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.5);
  osc.start(now);
  osc.stop(now + 0.52);
}

function playFallbackTone(kind) {
  if (!audioCtx) return;
  if (audioCtx.state === "suspended") audioCtx.resume();
  const now = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.connect(gain);
  gain.connect(audioCtx.destination);

  if (kind === "shoot") {
    osc.type = "triangle";
    osc.frequency.setValueAtTime(980, now);
    osc.frequency.exponentialRampToValueAtTime(420, now + 0.07);
    gain.gain.setValueAtTime(0.06, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.09);
    osc.start(now);
    osc.stop(now + 0.1);
    return;
  }

  if (kind === "destroy") {
    osc.type = "square";
    osc.frequency.setValueAtTime(240, now);
    osc.frequency.exponentialRampToValueAtTime(90, now + 0.12);
    gain.gain.setValueAtTime(0.07, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.15);
    osc.start(now);
    osc.stop(now + 0.16);
    return;
  }

  if (kind === "damage") {
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(420, now);
    osc.frequency.exponentialRampToValueAtTime(160, now + 0.13);
    gain.gain.setValueAtTime(0.05, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);
    osc.start(now);
    osc.stop(now + 0.17);
    return;
  }

  if (kind === "bossDeath") {
    osc.type = "square";
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(50, now + 0.45);
    gain.gain.setValueAtTime(0.07, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.5);
    osc.start(now);
    osc.stop(now + 0.52);
    return;
  }

  osc.type = "sine";
  osc.frequency.setValueAtTime(660, now);
  osc.frequency.exponentialRampToValueAtTime(330, now + 0.16);
  gain.gain.setValueAtTime(0.03, now);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.2);
  osc.start(now);
  osc.stop(now + 0.22);
}

function playSound(sound) {
  if (!sound) return;
  const clone = sound.cloneNode();
  clone.volume = sound.volume;
  clone.play().catch(() => {
    playFallbackTone(sound.sfxKey);
  });
  if (sound.sfxKey === "shoot" || sound.sfxKey === "destroy") {
    const boost = sound.cloneNode();
    boost.volume = Math.min(1.0, sound.volume * 0.85);
    boost.play().catch(() => {});
  }
  if (sound.sfxKey === "shoot") {
    const boost2 = sound.cloneNode();
    boost2.volume = Math.min(1.0, sound.volume * 0.75);
    boost2.play().catch(() => {});
  }
}

const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 2200);
const CAMERA_REST = new THREE.Vector3(0, 0, 180);
camera.position.copy(CAMERA_REST);
camera.lookAt(0, 0, 0);

/** Screen shake duration (accumulated via tank leak penalty). */
let cameraShakeRemain = 0;
let cameraShakeMag = 3.8;

function shakeCamera(durationSeconds = 0.45, magnitude = 3.8) {
  cameraShakeRemain = Math.max(cameraShakeRemain, durationSeconds);
  cameraShakeMag = Math.max(cameraShakeMag, magnitude);
}

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

const scoreValue = document.getElementById("score-value");
const dialogueOverlay = document.getElementById("dialogue-overlay");
const dialogueText = document.querySelector("#dialogue-overlay #dialogue-text");
const bossHpContainer = document.getElementById("boss-hp-container");
const bossHpBar = document.getElementById("boss-hp-bar");
const startOverlay = document.getElementById("start-overlay");
const playerHealthUI = document.getElementById("player-health-ui");
const overlayUsername = document.getElementById("overlay-username");
const cutsceneDialogueEl = document.getElementById("cutscene-dialogue");
const cutsceneSpeakerEl = document.getElementById("dialogue-speaker");
const cutsceneTextEl = cutsceneDialogueEl ? cutsceneDialogueEl.querySelector("#dialogue-text") : null;
if (overlayUsername) overlayUsername.innerText = currentUsername;

let score = 0;
let gameStarted = false;
let isGameOver = false;
const MARY_HP_MAX = 100;
const MARY_LIVES_START = 5;
const ROCKY_HP_MAX = 100;
const ROCKY_LIVES_START = 5;

/** Segment HP (shown on yellow bar); when it hits ≤0 costs one life and refills to MARY_HP_MAX — same rule as window.AG.loseHp. */
let maryHp = MARY_HP_MAX;
/** Remaining lives (hearts HUD); game over when 0 — matches window.AG.lives semantics. */
let maryLives = MARY_LIVES_START;

let rockyHp = ROCKY_HP_MAX;
let rockyLives = ROCKY_LIVES_START;

let isCinematic = false;
let cinematicTriggered = false;
let coOpEnabled = false;
let isBossPhase = false;
let isBossDefeated = false;
let isPostBossCinematic = false;
let isCutscenePlaying = false;
let shipsEscaping = false;
let cutsceneIndex = 0;
let bossMesh = null;
let bossShieldMesh = null;
let bossHp = 50;
const bossMaxHp = 50;
let bossDir = 1;
let spawnTimer = 0;
const spawnInterval = 0.58;
const obstacles = [];
const lasers = [];
const laserSpawnBox = new THREE.Box3();
const laserSpawnCenter = new THREE.Vector3();
/** Must match red boss mesh in `startBossPhase`: `IcosahedronGeometry(12)`. */
const BOSS_MESH_CIRCUMRADIUS = 12;
/** Tighter than vertex circumsphere so lasers don’t explode in front of the shaded hull. */
const BOSS_PLAYER_LASER_HIT_RADIUS = BOSS_MESH_CIRCUMRADIUS * 0.875;
/** Pad for thick scaled bolts only; keep small to avoid “ghost” hits */
const BOSS_LASER_HIT_BEAM_MARGIN = 0.22;

const _lBoltTipWorld = new THREE.Vector3();
const _lBoltTailWorld = new THREE.Vector3();
const _bossHitCenterWorld = new THREE.Vector3();

/** Short-lived impact sprites when player bolts hit the boss. */
const bossHitSparks = [];

let bossProjectiles = [];
const tweens = [];
let bossShootTimer = 0;
const playerShotCooldown = 0.15;
/** 'default' | 'rapid' | 'piercing' */
let currentWeapon = "default";
function getWeaponShotCooldown() {
  if (currentWeapon === "rapid") {
    return playerShotCooldown * 0.4;
  }
  return playerShotCooldown;
}
let maryShotCooldown = 0;
let rockyShotCooldown = 0;
let maryInputX = 0;
let rockyInputX = 0;
const cutsceneLines = [
  { speaker: "ROCKY", color: "#7bed9f", text: "Amaze! Astrophage cluster destroyed. Good job, friend!" },
  { speaker: "CURRENT_USER", color: "#ff6b81", text: "We secured the samples. Let's get these back to the lab." },
  { speaker: "ROCKY", color: "#7bed9f", text: "Yes yes yes! Speed! Science awaits!" }
];

const worldBounds = {
  minX: -74,
  maxX: 74,
  minY: -48,
  maxY: 54
};
const shipMinY = -72;

const keys = {
  w: false,
  a: false,
  s: false,
  d: false,
  up: false,
  down: false,
  left: false,
  right: false
};

const textureLoader = new THREE.TextureLoader();
const bgTexture = textureLoader.load("assets/deep_space_background.jpeg");
if (THREE.SRGBColorSpace) {
  bgTexture.colorSpace = THREE.SRGBColorSpace;
} else if (THREE.sRGBEncoding) {
  bgTexture.encoding = THREE.sRGBEncoding;
}
scene.background = bgTexture;
scene.add(new THREE.AmbientLight(0xffffff, 0.1));
const sunLight = new THREE.DirectionalLight(0xffffff, 2.0);
sunLight.position.set(100, 50, 100);
scene.add(sunLight);

const starfieldGeometry = new THREE.BufferGeometry();
const starCount = 1000;
const starPositions = new Float32Array(starCount * 3);
const starZMin = -1800;
const starZMax = -200;
for (let i = 0; i < starCount; i += 1) {
  const idx = i * 3;
  starPositions[idx] = THREE.MathUtils.randFloatSpread(2200);
  starPositions[idx + 1] = THREE.MathUtils.randFloatSpread(2200);
  starPositions[idx + 2] = THREE.MathUtils.randFloat(starZMin, starZMax);
}
starfieldGeometry.setAttribute("position", new THREE.BufferAttribute(starPositions, 3));
const starfield = new THREE.Points(
  starfieldGeometry,
  new THREE.PointsMaterial({ color: 0xffffff, size: 2, sizeAttenuation: true })
);
scene.add(starfield);

function updateStarfield(delta) {
  const pos = starfieldGeometry.attributes.position.array;
  for (let i = 0; i < starCount; i += 1) {
    const idx = i * 3;
    pos[idx + 2] += 72 * delta;
    if (pos[idx + 2] > camera.position.z + 120) {
      pos[idx] = THREE.MathUtils.randFloatSpread(2200);
      pos[idx + 1] = THREE.MathUtils.randFloatSpread(2200);
      pos[idx + 2] = starZMin;
    }
  }
  starfieldGeometry.attributes.position.needsUpdate = true;
}

const adrianGeometry = new THREE.SphereGeometry(80, 64, 64);
const adrianTexture = textureLoader.load("assets/adrian_planet_texture.webp");
if (THREE.SRGBColorSpace) {
  adrianTexture.colorSpace = THREE.SRGBColorSpace;
} else if (THREE.sRGBEncoding) {
  adrianTexture.encoding = THREE.sRGBEncoding;
}
const adrianMaterial = new THREE.MeshStandardMaterial({
  map: adrianTexture,
  roughness: 0.7,
  metalness: 0.0
});
const infectedStar = new THREE.Mesh(adrianGeometry, adrianMaterial);
infectedStar.position.set(0, 0, -150);
scene.add(infectedStar);

function createMaryFallbackShip() {
  const ship = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.ConeGeometry(4.8, 13, 8),
    new THREE.MeshStandardMaterial({ color: 0xf2f2f2, roughness: 0.6, metalness: 0.25 })
  );
  body.rotation.x = Math.PI / 2;
  body.castShadow = true;
  ship.add(body);

  const fin = new THREE.Mesh(
    new THREE.BoxGeometry(5.4, 1.2, 2.6),
    new THREE.MeshStandardMaterial({ color: 0x6f7d96, roughness: 0.7, metalness: 0.2 })
  );
  fin.position.set(0, -1.8, 2);
  fin.castShadow = true;
  ship.add(fin);
  return ship;
}

function createRockyFallbackShip() {
  const ship = new THREE.Group();
  const hull = new THREE.Mesh(
    new THREE.DodecahedronGeometry(6.3, 0),
    new THREE.MeshStandardMaterial({ color: 0x8e96a5, roughness: 0.45, metalness: 0.65 })
  );
  hull.castShadow = true;
  ship.add(hull);
  return ship;
}

const maryShip = new THREE.Group();
maryShip.position.set(0, -15, 0);
maryShip.rotation.y = Math.PI;
scene.add(maryShip);

const rockyShip = new THREE.Group();
rockyShip.position.set(118, -15, 0);
rockyShip.visible = false;
scene.add(rockyShip);

function setShipModelFromGLB(shipRoot, gltfScene, targetHeight) {
  const model = gltfScene;
  model.traverse((node) => {
    if (node.isMesh) {
      node.castShadow = true;
      node.receiveShadow = true;
    }
  });

  const bounds = new THREE.Box3().setFromObject(model);
  if (!bounds.isEmpty()) {
    const size = bounds.getSize(new THREE.Vector3());
    const center = bounds.getCenter(new THREE.Vector3());
    const scale = targetHeight / Math.max(size.y, 0.001);
    model.scale.setScalar(scale);
    model.position.sub(center);
  }

  shipRoot.clear();
  shipRoot.add(model);
}

const gltfLoader = new GLTFLoader();
const maryFallback = createMaryFallbackShip();
const rockyFallback = createRockyFallbackShip();
maryShip.add(maryFallback);
rockyShip.add(rockyFallback);

gltfLoader.load("../assets/spaceship_compressed.glb", (gltf) => {
  setShipModelFromGLB(maryShip, gltf.scene, 14);
  maryShip.scale.set(0.5, 0.5, 0.5);
  maryShip.position.set(0, -15, 0);
}, undefined, () => {
  maryShip.clear();
  maryShip.add(maryFallback);
  maryShip.scale.set(0.5, 0.5, 0.5);
  maryShip.position.set(0, -15, 0);
});

gltfLoader.load("../assets/alien_spaceship_with_fusion_core_compressed.glb", (gltf) => {
  setShipModelFromGLB(rockyShip, gltf.scene, 14);
  rockyShip.scale.set(1.5, 1.5, 1.5);
  rockyShip.position.y = -15;
  rockyShip.traverse((child) => {
    if (!child.isMesh || !child.material) return;
    const materials = Array.isArray(child.material) ? child.material : [child.material];
    for (let i = 0; i < materials.length; i += 1) {
      const mat = materials[i];
      if (mat.color) mat.color.setHex(0xaaaaaa);
      if (mat.emissive) mat.emissive.setHex(0x00aaff);
      mat.emissiveIntensity = 0.6;
      mat.needsUpdate = true;
    }
  });
}, undefined, () => {
  rockyShip.clear();
  rockyShip.add(rockyFallback);
  rockyShip.scale.set(1.5, 1.5, 1.5);
  rockyShip.position.y = -15;
  rockyShip.traverse((child) => {
    if (!child.isMesh || !child.material) return;
    const materials = Array.isArray(child.material) ? child.material : [child.material];
    for (let i = 0; i < materials.length; i += 1) {
      const mat = materials[i];
      if (mat.color) mat.color.setHex(0xaaaaaa);
      if (mat.emissive) mat.emissive.setHex(0x00aaff);
      mat.emissiveIntensity = 0.6;
      mat.needsUpdate = true;
    }
  });
});

const maryNeutral = new THREE.Vector3(-16, -15, 0);
const rockyNeutral = new THREE.Vector3(16, -15, 0);

function addTween(duration, onUpdate, onComplete, delay = 0) {
  tweens.push({ duration, elapsed: 0, delay, onUpdate, onComplete });
}

function updateTweens(delta) {
  for (let i = tweens.length - 1; i >= 0; i -= 1) {
    const t = tweens[i];
    if (t.delay > 0) {
      t.delay -= delta;
      continue;
    }
    t.elapsed += delta;
    const p = Math.min(t.elapsed / t.duration, 1);
    t.onUpdate(p);
    if (p >= 1) {
      if (t.onComplete) t.onComplete();
      tweens.splice(i, 1);
    }
  }
}

function spawnAstrophage() {
  const isTank = Math.random() >= 0.8;
  const geometry = new THREE.IcosahedronGeometry(2.5, 0);
  /** @type {THREE.MeshStandardMaterial} */
  let material;
  let hp;

  if (isTank) {
    hp = 5;
    material = new THREE.MeshStandardMaterial({
      color: 0x661010,
      emissive: 0xff1a2a,
      emissiveIntensity: 1.15,
      roughness: 0.42,
      metalness: 0.28
    });
  } else {
    hp = 1;
    material = new THREE.MeshStandardMaterial({
      color: 0xff0000,
      emissive: 0xff4400,
      emissiveIntensity: 0.8,
      roughness: 0.6,
      metalness: 0.05
    });
  }

  const mesh = new THREE.Mesh(geometry, material);
  const scaleUniform = isTank ? 2 : 1;
  mesh.scale.setScalar(scaleUniform);
  mesh.position.set(THREE.MathUtils.randFloat(worldBounds.minX + 4, worldBounds.maxX - 4), worldBounds.maxY + 10, 0);
  mesh.userData.speed = THREE.MathUtils.randFloat(24, 38);
  mesh.userData.hp = hp;
  mesh.userData.maxHp = hp;
  mesh.userData.isTank = isTank;
  mesh.userData.laserHitCooldown = 0;
  mesh.userData.damageFlashUntil = 0;
  scene.add(mesh);
  obstacles.push(mesh);
}

function ensureAstMaterialSnapshot(mesh) {
  if (!mesh.material || mesh.userData.savedMat) return;
  const mat = mesh.material;
  mesh.userData.savedMat = {
    color: mat.color.clone(),
    emissive: mat.emissive.clone(),
    emissiveIntensity: mat.emissiveIntensity
  };
}

function restoreAstMaterial(mesh) {
  if (!mesh.userData.savedMat || !mesh.material) return;
  const mat = mesh.material;
  const s = mesh.userData.savedMat;
  mat.color.copy(s.color);
  mat.emissive.copy(s.emissive);
  mat.emissiveIntensity = s.emissiveIntensity;
}

function flashAstDamage(mesh) {
  ensureAstMaterialSnapshot(mesh);
  mesh.material.color.setHex(0xffffff);
  mesh.material.emissive.setHex(0xffffff);
  mesh.material.emissiveIntensity = 2.1;
  mesh.userData.damageFlashUntil = performance.now() + 100;
}

function resumeAudio() {
  if (!audioCtx) return;
  if (audioCtx.state === "suspended") audioCtx.resume();
}

const LASER_SPEED = 165;

const LASER_RADIUS_DEFAULT = 0.35;
/** Thinner bolt after collecting rapid or piercing (power-ups). */
const LASER_RADIUS_POWERED = 0.23;

/** Obstacle / swarm collision radius (world units). */
const LASER_HIT_RADIUS = 6;

/** CylinderGeometry height in createLaserProjectile (world scale applied via mesh.scale). */
const LASER_CYLINDER_HEIGHT = 5.2;

function laserBoltHalfLengthWorld(laser) {
  const s = Math.max(Math.abs(laser.scale.x), Math.abs(laser.scale.y), Math.abs(laser.scale.z), 1e-6);
  return (LASER_CYLINDER_HEIGHT * s) * 0.5;
}

function sqDistSegmentToPoint(x0, y0, z0, x1, y1, z1, px, py, pz) {
  const lx = x1 - x0;
  const ly = y1 - y0;
  const lz = z1 - z0;
  const l2 = lx * lx + ly * ly + lz * lz;
  const tRaw = l2 > 1e-12 ? ((px - x0) * lx + (py - y0) * ly + (pz - z0) * lz) / l2 : 0;
  const t = THREE.MathUtils.clamp(tRaw, 0, 1);
  const qx = x0 + t * lx;
  const qy = y0 + t * ly;
  const qz = z0 + t * lz;
  const dx = px - qx;
  const dy = py - qy;
  const dz = pz - qz;
  return dx * dx + dy * dy + dz * dz;
}

function laserIntersectsBossHitbox(laser, _vx, _vy) {
  if (!bossMesh) return false;
  try {
    laser.updateMatrixWorld(true);
    bossMesh.updateMatrixWorld(true);

    const half = laserBoltHalfLengthWorld(laser);
    _lBoltTailWorld.set(0, -half, 0);
    _lBoltTipWorld.set(0, half, 0);
    laser.localToWorld(_lBoltTailWorld);
    laser.localToWorld(_lBoltTipWorld);

    bossMesh.getWorldPosition(_bossHitCenterWorld);
    const r = BOSS_PLAYER_LASER_HIT_RADIUS + BOSS_LASER_HIT_BEAM_MARGIN;
    const r2 = r * r;

    const dSq = sqDistSegmentToPoint(
      _lBoltTailWorld.x,
      _lBoltTailWorld.y,
      _lBoltTailWorld.z,
      _lBoltTipWorld.x,
      _lBoltTipWorld.y,
      _lBoltTipWorld.z,
      _bossHitCenterWorld.x,
      _bossHitCenterWorld.y,
      _bossHitCenterWorld.z
    );
    return dSq <= r2;
  } catch (_e) {
    return false;
  }
}

const powerups = [];
let powerupSpawnTimer = 0;
const POWERUP_SPAWN_INTERVAL = 14;
const POWERUP_FALL_SPEED = 22;

function createLaserProjectile(color, scaleOne, radius) {
  const r = radius !== undefined ? radius : LASER_RADIUS_DEFAULT;
  const laser = new THREE.Mesh(
    new THREE.CylinderGeometry(r, r, 5.2, 8),
    new THREE.MeshBasicMaterial({ color })
  );
  if (!scaleOne) {
    laser.scale.set(3, 3, 3);
  }
  return laser;
}

function spawnLaserProjectileFromOrigin(originShip, owner, vx, vy, piercing, cylinderColor, scaleUniform, beamRadius) {
  originShip.updateMatrixWorld(true);
  laserSpawnBox.setFromObject(originShip);
  laserSpawnBox.getCenter(laserSpawnCenter);
  const laser = createLaserProjectile(cylinderColor, scaleUniform, beamRadius);
  laser.position.set(laserSpawnCenter.x, laserSpawnCenter.y + 4.5, laserSpawnCenter.z);
  laser.userData.vx = vx;
  laser.userData.vy = vy;
  laser.userData.owner = owner;
  laser.userData.piercing = piercing;
  laser.rotation.z = -Math.atan2(vx, vy);
  scene.add(laser);
  lasers.push(laser);
}

function spawnLaserBurst(originShip, owner) {
  const shipColor = owner === "mary" ? 0x8ed7ff : 0xffc368;
  const piercing = currentWeapon === "piercing";
  const beamRadius = currentWeapon === "default" ? LASER_RADIUS_DEFAULT : LASER_RADIUS_POWERED;
  if (piercing) {
    spawnLaserProjectileFromOrigin(originShip, owner, 0, LASER_SPEED, true, shipColor, false, beamRadius);
  } else {
    spawnLaserProjectileFromOrigin(originShip, owner, 0, LASER_SPEED, false, shipColor, true, beamRadius);
  }
  playSound(SFX.shoot);
}

function spawnLaser(originShip, owner) {
  spawnLaserBurst(originShip, owner);
}

function clearPlayerLasers() {
  for (let i = lasers.length - 1; i >= 0; i -= 1) {
    scene.remove(lasers[i]);
  }
  lasers.length = 0;
}

function spawnPowerup() {
  /** @type {'rapid'|'piercing'} */
  const powerupWeapon = Math.random() < 0.5 ? "rapid" : "piercing";

  let geometry;
  let color;
  if (powerupWeapon === "rapid") {
    geometry = new THREE.OctahedronGeometry(4.2, 0);
    color = 0xffff44;
  } else {
    geometry = new THREE.IcosahedronGeometry(4.2, 0);
    color = 0xcc66ff;
  }

  const mesh = new THREE.Mesh(
    geometry,
    new THREE.MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity: 0.55,
      metalness: 0.25,
      roughness: 0.35
    })
  );
  mesh.userData.powerupWeapon = powerupWeapon;
  mesh.position.set(
    THREE.MathUtils.randFloat(worldBounds.minX + 10, worldBounds.maxX - 10),
    worldBounds.maxY + 12,
    0
  );
  scene.add(mesh);
  powerups.push(mesh);
}

function updatePowerups(delta) {
  for (let p = powerups.length - 1; p >= 0; p -= 1) {
    const pu = powerups[p];
    if (!pu) continue;
    pu.position.y -= POWERUP_FALL_SPEED * delta;
    pu.rotation.x += delta * 2.2;
    pu.rotation.y += delta * 3.1;

    const pickMary = pu.position.distanceTo(maryShip.position) < 11.5;
    const pickRocky = coOpEnabled && pu.position.distanceTo(rockyShip.position) < 11.5;
    if (pickMary || pickRocky) {
      const puKind = pu.userData.powerupWeapon || "rapid";
      if (puKind === "piercing") {
        playBluePowerup();
      } else {
        playYellowPowerup();
      }
      currentWeapon = puKind;
      scene.remove(pu);
      powerups.splice(p, 1);
      continue;
    }

    if (pu.position.y < worldBounds.minY - 20) {
      scene.remove(pu);
      powerups.splice(p, 1);
    }
  }
}

function resetToNeutral() {
  maryShip.position.copy(maryNeutral);
  rockyShip.position.copy(rockyNeutral);
}

const dialogueLines = [
  `[ROCKY]: \"Rocky watch whole crew die. Could not fix. ${username} say ${username} will die. Rocky fix.\"`,
  `[ CAPTAIN ${username} ]: \"There's no way you can hear me!\"`,
  "[ROCKY]: \"Can hear. Fist my bump. Let's get them - fix my planet Enrid and yours, Earth.\"",
  `[ CAPTAIN ${username} ]: \"Let's go.\"`
];
const postBossDialogueLines = [
  "[ROCKY]: \"Amaze! Amaze! Amaze! We did it, friend!\"",
  `[ CAPTAIN ${username} ]: \"Yeah... we did. But we still need to figure out how to kill these things for good.\"`,
  "[ROCKY]: \"We do science now. Good?\"",
  `[ CAPTAIN ${username} ]: \"Good.\"`
];
let dialogueIndex = 0;
let dialogueActive = false;
let activeDialogueLines = dialogueLines;
let dialogueCompletionHandler = null;

function showDialogue() {
  dialogueOverlay.style.display = "flex";
  dialogueText.textContent = activeDialogueLines[dialogueIndex];
  dialogueActive = true;
  clearPlayerLasers();
}

function hideDialogue() {
  dialogueOverlay.style.display = "none";
  dialogueActive = false;
}

function startFistBump() {
  const maryStart = maryShip.position.clone();
  const rockyStart = rockyShip.position.clone();
  const maryContact = new THREE.Vector3(-8, maryNeutral.y, 0);
  const rockyContact = new THREE.Vector3(8, rockyNeutral.y, 0);

  addTween(0.35, (p) => {
    maryShip.position.lerpVectors(maryStart, maryContact, p);
    rockyShip.position.lerpVectors(rockyStart, rockyContact, p);
  }, () => {
    const shakeBaseMary = maryShip.position.clone();
    const shakeBaseRocky = rockyShip.position.clone();
    addTween(0.28, (p) => {
      const shake = Math.sin(p * Math.PI * 10) * 0.8;
      maryShip.position.set(shakeBaseMary.x - shake, shakeBaseMary.y + shake * 0.2, 0);
      rockyShip.position.set(shakeBaseRocky.x + shake, shakeBaseRocky.y - shake * 0.2, 0);
    }, () => {
      addTween(0.4, (p) => {
        maryShip.position.lerpVectors(shakeBaseMary, maryNeutral, p);
        rockyShip.position.lerpVectors(shakeBaseRocky, rockyNeutral, p);
      }, () => {
        resetToNeutral();
        isCinematic = false;
        coOpEnabled = true;
        updateDualHealthUI();
      });
    });
  });
}

function startCinematic() {
  if (cinematicTriggered) return;
  cinematicTriggered = true;
  isCinematic = true;
  spawnTimer = 0;
  clearPlayerLasers();
  for (let i = obstacles.length - 1; i >= 0; i -= 1) {
    scene.remove(obstacles[i]);
  }
  obstacles.length = 0;

  for (let i = powerups.length - 1; i >= 0; i -= 1) {
    scene.remove(powerups[i]);
  }
  powerups.length = 0;
  powerupSpawnTimer = 0;

  rockyShip.visible = true;
  rockyShip.position.set(118, maryShip.position.y, 0);

  addTween(1.3, (p) => {
    rockyShip.position.x = THREE.MathUtils.lerp(118, rockyNeutral.x, p);
    rockyShip.position.y = THREE.MathUtils.lerp(maryShip.position.y, rockyNeutral.y, p);
  }, () => {
    resetToNeutral();
    dialogueIndex = 0;
    activeDialogueLines = dialogueLines;
    dialogueCompletionHandler = () => startFistBump();
    showDialogue();
  });
}

function advanceDialogue() {
  if (!dialogueActive) return;
  dialogueIndex += 1;
  if (dialogueIndex < activeDialogueLines.length) {
    dialogueText.textContent = activeDialogueLines[dialogueIndex];
    return;
  }
  hideDialogue();
  if (dialogueCompletionHandler) {
    const handler = dialogueCompletionHandler;
    dialogueCompletionHandler = null;
    handler();
  }
}

function showDialogueLine() {
  if (!cutsceneDialogueEl || !cutsceneSpeakerEl || !cutsceneTextEl) return;
  const line = cutsceneLines[cutsceneIndex];
  if (!line) return;
  const speakerName = line.speaker === "CURRENT_USER" ? currentUsername.toUpperCase() : line.speaker;
  cutsceneSpeakerEl.innerText = `[ ${speakerName} ]`;
  cutsceneSpeakerEl.style.color = line.color;
  cutsceneTextEl.innerText = line.text;
  cutsceneDialogueEl.style.display = "block";
}

function beginBossDefeatCutscene() {
  if (isCutscenePlaying || shipsEscaping) return;

  cutsceneIndex = 0;
  isBossDefeated = true;
  playSound(SFX.bossDeath);

  if (bossMesh) {
    scene.remove(bossMesh);
    bossMesh = null;
    bossShieldMesh = null;
  }
  if (bossHpContainer) bossHpContainer.style.display = "none";

  disposeAllBossHitSparks();

  for (let i = bossProjectiles.length - 1; i >= 0; i -= 1) {
    scene.remove(bossProjectiles[i].mesh);
  }
  bossProjectiles.length = 0;

  for (let i = obstacles.length - 1; i >= 0; i -= 1) {
    scene.remove(obstacles[i]);
  }
  obstacles.length = 0;

  for (let i = lasers.length - 1; i >= 0; i -= 1) {
    scene.remove(lasers[i]);
  }
  lasers.length = 0;

  for (let i = powerups.length - 1; i >= 0; i -= 1) {
    scene.remove(powerups[i]);
  }
  powerups.length = 0;

  /** Set only after lasers/entities cleared so paused frames never freeze bolts visually */
  isCutscenePlaying = true;
  showDialogueLine();
}

function setKeyFromEvent(code, isDown) {
  if (code === "KeyW") keys.w = isDown;
  if (code === "KeyA") keys.a = isDown;
  if (code === "KeyS") keys.s = isDown;
  if (code === "KeyD") keys.d = isDown;
  if (code === "ArrowUp") keys.up = isDown;
  if (code === "ArrowDown") keys.down = isDown;
  if (code === "ArrowLeft") keys.left = isDown;
  if (code === "ArrowRight") keys.right = isDown;
}

window.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && isCutscenePlaying && !shipsEscaping) {
    cutsceneIndex += 1;
    if (cutsceneIndex < cutsceneLines.length) {
      showDialogueLine();
    } else {
      if (cutsceneDialogueEl) cutsceneDialogueEl.style.display = "none";
      isCutscenePlaying = false;
      shipsEscaping = true;
    }
    return;
  }
  if (event.key === "Enter" && !gameStarted && !isGameOver) {
    gameStarted = true;
    playSound(SFX.start);
    bgm.volume = bgmBaseVolume;
    bgm.play().catch(() => {});
    if (startOverlay) startOverlay.style.display = "none";
    if (playerHealthUI) playerHealthUI.style.display = "block";
    updateDualHealthUI();
    return;
  }
  if (!gameStarted || isGameOver) return;
  resumeAudio();
  setKeyFromEvent(event.code, true);
  if (dialogueActive && (event.code === "Space" || event.code === "Enter")) {
    event.preventDefault();
    advanceDialogue();
    return;
  }
  if (
    !isCinematic &&
    !isPostBossCinematic &&
    !dialogueActive &&
    !isCutscenePlaying &&
    event.code === "Space" &&
    maryShotCooldown <= 0
  ) {
    spawnLaser(maryShip, "mary");
    maryShotCooldown = getWeaponShotCooldown();
  }
  if (
    !isCinematic &&
    !isPostBossCinematic &&
    !dialogueActive &&
    !isCutscenePlaying &&
    coOpEnabled &&
    (event.code === "Enter" || event.code === "ShiftLeft" || event.code === "ShiftRight") &&
    rockyShotCooldown <= 0
  ) {
    spawnLaser(rockyShip, "rocky");
    rockyShotCooldown = getWeaponShotCooldown();
  }
});

window.addEventListener("keyup", (event) => {
  setKeyFromEvent(event.code, false);
});

dialogueOverlay.addEventListener("click", () => {
  if (!gameStarted) return;
  resumeAudio();
  if (dialogueActive) advanceDialogue();
});

function updateShipMovement(delta) {
  if (!gameStarted) {
    maryInputX = 0;
    rockyInputX = 0;
    return;
  }
  if (isCinematic || isPostBossCinematic || isCutscenePlaying || shipsEscaping) {
    maryInputX = 0;
    rockyInputX = 0;
    return;
  }
  const speed = 56;
  let mx = 0;
  let my = 0;
  if (keys.a) mx -= 1;
  if (keys.d) mx += 1;
  if (keys.w) my += 1;
  if (keys.s) my -= 1;
  if (mx !== 0 || my !== 0) {
    const len = Math.hypot(mx, my);
    mx /= len;
    my /= len;
  }
  maryInputX = mx;
  maryShip.position.x = THREE.MathUtils.clamp(maryShip.position.x + mx * speed * delta, worldBounds.minX, worldBounds.maxX);
  maryShip.position.y = THREE.MathUtils.clamp(maryShip.position.y + my * speed * delta, shipMinY, worldBounds.maxY);

  if (coOpEnabled) {
    let rx = 0;
    let ry = 0;
    if (keys.left) rx -= 1;
    if (keys.right) rx += 1;
    if (keys.up) ry += 1;
    if (keys.down) ry -= 1;
    if (rx !== 0 || ry !== 0) {
      const len = Math.hypot(rx, ry);
      rx /= len;
      ry /= len;
    }
    rockyInputX = rx;
    rockyShip.position.x = THREE.MathUtils.clamp(rockyShip.position.x + rx * speed * delta, worldBounds.minX, worldBounds.maxX);
    rockyShip.position.y = THREE.MathUtils.clamp(rockyShip.position.y + ry * speed * delta, shipMinY, worldBounds.maxY);
  } else {
    rockyInputX = 0;
  }
}

function updateShipTilts() {
  const maryTargetTilt = maryInputX < 0 ? -0.3 : maryInputX > 0 ? 0.3 : 0;
  const rockyTargetTilt = rockyInputX < 0 ? -0.3 : rockyInputX > 0 ? 0.3 : 0;
  maryShip.rotation.z = THREE.MathUtils.lerp(maryShip.rotation.z, maryTargetTilt, 0.05);
  rockyShip.rotation.z = THREE.MathUtils.lerp(rockyShip.rotation.z, rockyTargetTilt, 0.05);
}

function updateBossUI(hp, maxHp) {
  if (maxHp <= 0) return;
  const widthPct = THREE.MathUtils.clamp((hp / maxHp) * 100, 0, 100);
  const uiBar = document.getElementById("boss-hp-bar");
  if (uiBar) uiBar.style.width = `${widthPct}%`;
}

function spawnBossHitSpark(at) {
  const geo = new THREE.SphereGeometry(1.15, 8, 8);
  const mat = new THREE.MeshBasicMaterial({
    color: 0xffaa44,
    transparent: true,
    opacity: 0.95,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.copy(at);
  scene.add(mesh);
  bossHitSparks.push({ mesh, geo, mat, t: 0, life: 0.22 });
}

function updateBossHitSparks(delta) {
  for (let i = bossHitSparks.length - 1; i >= 0; i -= 1) {
    const s = bossHitSparks[i];
    s.t += delta;
    const u = s.t / s.life;
    if (u >= 1) {
      scene.remove(s.mesh);
      s.geo.dispose();
      s.mat.dispose();
      bossHitSparks.splice(i, 1);
      continue;
    }
    s.mesh.scale.setScalar(1 + u * 3.6);
    s.mesh.material.opacity = 0.95 * (1 - u);
  }
}

function disposeAllBossHitSparks() {
  for (let i = bossHitSparks.length - 1; i >= 0; i -= 1) {
    const s = bossHitSparks[i];
    scene.remove(s.mesh);
    s.geo.dispose();
    s.mat.dispose();
    bossHitSparks.splice(i, 1);
  }
}

function phase1HpFillColor(hpRatio) {
  return hpRatio > 0.5 ? "#ffd24a" : "#ff3d3d";
}

function phase1HeartRowMarkup(numHeartsVisible) {
  const n = Math.max(0, Math.floor(Number(numHeartsVisible) || 0));
  let html = "";
  for (let i = 0; i < n; i += 1) {
    html += '<span class="phase1-heart">&#x2764;</span>';
  }
  return html;
}

function updateDualHealthUI() {
  /** ScenePhase1 updateHUD HP color rule (Phaser 0xffd24a vs 0xff3d3d). */
  const maryHr = THREE.MathUtils.clamp(maryHp / MARY_HP_MAX, 0, 1);
  const rockyRow = document.getElementById("rocky-health-block");
  if (rockyRow) rockyRow.style.display = coOpEnabled ? "block" : "none";

  const heartsMary = document.getElementById("mary-hearts-row");
  if (heartsMary) heartsMary.innerHTML = phase1HeartRowMarkup(maryLives);

  const pilotBar = document.getElementById("player-health-bar");
  if (pilotBar) {
    pilotBar.style.width = `${maryHr * 100}%`;
    pilotBar.style.backgroundColor = phase1HpFillColor(maryHr);
  }

  const heartsRocky = document.getElementById("rocky-hearts-row");
  const allyBar = document.getElementById("rocky-health-bar");
  if (coOpEnabled && heartsRocky) {
    heartsRocky.innerHTML = phase1HeartRowMarkup(rockyLives);
  } else if (heartsRocky) {
    heartsRocky.innerHTML = "";
  }
  if (allyBar && coOpEnabled) {
    const rockyHr = THREE.MathUtils.clamp(rockyHp / ROCKY_HP_MAX, 0, 1);
    allyBar.style.width = `${rockyHr * 100}%`;
    allyBar.style.backgroundColor = phase1HpFillColor(rockyHr);
  }
}

function damagePlayer(amount) {
  if (isGameOver || !gameStarted || amount <= 0) return;
  amount = Math.max(0, Number(amount) || 0);
  maryHp -= amount;
  if (maryHp <= 0) {
    maryLives -= 1;
    maryHp = MARY_HP_MAX;
  }
  if (maryLives < 0) maryLives = 0;
  playSound(SFX.damage);
  updateDualHealthUI();
  if (maryLives <= 0) {
    triggerGameOver();
  }
}

function damageRocky(amount) {
  if (isGameOver || !gameStarted || !coOpEnabled || amount <= 0) return;
  amount = Math.max(0, Number(amount) || 0);
  rockyHp -= amount;
  if (rockyHp <= 0) {
    rockyLives -= 1;
    rockyHp = ROCKY_HP_MAX;
  }
  if (rockyLives < 0) rockyLives = 0;
  playSound(SFX.damage);
  updateDualHealthUI();
  if (rockyLives <= 0) {
    triggerGameOver();
  }
}

function triggerGameOver() {
  showGameOverOverlay();
}

function showGameOverOverlay() {
  if (isGameOver || document.getElementById("phase3-gameover-overlay")) return;
  isGameOver = true;
  gameStarted = false;
  fadeOutBgm(900);

  const overlay = document.createElement("div");
  overlay.id = "phase3-gameover-overlay";
  overlay.style.position = "fixed";
  overlay.style.inset = "0";
  overlay.style.zIndex = "3000";
  overlay.style.display = "flex";
  overlay.style.alignItems = "center";
  overlay.style.justifyContent = "center";
  overlay.style.background = "rgba(0, 0, 0, 0.88)";
  overlay.style.fontFamily = "'Share Tech Mono', monospace";

  const card = document.createElement("div");
  card.style.width = "min(760px, 90vw)";
  card.style.padding = "30px 34px";
  card.style.textAlign = "center";
  card.style.border = "2px solid #ff3b3b";
  card.style.background = "rgba(8, 12, 18, 0.95)";
  card.style.boxShadow = "0 0 26px rgba(255, 59, 59, 0.35)";
  card.style.color = "#e8eef6";

  const title = document.createElement("h2");
  title.textContent = "[ GAME OVER ]";
  title.style.margin = "0 0 14px";
  title.style.letterSpacing = "2px";
  title.style.color = "#ff5959";

  const msg = document.createElement("p");
  msg.textContent = "Pilot integrity or allied hull lost. Restart and fight again for Earth and Enrid.";
  msg.style.margin = "0 0 24px";
  msg.style.lineHeight = "1.6";
  msg.style.color = "#c7d6e7";

  const actions = document.createElement("div");
  actions.style.display = "flex";
  actions.style.gap = "12px";
  actions.style.justifyContent = "center";

  const restartBtn = document.createElement("button");
  restartBtn.textContent = "RESTART MISSION";
  restartBtn.style.padding = "12px 18px";
  restartBtn.style.border = "none";
  restartBtn.style.cursor = "pointer";
  restartBtn.style.fontWeight = "700";
  restartBtn.style.letterSpacing = "1px";
  restartBtn.style.background = "#39ff14";
  restartBtn.style.color = "#001400";
  restartBtn.addEventListener("click", () => {
    window.location.reload();
  });

  const briefingBtn = document.createElement("button");
  briefingBtn.textContent = "RETURN TO BRIEFING";
  briefingBtn.style.padding = "12px 18px";
  briefingBtn.style.border = "none";
  briefingBtn.style.cursor = "pointer";
  briefingBtn.style.fontWeight = "700";
  briefingBtn.style.letterSpacing = "1px";
  briefingBtn.style.background = "#24384f";
  briefingBtn.style.color = "#d8e5f2";
  briefingBtn.addEventListener("click", () => {
    window.location.href = `index.html?username=${encodeURIComponent(currentUsername)}`;
  });

  actions.appendChild(restartBtn);
  actions.appendChild(briefingBtn);
  card.appendChild(title);
  card.appendChild(msg);
  card.appendChild(actions);
  overlay.appendChild(card);
  document.body.appendChild(overlay);
}

function updateObstacles(delta) {
  if (!gameStarted || isGameOver) return;

  const pauseCombat =
    isCinematic || isPostBossCinematic || isCutscenePlaying || shipsEscaping;
  if (pauseCombat) {
    if (lasers.length > 0) {
      clearPlayerLasers();
    }
    return;
  }

  if (maryShotCooldown > 0) maryShotCooldown -= delta;
  if (rockyShotCooldown > 0) rockyShotCooldown -= delta;

  if (dialogueActive) {
    clearPlayerLasers();
  }

  updatePowerups(delta);
  powerupSpawnTimer += delta;
  if (powerupSpawnTimer >= POWERUP_SPAWN_INTERVAL && !isBossPhase) {
    powerupSpawnTimer = 0;
    spawnPowerup();
  }

  if (!isBossPhase) {
    spawnTimer += delta;
    if (spawnTimer >= spawnInterval) {
      spawnTimer = 0;
      spawnAstrophage();
    }
  }

  for (let i = lasers.length - 1; i >= 0; i -= 1) {
    const laser = lasers[i];
    const vx = laser.userData.vx !== undefined ? laser.userData.vx : 0;
    const vy = laser.userData.vy !== undefined ? laser.userData.vy : LASER_SPEED;
    laser.position.x += vx * delta;
    laser.position.y += vy * delta;

    if (isBossPhase && bossMesh && !isBossDefeated) {
      if (laserIntersectsBossHitbox(laser, vx, vy)) {
        const bossDmg = laser.userData.piercing ? 2 : 1;
        bossHp -= bossDmg;
        updateBossUI(bossHp, bossMaxHp);
        spawnBossHitSpark(laser.position);
        scene.remove(laser);
        lasers.splice(i, 1);
        if (bossHp <= 0 && !isCutscenePlaying && !shipsEscaping) {
          beginBossDefeatCutscene();
          return;
        }
        continue;
      }
    }

    const outOfBounds =
      laser.position.y > worldBounds.maxY + 38 ||
      laser.position.y < worldBounds.minY - 220 ||
      Math.abs(laser.position.x) > 130;
    if (outOfBounds) {
      scene.remove(laser);
      lasers.splice(i, 1);
      continue;
    }
  }

  for (let i = obstacles.length - 1; i >= 0; i -= 1) {
    const rock = obstacles[i];
    if (!rock) continue;

    const nowTs = performance.now();

    rock.position.y -= rock.userData.speed * delta;
    rock.rotation.x += delta * 1.4;
    rock.rotation.y += delta * 1.8;

    if (rock.userData.damageFlashUntil && nowTs >= rock.userData.damageFlashUntil) {
      restoreAstMaterial(rock);
      rock.userData.damageFlashUntil = 0;
    }

    if (rock.userData.laserHitCooldown > 0) {
      rock.userData.laserHitCooldown -= delta;
    }

    const shipHitR = rock.userData.isTank ? 12 : 8.5;

    const dMary = rock.position.distanceTo(maryShip.position);
    const dRocky = coOpEnabled ? rock.position.distanceTo(rockyShip.position) : Number.POSITIVE_INFINITY;
    const hitMary = dMary < shipHitR;
    const hitRocky = coOpEnabled && dRocky < shipHitR;
    if (hitMary || hitRocky) {
      if (hitMary && hitRocky) {
        if (dMary <= dRocky) {
          damagePlayer(20);
        } else {
          damageRocky(20);
        }
      } else if (hitMary) {
        damagePlayer(20);
      } else {
        damageRocky(20);
      }
      scene.remove(rock);
      obstacles.splice(i, 1);
      continue;
    }

    let obstacleRemoved = false;
    for (let j = lasers.length - 1; j >= 0; j -= 1) {
      const laser = lasers[j];
      const pierceWide = !!laser.userData.piercing;
      const baseRad = pierceWide ? LASER_HIT_RADIUS * 2.2 : LASER_HIT_RADIUS;
      const hitR = rock.userData.isTank ? baseRad * 1.45 : baseRad;

      if (rock.position.distanceTo(laser.position) > hitR) continue;
      if (rock.userData.laserHitCooldown > 0) continue;

      const dmg = pierceWide ? 2 : 1;
      rock.userData.hp -= dmg;
      rock.userData.laserHitCooldown = pierceWide ? 0.065 : 0.09;

      if (!pierceWide) {
        scene.remove(laser);
        lasers.splice(j, 1);
      }

      if (rock.userData.hp <= 0) {
        const wasTank = !!rock.userData.isTank;
        scene.remove(rock);
        obstacles.splice(i, 1);
        obstacleRemoved = true;
        score += wasTank ? 4 : 1;
        if (scoreValue) scoreValue.textContent = String(score);
        if (wasTank) {
          playTankExplosion();
        } else {
          playSound(SFX.destroy);
        }
        if (score >= 50 && !cinematicTriggered) {
          startCinematic();
          return;
        }
        if (score >= 100 && !isBossPhase) {
          startBossPhase();
          return;
        }
      } else {
        flashAstDamage(rock);
      }
      break;
    }

    if (obstacleRemoved) continue;

    if (rock.position.y < worldBounds.minY - 12) {
      const tankEscape = !!rock.userData.isTank;
      scene.remove(rock);
      obstacles.splice(i, 1);
      if (tankEscape) {
        damagePlayer(20);
        shakeCamera();
      }
    }
  }
}

function spawnBossSpreadShot() {
  if (!bossMesh) return;
  const shotPattern = [
    { vx: -0.3, vy: -0.6 },
    { vx: 0, vy: -0.6 },
    { vx: 0.3, vy: -0.6 }
  ];
  for (let i = 0; i < shotPattern.length; i += 1) {
    const shot = shotPattern[i];
    const mesh = new THREE.Mesh(
      new THREE.IcosahedronGeometry(1.8, 0),
      new THREE.MeshBasicMaterial({ color: 0xffff00 })
    );
    mesh.position.set(bossMesh.position.x, bossMesh.position.y, bossMesh.position.z);
    scene.add(mesh);
    bossProjectiles.push({ mesh, vx: shot.vx, vy: shot.vy });
  }
}

function updateBossProjectiles() {
  if (!gameStarted || isGameOver || isCutscenePlaying || shipsEscaping) return;
  for (let i = bossProjectiles.length - 1; i >= 0; i -= 1) {
    const proj = bossProjectiles[i];
    proj.mesh.position.x += proj.vx;
    proj.mesh.position.y += proj.vy;
    proj.mesh.rotation.x += 0.2;
    proj.mesh.rotation.y += 0.2;

    const dMary = proj.mesh.position.distanceTo(maryShip.position);
    const dRocky = coOpEnabled ? proj.mesh.position.distanceTo(rockyShip.position) : Number.POSITIVE_INFINITY;
    const hitMary = dMary < 2.5;
    const hitRocky = coOpEnabled && dRocky < 2.5;
    if (hitMary || hitRocky) {
      if (hitMary && hitRocky) {
        if (dMary <= dRocky) {
          damagePlayer(40);
        } else {
          damageRocky(40);
        }
      } else if (hitMary) {
        damagePlayer(40);
      } else {
        damageRocky(40);
      }
      scene.remove(proj.mesh);
      bossProjectiles.splice(i, 1);
      continue;
    }

    if (proj.mesh.position.y < -140) {
      scene.remove(proj.mesh);
      bossProjectiles.splice(i, 1);
    }
  }
}

function startBossPhase() {
  if (isBossPhase || isBossDefeated) return;
  isBossPhase = true;
  spawnTimer = 0;
  disposeAllBossHitSparks();
  for (let i = obstacles.length - 1; i >= 0; i -= 1) {
    scene.remove(obstacles[i]);
  }
  obstacles.length = 0;
  for (let i = bossProjectiles.length - 1; i >= 0; i -= 1) {
    scene.remove(bossProjectiles[i].mesh);
  }
  bossProjectiles.length = 0;
  for (let i = powerups.length - 1; i >= 0; i -= 1) {
    scene.remove(powerups[i]);
  }
  powerups.length = 0;
  powerupSpawnTimer = 0;
  bossShootTimer = 0;
  bossHp = bossMaxHp;
  isBossDefeated = false;
  bossDir = 1;
  bossShieldMesh = null;
  bossMesh = new THREE.Mesh(
    new THREE.IcosahedronGeometry(BOSS_MESH_CIRCUMRADIUS, 0),
    new THREE.MeshStandardMaterial({
      color: 0xff0000,
      emissive: 0xff0000,
      emissiveIntensity: 1.0,
      roughness: 0.5,
      metalness: 0.15
    })
  );
  bossShieldMesh = new THREE.Mesh(
    new THREE.IcosahedronGeometry(13, 1),
    new THREE.MeshBasicMaterial({
      color: 0xffaa00,
      wireframe: true,
      transparent: true,
      opacity: 0.6
    })
  );
  bossMesh.add(bossShieldMesh);
  bossMesh.position.set(0, 44, 0);
  scene.add(bossMesh);
  updateBossUI(bossHp, bossMaxHp);
  if (bossHpContainer) bossHpContainer.style.display = "block";
}

function updateBoss(delta, elapsed) {
  if (!gameStarted || !isBossPhase || isBossDefeated || !bossMesh || isPostBossCinematic || isCutscenePlaying || shipsEscaping) return;
  bossMesh.position.x += bossDir * 20 * delta;
  if (bossMesh.position.x > 56) {
    bossMesh.position.x = 56;
    bossDir = -1;
  } else if (bossMesh.position.x < -56) {
    bossMesh.position.x = -56;
    bossDir = 1;
  }
  bossMesh.rotation.x += 0.02;
  bossMesh.rotation.y += 0.03;
  if (bossShieldMesh) {
    bossShieldMesh.rotation.x -= 0.04;
  }
  const pulse = 0.5 + ((Math.sin(elapsed * 3.4) + 1) * 0.5);
  bossMesh.material.emissiveIntensity = pulse;
}

function startPostBossCinematic() {
  isPostBossCinematic = true;
  if (bossHpContainer) bossHpContainer.style.display = "none";
  disposeAllBossHitSparks();
  maryInputX = 0;
  rockyInputX = 0;
  for (let i = obstacles.length - 1; i >= 0; i -= 1) {
    scene.remove(obstacles[i]);
  }
  obstacles.length = 0;
  for (let i = lasers.length - 1; i >= 0; i -= 1) {
    scene.remove(lasers[i]);
  }
  lasers.length = 0;
  for (let i = bossProjectiles.length - 1; i >= 0; i -= 1) {
    scene.remove(bossProjectiles[i].mesh);
  }
  bossProjectiles.length = 0;
  for (let i = powerups.length - 1; i >= 0; i -= 1) {
    scene.remove(powerups[i]);
  }
  powerups.length = 0;
  bossShootTimer = 0;
  activeDialogueLines = postBossDialogueLines;
  dialogueCompletionHandler = () => showEnterLabOverlay();
  dialogueIndex = 0;
  showDialogue();
}

function showEnterLabOverlay() {
  if (document.getElementById("enter-lab-overlay")) return;
  const overlay = document.createElement("div");
  overlay.id = "enter-lab-overlay";
  overlay.style.position = "fixed";
  overlay.style.inset = "0";
  overlay.style.zIndex = "60";
  overlay.style.display = "flex";
  overlay.style.alignItems = "center";
  overlay.style.justifyContent = "center";
  overlay.style.background = "rgba(0, 0, 0, 0.84)";
  overlay.style.fontFamily = "Orbitron, 'Courier New', monospace";

  const card = document.createElement("div");
  card.style.padding = "28px 34px";
  card.style.border = "2px solid #39ff14";
  card.style.boxShadow = "0 0 28px rgba(57, 255, 20, 0.25)";
  card.style.background = "#05070a";
  card.style.textAlign = "center";
  card.style.color = "#e8ffed";

  const btn = document.createElement("button");
  btn.innerText = "ENTER THE LAB";
  btn.style.fontSize = "1.2rem";
  btn.style.fontWeight = "700";
  btn.style.padding = "14px 26px";
  btn.style.letterSpacing = "1px";
  btn.style.background = "#39ff14";
  btn.style.color = "#000";
  btn.style.border = "none";
  btn.style.cursor = "pointer";
  btn.addEventListener("click", () => {
    transitionToNextPhase();
  });

  card.appendChild(btn);
  overlay.appendChild(card);
  document.body.appendChild(overlay);
}

function transitionToNextPhase() {
  if (document.getElementById("phase-transition-overlay")) return;
  fadeOutBgm(2200);
  const overlay = document.createElement("div");
  overlay.id = "phase-transition-overlay";
  overlay.style.cssText = "position:fixed; top:0; left:0; width:100vw; height:100vh; background:#000; z-index:9999; opacity:0; transition: opacity 2s ease-in-out; display:flex; justify-content:center; align-items:center; color:#4a90e2; font-family:monospace; font-size:24px;";
  overlay.innerText = "FINAL PHASE: LAB INCUBATION...";
  document.body.appendChild(overlay);

  setTimeout(() => {
    overlay.style.opacity = "1";
  }, 50);

  setTimeout(() => {
    window.location.href = `../phase4-lab/index.html?username=${encodeURIComponent(currentUsername)}`;
  }, 2500);
}

const clock = new THREE.Clock();
function animate() {
  const delta = clock.getDelta();
  const elapsed = clock.elapsedTime;
  updateStarfield(delta);
  starfield.rotation.y += delta * 0.025;
  infectedStar.rotation.y += 0.001;
  updateTweens(delta);
  updateShipMovement(delta);
  updateShipTilts();
  updateObstacles(delta);
  updateBossHitSparks(delta);
  if (cameraShakeRemain > 0) {
    cameraShakeRemain -= delta;
    const p = Math.max(0, cameraShakeRemain / 0.45);
    const s = cameraShakeMag * p;
    camera.position.x = THREE.MathUtils.randFloatSpread(s * 4.4);
    camera.position.y = THREE.MathUtils.randFloatSpread(s * 3.2);
    if (cameraShakeRemain <= 0) {
      cameraShakeRemain = 0;
      cameraShakeMag = 3.8;
      camera.position.copy(CAMERA_REST);
    }
  } else if (camera.position.x !== 0 || camera.position.y !== 0) {
    camera.position.copy(CAMERA_REST);
  }
  updateBoss(delta, elapsed);
  if (gameStarted && isBossPhase && !isBossDefeated && bossMesh && !isPostBossCinematic) {
    bossShootTimer += 1;
    if (bossShootTimer > 70) {
      spawnBossSpreadShot();
      bossShootTimer = 0;
    }
  }
  updateBossProjectiles();
  if (shipsEscaping) {
    maryShip.position.x -= 0.32;
    rockyShip.position.x += 0.32;
    maryShip.position.y += 0.08;
    rockyShip.position.y += 0.08;
    maryShip.rotation.x = -0.3;
    rockyShip.rotation.x = -0.3;
    maryShip.rotation.z = 0.25;
    rockyShip.rotation.z = -0.25;
    if (maryShip.position.x < -130 && rockyShip.position.x > 130) {
      shipsEscaping = false;
      showEnterLabOverlay();
    }
  }
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

animate();

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
