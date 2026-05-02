import * as THREE from "https://esm.sh/three@0.161.0";
import { GLTFLoader } from "https://esm.sh/three@0.161.0/examples/jsm/loaders/GLTFLoader.js";

const vibeJamOriginalParams =
  typeof window !== "undefined" && window.location.search ? window.location.search : "";
const vibeJamSearchParams = new URLSearchParams(vibeJamOriginalParams);
/** Webring exit target; defaulted when no incoming ref so the return portal always has a destination. */
let vibeJamRefURL = vibeJamSearchParams.get("ref") || "";
vibeJamRefURL = vibeJamRefURL.trim() ? vibeJamRefURL.trim() : "https://vibejam.cc/portal/2026";
const vibePortalOverlayActive = true;

function buildVibeReturnPortalHref(refBase, originalSearch) {
  const trimmed = typeof refBase === "string" ? refBase.trim() : "";
  if (!trimmed) return "";
  try {
    const absolute = trimmed.startsWith("http://") || trimmed.startsWith("https://")
      ? trimmed
      : new URL(trimmed, window.location.href).href;
    const dest = new URL(absolute);
    const rawQs = typeof originalSearch === "string" ? originalSearch.replace(/^\?/, "") : "";
    const incoming = new URLSearchParams(rawQs);
    const skip = new Set(["ref"]);
    incoming.forEach((value, key) => {
      if (!skip.has(key.toLowerCase())) dest.searchParams.set(key, value);
    });
    return dest.href;
  } catch {
    return trimmed;
  }
}

let vibePortalRedirectPending = false;

let vibePortalOverlayLastTs = 0;
const vibePortalEnergyParticles = [];
const VIBE_PORTAL_PARTICLE_COUNT = 96;

(function initPortalParticlePool() {
  for (let i = 0; i < VIBE_PORTAL_PARTICLE_COUNT; i += 1) {
    vibePortalEnergyParticles.push({
      theta: Math.random() * Math.PI * 2,
      bandT: Math.random(),
      ttl: Math.random(),
      spin: 1.2 + Math.random() * 4.5,
      ttlSpeed: 0.22 + Math.random() * 0.5,
      jitter: Math.random() * Math.PI * 2
    });
  }
})();
const scene = new THREE.Scene();
const skyColor = new THREE.Color("#ff8c00");
scene.background = skyColor;
scene.fog = new THREE.Fog(skyColor, 180, 2400);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 6000);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);
renderer.domElement.style.position = "fixed";
renderer.domElement.style.left = "0";
renderer.domElement.style.top = "0";
renderer.domElement.style.zIndex = "2";

const introOverlay = document.getElementById("intro-overlay");
const inputSection = document.getElementById("input-section");
const narrativeSection = document.getElementById("narrative-section");
const pilotNameInput = document.getElementById("pilot-name");
const startBtn = document.getElementById("start-btn");
const typewriterText = document.getElementById("typewriter-text");
const continuePrompt = document.getElementById("continue-prompt");
let controlsEnabled = !introOverlay;
let narrativeReadyForInit = !introOverlay;
let typewriterTimerId = null;
let introAutoStartTimerId = null;
let captainName = "CAPTAIN";
let audioContext = null;
let engineOscillator = null;
let engineGainNode = null;
let lastDriftBurstAt = -1;

function initProceduralAudio() {
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return;

  if (!audioContext) {
    audioContext = new AudioCtx();
    engineOscillator = audioContext.createOscillator();
    engineGainNode = audioContext.createGain();
    engineOscillator.type = "triangle";
    engineOscillator.frequency.value = 40;
    engineGainNode.gain.value = 0;
    engineOscillator.connect(engineGainNode);
    engineGainNode.connect(audioContext.destination);
    engineOscillator.start();
  }

  if (audioContext.state === "suspended") audioContext.resume();
}

function normalizeCaptainName(value) {
  const normalized = (value || "").trim().replace(/\s+/g, " ").toUpperCase();
  return normalized || "CAPTAIN";
}

function getIntroNarrative(name) {
  return `Welcome aboard, Captain ${name}. You are entering the Dead Zone. This city is a simulation, but the danger is real. Your mission: survive the transit to the core. In each stage, you will return here to recalibrate and prepare for the next phase. Save the Earth, Captain. Commencement begins now.`;
}

function initializeSimulation() {
  if (controlsEnabled) return;
  if (introAutoStartTimerId) {
    window.clearTimeout(introAutoStartTimerId);
    introAutoStartTimerId = null;
  }
  initProceduralAudio();
  controlsEnabled = true;
  narrativeReadyForInit = false;
  if (introOverlay) {
    introOverlay.style.transition = "opacity 700ms ease";
    introOverlay.style.opacity = "0";
    window.setTimeout(() => {
      introOverlay.style.display = "none";
    }, 720);
  }
}

const checkpointUi = document.createElement("div");
checkpointUi.style.position = "absolute";
checkpointUi.style.left = "50%";
checkpointUi.style.top = "20%";
checkpointUi.style.transform = "translate(-50%, -50%)";
checkpointUi.style.display = "none";
checkpointUi.style.pointerEvents = "none";
checkpointUi.style.fontFamily = "Orbitron, Arial, sans-serif";
checkpointUi.style.fontSize = "46px";
checkpointUi.style.fontWeight = "700";
checkpointUi.style.color = "#ffffff";
checkpointUi.style.textShadow = "0 0 3px #000, 0 0 8px #000, 0 0 14px #000";
checkpointUi.style.letterSpacing = "2px";
checkpointUi.style.zIndex = "20";
document.body.appendChild(checkpointUi);

const ambient = new THREE.AmbientLight(0xffffff, 0.36);
scene.add(ambient);

const dirLight = new THREE.DirectionalLight(0xfff7df, 1.05);
dirLight.position.set(120, 220, 80);
dirLight.castShadow = true;
dirLight.shadow.mapSize.width = 4096;
dirLight.shadow.mapSize.height = 4096;
dirLight.shadow.camera.left = -600;
dirLight.shadow.camera.right = 600;
dirLight.shadow.camera.top = 600;
dirLight.shadow.camera.bottom = -600;
scene.add(dirLight);

const islandSurfaceMat = new THREE.MeshStandardMaterial({ color: 0x0b0b10, roughness: 0.9, metalness: 0.02 });
islandSurfaceMat.onBeforeCompile = (shader) => {
  shader.uniforms.uTime = { value: 0 };
  islandSurfaceMat.userData.shader = shader;

  shader.vertexShader =
    `
varying vec3 vWorldPos;
` + shader.vertexShader;

  shader.vertexShader = shader.vertexShader.replace(
    "#include <worldpos_vertex>",
    `
#include <worldpos_vertex>
vWorldPos = worldPosition.xyz;
`
  );

  shader.fragmentShader =
    `
varying vec3 vWorldPos;
uniform float uTime;

float hash21(vec2 p) {
  p = fract(p * vec2(123.34, 345.45));
  p += dot(p, p + 34.345);
  return fract(p.x * p.y);
}

float valueNoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  float a = hash21(i);
  float b = hash21(i + vec2(1.0, 0.0));
  float c = hash21(i + vec2(0.0, 1.0));
  float d = hash21(i + vec2(1.0, 1.0));
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}
` + shader.fragmentShader;

  shader.fragmentShader = shader.fragmentShader.replace(
    "vec4 diffuseColor = vec4( diffuse, opacity );",
    `
vec3 deepBase = vec3(0.015, 0.03, 0.015);
vec3 grassBase = vec3(0.03, 0.12, 0.03);
vec2 gridUv = vWorldPos.xz * 0.22;
vec2 gridDist = abs(fract(gridUv - 0.5) - 0.5) / max(fwidth(gridUv), vec2(0.0001));
float lineDist = min(gridDist.x, gridDist.y);
float nA = valueNoise(vWorldPos.xz * 0.09);
float nB = valueNoise(vWorldPos.xz * 0.21 + vec2(12.4, 4.6));
float grassNoise = mix(nA, nB, 0.45);
vec3 fieldColor = mix(deepBase, grassBase, grassNoise);
float pulse = 0.82 + 0.18 * sin(uTime * 0.55 + vWorldPos.x * 0.03 + vWorldPos.z * 0.025);
float bladeAccent = 1.0 - smoothstep(0.0, 0.45, lineDist);
vec3 finalDiffuse = fieldColor * (0.86 + 0.14 * pulse) + vec3(0.07, 0.16, 0.06) * bladeAccent * 0.22;
vec4 diffuseColor = vec4( finalDiffuse, opacity );
`
  );
};
islandSurfaceMat.customProgramCacheKey = () => "island-synthwave-grid-v1";

