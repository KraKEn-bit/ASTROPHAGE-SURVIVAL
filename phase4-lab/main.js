const username = new URLSearchParams(window.location.search).get("username") || "PILOT";
document.getElementById("lab-username").innerText = username;
const creditsPlayerNameEl = document.getElementById("credits-player-name");
if (creditsPlayerNameEl) creditsPlayerNameEl.textContent = username;

let gameState = "OPENING"; // States: OPENING, MANUAL, PLAYING, ENDING

function spawnIntroSpores() {
  const overlay = document.getElementById("terminal-overlay");
  if (!overlay) {
    return;
  }

  for (let i = 0; i < 40; i += 1) {
    const spore = document.createElement("div");
    spore.classList.add("intro-spore");

    const size = Math.random() * 6 + 2;
    const left = Math.random() * 100;
    const duration = Math.random() * 10 + 10;
    const delay = -(Math.random() * duration);

    spore.style.width = `${size}px`;
    spore.style.height = `${size}px`;
    spore.style.left = `${left}vw`;
    spore.style.animationDuration = `${duration}s`;
    spore.style.animationDelay = `${delay}s`;

    overlay.appendChild(spore);
  }
}

spawnIntroSpores();

const labState = { light: false, co2: false, nitro: false };
let sunIntegrity = 100.0;
let isGameOver = false;

// --- 1. OPENING CINEMATIC ---
const logs = [
  "> Test 1: Light exposure - Astrophage moves toward light. Cool.",
  "> Test 2: Add CO2 - particles begin duplicating.",
  "> Test 3: Increase light intensity - particles accelerate.",
  "> Unknown behaviour detected. Astrophage forming patterns. Climbing glass...",
  "> CRITICAL: CONTAINMENT BREACH IMMINENT."
];

const logBox = document.getElementById("log-box");
const crackEffect = document.getElementById("crack-effect");
const terminalOverlay = document.getElementById("terminal-overlay");
const gameUi = document.getElementById("game-ui");
const synthesisUi = document.getElementById("synthesis-ui");
const labManual = document.getElementById("lab-manual");
const gameplayBgm = document.getElementById("bgm-gameplay");
const endingBgm = document.getElementById("bgm-ending");
let manualPage = 1;

let currentLog = 0;
/** Bumped while typing intro logs; timeouts compare so pending callbacks no-op after Enter/Tab skip. */
let introTypingGeneration = 0;
/** Prevents duplicate crack/fade if Enter/Tab is mashed during OPENING ending. */
let introEndingStarted = false;
let endingFadeTimer = null;

function scheduleIntroDelayed(ms, cb) {
  const gen = introTypingGeneration;
  setTimeout(() => {
    if (gen !== introTypingGeneration) return;
    cb();
  }, ms);
}

function finishOpeningCinematicAndShowManual() {
  if (introEndingStarted) return;
  introEndingStarted = true;
  crackEffect.style.opacity = "1";
  setTimeout(() => {
    terminalOverlay.style.opacity = "0";
    setTimeout(() => {
      terminalOverlay.style.display = "none";
      gameUi.style.display = "block";
      if (synthesisUi) {
        synthesisUi.style.display = "block";
      }
      if (labManual) {
        labManual.style.display = "flex";
      }
      gameState = "MANUAL";
    }, 2000);
  }, 500);
}

/** Enter or Tab during opening: abort typewriter timers, print all lines immediately, proceed. */
function skipOpeningLogTyping() {
  if (gameState !== "OPENING" || introEndingStarted) return;
  introTypingGeneration += 1;
  logBox.innerHTML = logs.map((line) => `<div class="log-line">${line}</div>`).join("");
  currentLog = logs.length;
  finishOpeningCinematicAndShowManual();
}

function setBgm(trackName) {
  if (!gameplayBgm || !endingBgm) {
    return;
  }

  if (endingFadeTimer) {
    clearInterval(endingFadeTimer);
    endingFadeTimer = null;
  }

  if (trackName === "gameplay") {
    endingBgm.pause();
    endingBgm.currentTime = 0;
    endingBgm.volume = 1;
    gameplayBgm.loop = true;
    gameplayBgm.volume = 1;
    void gameplayBgm.play().catch(() => {});
    return;
  }

  if (trackName === "ending") {
    gameplayBgm.pause();
    gameplayBgm.currentTime = 0;
    endingBgm.loop = true;
    endingBgm.currentTime = 0;
    endingBgm.volume = 0;
    void endingBgm.play().then(() => {
      const fadeDurationMs = 4000;
      const stepMs = 100;
      const volumeStep = stepMs / fadeDurationMs;
      endingFadeTimer = setInterval(() => {
        endingBgm.volume = Math.min(1, endingBgm.volume + volumeStep);
        if (endingBgm.volume >= 1) {
          clearInterval(endingFadeTimer);
          endingFadeTimer = null;
        }
      }, stepMs);
    }).catch(() => {});
  }
}

function typeWriterEffect(text, index, callback) {
  if (index < text.length) {
    logBox.innerHTML = logBox.innerHTML.replace('<span class="cursor">_</span>', "");
    logBox.innerHTML += text.charAt(index) + '<span class="cursor">_</span>';
    setTimeout(() => typeWriterEffect(text, index + 1, callback), 40);
  } else {
    logBox.innerHTML = logBox.innerHTML.replace('<span class="cursor">_</span>', "") + "<br><br>";
    setTimeout(callback, 1200);
  }
}