const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(460, 760),
  islandSurfaceMat
);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

const ocean = new THREE.Mesh(
  new THREE.PlaneGeometry(10000, 10000),
  new THREE.MeshStandardMaterial({ color: 0x004466, roughness: 0.92, metalness: 0.05 })
);
ocean.rotation.x = -Math.PI / 2;
ocean.position.y = -0.5;
ocean.receiveShadow = false;
scene.add(ocean);

const mountainMat = new THREE.MeshStandardMaterial({ color: 0x2b2b36, flatShading: true });
const mountainCount = 130;
for (let i = 0; i < mountainCount; i += 1) {
  const angle = (i / mountainCount) * Math.PI * 2 + THREE.MathUtils.randFloatSpread(0.18);
  const ringRadius = THREE.MathUtils.randFloat(900, 1450);
  const height = THREE.MathUtils.randFloat(100, 300);
  const radius = THREE.MathUtils.randFloat(45, 130);
  const mountain = new THREE.Mesh(
    new THREE.ConeGeometry(radius, height, Math.random() < 0.5 ? 3 : 4),
    mountainMat
  );
  mountain.position.set(Math.cos(angle) * ringRadius, height * 0.5 - 2, Math.sin(angle) * ringRadius);
  mountain.rotation.y = Math.random() * Math.PI * 2;
  mountain.castShadow = true;
  mountain.receiveShadow = true;
  scene.add(mountain);
}

const roadCurve = new THREE.CatmullRomCurve3([
  new THREE.Vector3(0, 0.04, 0),
  new THREE.Vector3(-35, 0.04, -90),
  new THREE.Vector3(60, 0.04, -180),
  new THREE.Vector3(8, 0.04, -300),
  new THREE.Vector3(0, 0.04, -380)
]);

const roadWidth = 20;
function buildFlatRoadGeometry(curve, width, segments = 520) {
  const positions = [];
  const normals = [];
  const uvs = [];
  const indices = [];

  for (let i = 0; i <= segments; i += 1) {
    const t = i / segments;
    const p = curve.getPointAt(t);
    const tangent = curve.getTangentAt(t).normalize();
    const side = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();

    const left = p.clone().addScaledVector(side, width * 0.5);
    const right = p.clone().addScaledVector(side, -width * 0.5);

    positions.push(left.x, 0.045, left.z);
    positions.push(right.x, 0.045, right.z);

    normals.push(0, 1, 0, 0, 1, 0);
    uvs.push(0, t, 1, t);
  }

  for (let i = 0; i < segments; i += 1) {
    const a = i * 2;
    const b = a + 1;
    const c = a + 2;
    const d = a + 3;
    indices.push(a, c, b);
    indices.push(b, c, d);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeBoundingSphere();
  return geometry;
}

const road = new THREE.Mesh(
  buildFlatRoadGeometry(roadCurve, roadWidth),
  new THREE.MeshStandardMaterial({ color: 0x1e2024, flatShading: true })
);
road.receiveShadow = true;
road.castShadow = false;
scene.add(road);

function getRoadPointAt(t) {
  return roadCurve.getPointAt(t);
}

function getRoadTangentAt(t) {
  const t3 = roadCurve.getTangentAt(t);
  return new THREE.Vector3(t3.x, 0, t3.z).normalize();
}

function createRoadMarker(t) {
  const p = getRoadPointAt(t);
  const tangent = getRoadTangentAt(t);
  const marker = new THREE.Mesh(
    new THREE.BoxGeometry(0.7, 0.04, 4.6),
    new THREE.MeshStandardMaterial({ color: 0xefefef })
  );
  marker.position.copy(p);
  marker.position.y += 0.08;
  marker.rotation.y = Math.atan2(-tangent.x, -tangent.z);
  return marker;
}

for (let i = 0; i < 70; i += 1) {
  scene.add(createRoadMarker(i / 69));
}

const BUILDING_COUNT = 200;
const TREE_COUNT = 300;
const ROAD_KEEP_OUT = roadWidth * 0.5 + 6; // stronger no-tree/no-building road buffer
const ISLAND_WIDTH = 460;
const ISLAND_DEPTH = 760;
const ISLAND_EDGE_MARGIN = 22;
const upAxis = new THREE.Vector3(0, 1, 0);
const transformDummy = new THREE.Object3D();
const obstacleBoxes = [];

const roadDistanceSamples = [];
for (let i = 0; i <= 220; i += 1) {
  const p = getRoadPointAt(i / 220);
  roadDistanceSamples.push(new THREE.Vector3(p.x, 0, p.z));
}

function minDistanceToRoad(pos2D) {
  let minSq = Number.POSITIVE_INFINITY;
  for (let i = 0; i < roadDistanceSamples.length; i += 1) {
    const rp = roadDistanceSamples[i];
    const dx = pos2D.x - rp.x;
    const dz = pos2D.z - rp.z;
    const d2 = dx * dx + dz * dz;
    if (d2 < minSq) minSq = d2;
  }
  return Math.sqrt(minSq);
}

function sampleIslandPlacement(objRadius, minRoadDistance) {
  const minX = -ISLAND_WIDTH * 0.5 + ISLAND_EDGE_MARGIN + objRadius;
  const maxX = ISLAND_WIDTH * 0.5 - ISLAND_EDGE_MARGIN - objRadius;
  const minZ = -ISLAND_DEPTH * 0.5 + ISLAND_EDGE_MARGIN + objRadius;
  const maxZ = ISLAND_DEPTH * 0.5 - ISLAND_EDGE_MARGIN - objRadius;
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const x = THREE.MathUtils.randFloat(minX, maxX);
    const z = THREE.MathUtils.randFloat(minZ, maxZ);
    const pos2D = new THREE.Vector3(x, 0, z);
    if (minDistanceToRoad(pos2D) < minRoadDistance) continue;
    return new THREE.Vector3(x, 0, z);
  }
  return new THREE.Vector3(
    THREE.MathUtils.randFloat(minX, maxX),
    0,
    THREE.MathUtils.randFloat(minZ, maxZ)
  );
}

function isOverlapping(pos, radius, entries, padding = 0) {
  for (let i = 0; i < entries.length; i += 1) {
    const e = entries[i];
    const minDist = radius + e.radius + padding;
    if (pos.distanceToSquared(e.pos) < minDist * minDist) return true;
  }
  return false;
}

const buildingBaseMat = new THREE.MeshStandardMaterial({
  color: 0x161a22,
  flatShading: true,
  roughness: 0.92,
  metalness: 0.03
});
buildingBaseMat.onBeforeCompile = (shader) => {
  shader.vertexShader =
    `
varying vec3 vWorldPos;
` + shader.vertexShader;

  shader.vertexShader = shader.vertexShader.replace(
    "#include <worldpos_vertex>",
    `
#include <worldpos_vertex>
vWorldPos = worldPosition.xyz;
`
  );

  shader.fragmentShader =
    `
varying vec3 vWorldPos;
` + shader.fragmentShader;

  shader.fragmentShader = shader.fragmentShader.replace(
    "vec4 diffuseColor = vec4( diffuse, opacity );",
    `
vec3 wallColor = diffuse * 0.95;
vec2 facadeUV = vec2(vWorldPos.x, vWorldPos.y);
float cellSize = 2.0;
vec2 cell = fract(facadeUV / cellSize);
vec2 cellId = floor(facadeUV / cellSize);
float litSeed = fract(sin(dot(cellId, vec2(12.9898, 78.233))) * 43758.5453);
float lit = step(0.42, litSeed);
float wx = step(0.22, cell.x) * step(cell.x, 0.78);
float wy = step(0.20, cell.y) * step(cell.y, 0.80);
float wMask = wx * wy * lit;
float warmSeed = fract(sin(dot(cellId + 3.17, vec2(7.13, 19.37))) * 15731.743);
vec3 warmA = vec3(1.0, 0.84, 0.34);
vec3 warmB = vec3(1.0, 0.70, 0.28);
vec3 warmC = vec3(1.0, 0.95, 0.68);
vec3 windowColor = mix(warmA, warmB, step(0.55, warmSeed));
windowColor = mix(windowColor, warmC, step(0.87, warmSeed));
vec3 finalDiffuse = mix(wallColor, windowColor, wMask);
vec4 diffuseColor = vec4( finalDiffuse, opacity );
`
  );
};
buildingBaseMat.customProgramCacheKey = () => "building-onbeforecompile-worldwindows-v1";

const buildingMesh = new THREE.InstancedMesh(
  new THREE.BoxGeometry(1, 1, 1),
  buildingBaseMat,
  BUILDING_COUNT
);
buildingMesh.castShadow = true;
buildingMesh.receiveShadow = true;
const buildingFootprints = [];
for (let i = 0; i < BUILDING_COUNT; i += 1) {
  const width = THREE.MathUtils.randFloat(6.5, 10.5);
  const depth = THREE.MathUtils.randFloat(8, 14);
  const height = THREE.MathUtils.randFloat(24, 86);
  const footprintRadius = Math.max(width, depth) * 0.55;
  let sampled = null;
  for (let attempt = 0; attempt < 24; attempt += 1) {
    const pos2D = sampleIslandPlacement(footprintRadius, ROAD_KEEP_OUT + 2);
    if (!isOverlapping(pos2D, footprintRadius, buildingFootprints, 6)) {
      sampled = pos2D;
      break;
    }
  }
  if (!sampled) {
    sampled = sampleIslandPlacement(footprintRadius, ROAD_KEEP_OUT + 1);
  }
  const pos = sampled;
  pos.y = height * 0.5;

  const yaw = Math.random() * Math.PI * 2;
  transformDummy.position.copy(pos);
  transformDummy.quaternion.setFromAxisAngle(upAxis, yaw);
  transformDummy.scale.set(width, height, depth);
  transformDummy.updateMatrix();
  buildingMesh.setMatrixAt(i, transformDummy.matrix);
  buildingFootprints.push({ pos: new THREE.Vector3(pos.x, 0, pos.z), radius: footprintRadius });
  obstacleBoxes.push(
    new THREE.Box3().setFromCenterAndSize(
      new THREE.Vector3(pos.x, height * 0.5, pos.z),
      new THREE.Vector3(width, height, depth)
    )
  );
}
buildingMesh.instanceMatrix.needsUpdate = true;
scene.add(buildingMesh);

const trunkMesh = new THREE.InstancedMesh(
  new THREE.CylinderGeometry(0.35, 0.5, 1, 6),
  new THREE.MeshStandardMaterial({ color: 0x6b4a2f, flatShading: true }),
  TREE_COUNT
);
trunkMesh.castShadow = true;
trunkMesh.receiveShadow = true;

const leavesMesh = new THREE.InstancedMesh(
  new THREE.ConeGeometry(1, 1, 7),
  new THREE.MeshStandardMaterial({ color: 0x2f8f3d, flatShading: true }),
  TREE_COUNT
);
leavesMesh.castShadow = true;
leavesMesh.receiveShadow = true;
const treeFootprints = [];
for (let i = 0; i < TREE_COUNT; i += 1) {
  const trunkRadius = THREE.MathUtils.randFloat(0.7, 1.2);
  const trunkHeight = THREE.MathUtils.randFloat(2.5, 5.5);
  const leavesRadius = THREE.MathUtils.randFloat(2.0, 4.2);
  const leavesHeight = THREE.MathUtils.randFloat(4.5, 8.2);
  const treeRadius = leavesRadius * 1.25;
  let sampled = null;
  for (let attempt = 0; attempt < 28; attempt += 1) {
    const pos2D = sampleIslandPlacement(treeRadius, ROAD_KEEP_OUT + 1);
    if (isOverlapping(pos2D, treeRadius, buildingFootprints, 6)) continue;
    if (isOverlapping(pos2D, treeRadius, treeFootprints, 1.5)) continue;
    sampled = pos2D;
    break;
  }
  if (!sampled) {
    sampled = sampleIslandPlacement(treeRadius, ROAD_KEEP_OUT);
  }
  const basePos = sampled;
  const yaw = Math.random() * Math.PI * 2;

  transformDummy.position.set(basePos.x, trunkHeight * 0.5, basePos.z);
  transformDummy.quaternion.setFromAxisAngle(upAxis, yaw);
  transformDummy.scale.set(trunkRadius, trunkHeight, trunkRadius);
  transformDummy.updateMatrix();
  trunkMesh.setMatrixAt(i, transformDummy.matrix);

  transformDummy.position.set(basePos.x, trunkHeight + leavesHeight * 0.5, basePos.z);
  transformDummy.quaternion.setFromAxisAngle(upAxis, yaw);
  transformDummy.scale.set(leavesRadius, leavesHeight, leavesRadius);
  transformDummy.updateMatrix();
  leavesMesh.setMatrixAt(i, transformDummy.matrix);
  treeFootprints.push({ pos: new THREE.Vector3(basePos.x, 0, basePos.z), radius: treeRadius });
  obstacleBoxes.push(
    new THREE.Box3().setFromCenterAndSize(
      new THREE.Vector3(basePos.x, (trunkHeight + leavesHeight) * 0.5, basePos.z),
      new THREE.Vector3(treeRadius * 2, trunkHeight + leavesHeight, treeRadius * 2)
    )
  );
}
trunkMesh.instanceMatrix.needsUpdate = true;
leavesMesh.instanceMatrix.needsUpdate = true;
scene.add(trunkMesh);
scene.add(leavesMesh);

function createWhiteboardTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext("2d");
  const tex = new THREE.CanvasTexture(canvas);
  tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  tex.needsUpdate = true;
  return { canvas, ctx, texture: tex };
}