const INTRO_TYPE_MS = 40;
const INTRO_PAUSE_MS = 1200;

function runIntro() {
  if (currentLog < logs.length) {
    logBox.innerHTML += '<div class="log-line"></div>';
    const lineEls = logBox.querySelectorAll(".log-line");
    const activeLine = lineEls[lineEls.length - 1];
    const originalLogBoxRef = logBox.innerHTML;
    const lineText = logs[currentLog];

    // Keep typed characters wrapped with the requested .log-line style.
    let typed = "";
    function typeLine(index, done) {
      if (index < lineText.length) {
        typed += lineText.charAt(index);
        activeLine.innerHTML = typed + '<span class="cursor">_</span>';
        scheduleIntroDelayed(INTRO_TYPE_MS, () => typeLine(index + 1, done));
      } else {
        activeLine.innerHTML = typed;
        scheduleIntroDelayed(INTRO_PAUSE_MS, done);
      }
    }

    typeLine(0, () => {
      currentLog += 1;
      runIntro();
    });
    void originalLogBoxRef;
  } else {
    finishOpeningCinematicAndShowManual();
  }
}

// Start Intro
runIntro();

// --- 2. 2D LAB ENGINE (Gameplay) ---
const canvas = document.getElementById("lab-canvas");
const ctx = canvas.getContext("2d");

/** Integrate movement at consistent world speed regardless of FPS (large fullscreen canvas = heavier draw). */
const LAB_REF_FPS = 60;
let labTimingLastTs = performance.now();

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}

resizeCanvas();

function resetLabGameplayClock() {
  labTimingLastTs = performance.now();
}

/** ~1.0 at 60fps; scales proportional to elapsed time for sub-steps. Returns capped to avoid instability after tab sleeps. */
function computeLabTimingStepSec() {
  const nowTs = performance.now();
  let dtSec = (nowTs - labTimingLastTs) / 1000;
  labTimingLastTs = nowTs;
  dtSec = Math.min(Math.max(dtSec, 0), 1 / 20);
  return Math.min(LAB_REF_FPS * dtSec, 8);
}

/** Viewport-relative motion: gameplay tuned assuming ~LAB_TUNED_REFERENCE px shorter canvas edge at 60fps legacy speeds. */
const LAB_TUNED_REFERENCE = 1080;

/**
 * Baseline arcade speed boost after dt/canvas-relative integration. Scaling formulas untouched —
 * only legacy scalar numerators (player stride, impulses, integrations) are amplified.
 */
const LAB_ARCADE_PLAYER_MOVE_MULT = 3;
const LAB_ARCADE_SWARM_INTEGRATION_MULT = 3;
const LAB_ARCADE_TAUM_PHYS_MULT = 2;
/** Sun bleed scales with swarm speed so pacing stays threatening */
const LAB_ARCADE_SUN_DRAIN_MULT = 3;
/** Credits 3D particle field */
const LAB_ARCADE_FINALE_VEL_MULT = 2;
const LAB_ARCADE_FINALE_ROT_MULT = 2;

function labMinSpanPx() {
  return Math.min(Math.max(canvas.width, 1), Math.max(canvas.height, 1));
}

/** Multiply legacy pixel impulses/displacements so crossing the screen stays ~constant time vs monitor size. */
function labCanvasSpeedScale() {
  return Math.min(Math.max(labMinSpanPx() / LAB_TUNED_REFERENCE, 0.2), 3.5);
}

window.openManual = function openManual() {
  gameState = "MANUAL";
  manualPage = 1;
  if (labManual) labManual.style.display = "flex";
  const mp1 = document.getElementById("manual-page-1");
  const mp2 = document.getElementById("manual-page-2");
  const mp3 = document.getElementById("manual-page-3");
  if (mp1) mp1.style.display = "block";
  if (mp2) mp2.style.display = "none";
  if (mp3) mp3.style.display = "none";
};

window.toggleHint = function toggleHint() {
  const hintContent = document.getElementById("hint-content");
  const hintBtn = document.getElementById("hint-toggle-btn");
  if (!hintContent || !hintBtn) return;

  if (hintContent.style.display === "none" || hintContent.style.display === "") {
    hintContent.style.display = "block";
    hintBtn.style.background = "rgba(156, 136, 255, 0.18)";
  } else {
    hintContent.style.display = "none";
    hintBtn.style.background = "rgba(156, 136, 255, 0.08)";
  }
};

const LAB_PLAYER_VISOR_RADIUS_FRAC = 15 / LAB_TUNED_REFERENCE;

function labPlayerRadiusPx() {
  return labMinSpanPx() * LAB_PLAYER_VISOR_RADIUS_FRAC;
}

const player = {
  x: canvas.width / 2,
  y: canvas.height / 2
};

const keys = { w: false, a: false, s: false, d: false };
const astrophageSwarm = [];
const taumoebaSwarm = [];
let atoms = { C: 0, H: 0, N: 0 };
let incubatorCompounds = [];