const whiteboard = new THREE.Group();
const whiteboardTextureData = createWhiteboardTexture();
function buildBoardPages(name) {
  const pilot = normalizeCaptainName(name || window.captainName || captainName);
  return [
    `PHASE 1 TUTORIAL\nPILOT: CAPTAIN ${pilot}\n\n[ PRESS 'RIGHT ARROW' FOR BRIEFING -> ]`,
    "MISSION UPDATE: YOU HAVE GONE ROGUE.\nTo avoid the suicide mission of collecting the Astrophage in deep space, you are fleeing to the Safe Zone. But Commander Eva and the US Special Security Force are hot on your tail.\n\n[ -> ]",
    "EVASION PROTOCOL:\nUse W/A/S/D to steer. Avoid attacks at all costs!\n- CYAN BEAMS: -10 Armor HP\n- ASTRO BLOBS: -20 Armor HP\nIf your yellow Armor Bar depletes, you lose a Heart.\n\n[ -> ]",
    "READY FOR DEPLOYMENT?\nSurvive the onslaught. Do not let Eva's forces destroy your vehicle. Also, try to Go pass the Green Astros with less Distance to your car and you'll see MAGIC!\n\n[ PRESS ENTER TO START EVASION ]"
  ];
}
let boardPages = buildBoardPages(window.captainName || captainName);
let boardPageIndex = 0;

function drawWrappedText(ctx, text, x, y, maxWidth, lineHeight) {
  let cursorY = y;
  const rows = text.split("\n");
  for (let r = 0; r < rows.length; r += 1) {
    const row = rows[r];
    if (row.trim() === "") {
      cursorY += lineHeight;
      continue;
    }
    const words = row.split(" ");
    let line = "";
    for (let i = 0; i < words.length; i += 1) {
      const testLine = line ? `${line} ${words[i]}` : words[i];
      if (ctx.measureText(testLine).width <= maxWidth) {
        line = testLine;
      } else {
        if (line) {
          ctx.fillText(line, x, cursorY);
          cursorY += lineHeight;
        }
        line = words[i];
      }
    }
    if (line) {
      ctx.fillText(line, x, cursorY);
      cursorY += lineHeight;
    }
  }
  return cursorY;
}

function renderBoardPage() {
  const { canvas, ctx, texture } = whiteboardTextureData;
  ctx.fillStyle = "#080808";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = "#d2d2d2";
  ctx.lineWidth = 12;
  ctx.strokeRect(18, 18, canvas.width - 36, canvas.height - 36);
  ctx.fillStyle = "#f8f8f8";
  ctx.font = "bold 40px Arial";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const horizontalPadding = 84;
  const maxTextWidth = canvas.width - horizontalPadding * 2;
  const textX = canvas.width / 2;
  const topY = 78;
  const lineHeight = 52;
  const pageLines = boardPages[boardPageIndex].split("\n");
  let bottomPrompt = "";
  if (pageLines.length && pageLines[pageLines.length - 1].trim().startsWith("[")) {
    bottomPrompt = pageLines.pop().trim();
  }
  const pageBody = pageLines.join("\n");
  const renderedBottom = drawWrappedText(ctx, pageBody, textX, topY, maxTextWidth, lineHeight);
  ctx.font = "bold 36px Arial";
  if (bottomPrompt) ctx.fillText(bottomPrompt, textX, Math.min(renderedBottom + 14, canvas.height - 54));
  texture.needsUpdate = true;
}
renderBoardPage();

function syncPilotWhiteboard(name) {
  boardPages = buildBoardPages(name);
  if (boardPageIndex >= boardPages.length) boardPageIndex = 0;
  renderBoardPage();
}

function beginNarrativeSequence(rawName) {
  initProceduralAudio();
  captainName = normalizeCaptainName(rawName);
  window.captainName = captainName;
  syncPilotWhiteboard(captainName);
  narrativeReadyForInit = false;

  if (introAutoStartTimerId) {
    window.clearTimeout(introAutoStartTimerId);
    introAutoStartTimerId = null;
  }

  if (inputSection) inputSection.style.display = "none";
  if (narrativeSection) narrativeSection.style.display = "block";
  if (continuePrompt) continuePrompt.style.display = "none";
  if (typewriterText) typewriterText.textContent = "";

  const narrative = getIntroNarrative(captainName);
  let index = 0;
  if (typewriterTimerId) window.clearInterval(typewriterTimerId);
  typewriterTimerId = window.setInterval(() => {
    index += 1;
    if (typewriterText) typewriterText.textContent = narrative.slice(0, index);
    playTypingSound();
    if (index >= narrative.length) {
      window.clearInterval(typewriterTimerId);
      typewriterTimerId = null;
      narrativeReadyForInit = true;
      if (continuePrompt) continuePrompt.style.display = "block";
      if (introAutoStartTimerId) window.clearTimeout(introAutoStartTimerId);
      introAutoStartTimerId = window.setTimeout(() => {
        introAutoStartTimerId = null;
        if (!controlsEnabled && narrativeReadyForInit) {
          initializeSimulation();
        }
      }, 2400);
    }
  }, 22);
}

if (introOverlay) {
  const query = new URLSearchParams(window.location.search);
  const paramName = query.get("username") || query.get("user") || query.get("name");
  if (paramName && paramName.trim() && pilotNameInput) {
    pilotNameInput.value = normalizeCaptainName(paramName);
  }

  introOverlay.addEventListener("click", () => {
    if (!controlsEnabled && narrativeReadyForInit) {
      initializeSimulation();
    }
  });
  introOverlay.addEventListener(
    "touchend",
    (e) => {
      if (!controlsEnabled && narrativeReadyForInit) {
        e.preventDefault();
        initializeSimulation();
      }
    },
    { passive: false }
  );

  if (startBtn && pilotNameInput) {
    startBtn.addEventListener("click", () => {
      initProceduralAudio();
      beginNarrativeSequence(pilotNameInput.value);
    });
    pilotNameInput.addEventListener("keydown", (e) => {
      if (e.code === "Enter") {
        initProceduralAudio();
        beginNarrativeSequence(pilotNameInput.value);
      }
    });
    pilotNameInput.focus();
  }
}

const boardMaterials = [
  new THREE.MeshStandardMaterial({ color: 0x222222 }),
  new THREE.MeshStandardMaterial({ color: 0x222222 }),
  new THREE.MeshStandardMaterial({ color: 0x2a2a2a }),
  new THREE.MeshStandardMaterial({ color: 0x2a2a2a }),
  new THREE.MeshStandardMaterial({ color: 0x1b1b1b }),
  new THREE.MeshStandardMaterial({ map: whiteboardTextureData.texture, color: 0xffffff })
];
const boardPanel = new THREE.Mesh(new THREE.BoxGeometry(14, 7.5, 0.45), boardMaterials);
boardPanel.position.y = 5;
boardPanel.castShadow = true;
boardPanel.receiveShadow = true;
boardPanel.rotation.y = Math.PI;
whiteboard.add(boardPanel);

const standMat = new THREE.MeshStandardMaterial({ color: 0x6f6f6f });
const standLeft = new THREE.Mesh(new THREE.BoxGeometry(0.5, 4.8, 0.5), standMat);
standLeft.position.set(-4.5, 2.3, -0.75);
standLeft.castShadow = true;
whiteboard.add(standLeft);
const standRight = standLeft.clone();
standRight.position.x = 4.5;
whiteboard.add(standRight);