const astroSpawnSpanScale = labCanvasSpeedScale();
for (let i = 0; i < 30; i += 1) {
  astrophageSwarm.push({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    vx: (Math.random() - 0.5) * 2 * LAB_ARCADE_SWARM_INTEGRATION_MULT * astroSpawnSpanScale,
    vy: (Math.random() - 0.5) * 2 * LAB_ARCADE_SWARM_INTEGRATION_MULT * astroSpawnSpanScale,
    radius: (3 + Math.random() * 3) * astroSpawnSpanScale
  });
}

window.addEventListener("keydown", (event) => {
  if (
    gameState === "OPENING" &&
    !introEndingStarted &&
    (event.key === "Enter" || event.key === "Tab")
  ) {
    event.preventDefault();
    skipOpeningLogTyping();
    return;
  }

  if (gameState === "PLAYING" && (event.key === "m" || event.key === "M")) {
    openManual();
    return;
  }

  if (gameState === "MANUAL") {
    if (event.key === "ArrowRight" || event.key === "d" || event.key === "D") {
      event.preventDefault();
      if (manualPage < 3) {
        const cur = document.getElementById(`manual-page-${manualPage}`);
        if (cur) cur.style.display = "none";
        manualPage += 1;
        const nextPage = document.getElementById(`manual-page-${manualPage}`);
        if (nextPage) nextPage.style.display = "block";
      }
    } else if (event.key === "ArrowLeft" || event.key === "a" || event.key === "A") {
      event.preventDefault();
      if (manualPage > 1) {
        const cur = document.getElementById(`manual-page-${manualPage}`);
        if (cur) cur.style.display = "none";
        manualPage -= 1;
        const prevPage = document.getElementById(`manual-page-${manualPage}`);
        if (prevPage) prevPage.style.display = "block";
      }
    } else if (event.key === "Enter") {
      event.preventDefault();
      if (manualPage < 3) {
        const cur = document.getElementById(`manual-page-${manualPage}`);
        if (cur) cur.style.display = "none";
        manualPage += 1;
        const nextPage = document.getElementById(`manual-page-${manualPage}`);
        if (nextPage) nextPage.style.display = "block";
      } else if (labManual) {
        labManual.style.display = "none";
        gameState = "PLAYING";
        resetLabGameplayClock();
        setBgm("gameplay");
      }
    }
    return;
  }

  const key = event.key.toLowerCase();
  if (gameState === "PLAYING" && Object.prototype.hasOwnProperty.call(keys, key)) {
    keys[key] = true;
  }
});

window.addEventListener("keydown", (event) => {
  if (gameState !== "PLAYING") {
    return;
  }
  if (event.key === "1") {
    toggleEquipment("light", "btn-light", "UV LIGHT", "#ffeb3b", "1");
  }
  if (event.key === "2") {
    toggleEquipment("co2", "btn-co2", "CO2 VALVE", "#ff5252", "2");
  }
  if (event.key === "3") {
    toggleEquipment("nitro", "btn-nitro", "LIQUID NITROGEN", "#4ee0e3", "3");
  }
  if (event.key === "4") {
    runCVClassification();
  }
});

window.addEventListener("keyup", (event) => {
  const key = event.key.toLowerCase();
  if (Object.prototype.hasOwnProperty.call(keys, key)) {
    keys[key] = false;
  }
});

window.addEventListener("resize", resizeCanvas);

function toggleEquipment(key, btnId, label, color, numberKey) {
  labState[key] = !labState[key];
  const btn = document.getElementById(btnId);
  if (!btn) {
    return;
  }
  if (labState[key]) {
    btn.style.background = color;
    btn.style.color = "#000";
    btn.innerText = `[${numberKey}] ${label}: ON`;
  } else {
    btn.style.background = "#222";
    btn.style.color = "#fff";
    btn.innerText = `[${numberKey}] ${label}: OFF`;
  }
}

const btnLight = document.getElementById("btn-light");
const btnCo2 = document.getElementById("btn-co2");
const btnNitro = document.getElementById("btn-nitro");
const btnScan = document.getElementById("btn-scan");
if (btnLight) {
  btnLight.addEventListener("click", () => {
    if (gameState === "PLAYING") {
      toggleEquipment("light", "btn-light", "UV LIGHT", "#ffeb3b", "1");
    }
  });
}
if (btnCo2) {
  btnCo2.addEventListener("click", () => {
    if (gameState === "PLAYING") {
      toggleEquipment("co2", "btn-co2", "CO2 VALVE", "#ff5252", "2");
    }
  });
}
if (btnNitro) {
  btnNitro.addEventListener("click", () => {
    if (gameState === "PLAYING") {
      toggleEquipment("nitro", "btn-nitro", "LIQUID NITROGEN", "#4ee0e3", "3");
    }
  });
}
if (btnScan) {
  btnScan.addEventListener("click", () => {
    runCVClassification();
  });
}

function runCVClassification() {
  if (gameState !== "PLAYING") {
    return;
  }
  const cvModal = document.getElementById("cv-modal");
  const closeCvBtn = document.getElementById("btn-close-cv");
  const cvLogBox = document.getElementById("cv-logs");
  if (!cvModal || !closeCvBtn || !cvLogBox) {
    return;
  }
  cvModal.style.display = "block";
  closeCvBtn.style.display = "none";
  cvLogBox.innerHTML = "";

  const inferenceLogs = [
    "Isolating target morphology...",
    "Extracting features (Conv2D -> MaxPooling)...",
    "Running forward pass...",
    "Class Confidence: ASTROPHAGE (99.8%)",
    "Analyzing chemical vulnerabilities...",
    "<span style='color:#2ed573'>SOLUTION FOUND: PREDATOR INCUBATION REQUIRED.</span>",
    "RECIPE 1 (BASE STRAIN): 1 Carbon + 4 Hydrogen -> CH4",
    "RECIPE 2 (BASE STRAIN): 1 Nitrogen + 3 Hydrogen -> NH3",
    "RECIPE 3 (MUTATION TRIGGER): 2 Nitrogen -> N2"
  ];

  let i = 0;
  function printLog() {
    if (i < inferenceLogs.length) {
      cvLogBox.innerHTML += `${inferenceLogs[i]}<br>`;
      i += 1;
      setTimeout(printLog, 600);
    } else {
      closeCvBtn.style.display = "block";
    }
  }
  printLog();
}

window.closeCVModal = function closeCVModal() {
  const cvModal = document.getElementById("cv-modal");
  if (cvModal) {
    cvModal.style.display = "none";
  }
};

function updateBuffer() {
  const atomBuffer = document.getElementById("atom-buffer");
  if (!atomBuffer) {
    return;
  }
  const parts = [];
  if (atoms.C > 0) {
    parts.push(`C${atoms.C > 1 ? atoms.C : ""}`);
  }
  if (atoms.H > 0) {
    parts.push(`H${atoms.H > 1 ? atoms.H : ""}`);
  }
  if (atoms.N > 0) {
    parts.push(`N${atoms.N > 1 ? atoms.N : ""}`);
  }
  atomBuffer.innerText = parts.length > 0 ? parts.join(" + ") : "EMPTY";
}

function setSysMessage(text, color = "#a9c2db") {
  const msgBox = document.getElementById("sys-message");
  if (msgBox) {
    msgBox.innerHTML = text;
    msgBox.style.color = color;
    msgBox.style.borderColor = color;
  }
}

window.addAtom = function addAtom(element) {
  atoms[element] += 1;
  updateBuffer();
};

window.clearBuffer = function clearBuffer() {
  atoms = { C: 0, H: 0, N: 0 };
  updateBuffer();
};

window.synthesize = function synthesize() {
  let compound = null;

  if (atoms.C === 1 && atoms.H === 4 && atoms.N === 0) {
    compound = "CH4 (Methane)";
  } else if (atoms.C === 0 && atoms.H === 3 && atoms.N === 1) {
    compound = "NH3 (Ammonia)";
  } else if (atoms.C === 0 && atoms.H === 0 && atoms.N === 2) {
    compound = "N2 (Nitrogen)";
  }

  if (compound) {
    incubatorCompounds.push(compound);
    window.clearBuffer();
    checkReaction();
  } else {
    setSysMessage("SYNTHESIS FAILED: Invalid atomic ratio. Review CV recipe and try again.", "#ff5252");
    window.clearBuffer();
  }
};

function checkReaction() {
  const hasCH4 = incubatorCompounds.includes("CH4 (Methane)");
  const hasNH3 = incubatorCompounds.includes("NH3 (Ammonia)");
  const hasN2 = incubatorCompounds.includes("N2 (Nitrogen)");
  
  renderIncubator();

  // Step-by-step guidance for Base Culture
  if (hasCH4 && !hasNH3) {
    setSysMessage("CH4 Stabilized. Secondary compound (NH3) required to initiate breeding.", "#ffeb3b");
  } else if (hasNH3 && !hasCH4) {
    setSysMessage("NH3 Stabilized. Primary compound (CH4) required to initiate breeding.", "#ffeb3b");
  }

  // Reaction 1: Base Taumoeba
  if (hasCH4 && hasNH3 && !hasN2) {
    for (let i = 0; i < 60; i += 1) {
      const rSpawn = 4 * labCanvasSpeedScale();
      taumoebaSwarm.push({
        x: player.x,
        y: player.y,
        vx: 0,
        vy: 0,
        radius: rSpawn,
        resistant: false
      });
    }
    incubatorCompounds = incubatorCompounds.filter((compound) => compound === "N2 (Nitrogen)");
    renderIncubator();
    setSysMessage("BASE CULTURE BRED: Warning - Growth rate insufficient. Introduce UV Light and N2 to force mutation.", "#4a90e2");
  }

  // Reaction 2: Forced Evolution
  if (hasN2 && taumoebaSwarm.length > 0) {
    if (!labState.light) {
      taumoebaSwarm.length = 0;
      incubatorCompounds = incubatorCompounds.filter((compound) => compound !== "N2 (Nitrogen)");
      renderIncubator();
      setSysMessage("FATAL ERROR: N2 introduced without UV radiation. Culture destroyed. Restart synthesis.", "#ff5252");
    } else {
      let survivors = 0;
      for (let i = taumoebaSwarm.length - 1; i >= 0; i -= 1) {
        if (Math.random() > 0.15) {
          taumoebaSwarm.splice(i, 1);
        } else {
          taumoebaSwarm[i].resistant = true;
          survivors += 1;
        }
      }
      incubatorCompounds = incubatorCompounds.filter((compound) => compound !== "N2 (Nitrogen)");
      renderIncubator();
      setSysMessage(`EVOLUTION SUCCESS: ${survivors} N2-Resistant hyper-predators bred. Stand by for Astrophage eradication.`, "#9c88ff");
    }
  }
}