const endPoint = getRoadPointAt(1);
const endTangent = getRoadTangentAt(1);
const facingDir = endTangent.clone().multiplyScalar(-1);
whiteboard.position.copy(endPoint);
whiteboard.position.y = 0;
whiteboard.rotation.y = Math.atan2(facingDir.x, facingDir.z);
scene.add(whiteboard);
obstacleBoxes.push(new THREE.Box3().setFromObject(whiteboard).expandByScalar(1.5));

const startPoint = roadCurve.getPoint(0);
const startTangent = roadCurve.getTangent(0).normalize();

/** Fixed in world space at startup only (never updated per frame). */
const vibePortalWorldPosition = new THREE.Vector3();
const vibePortalProjectScratch = new THREE.Vector3();
(function initVibePortalWorldPositionOnce() {
  const spawn = roadCurve.getPoint(0);
  const tan = roadCurve.getTangent(0).normalize();
  vibePortalWorldPosition.copy(spawn).addScaledVector(tan, -5);
  vibePortalWorldPosition.y = 0.2;
})();

/** < 5 units: spawn stays outside the sphere (spawn->portal distance = 5 along road). */
const VIBE_PORTAL_HIT_RADIUS = 4;

const car = new THREE.Group();
car.position.copy(startPoint);
car.position.y = 0;
car.rotation.y = Math.atan2(-startTangent.x, -startTangent.z);
scene.add(car);

const gltfLoader = new GLTFLoader();
const CAR_VISUAL_YAW_OFFSET = Math.PI * 1.5;
const carHalfExtents = new THREE.Vector3(1.2, 0.7, 2.2);
const carModelBounds = new THREE.Box3();
const carModelSize = new THREE.Vector3();
function createFallbackCarMesh() {
  const fallback = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(2.2, 0.8, 4.2),
    new THREE.MeshStandardMaterial({ color: 0x3a3a3a, roughness: 0.55, metalness: 0.25 })
  );
  body.position.y = 0.8;
  body.castShadow = true;
  body.receiveShadow = true;
  fallback.add(body);

  const cabin = new THREE.Mesh(
    new THREE.BoxGeometry(1.5, 0.7, 1.9),
    new THREE.MeshStandardMaterial({ color: 0x575757, roughness: 0.45, metalness: 0.35 })
  );
  cabin.position.y = 1.35;
  cabin.castShadow = true;
  cabin.receiveShadow = true;
  fallback.add(cabin);
  return fallback;
}

const fallbackCarMesh = createFallbackCarMesh();
car.add(fallbackCarMesh);

function applyLoadedCar(gltf) {
  const loadedCar = gltf.scene;
  loadedCar.rotation.y = CAR_VISUAL_YAW_OFFSET;
  loadedCar.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });

  carModelBounds.setFromObject(loadedCar);
  if (!carModelBounds.isEmpty()) {
    carModelBounds.getSize(carModelSize);
    const horizontalSpan = Math.max(carModelSize.x, carModelSize.z, 0.001);
    const targetHorizontalSpan = 4;
    const modelScale = targetHorizontalSpan / horizontalSpan;
    loadedCar.scale.setScalar(modelScale);

    carModelBounds.setFromObject(loadedCar);
    const center = carModelBounds.getCenter(new THREE.Vector3());
    loadedCar.position.x -= center.x;
    loadedCar.position.z -= center.z;
    loadedCar.position.y -= carModelBounds.min.y;

    carModelBounds.setFromObject(loadedCar);
    carModelBounds.getSize(carModelSize);
    carHalfExtents.set(
      Math.max(carModelSize.x * 0.5, 0.6),
      Math.max(carModelSize.y * 0.5, 0.4),
      Math.max(carModelSize.z * 0.5, 1.2)
    );
  }

  car.clear();
  car.add(loadedCar);
  updateCarBounds();
}

const carModelPaths = [
  "./assets/3d_car.glb",
  "/phase1-threejs/assets/3d_car.glb",
  "/assets/3d_car.glb",
  "../assets/3d_car.glb"
];
function loadCarModel(pathIndex = 0) {
  if (pathIndex >= carModelPaths.length) {
    car.clear();
    car.add(fallbackCarMesh);
    carHalfExtents.set(1.2, 0.7, 2.2);
    updateCarBounds();
    return;
  }

  gltfLoader.load(carModelPaths[pathIndex], (gltf) => {
    applyLoadedCar(gltf);
  }, undefined, () => {
    loadCarModel(pathIndex + 1);
  });
}

loadCarModel();

const carBounds = new THREE.Box3();
function updateCarBounds(position = car.position) {
  carBounds.setFromCenterAndSize(
    new THREE.Vector3(position.x, position.y + carHalfExtents.y, position.z),
    carHalfExtents.clone().multiplyScalar(2)
  );
}
updateCarBounds();

let currentRespawnPoint = {
  position: car.position.clone(),
  rotationY: car.rotation.y
};
let isParkedAtBoard = false;

function createCheckpointCoin() {
  const mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(1.05, 1.05, 0.24, 20),
    new THREE.MeshStandardMaterial({
      color: 0xffd54a,
      emissive: 0x8a6a00,
      emissiveIntensity: 0.35,
      metalness: 0.35,
      roughness: 0.35
    })
  );
  // Stand the coin upright (on edge).
  mesh.rotation.z = Math.PI / 2;
  mesh.castShadow = true;
  return mesh;
}

const activeCheckpointCoins = [];
const checkpointCount = 5;
let checkpointUiTimer = null;
for (let i = 1; i <= checkpointCount; i += 1) {
  const t = i / (checkpointCount + 1);
  const p = getRoadPointAt(t);
  const tangent = getRoadTangentAt(t);
  const rotationY = Math.atan2(-tangent.x, -tangent.z);

  const coin = createCheckpointCoin();
  coin.position.set(p.x, 1.4, p.z);
  scene.add(coin);

  activeCheckpointCoins.push({
    mesh: coin,
    checkpointNumber: i,
    respawnPosition: new THREE.Vector3(p.x, 0, p.z),
    respawnRotationY: rotationY
  });
}

const keys = { forward: false, backward: false, left: false, right: false };
const setKey = (code, isDown) => {
  if (code === "KeyW" || code === "ArrowUp") keys.forward = isDown;
  if (code === "KeyS" || code === "ArrowDown") keys.backward = isDown;
  if (code === "KeyA" || code === "ArrowLeft") keys.left = isDown;
  if (code === "KeyD" || code === "ArrowRight") keys.right = isDown;
};

function transitionToNextPhase() {
  if (document.getElementById("phase-transition-overlay")) return;
  const overlay = document.createElement("div");
  overlay.id = "phase-transition-overlay";
  overlay.style.cssText = "position:fixed; top:0; left:0; width:100vw; height:100vh; background:#000; z-index:9999; opacity:0; transition: opacity 2s ease-in-out; display:flex; justify-content:center; align-items:center; color:#4a90e2; font-family:monospace; font-size:24px;";
  overlay.innerText = "INITIATING EVA & MARY INTERCEPT...";
  document.body.appendChild(overlay);

  setTimeout(() => {
    overlay.style.opacity = "1";
  }, 50);

  setTimeout(() => {
    const currentUsername = (window.captainName || new URLSearchParams(window.location.search).get("username") || "PILOT").trim();
    window.location.href = `../phase2.html?username=${encodeURIComponent(currentUsername)}`;
  }, 2500);
}