function renderIncubator() {
  const container = document.getElementById("incubator-contents");
  if (!container) {
    return;
  }
  container.innerHTML = "";
  incubatorCompounds.forEach((compound) => {
    const color = compound.includes("CH4") ? "#2ed573" : compound.includes("NH3") ? "#4a90e2" : "#9c88ff";
    const div = document.createElement("div");
    div.style.cssText = `background: ${color}33; border: 1px solid ${color}; color: ${color}; padding: 5px; font-size: 12px;`;
    div.innerText = compound;
    container.appendChild(div);
  });
}

function updateAndRenderSwarm(step) {
  if (gameState !== "PLAYING" || isGameOver) {
    return;
  }

  const spd = labCanvasSpeedScale();
  sunIntegrity -= astrophageSwarm.length * 0.00008 * LAB_ARCADE_SUN_DRAIN_MULT * step * spd;
  if (sunIntegrity > 100) {
    sunIntegrity = 100;
  }
  const sunStatusEl = document.getElementById("sun-status");
  if (sunStatusEl) {
    sunStatusEl.innerText = `${Math.max(0, sunIntegrity).toFixed(1)}%`;
  }
  const sensorUI = document.getElementById("gas-sensor");
  if (sensorUI) {
    if (astrophageSwarm.length < 100) {
      sensorUI.innerText = "NORMAL";
      sensorUI.style.color = "#2ed573";
    } else if (astrophageSwarm.length < 500) {
      sensorUI.innerText = "ELEVATED CO/GAS";
      sensorUI.style.color = "#ffeb3b";
    } else {
      sensorUI.innerText = "CRITICAL TOXICITY";
      sensorUI.style.color = "#ff5252";
    }
  }

  if (sunIntegrity <= 0) {
    triggerLoss("SUN DEPLETED. EARTH HAS FROZEN.");
    return;
  }
  if (astrophageSwarm.length > 1200) {
    triggerLoss("CONTAINMENT BREACH. ASTROPHAGE OVERRAN THE HAIL MARY.");
    return;
  }
  // WIN STATE: Astrophage Eradicated by MUTATED Taumoeba
  const hasMutatedStrain = taumoebaSwarm.some((taumoeba) => taumoeba.resistant === true);

  if (astrophageSwarm.length === 0 && hasMutatedStrain && !isGameOver) {
    triggerWin();
    return;
  }

  ctx.shadowBlur = 15;
  ctx.shadowColor = "#ff9f43";
  ctx.fillStyle = "#ff9f43";

  const baseSpeed = (labState.nitro ? 0.2 : 1.5) * LAB_ARCADE_SWARM_INTEGRATION_MULT;

  for (let i = 0; i < astrophageSwarm.length; i += 1) {
    const particle = astrophageSwarm[i];

    if (labState.light && !labState.nitro) {
      const dx = player.x - particle.x;
      const dy = player.y - particle.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 0) {
        particle.vx += (dx / dist) * 0.05 * LAB_ARCADE_SWARM_INTEGRATION_MULT * step * spd;
        particle.vy += (dy / dist) * 0.05 * LAB_ARCADE_SWARM_INTEGRATION_MULT * step * spd;
      }
    } else {
      particle.vx += (Math.random() - 0.5) * 0.2 * LAB_ARCADE_SWARM_INTEGRATION_MULT * step * spd;
      particle.vy += (Math.random() - 0.5) * 0.2 * LAB_ARCADE_SWARM_INTEGRATION_MULT * step * spd;
    }

    particle.vx *= Math.pow(0.95, step);
    particle.vy *= Math.pow(0.95, step);
    particle.x += particle.vx * baseSpeed * step * spd;
    particle.y += particle.vy * baseSpeed * step * spd;

    if (particle.x < 0 || particle.x > canvas.width) {
      particle.vx *= -1;
      particle.x = Math.max(0, Math.min(canvas.width, particle.x));
    }
    if (particle.y < 0 || particle.y > canvas.height) {
      particle.vy *= -1;
      particle.y = Math.max(0, Math.min(canvas.height, particle.y));
    }

    if (
      labState.co2 &&
      !labState.nitro &&
      astrophageSwarm.length < 1500 &&
      Math.random() < 1 - Math.pow(0.997, Math.min(step, 200))
    ) {
      astrophageSwarm.push({
        x: particle.x,
        y: particle.y,
        vx: -particle.vx,
        vy: -particle.vy,
        radius: particle.radius
      });
    }

    ctx.beginPath();
    ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
    ctx.fill();
  }

  // Render and update Taumoeba hunters.
  for (let i = taumoebaSwarm.length - 1; i >= 0; i -= 1) {
    const taumoeba = taumoebaSwarm[i];

    if (labState.nitro && !taumoeba.resistant) {
      taumoebaSwarm.splice(i, 1);
      continue;
    }

    let target = null;
    let minDist = Infinity;
    let targetIndex = -1;
    for (let j = 0; j < astrophageSwarm.length; j += 1) {
      const astro = astrophageSwarm[j];
      const dx = astro.x - taumoeba.x;
      const dy = astro.y - taumoeba.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < minDist) {
        minDist = dist;
        target = astro;
        targetIndex = j;
      }
    }

    if (target) {
      taumoeba.vx += (target.x - taumoeba.x) * 0.002 * LAB_ARCADE_TAUM_PHYS_MULT * step * spd;
      taumoeba.vy += (target.y - taumoeba.y) * 0.002 * LAB_ARCADE_TAUM_PHYS_MULT * step * spd;

      // Eat Astrophage (Collision)
      if (minDist < taumoeba.radius + target.radius && targetIndex !== -1) {
        astrophageSwarm.splice(targetIndex, 1);

        if (taumoeba.resistant) {
          // MUTATED (PURPLE) STRAIN: Reproduces and keeps hunting
          taumoebaSwarm.push({
            x: taumoeba.x,
            y: taumoeba.y,
            vx: -taumoeba.vx,
            vy: -taumoeba.vy,
            radius: 4 * labCanvasSpeedScale(),
            resistant: true
          });
        } else {
          // BASE (BLUE) STRAIN: Fragile metabolism. Dies after eating 1 Astrophage.
          taumoebaSwarm.splice(i, 1);
          continue;
        }
      }
    }

    taumoeba.vx *= Math.pow(0.85, step);
    taumoeba.vy *= Math.pow(0.85, step);
    taumoeba.x += taumoeba.vx * 1.2 * LAB_ARCADE_TAUM_PHYS_MULT * step * spd;
    taumoeba.y += taumoeba.vy * 1.2 * LAB_ARCADE_TAUM_PHYS_MULT * step * spd;

    ctx.shadowBlur = 10;
    ctx.shadowColor = taumoeba.resistant ? "#9c88ff" : "#4a90e2";
    ctx.fillStyle = taumoeba.resistant ? "#9c88ff" : "#4a90e2";
    ctx.beginPath();
    ctx.arc(taumoeba.x, taumoeba.y, taumoeba.radius, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.shadowBlur = 0;
}

function renderLab(step) {
  if (gameState !== "PLAYING") {
    return;
  }

  const playerAxisSpeedRefPx =
    (240 * LAB_ARCADE_PLAYER_MOVE_MULT) / LAB_TUNED_REFERENCE;
  const moveX = canvas.width * playerAxisSpeedRefPx * (step / LAB_REF_FPS);
  const moveY = canvas.height * playerAxisSpeedRefPx * (step / LAB_REF_FPS);
  if (keys.w) {
    player.y -= moveY;
  }
  if (keys.s) {
    player.y += moveY;
  }
  if (keys.a) {
    player.x -= moveX;
  }
  if (keys.d) {
    player.x += moveX;
  }

  const pRad = labPlayerRadiusPx();

  // Keep player inside viewport bounds.
  player.x = Math.max(pRad, Math.min(canvas.width - pRad, player.x));
  player.y = Math.max(pRad, Math.min(canvas.height - pRad, player.y));

  ctx.fillStyle = "#0a1122";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Draw grid-like lab floor tiles.
  const gridStep = Math.max(24, Math.round(50 * labCanvasSpeedScale()));
  ctx.strokeStyle = "rgba(74, 144, 226, 0.1)";
  for (let i = 0; i < canvas.width; i += gridStep) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, canvas.height);
    ctx.stroke();
  }
  for (let j = 0; j < canvas.height; j += gridStep) {
    ctx.beginPath();
    ctx.moveTo(0, j);
    ctx.lineTo(canvas.width, j);
    ctx.stroke();
  }

  updateAndRenderSwarm(step);

  // Draw Player
  ctx.shadowBlur = 10;
  ctx.shadowColor = "#4a90e2";
  ctx.fillStyle = "#ffffff"; // White helmet
  ctx.beginPath();
  ctx.arc(player.x, player.y, pRad, 0, Math.PI * 2);
  ctx.fill();

  // Draw Visor (facing slightly forward/down to imply top-down perspective)
  ctx.shadowBlur = 5;
  ctx.shadowColor = "#4ee0e3";
  ctx.fillStyle = "#050a14"; // Dark glass
  ctx.beginPath();
  // Offset the visor slightly based on the last movement direction, or just static front
  ctx.arc(player.x, player.y + 4, pRad * 0.6, 0, Math.PI);
  ctx.fill();
  ctx.shadowBlur = 0; // Reset shadow
}

function animate() {
  requestAnimationFrame(animate);
  if (gameState === "PLAYING") {
    const step = computeLabTimingStepSec();
    renderLab(step);
  }
}