window.addEventListener("keydown", (e) => {
  if (!controlsEnabled) {
    if (narrativeReadyForInit) initializeSimulation();
    return;
  }
  if (isParkedAtBoard && e.code === "Enter" && boardPageIndex === boardPages.length - 1) {
    transitionToNextPhase();
    return;
  }
  if (isParkedAtBoard && (e.code === "ArrowLeft" || e.code === "ArrowRight")) {
    if (!e.repeat) {
      if (e.code === "ArrowLeft") boardPageIndex = (boardPageIndex - 1 + boardPages.length) % boardPages.length;
      if (e.code === "ArrowRight") boardPageIndex = (boardPageIndex + 1) % boardPages.length;
      renderBoardPage();
      playUIClick();
    }
    return;
  }
  setKey(e.code, true);
  if (e.code === "KeyR") {
    car.position.copy(currentRespawnPoint.position);
    car.rotation.y = currentRespawnPoint.rotationY;
    updateCarBounds();
    isParkedAtBoard = false;
  }
});
window.addEventListener("keyup", (e) => {
  if (!controlsEnabled) return;
  setKey(e.code, false);
});

const worldUp = new THREE.Vector3(0, 1, 0);
const forward = new THREE.Vector3();
const rearward = new THREE.Vector3();
const smokeSpawnPos = new THREE.Vector3();
const cameraOffset = new THREE.Vector3(0, 9, 16);
const boardCameraOffset = new THREE.Vector3(0, 6.2, 10.2);
const cameraBoardDir = new THREE.Vector3();
const cameraCarForward = new THREE.Vector3();
const cameraDefaultTarget = new THREE.Vector3();
const cameraBoardTarget = new THREE.Vector3();
const cameraLookTarget = new THREE.Vector3();
const vibePortalCarFillLightPos = new THREE.Vector3();
const moveSpeed = 26;
const turnSpeed = 2.6;
const clock = new THREE.Clock();

let vibePortalCarFillLight = null;

function setupVibePortalThreeAtmosphere() {
  if (!vibePortalOverlayActive) return;

  vibePortalCarFillLight = new THREE.PointLight(0xaaeeff, 0, 42);
  vibePortalCarFillLight.decay = 2;
  scene.add(vibePortalCarFillLight);
}

function syncVibePortalCarFillLightPosition() {
  if (!vibePortalCarFillLight) return;
  vibePortalCarFillLightPos.set(0.45, 1.72, -0.35);
  vibePortalCarFillLightPos.applyAxisAngle(worldUp, car.rotation.y);
  vibePortalCarFillLight.position.copy(car.position).add(vibePortalCarFillLightPos);
}

function updateVibePortalThreeAtmosphere() {
  if (!vibePortalOverlayActive || !clock) return;
  const elapsed = clock.getElapsedTime();
  const flick =
    0.58 +
    Math.sin(elapsed * 18.2) * 0.14 +
    Math.sin(elapsed * 41) * 0.1 +
    Math.sin(elapsed * 73.4) * 0.08;
  const dXZ = Math.hypot(car.position.x - vibePortalWorldPosition.x, car.position.z - vibePortalWorldPosition.z);
  const proximity = THREE.MathUtils.clamp(1 - dXZ / 40, 0, 1);
  if (vibePortalCarFillLight) {
    syncVibePortalCarFillLightPosition();
    vibePortalCarFillLight.intensity = Math.pow(proximity, 1.15) * (7.2 + 4.5 * flick);
  }
}

setupVibePortalThreeAtmosphere();

const activeSmokeParticles = [];
const smokeMaterial = new THREE.MeshBasicMaterial({
  color: 0xcccccc,
  transparent: true,
  opacity: 0.8,
  depthWrite: false
});
const smokeIgnitionColor = new THREE.Color(0xffdd9a);
const smokeMidColor = new THREE.Color(0xd0d0d0);
const smokeEndColor = new THREE.Color(0x4f4f4f);
const smokeSpawnInterval = 0.011;
let smokeSpawnTimer = 0;
let isCarActivelyMoving = false;

function triggerDriftBurst(now) {
  if (!audioContext) return;
  if (lastDriftBurstAt >= 0 && now - lastDriftBurstAt < 0.17) return;
  lastDriftBurstAt = now;

  const squealOsc = audioContext.createOscillator();
  const squealGain = audioContext.createGain();
  squealOsc.type = "triangle";
  squealOsc.frequency.setValueAtTime(520, now);
  squealOsc.frequency.exponentialRampToValueAtTime(230, now + 0.12);
  squealGain.gain.setValueAtTime(0.0001, now);
  squealGain.gain.exponentialRampToValueAtTime(0.035, now + 0.015);
  squealGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.14);
  squealOsc.connect(squealGain);
  squealGain.connect(audioContext.destination);
  squealOsc.start(now);
  squealOsc.stop(now + 0.16);
  squealOsc.onended = () => {
    squealOsc.disconnect();
    squealGain.disconnect();
  };
}

function playTypingSound() {
  if (!audioContext) return;
  const now = audioContext.currentTime;
  const osc = audioContext.createOscillator();
  const gain = audioContext.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(THREE.MathUtils.randFloat(600, 800), now);
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(0.02, now + 0.008);
  gain.gain.linearRampToValueAtTime(0, now + 0.05);
  osc.connect(gain);
  gain.connect(audioContext.destination);
  osc.start(now);
  osc.stop(now + 0.055);
  osc.onended = () => {
    osc.disconnect();
    gain.disconnect();
  };
}

function playUIClick() {
  if (!audioContext) return;
  const now = audioContext.currentTime;
  const osc = audioContext.createOscillator();
  const gain = audioContext.createGain();
  osc.type = "square";
  osc.frequency.setValueAtTime(400, now);
  osc.frequency.exponentialRampToValueAtTime(200, now + 0.1);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.02, now + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.1);
  osc.connect(gain);
  gain.connect(audioContext.destination);
  osc.start(now);
  osc.stop(now + 0.11);
  osc.onended = () => {
    osc.disconnect();
    gain.disconnect();
  };
}

function playCheckpointSound() {
  if (!audioContext) return;
  const now = audioContext.currentTime;
  const osc = audioContext.createOscillator();
  const gain = audioContext.createGain();
  osc.type = "triangle";
  osc.frequency.setValueAtTime(800, now);
  osc.frequency.setValueAtTime(1200, now + 0.05);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.05, now + 0.012);
  gain.gain.setValueAtTime(0.05, now + 0.05);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.25);
  osc.connect(gain);
  gain.connect(audioContext.destination);
  osc.start(now);
  osc.stop(now + 0.26);
  osc.onended = () => {
    osc.disconnect();
    gain.disconnect();
  };
}

function updateEngineAudio() {
  if (!audioContext || !engineOscillator || !engineGainNode) return;
  const now = audioContext.currentTime;
  const isDrivingInput = controlsEnabled && !isParkedAtBoard && (keys.forward || keys.backward);
  const speedFactor = THREE.MathUtils.clamp(moveSpeed / 60, 0, 1);
  const targetFrequency = isDrivingInput ? THREE.MathUtils.lerp(40, 90, speedFactor) : 40;
  const targetGain = isDrivingInput ? 0.05 : 0;

  engineOscillator.frequency.cancelScheduledValues(now);
  engineOscillator.frequency.setTargetAtTime(targetFrequency, now, 0.12);
  engineGainNode.gain.cancelScheduledValues(now);
  engineGainNode.gain.setTargetAtTime(targetGain, now, isDrivingInput ? 0.1 : 0.18);

  if (isDrivingInput && (keys.left || keys.right)) triggerDriftBurst(now);
}