function triggerLoss(reason) {
  if (isGameOver) {
    return;
  }
  isGameOver = true;
  gameState = "ENDING";
  const overlay = document.createElement("div");
  overlay.style.cssText = "position:absolute; top:0; left:0; width:100vw; height:100vh; background:rgba(255,0,0,0.8); z-index: 5000; display:flex; flex-direction:column; justify-content:center; align-items:center; color:white; font-family:monospace; text-align:center;";
  overlay.innerHTML = `<h1 style="font-size:40px;">MISSION FAILED</h1><p style="font-size:20px;">${reason}</p><p style="margin-top:20px; font-size:14px; cursor:pointer;" id="retry-mission">[ CLICK TO RETRY ]</p>`;
  document.body.appendChild(overlay);
  const retryBtn = document.getElementById("retry-mission");
  if (retryBtn) {
    retryBtn.addEventListener("click", () => {
      window.location.reload();
    });
  }
}

function triggerWin() {
  isGameOver = true;
  gameState = "ENDING";
  setBgm("ending");

  // Lock player in a cinematic position for the ending dialogue.
  player.x = canvas.width / 2;
  player.y = Math.max(labPlayerRadiusPx() + 20, canvas.height - 260);

  // Hide 2D UI elements
  document.getElementById("game-ui").style.display = "none";
  const synthesisUi = document.getElementById("synthesis-ui");
  if (synthesisUi) {
    synthesisUi.style.display = "none";
  }

  // Reveal the sunrise overlay
  const sunrise = document.getElementById("sunrise-overlay");
  sunrise.style.display = "block";

  // 1. Add Telemetry Text (if it doesn't already exist)
  if (!document.getElementById("end-telemetry")) {
    const telemetry = document.createElement("div");
    telemetry.id = "end-telemetry";
    telemetry.className = "telemetry-readout";
    telemetry.innerHTML = "> SYSTEM REBOOT INITIATED...<br>> ATMOSPHERE: NOMINAL<br>> SOLAR RADIATION: 100%<br>> THREAT LEVEL: ZERO";
    sunrise.appendChild(telemetry);
  }

  // 2. Generate Sunbeam Dust Motes
  // Clear old motes if re-triggered
  document.querySelectorAll(".dust-mote").forEach((e) => e.remove());
  for (let i = 0; i < 120; i += 1) {
    const mote = document.createElement("div");
    mote.className = "dust-mote";
    // Randomize position across the screen
    mote.style.left = `${Math.random() * 100}vw`;
    mote.style.top = `${Math.random() * 100}vh`;
    // Randomize size
    const size = Math.random() * 2 + 0.7;
    mote.style.width = `${size}px`;
    mote.style.height = `${size}px`;
    // Randomize speed and delay for a natural drift
    mote.style.animationDuration = `${Math.random() * 10 + 8}s`;
    mote.style.animationDelay = `-${Math.random() * 8}s`;

    sunrise.appendChild(mote);
  }

  // Force reflow to ensure the CSS transition triggers
  void sunrise.offsetWidth;
  sunrise.style.opacity = "1";

  // Grab the player's username from the URL
  const currentUsername = new URLSearchParams(window.location.search).get("username") || "PILOT";
  const playerName = currentUsername.toUpperCase();

  // The Cinematic Dialogue Sequence
  const endingDialogues = [
    { speaker: "ROCKY", text: "AMAZE! AMAZE! AMAZE! Astrophage asleep. Sun is safe. You did it, question?", color: "#7bed9f" },
    { speaker: playerName, text: "We did it, buddy. The Taumoeba worked.", color: "#4ee0e3" },
    { speaker: "ROCKY", text: "Yes! Good team. Science is good.", color: "#7bed9f" },
    { speaker: "SYSTEM", text: "[ LIGHT LEVEL INCREASING - SUN INTEGRITY FULLY STABILIZED ]", color: "#ffeb3b" },
    { speaker: "ROCKY", text: "Now we go home?", color: "#7bed9f" },
    { speaker: playerName, text: "Yeah, Rocky. Time to plot a course for Earth.", color: "#4ee0e3" },
    { speaker: "ROCKY", text: "Happy, happy, happy!", color: "#7bed9f" }
  ];

  let dialogIndex = 0;

  // Create the Dialogue Box UI
  const overlay = document.createElement("div");
  overlay.id = "win-dialogue-overlay";
  overlay.style.cssText = "position:absolute; bottom:40px; left:50%; transform:translateX(-50%); width:800px; background:rgba(5,10,20,0.95); border:2px solid #4a90e2; padding:30px; z-index:5000; color:white; font-family:'Share Tech Mono', monospace; text-align:center; box-shadow: 0 0 40px rgba(74, 144, 226, 0.4);";
  document.body.appendChild(overlay);

  // Function to render current line
  function updateDialogue() {
    const current = endingDialogues[dialogIndex];
    overlay.innerHTML = `
            <h3 style="color:${current.color}; margin:0 0 15px 0; font-size: 26px; text-shadow: 0 0 10px ${current.color}; letter-spacing: 2px;">[ ${current.speaker} ]</h3>
            <p style="font-size:22px; line-height: 1.6; margin-bottom: 25px;">${current.text}</p>
            <p style="color:#2ed573; margin-top:15px; font-size:14px; animation: blink 1s infinite; cursor:pointer; font-weight: bold;">[ CLICK OR PRESS ENTER TO CONTINUE ]</p>
        `;
  }

  updateDialogue();

  // Function to handle moving to the next line or finishing the game
  function advanceDialogue(event) {
    if (event.type === "keydown" && event.key !== "Enter") {
      return;
    }

    dialogIndex += 1;
    if (dialogIndex < endingDialogues.length) {
      updateDialogue();
    } else {
      // End of dialogue - Trigger the massive 3D Finale
      const sunriseOverlay = document.getElementById("sunrise-overlay");
      if (sunriseOverlay) {
        sunriseOverlay.style.display = "none";
      }
      document.removeEventListener("keydown", advanceDialogue);
      overlay.removeEventListener("click", advanceDialogue);
      overlay.style.display = "none";

      // Destroy the 2D Lab Canvas
      document.getElementById("lab-canvas").style.display = "none";
      const incZone = document.getElementById("incubator-zone");
      if (incZone) {
        incZone.style.display = "none";
      }

      // Reveal and start 3D engine
      const threeCanvasElement = document.getElementById("threejs-canvas");
      threeCanvasElement.style.display = "block";
      threeCanvasElement.style.background = "radial-gradient(circle, #02050a 0%, #000 100%)";

      if (typeof threeAnimating !== "undefined") {
        threeAnimating = true;
        threeLastTs = performance.now();
        animateThreeFinale();
      }

      // Trigger rolling credits
      const credits = document.getElementById("credits-overlay");
      credits.style.display = "flex";
      void credits.offsetWidth; // Force CSS reflow
      credits.style.top = "0";

      let vibePortalRevealStarted = false;
      function showVibeJamPortal() {
        if (vibePortalRevealStarted) return;
        vibePortalRevealStarted = true;
        const creditsEl = document.getElementById("credits-overlay");
        if (creditsEl) {
          creditsEl.style.display = "none";
          creditsEl.style.opacity = "0";
        }
        const portal = document.getElementById("vibe-jam-portal");
        if (!portal) return;
        portal.style.display = "flex";
        portal.style.opacity = "0";
        portal.style.transition = "opacity 2s ease-in-out";
        setTimeout(() => {
          portal.style.opacity = "1";
        }, 100);
      }

      // THE END fades in over ~4s after t=12s; wait 3000ms after that (nominal fade end ~16s)
      setTimeout(() => {
        document.getElementById("the-end-text").style.opacity = "1";
      }, 12000);
      setTimeout(showVibeJamPortal, 12000 + 4000 + 3000);
    }
  }

  // Attach listeners for progression
  document.addEventListener("keydown", advanceDialogue);
  overlay.addEventListener("click", advanceDialogue);
}