function spawnSmokeParticle() {
  rearward.set(0, 0, 1).applyAxisAngle(worldUp, car.rotation.y).normalize();
  smokeSpawnPos
    .copy(car.position)
    .addScaledVector(rearward, carHalfExtents.z + 0.3);
  smokeSpawnPos.y += 0.2;
  smokeSpawnPos.x += THREE.MathUtils.randFloatSpread(0.35);
  smokeSpawnPos.y += THREE.MathUtils.randFloat(-0.06, 0.1);
  smokeSpawnPos.z += THREE.MathUtils.randFloatSpread(0.35);

  const startScale = THREE.MathUtils.randFloat(0.12, 0.3);
  const endScale = startScale * THREE.MathUtils.randFloat(3.2, 4.4);
  const particle = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.22, 0.22), smokeMaterial.clone());
  particle.position.copy(smokeSpawnPos);
  particle.scale.setScalar(startScale);
  particle.material.opacity = THREE.MathUtils.randFloat(0.7, 0.95);
  particle.material.color.copy(smokeIgnitionColor);
  scene.add(particle);

  const drift = rearward.clone().multiplyScalar(THREE.MathUtils.randFloat(0.4, 3.6));
  drift.x += THREE.MathUtils.randFloatSpread(1.4);
  drift.y = THREE.MathUtils.randFloat(1.2, 3.1);
  drift.z += THREE.MathUtils.randFloatSpread(1.4);
  const life = THREE.MathUtils.randFloat(0.35, 0.62);
  activeSmokeParticles.push({
    mesh: particle,
    velocity: drift,
    age: 0,
    life,
    startScale,
    endScale
  });
}

function updateSmoke(delta) {
  if (isCarActivelyMoving && !isParkedAtBoard) {
    smokeSpawnTimer -= delta;
    while (smokeSpawnTimer <= 0) {
      spawnSmokeParticle();
      smokeSpawnTimer = smokeSpawnInterval;
    }
  } else {
    smokeSpawnTimer = 0;
  }

  for (let i = activeSmokeParticles.length - 1; i >= 0; i -= 1) {
    const p = activeSmokeParticles[i];
    p.age += delta;
    const t = Math.min(p.age / p.life, 1);
    p.mesh.position.addScaledVector(p.velocity, delta);
    p.mesh.scale.setScalar(THREE.MathUtils.lerp(p.startScale, p.endScale, t));
    p.mesh.material.opacity = Math.max((1 - t) * 0.95, 0);
    if (t < 0.35) {
      p.mesh.material.color.copy(smokeIgnitionColor).lerp(smokeMidColor, t / 0.35);
    } else {
      p.mesh.material.color.copy(smokeMidColor).lerp(smokeEndColor, (t - 0.35) / 0.65);
    }

    if (t >= 1 || p.mesh.material.opacity <= 0) {
      scene.remove(p.mesh);
      p.mesh.geometry.dispose();
      p.mesh.material.dispose();
      activeSmokeParticles.splice(i, 1);
    }
  }
}

const spawnCameraPos = cameraOffset.clone().applyAxisAngle(worldUp, car.rotation.y).add(car.position);
camera.position.copy(spawnCameraPos);
camera.lookAt(car.position.x, car.position.y + carHalfExtents.y, car.position.z);

function updateCar(delta) {
  const distToBoard = car.position.distanceTo(whiteboard.position);
  isParkedAtBoard = distToBoard <= 20;
  if (isParkedAtBoard) {
    keys.forward = false;
    keys.backward = false;
    keys.left = false;
    keys.right = false;
  }

  const prevPos = car.position.clone();
  const prevRot = car.rotation.y;

  if (keys.left) car.rotation.y += turnSpeed * delta;
  if (keys.right) car.rotation.y -= turnSpeed * delta;

  let direction = 0;
  if (keys.forward) direction += 1;
  if (keys.backward) direction -= 1;

  if (!isParkedAtBoard && direction !== 0) {
    forward.set(0, 0, -1).applyAxisAngle(worldUp, car.rotation.y).normalize();
    const nextPos = prevPos.clone().addScaledVector(forward, direction * moveSpeed * delta);
    const minX = -ISLAND_WIDTH * 0.5 + carHalfExtents.x;
    const maxX = ISLAND_WIDTH * 0.5 - carHalfExtents.x;
    const minZ = -ISLAND_DEPTH * 0.5 + carHalfExtents.z;
    const maxZ = ISLAND_DEPTH * 0.5 - carHalfExtents.z;
    nextPos.x = THREE.MathUtils.clamp(nextPos.x, minX, maxX);
    nextPos.z = THREE.MathUtils.clamp(nextPos.z, minZ, maxZ);
    const nextBounds = new THREE.Box3().setFromCenterAndSize(
      new THREE.Vector3(nextPos.x, nextPos.y + carHalfExtents.y, nextPos.z),
      carHalfExtents.clone().multiplyScalar(2)
    );
    let blocked = false;
    for (let i = 0; i < obstacleBoxes.length; i += 1) {
      if (nextBounds.intersectsBox(obstacleBoxes[i])) {
        blocked = true;
        break;
      }
    }
    if (!blocked) {
      car.position.copy(nextPos);
      carBounds.copy(nextBounds);
    } else {
      car.position.copy(prevPos);
      car.rotation.y = prevRot;
    }
  }

  isCarActivelyMoving = !isParkedAtBoard && car.position.distanceToSquared(prevPos) > 0.000001;
  updateCarBounds();
  for (let i = activeCheckpointCoins.length - 1; i >= 0; i -= 1) {
    const coinData = activeCheckpointCoins[i];
    coinData.mesh.rotation.y += delta * 3.2;
    if (car.position.distanceTo(coinData.mesh.position) <= 3.3) {
      playCheckpointSound();
      currentRespawnPoint = {
        position: coinData.respawnPosition.clone(),
        rotationY: coinData.respawnRotationY
      };
      scene.remove(coinData.mesh);
      activeCheckpointCoins.splice(i, 1);
      checkpointUi.textContent = `CHECKPOINT - ${coinData.checkpointNumber}`;
      checkpointUi.style.display = "block";
      if (checkpointUiTimer) clearTimeout(checkpointUiTimer);
      checkpointUiTimer = setTimeout(() => {
        checkpointUi.style.display = "none";
      }, 2000);
    }
  }

  if (vibeJamRefURL && controlsEnabled && vibePortalOverlayActive && !vibePortalRedirectPending) {
    const dSq = car.position.distanceToSquared(vibePortalWorldPosition);
    const hr = VIBE_PORTAL_HIT_RADIUS;
    if (dSq <= hr * hr) {
      const href = buildVibeReturnPortalHref(vibeJamRefURL, vibeJamOriginalParams).trim();
      if (href) {
        vibePortalRedirectPending = true;
        window.location.assign(href);
      }
    }
  }
}