// --- 3. 3D FINALE ENGINE ---
const threeCanvas = document.getElementById("threejs-canvas");
const renderer = new THREE.WebGLRenderer({ canvas: threeCanvas, alpha: true, antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.z = 50;

const particleCount = 8000;
const geometry = new THREE.BufferGeometry();
const positions = new Float32Array(particleCount * 3);
const velocities = [];

for (let i = 0; i < particleCount; i += 1) {
  positions[i * 3] = (Math.random() - 0.5) * 5;
  positions[i * 3 + 1] = (Math.random() - 0.5) * 5;
  positions[i * 3 + 2] = (Math.random() - 0.5) * 5;

  velocities.push({
    x: (Math.random() - 0.5) * 0.8 * LAB_ARCADE_FINALE_VEL_MULT,
    y: (Math.random() - 0.5) * 0.8 * LAB_ARCADE_FINALE_VEL_MULT,
    z: (Math.random() - 0.5) * 0.8 * LAB_ARCADE_FINALE_VEL_MULT
  });
}
geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));

const material = new THREE.PointsMaterial({
  color: 0x9c88ff,
  size: 0.15,
  transparent: true,
  opacity: 0.9,
  blending: THREE.AdditiveBlending
});
const particles = new THREE.Points(geometry, material);
scene.add(particles);

let threeAnimating = false;
let threeLastTs = performance.now();

function animateThreeFinale() {
  if (!threeAnimating) {
    return;
  }
  requestAnimationFrame(animateThreeFinale);

  const nowTs = performance.now();
  let dtSec = (nowTs - threeLastTs) / 1000;
  threeLastTs = nowTs;
  dtSec = Math.min(Math.max(dtSec, 0), 0.05);
  const stepThree = Math.min(LAB_REF_FPS * dtSec, 8);

  const posAttr = geometry.attributes.position;
  for (let i = 0; i < particleCount; i += 1) {
    const s3 = stepThree;
    posAttr.array[i * 3] += velocities[i].x * s3;
    posAttr.array[i * 3 + 1] += velocities[i].y * s3;
    posAttr.array[i * 3 + 2] += velocities[i].z * s3;

    velocities[i].x *= Math.pow(0.995, stepThree);
    velocities[i].y *= Math.pow(0.995, stepThree);
    velocities[i].z *= Math.pow(0.995, stepThree);
  }
  posAttr.needsUpdate = true;
  particles.rotation.y += 0.002 * LAB_ARCADE_FINALE_ROT_MULT * stepThree;
  particles.rotation.x += 0.001 * LAB_ARCADE_FINALE_ROT_MULT * stepThree;

  renderer.render(scene, camera);
}

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

animate();