function resizeVibePortalCanvas() {
  const canvasEl = document.getElementById("vibe-portal-overlay");
  if (!canvasEl) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvasEl.width = Math.floor(window.innerWidth * dpr);
  canvasEl.height = Math.floor(window.innerHeight * dpr);
  canvasEl.style.width = `${window.innerWidth}px`;
  canvasEl.style.height = `${window.innerHeight}px`;
  const c = canvasEl.getContext("2d");
  if (c) c.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function renderVibePortalOverlay() {
  const canvasEl = document.getElementById("vibe-portal-overlay");
  if (!canvasEl) return;
  const ctx = canvasEl.getContext("2d");
  if (!ctx) return;
  const w = window.innerWidth;
  const h = window.innerHeight;
  ctx.clearRect(0, 0, w, h);
  if (!vibePortalOverlayActive || !controlsEnabled) return;

  const nowTs = performance.now();
  let dtSec = vibePortalOverlayLastTs > 0 ? (nowTs - vibePortalOverlayLastTs) * 0.001 : 0.016;
  vibePortalOverlayLastTs = nowTs;
  dtSec = THREE.MathUtils.clamp(dtSec, 0.004, 0.07);

  const t = nowTs * 0.001;
  const pulseBase = 28 + Math.sin(t * 4.4) * 7;
  const pulseOuter = pulseBase * 1.25;

  const mainFontPx = Math.round(THREE.MathUtils.clamp(11 + w / 220, 12, 19));
  const subFontPx = Math.round(THREE.MathUtils.clamp(mainFontPx * 0.58, 7, 11));
  const textStackH = mainFontPx * 1.35 + subFontPx * 1.4 + 14;

  vibePortalProjectScratch.copy(vibePortalWorldPosition);
  vibePortalProjectScratch.project(camera);
  if (vibePortalProjectScratch.z > 1) return;

  const sx = (vibePortalProjectScratch.x * 0.5 + 0.5) * w;
  const sy = (-vibePortalProjectScratch.y * 0.5 + 0.5) * h;

  ctx.save();
  ctx.translate(sx, sy);

  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.shadowBlur = 14;
  ctx.shadowColor = "rgba(100, 240, 255, 0.95)";
  ctx.font = `600 ${mainFontPx}px "Share Tech Mono", monospace`;
  ctx.fillStyle = "rgba(180, 255, 255, 0.98)";
  ctx.fillText("BACK TO PREVIOUS GAME", 0, -pulseOuter - textStackH);

  ctx.shadowBlur = 10;
  ctx.shadowColor = "rgba(120, 200, 255, 0.85)";
  ctx.font = `${subFontPx}px "Share Tech Mono", monospace`;
  ctx.fillStyle = "rgba(140, 220, 255, 0.92)";
  ctx.fillText(
    "VIBE JAM 2026 WEB-RING RETURN PORTAL",
    0,
    -pulseOuter - textStackH + mainFontPx * 1.05 + subFontPx * 0.2
  );
  ctx.shadowBlur = 0;

  ctx.globalCompositeOperation = "source-over";
  const baseGrad = ctx.createRadialGradient(0, 0, pulseBase * 0.04, 0, 0, pulseOuter * 1.15);
  baseGrad.addColorStop(0, "rgba(90, 255, 255, 0.45)");
  baseGrad.addColorStop(0.25, "rgba(80, 180, 255, 0.22)");
  baseGrad.addColorStop(0.55, "rgba(120, 90, 255, 0.14)");
  baseGrad.addColorStop(1, "rgba(20, 20, 60, 0.02)");
  ctx.fillStyle = baseGrad;
  ctx.beginPath();
  ctx.arc(0, 0, pulseOuter * 1.1, 0, Math.PI * 2);
  ctx.fill();

  ctx.globalCompositeOperation = "lighter";
  for (let i = 0; i < vibePortalEnergyParticles.length; i += 1) {
    const p = vibePortalEnergyParticles[i];
    p.ttl -= dtSec * p.ttlSpeed * 1.35;
    p.theta += p.spin * dtSec * 0.92;
    p.jitter += dtSec * 4.8;
    if (p.ttl <= 0) {
      p.ttl = 0.75 + Math.random() * 0.5;
      p.theta = Math.random() * Math.PI * 2;
      p.bandT = Math.random();
      p.spin = 1 + Math.random() * 5.5;
      p.ttlSpeed = 0.25 + Math.random() * 0.55;
    }
    const band = 0.18 + p.bandT * 0.84;
    const pr = pulseBase * band * 0.98;
    const wob = 1 + Math.sin(p.jitter + i * 3) * 0.14;
    const bubbly = Math.sin(p.jitter * 2.1 + i) * pulseBase * 0.045;
    const px = Math.cos(p.theta) * pr * wob + Math.cos(i * 1.73 + p.jitter * 1.7) * bubbly;
    const py = Math.sin(p.theta) * pr * wob + Math.sin(i * 2.07 + p.jitter * 1.4) * bubbly;
    const lifeA = Math.max(0, p.ttl);
    const hue = 172 + Math.sin(p.jitter * 0.4 + i * 11) * 38 + ((i + 17) % 9) * 11;
    const sat = 88 + Math.sin(i + p.jitter) * 12;
    const lit = 55 + Math.sin(i * 0.7) * 12;
    ctx.fillStyle = `hsla(${hue}, ${sat}%, ${lit}%, ${lifeA * 0.62})`;
    const rPx = 1.15 + lifeA * (2.2 + ((i >> 3) % 5) * 0.65);
    ctx.beginPath();
    ctx.arc(px, py, rPx, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = `hsla(${hue + 25}, ${Math.min(100, sat + 6)}%, ${lit + 16}%, ${lifeA * 0.4})`;
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.arc(px, py, rPx + 0.95 + lifeA * 1.15, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.globalCompositeOperation = "lighter";
  ctx.fillStyle = "rgba(220, 255, 255, 0.12)";
  ctx.beginPath();
  ctx.arc(0, 0, pulseBase * 0.09, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function updateCamera() {
  const distToBoard = car.position.distanceTo(whiteboard.position);
  const proximityBlend = THREE.MathUtils.clamp((36 - distToBoard) / 20, 0, 1);

  cameraCarForward.set(0, 0, -1).applyAxisAngle(worldUp, car.rotation.y).normalize();
  cameraBoardDir.copy(whiteboard.position).sub(car.position).setY(0);
  if (cameraBoardDir.lengthSq() > 0.0001) {
    cameraBoardDir.normalize();
  }
  const facingBlend = THREE.MathUtils.clamp(cameraCarForward.dot(cameraBoardDir), 0, 1);
  const boardFocusBlend = THREE.MathUtils.clamp(proximityBlend * facingBlend, 0, 1);

  const chasePos = cameraOffset.clone().applyAxisAngle(worldUp, car.rotation.y).add(car.position);
  const boardZoomPos = boardCameraOffset.clone().applyAxisAngle(worldUp, car.rotation.y).add(car.position);
  chasePos.lerp(boardZoomPos, boardFocusBlend);
  camera.position.lerp(chasePos, 0.1);

  cameraDefaultTarget.set(car.position.x, car.position.y + carHalfExtents.y, car.position.z);
  cameraBoardTarget.set(whiteboard.position.x, whiteboard.position.y + 5.1, whiteboard.position.z);
  cameraLookTarget.lerpVectors(cameraDefaultTarget, cameraBoardTarget, boardFocusBlend);
  camera.lookAt(cameraLookTarget);

  const targetFov = THREE.MathUtils.lerp(60, 42, boardFocusBlend);
  if (Math.abs(camera.fov - targetFov) > 0.01) {
    camera.fov += (targetFov - camera.fov) * 0.1;
    camera.updateProjectionMatrix();
  }
}

function animate() {
  const delta = clock.getDelta();
  if (islandSurfaceMat.userData.shader) islandSurfaceMat.userData.shader.uniforms.uTime.value += delta;
  if (controlsEnabled) {
    updateCar(delta);
    updateSmoke(delta);
    updateCamera();
    updateVibePortalThreeAtmosphere();
  }
  updateEngineAudio();
  renderer.render(scene, camera);
  renderVibePortalOverlay();
  requestAnimationFrame(animate);
}

resizeVibePortalCanvas();
updateCamera();
animate();

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  resizeVibePortalCanvas();
});
