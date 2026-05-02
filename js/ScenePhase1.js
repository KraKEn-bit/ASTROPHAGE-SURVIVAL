class ScenePhase1 extends Phaser.Scene {
  constructor() {
    super({ key: "ScenePhase1" });
  }

  preload() {
    this.load.image("astro_human", "assets/sprites/astro_GG.gif");
    this.load.image("car_topdown", "assets/sprites/car_topdown.webp");
    this.load.image("alien_obstacle", "assets/sprites/alien_beam.png");
    this.load.image("road_texture", "assets/sprites/main_road.jpg");
    this.load.image("scenery_side", "assets/sprites/forest_map.webp");
    this.load.image("eva", "assets/sprites/eva_character.png");
    this.load.image("mary", "assets/sprites/rocket.png");
  }

  create() {
    const w = this.scale.width;
    const h = this.scale.height;

    this.cameras.main.setBackgroundColor("#020208");

    this.starfield = this.add.graphics().setDepth(-3);
    this.voidStars = [];
    for (let i = 0; i < 150; i += 1) {
      this.voidStars.push({
        x: Phaser.Math.FloatBetween(0, w),
        y: Phaser.Math.FloatBetween(0, h),
        size: Phaser.Math.Between(1, 2),
        color: Phaser.Math.RND.pick([0xffffff, 0x00ffff]),
        alpha: Phaser.Math.FloatBetween(0.5, 0.95)
      });
    }
    this.renderVoidStars();

    const forestWidth = 200;
    const roadWidth = Math.max(320, w - 640);
    const islandWidth = forestWidth * 2 + roadWidth;
    const islandStartX = Math.floor((w - islandWidth) * 0.5);

    this.leftForest = this.add
      .tileSprite(islandStartX, 0, forestWidth, h, "scenery_side")
      .setOrigin(0, 0)
      .setDepth(-2);
    this.rightForest = this.add
      .tileSprite(islandStartX + forestWidth + roadWidth, 0, forestWidth, h, "scenery_side")
      .setOrigin(0, 0)
      .setDepth(-2)
      .setFlipX(true);
    this.centerTrack = this.add
      .tileSprite(islandStartX + forestWidth, 0, roadWidth, h, "road_texture")
      .setOrigin(0, 0)
      .setDepth(-1);

    this.add.text(16, 14, "PHASE 1 - ROAD SURVIVAL", {
      fontFamily: "Orbitron",
      fontSize: "18px",
      color: "#d8d8d8"
    });
    this.add.text(16, 40, "WASD/Arrows move", {
      fontFamily: "Orbitron",
      fontSize: "14px",
      color: "#a8a8a8"
    });

    this.roadMinX = this.centerTrack.x;
    this.roadMaxX = this.centerTrack.x + this.centerTrack.width;

    this.car = this.add.image(w * 0.5, h * 0.78, "car_topdown");
    this.car.setDisplaySize(48, 90);
    this.physics.add.existing(this.car);
    this.car.body.setAllowGravity(false);
    this.car.body.setSize(this.car.width * 0.6, this.car.height * 0.8, true);
    this.physics.world.timeScale = 1;

    const dotSize = 8;
    if (!this.textures.exists("ag-exhaust-dot")) {
      const g = this.make.graphics({ x: 0, y: 0, add: false });
      g.fillStyle(0xffffff, 1);
      g.fillCircle(dotSize / 2, dotSize / 2, dotSize / 2);
      g.generateTexture("ag-exhaust-dot", dotSize, dotSize);
      g.destroy();
    }
    this.nitro = this.add.particles(0, 0, "ag-exhaust-dot", {
      lifespan: 520,
      speed: { min: 70, max: 180 },
      angle: { min: 80, max: 100 },
      scale: { start: 0.65, end: 0 },
      alpha: { start: 0.95, end: 0 },
      quantity: 6,
      frequency: 20,
      tint: [0xff8c42, 0xffb347, 0xb3bac4, 0x8f98a3],
      blendMode: "ADD",
      emitting: true
    });
    this.nitro.setDepth(2);
    if (this.nitro.startFollow) {
      this.nitro.startFollow(this.car, 0, this.car.displayHeight * 0.58);
    }

    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasd = this.input.keyboard.addKeys({
      w: Phaser.Input.Keyboard.KeyCodes.W,
      a: Phaser.Input.Keyboard.KeyCodes.A,
      s: Phaser.Input.Keyboard.KeyCodes.S,
      d: Phaser.Input.Keyboard.KeyCodes.D
    });

    this.humans = this.physics.add.group();
    this.aliens = this.physics.add.group();

    this.astroSpawnEvent = this.time.addEvent({
      delay: 1400,
      loop: true,
      callback: this.spawnAstroHuman,
      callbackScope: this
    });
    this.alienSpawnEvent = this.time.addEvent({
      delay: 1700,
      loop: true,
      callback: this.spawnAlienBeam,
      callbackScope: this
    });

    this.moveSpeed = 280;
    this.nearMissCooldownMs = 0;
    this.isInvulnerable = false;
    this.isCinematicActive = false;
    this.isEndingSequenceStarted = false;
    this.isRoadScrolling = true;
    this.playerControlLocked = false;
    this.endingDomOverlay = null;
    this.endingDialogueBox = null;
    this.endingPromptText = null;
    this.endingDialogueLines = [];
    this.endingDialogueIndex = 0;
    this.endingAdvanceBound = null;
    this.cinematicUsername = new URLSearchParams(window.location.search).get("username") || "UNKNOWN PILOT";
    this.evaSprite = null;
    this.evaLabel = null;
    this.marySprite = null;
    this.maryLabel = null;
    this.arrivalIdleTween = null;
    this.isEndingChoiceShown = false;
    this.isDialogueTyping = false;
    this.endingLineTimer = null;
    this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    this.engineOsc = null;
    this.engineGain = null;
    this.engineStopped = false;
    this.engineTargetFreq = 40;
    this.initProceduralAudio();
    this.blurOverlay = this.add
      .rectangle(w * 0.5, h * 0.5, w, h, 0xaad6ff, 0)
      .setDepth(1000)
      .setScrollFactor(0)
      .setVisible(false);

    this.createHUD();
    this.updateHUD();

    this._onGameOver = () => {
      if (this.scene.isActive("ScenePhase1")) this.scene.start("SceneGameOver");
    };
    window.addEventListener("ag:gameover", this._onGameOver);
    this.events.once("shutdown", () => {
      if (this._onGameOver) {
        window.removeEventListener("ag:gameover", this._onGameOver);
        this._onGameOver = null;
      }
      this.stopEngineHum();
      this.teardownEndingOverlay();
    });

    this.input.keyboard.on("keydown-M", () => {
      if (this.isEndingSequenceStarted) return;
      this.scene.start("SceneMenu");
    });
    this.input.keyboard.on("keydown", () => {
      if (this.audioCtx && this.audioCtx.state === "suspended") this.audioCtx.resume();
    });
    this.input.on("pointerdown", () => {
      if (this.audioCtx && this.audioCtx.state === "suspended") this.audioCtx.resume();
    });
  }

  initProceduralAudio() {
    if (!this.audioCtx || this.engineOsc) return;
    this.engineOsc = this.audioCtx.createOscillator();
    this.engineGain = this.audioCtx.createGain();
    this.engineOsc.type = "triangle";
    this.engineOsc.frequency.setValueAtTime(40, this.audioCtx.currentTime);
    this.engineGain.gain.setValueAtTime(0.05, this.audioCtx.currentTime);
    this.engineOsc.connect(this.engineGain);
    this.engineGain.connect(this.audioCtx.destination);
    this.engineOsc.start();
  }

  updateEngineHum(isMoving) {
    if (!this.audioCtx || !this.engineOsc || !this.engineGain) return;
    if (this.engineStopped) return;
    const now = this.audioCtx.currentTime;
    const targetFreq = isMoving ? 70 : 40;
    this.engineOsc.frequency.cancelScheduledValues(now);
    this.engineOsc.frequency.setTargetAtTime(targetFreq, now, 0.09);
    this.engineGain.gain.cancelScheduledValues(now);
    this.engineGain.gain.setTargetAtTime(0.05, now, 0.14);
  }

  stopEngineHum() {
    if (!this.audioCtx || !this.engineOsc || !this.engineGain || this.engineStopped) return;
    const now = this.audioCtx.currentTime;
    this.engineGain.gain.cancelScheduledValues(now);
    this.engineGain.gain.setTargetAtTime(0.0001, now, 0.08);
    this.engineOsc.stop(now + 0.25);
    this.engineStopped = true;
  }

  startEndingSequence() {
    if (this.isEndingSequenceStarted) return;
    this.isEndingSequenceStarted = true;
    this.isRoadScrolling = false;
    this.playerControlLocked = true;
    this.isCinematicActive = false;
    this.nearMissCooldownMs = 0;
    if (this.astroSpawnEvent) this.astroSpawnEvent.remove(false);
    if (this.alienSpawnEvent) this.alienSpawnEvent.remove(false);
    this.humans.clear(true, true);
    this.aliens.clear(true, true);
    if (this.nitro && this.nitro.stop) this.nitro.stop();

    this.tweens.add({
      targets: this.car,
      x: this.scale.width * 0.5,
      y: this.scale.height * 0.82,
      duration: 1100,
      ease: "Sine.easeInOut",
      onComplete: () => {
        this.spawnArrivalActors();
      }
    });
  }

  spawnArrivalActors() {
    const w = this.scale.width;
    const h = this.scale.height;
    this.evaSprite = this.add.image(w * 0.36, -120, "eva").setDepth(1600);
    this.evaSprite.displayHeight = 150;
    this.evaSprite.scaleX = this.evaSprite.scaleY;
    if (this.evaSprite.setPixelPerfect) this.evaSprite.setPixelPerfect(true);
    this.evaLabel = this.add
      .text(this.evaSprite.x, this.evaSprite.y + this.evaSprite.displayHeight * 0.5 + 18, "EVA", {
        fontFamily: "Orbitron",
        fontSize: "20px",
        color: "#ffffff"
      })
      .setOrigin(0.5)
      .setDepth(1601);
    this.marySprite = this.add.image(w * 0.64, -170, "mary").setDepth(1600);
    this.marySprite.displayHeight = 180;
    this.marySprite.scaleX = this.marySprite.scaleY;
    if (this.marySprite.setPixelPerfect) this.marySprite.setPixelPerfect(true);
    this.maryLabel = this.add
      .text(this.marySprite.x, this.marySprite.y + this.marySprite.displayHeight * 0.5 + 18, "MARY", {
        fontFamily: "Orbitron",
        fontSize: "20px",
        color: "#ffffff"
      })
      .setOrigin(0.5)
      .setDepth(1601);

    this.tweens.add({
      targets: this.evaSprite,
      y: h * 0.42,
      duration: 1200,
      ease: "Cubic.easeOut"
    });
    this.tweens.add({
      targets: this.evaLabel,
      y: h * 0.42 + this.evaSprite.displayHeight * 0.5 + 18,
      duration: 1200,
      ease: "Cubic.easeOut"
    });

    this.tweens.add({
      targets: this.marySprite,
      y: h * 0.40,
      duration: 1300,
      ease: "Cubic.easeOut",
      onComplete: () => {
        if (this.arrivalIdleTween) this.arrivalIdleTween.remove();
        this.arrivalIdleTween = this.tweens.add({
          targets: [this.evaSprite, this.evaLabel, this.marySprite, this.maryLabel],
          y: "+=5",
          duration: 1500,
          ease: "Sine.easeInOut",
          yoyo: true,
          repeat: -1
        });
        this.startEndingDialogue();
      }
    });
    this.tweens.add({
      targets: this.maryLabel,
      y: h * 0.40 + this.marySprite.displayHeight * 0.5 + 18,
      duration: 1300,
      ease: "Cubic.easeOut"
    });
  }

  startEndingDialogue() {
    this.physics.pause();
    this.endingDialogueLines = [
      "[EVA STRATT]: \"This might seem like me betraying you, but this is actually me believing in you.\"",
      `[ CAPTAIN ${this.cinematicUsername} ]: \"Why me? It took like 200 years to figure out how bacteria works!\"`,
      "[EVA STRATT]: \"It doesn't matter. You'll get used to it.\"",
      `[ CAPTAIN ${this.cinematicUsername} ]: \"I put the 'not' in astronaut! I've never done a space walk, I can't even moonwalk! I haven't done any training, I haven't done the whole... the pool thing!\"`,
      "[EVA STRATT]: \"You're smart. You'll figure it out.\""
    ];
    this.endingDialogueIndex = 0;
    this.isEndingChoiceShown = false;

    const overlay = document.createElement("div");
    overlay.id = "phase1-ending-overlay";
    overlay.style.position = "fixed";
    overlay.style.inset = "0";
    overlay.style.zIndex = "4000";
    overlay.style.pointerEvents = "auto";
    overlay.style.display = "flex";
    overlay.style.alignItems = "flex-end";
    overlay.style.justifyContent = "center";
    overlay.style.background = "transparent";
    overlay.style.padding = "24px";

    const dialogueBox = document.createElement("div");
    dialogueBox.style.width = "min(980px, 92vw)";
    dialogueBox.style.background = "rgba(0, 0, 0, 0.88)";
    dialogueBox.style.border = "2px solid #39ff14";
    dialogueBox.style.boxShadow = "0 0 24px rgba(57, 255, 20, 0.2)";
    dialogueBox.style.padding = "24px 28px";
    dialogueBox.style.fontFamily = "'Courier New', Courier, monospace";
    dialogueBox.style.color = "#d8fada";
    dialogueBox.style.lineHeight = "1.7";
    dialogueBox.style.fontSize = "1.1rem";

    const text = document.createElement("p");
    text.style.margin = "0";
    text.innerText = "";
    dialogueBox.appendChild(text);

    const hint = document.createElement("p");
    hint.style.margin = "12px 0 0";
    hint.style.color = "#39ff14";
    hint.style.fontWeight = "bold";
    hint.style.letterSpacing = "1px";
    hint.innerText = "[ CLICK OR PRESS SPACE TO CONTINUE ]";
    dialogueBox.appendChild(hint);

    overlay.appendChild(dialogueBox);
    document.body.appendChild(overlay);

    this.endingDomOverlay = overlay;
    this.endingDialogueBox = dialogueBox;
    this.endingPromptText = text;

    this.endingAdvanceBound = (event) => {
      if (event.type === "keydown" && event.code !== "Space" && event.code !== "Enter") return;
      if (event.type === "keydown") event.preventDefault();
      this.advanceEndingDialogue();
    };

    overlay.addEventListener("click", this.endingAdvanceBound);
    window.addEventListener("keydown", this.endingAdvanceBound);
    this.typeDialogueLine(this.endingDialogueLines[this.endingDialogueIndex]);
  }

  typeDialogueLine(line) {
    if (!this.endingPromptText) return;
    if (this.endingLineTimer) {
      this.endingLineTimer.remove(false);
      this.endingLineTimer = null;
    }
    this.isDialogueTyping = true;
    let idx = 0;
    this.endingPromptText.innerText = "";
    this.endingLineTimer = this.time.addEvent({
      delay: 18,
      loop: true,
      callback: () => {
        idx += 1;
        this.endingPromptText.innerText = line.slice(0, idx);
        this.playTypewriterBlip();
        if (idx >= line.length) {
          this.isDialogueTyping = false;
          if (this.endingLineTimer) {
            this.endingLineTimer.remove(false);
            this.endingLineTimer = null;
          }
        }
      }
    });
  }

  advanceEndingDialogue() {
    if (!this.endingPromptText || this.isEndingChoiceShown) return;
    if (this.isDialogueTyping) {
      if (this.endingLineTimer) {
        this.endingLineTimer.remove(false);
        this.endingLineTimer = null;
      }
      this.isDialogueTyping = false;
      this.endingPromptText.innerText = this.endingDialogueLines[this.endingDialogueIndex];
      return;
    }
    this.endingDialogueIndex += 1;
    if (this.endingDialogueIndex < this.endingDialogueLines.length) {
      this.typeDialogueLine(this.endingDialogueLines[this.endingDialogueIndex]);
      return;
    }
    this.showEndingChoice();
  }

  showEndingChoice() {
    if (!this.endingDomOverlay || this.isEndingChoiceShown) return;
    this.isEndingChoiceShown = true;
    if (this.endingAdvanceBound) {
      this.endingDomOverlay.removeEventListener("click", this.endingAdvanceBound);
      window.removeEventListener("keydown", this.endingAdvanceBound);
      this.endingAdvanceBound = null;
    }

    this.endingDomOverlay.innerHTML = "";
    this.endingDomOverlay.style.alignItems = "center";
    this.endingDomOverlay.style.padding = "20px";
    this.endingDomOverlay.style.background = "rgba(0, 0, 0, 0.74)";

    const promptWrap = document.createElement("div");
    promptWrap.style.textAlign = "center";
    promptWrap.style.fontFamily = "'Courier New', Courier, monospace";
    promptWrap.style.color = "#ffffff";

    const title = document.createElement("h2");
    title.style.fontSize = "clamp(1.8rem, 4vw, 3rem)";
    title.style.marginBottom = "26px";
    title.style.letterSpacing = "2px";
    title.innerText = "Are you smart enough to fight the Astrophage?";
    promptWrap.appendChild(title);

    const yesBtn = document.createElement("button");
    yesBtn.innerText = "YES";
    yesBtn.style.fontSize = "1.5rem";
    yesBtn.style.fontWeight = "bold";
    yesBtn.style.padding = "16px 38px";
    yesBtn.style.margin = "0 12px";
    yesBtn.style.background = "#39ff14";
    yesBtn.style.color = "#000";
    yesBtn.style.border = "none";
    yesBtn.style.cursor = "pointer";

    const noBtn = document.createElement("button");
    noBtn.innerText = "NO";
    noBtn.style.fontSize = "1.5rem";
    noBtn.style.fontWeight = "bold";
    noBtn.style.padding = "16px 38px";
    noBtn.style.margin = "0 12px";
    noBtn.style.background = "#ff003c";
    noBtn.style.color = "#fff";
    noBtn.style.border = "none";
    noBtn.style.cursor = "pointer";

    yesBtn.addEventListener("click", () => this.handleEndingYes());
    noBtn.addEventListener("click", () => this.handleEndingNo());

    promptWrap.appendChild(yesBtn);
    promptWrap.appendChild(noBtn);
    this.endingDomOverlay.appendChild(promptWrap);
  }

  handleEndingNo() {
    if (!this.endingDomOverlay) return;
    this.cameras.main.flash(350, 255, 0, 0);
    this.endingDomOverlay.innerHTML = "";
    this.endingDomOverlay.style.background = "#000";
    this.endingDomOverlay.style.alignItems = "center";

    const wrap = document.createElement("div");
    wrap.style.textAlign = "center";
    wrap.style.fontFamily = "'Courier New', Courier, monospace";
    wrap.style.maxWidth = "900px";
    wrap.style.padding = "20px";

    const dramatic = document.createElement("p");
    dramatic.style.color = "#ff003c";
    dramatic.style.fontSize = "1.5rem";
    dramatic.style.lineHeight = "1.6";
    dramatic.style.marginBottom = "24px";
    dramatic.innerText = "A quarter of Earth's population will die in the next second - AND IT INCLUDES YOU. Now DIE.";
    wrap.appendChild(dramatic);

    const title = document.createElement("h1");
    title.style.color = "#ffffff";
    title.style.fontSize = "clamp(2rem, 6vw, 4rem)";
    title.style.letterSpacing = "4px";
    title.style.marginBottom = "34px";
    title.innerText = "DISAPPOINTING.";
    wrap.appendChild(title);

    const retryBtn = document.createElement("button");
    retryBtn.innerText = "TRY AGAIN";
    retryBtn.style.fontSize = "1.2rem";
    retryBtn.style.padding = "14px 28px";
    retryBtn.style.margin = "0 10px";
    retryBtn.style.background = "#39ff14";
    retryBtn.style.color = "#000";
    retryBtn.style.border = "none";
    retryBtn.style.cursor = "pointer";
    retryBtn.addEventListener("click", () => window.location.reload());

    const quitBtn = document.createElement("button");
    quitBtn.innerText = "QUIT";
    quitBtn.style.fontSize = "1.2rem";
    quitBtn.style.padding = "14px 28px";
    quitBtn.style.margin = "0 10px";
    quitBtn.style.background = "#ff003c";
    quitBtn.style.color = "#fff";
    quitBtn.style.border = "none";
    quitBtn.style.cursor = "pointer";
    quitBtn.addEventListener("click", () => {
      const search = window.location.search || "";
      window.location.href = `phase1-threejs/index.html${search}`;
    });

    wrap.appendChild(retryBtn);
    wrap.appendChild(quitBtn);
    this.endingDomOverlay.appendChild(wrap);
  }

  handleEndingYes() {
    if (!this.marySprite) return;
    if (this.endingDomOverlay) this.endingDomOverlay.style.display = "none";
    if (this.arrivalIdleTween) {
      this.arrivalIdleTween.remove();
      this.arrivalIdleTween = null;
    }
    this.tweens.add({
      targets: this.car,
      x: this.marySprite.x,
      y: this.marySprite.y + 40,
      duration: 850,
      ease: "Sine.easeInOut",
      onComplete: () => {
        this.car.setVisible(false);
        if (this.evaLabel) this.evaLabel.setVisible(false);
        if (this.maryLabel) this.maryLabel.setVisible(false);
        this.playLiftoff();
        this.tweens.add({
          targets: this.marySprite,
          y: -220,
          duration: 2000,
          ease: "Cubic.easeIn",
          onComplete: () => {
            this.cameras.main.fadeOut(1000, 0, 0, 0);
            this.cameras.main.once("camerafadeoutcomplete", () => {
              window.location.href = `./phase3-threejs/index.html?username=${encodeURIComponent(this.cinematicUsername)}`;
            });
          }
        });
      }
    });
  }

  teardownEndingOverlay() {
    if (this.endingLineTimer) {
      this.endingLineTimer.remove(false);
      this.endingLineTimer = null;
    }
    if (this.arrivalIdleTween) {
      this.arrivalIdleTween.remove();
      this.arrivalIdleTween = null;
    }
    if (this.endingDomOverlay && this.endingAdvanceBound) {
      this.endingDomOverlay.removeEventListener("click", this.endingAdvanceBound);
      window.removeEventListener("keydown", this.endingAdvanceBound);
      this.endingAdvanceBound = null;
    }
    if (this.endingDomOverlay && this.endingDomOverlay.parentNode) {
      this.endingDomOverlay.parentNode.removeChild(this.endingDomOverlay);
    }
    this.endingDomOverlay = null;
    this.endingDialogueBox = null;
    this.endingPromptText = null;
    this.isDialogueTyping = false;
  }

  spawnAstroHuman() {
    const astroScale = 0.1;
    const tex = this.textures.get("astro_human").getSourceImage();
    const astroHalfW = tex ? (tex.width * astroScale) / 2 : 16;
    const x = Phaser.Math.Between(
      Math.ceil(this.roadMinX + astroHalfW + 6),
      Math.floor(this.roadMaxX - astroHalfW - 6)
    );
    const human = this.humans.create(x, -36, "astro_human");
    human.setScale(astroScale);
    human.body.setAllowGravity(false);
    human.body.setVelocityY(220);
    human.body.setSize(human.width * 0.6, human.height * 0.6, true);
    human.setData("baseX", x);
    human.setData("jitterAmp", 2);
    human.setData("anglePhase", Phaser.Math.FloatBetween(0, Math.PI * 2));
  }

  spawnAlienBeam() {
    const alien = this.aliens.create(0, -48, "alien_obstacle");
    alien.setScale(0.2);
    const alienHalfW = alien.displayWidth * 0.5;
    const x = Phaser.Math.Between(
      Math.ceil(this.roadMinX + alienHalfW + 6),
      Math.floor(this.roadMaxX - alienHalfW - 6)
    );
    alien.x = x;
    alien.body.setAllowGravity(false);
    alien.body.setVelocityY(220);
    alien.setData("baseX", x);
    alien.setData("sineAmplitude", Phaser.Math.Between(2, 6));
    alien.setData("sineSpeed", Phaser.Math.FloatBetween(0.0045, 0.0065));
    alien.setData("sinePhase", Phaser.Math.FloatBetween(0, Math.PI * 2));
    alien.body.setSize(alien.width * 0.6, alien.height * 0.6, true);

    this.tweens.add({
      targets: alien,
      scaleY: 0.19,
      duration: 200,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut"
    });
  }

  createHUD() {
    this.hudElements = [];
    this.heartIcons = [];

    this.hpBarGraphics = this.add.graphics().setScrollFactor(0).setDepth(1002);
    this.hudElements.push(this.hpBarGraphics);

    this.scoreText = this.add
      .text(this.scale.width - 16, 16, "SCORE: 0", {
        fontFamily: "Orbitron",
        fontSize: "22px",
        color: "#ffffff"
      })
      .setOrigin(1, 0)
      .setScrollFactor(0)
      .setDepth(1002);
    this.hudElements.push(this.scoreText);
  }

  updateHUD() {
    const lives = window.AG.lives;
    const hpRatio = Phaser.Math.Clamp(window.AG.hp / 100, 0, 1);
    this.heartIcons.forEach((heart) => heart.destroy());
    this.heartIcons = [];
    this.hudElements = [this.hpBarGraphics, this.scoreText];
    for (let i = 0; i < lives; i += 1) {
      const heart = this.add
        .text(16 + i * 26, 66, "♥", {
          fontFamily: "Arial",
          fontSize: "24px",
          color: "#ff4b4b"
        })
        .setScrollFactor(0)
        .setDepth(1001);
      this.heartIcons.push(heart);
      this.hudElements.push(heart);
    }

    const barX = 16;
    const barY = 98;
    const barW = 132;
    const barH = 14;
    const hpColor = hpRatio > 0.5 ? 0xffd24a : 0xff3d3d;
    this.hpBarGraphics.clear();
    this.hpBarGraphics.fillStyle(0x2b2b34, 0.95);
    this.hpBarGraphics.fillRect(barX, barY, barW, barH);
    this.hpBarGraphics.fillStyle(hpColor, 1);
    this.hpBarGraphics.fillRect(barX + 2, barY + 2, Math.max(0, (barW - 4) * hpRatio), barH - 4);
    this.hpBarGraphics.lineStyle(2, 0xbfc8d4, 1);
    this.hpBarGraphics.strokeRect(barX, barY, barW, barH);
    this.scoreText.setText(`SCORE: ${window.AG.score}`);
    this.syncHUDTransform();
  }

  syncHUDTransform() {
    if (!this.hudElements) return;
    const cam = this.cameras.main;
    const invZoom = cam.zoom === 0 ? 1 : 1 / cam.zoom;
    for (let i = 0; i < this.hudElements.length; i += 1) {
      const hudObj = this.hudElements[i];
      if (!hudObj || !hudObj.active) continue;
      hudObj.setRotation(-cam.rotation);
      hudObj.setScale(invZoom);
    }
  }

  playBeamHit() {
    if (!this.audioCtx) return;
    const now = this.audioCtx.currentTime;
    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();
    osc.type = "square";
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(200, now + 0.1);
    gain.gain.setValueAtTime(0.035, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.1);
    osc.connect(gain);
    gain.connect(this.audioCtx.destination);
    osc.start(now);
    osc.stop(now + 0.11);
    osc.onended = () => {
      osc.disconnect();
      gain.disconnect();
    };
  }

  playAstroHit() {
    if (!this.audioCtx) return;
    const now = this.audioCtx.currentTime;
    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.exponentialRampToValueAtTime(40, now + 0.3);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.2, now + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.3);
    osc.connect(gain);
    gain.connect(this.audioCtx.destination);
    osc.start(now);
    osc.stop(now + 0.31);
    osc.onended = () => {
      osc.disconnect();
      gain.disconnect();
    };
  }

  playSpinSound() {
    if (!this.audioCtx) return;
    const now = this.audioCtx.currentTime;
    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(300, now);
    osc.frequency.linearRampToValueAtTime(800, now + 0.5);
    osc.frequency.linearRampToValueAtTime(300, now + 1.0);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.04, now + 0.1);
    gain.gain.linearRampToValueAtTime(0.0001, now + 1.0);
    osc.connect(gain);
    gain.connect(this.audioCtx.destination);
    osc.start(now);
    osc.stop(now + 1.05);
    osc.onended = () => {
      osc.disconnect();
      gain.disconnect();
    };
  }

  playTypewriterBlip() {
    if (!this.audioCtx) return;
    const now = this.audioCtx.currentTime;
    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(Phaser.Math.FloatBetween(500, 800), now);
    gain.gain.setValueAtTime(0.009, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.03);
    osc.connect(gain);
    gain.connect(this.audioCtx.destination);
    osc.start(now);
    osc.stop(now + 0.032);
    osc.onended = () => {
      osc.disconnect();
      gain.disconnect();
    };
  }

  playLiftoff() {
    if (!this.audioCtx) return;
    const now = this.audioCtx.currentTime;
    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(50, now);
    osc.frequency.exponentialRampToValueAtTime(600, now + 2.0);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.09, now + 2.0);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 2.2);
    osc.connect(gain);
    gain.connect(this.audioCtx.destination);
    osc.start(now);
    osc.stop(now + 2.25);
    osc.onended = () => {
      osc.disconnect();
      gain.disconnect();
    };
  }

  renderVoidStars() {
    if (!this.starfield) return;
    this.starfield.clear();
    for (let i = 0; i < this.voidStars.length; i += 1) {
      const star = this.voidStars[i];
      this.starfield.fillStyle(star.color, star.alpha);
      this.starfield.fillRect(star.x, star.y, star.size, star.size);
    }
  }

  startNearMissCinematic(human) {
    if (this.isCinematicActive) return;
    this.isCinematicActive = true;
    this.nearMissCooldownMs = 1200;

    this.physics.world.timeScale = 0.2;
    this.playSpinSound();
    if (this.nitro && this.nitro.stop) this.nitro.stop();
    const cam = this.cameras.main;
    const w = this.scale.width;
    const h = this.scale.height;

    // Rotate around the car instead of screen center.
    cam.setOrigin(
      Phaser.Math.Clamp(this.car.x / w, 0, 1),
      Phaser.Math.Clamp(this.car.y / h, 0, 1)
    );

    // Counter-rotate the car so it stays upright.
    this.tweens.add({
      targets: this.car,
      angle: -360,
      duration: 1000,
      ease: "Sine.easeInOut"
    });

    // Zoom and spin the camera.
    cam.zoomTo(1.5, 500, "Sine.easeInOut", true);
    this.tweens.add({
      targets: cam,
      rotation: Math.PI * 2,
      duration: 1000,
      ease: "Sine.easeInOut",
      onComplete: () => {
        // Reset everything cleanly.
        cam.rotation = 0;
        cam.setOrigin(0.5, 0.5);
        this.car.angle = 0;
        cam.zoomTo(1, 300, "Sine.easeOut", true);
        this.physics.world.timeScale = 1;
        if (this.nitro) {
          if (this.nitro.startFollow) {
            this.nitro.startFollow(this.car, 0, this.car.displayHeight * 0.58);
          }
          if (this.nitro.start) this.nitro.start();
        }
        this.leftForest.setAlpha(1).clearTint();
        this.rightForest.setAlpha(1).clearTint();
        this.centerTrack.setAlpha(1);
        this.blurOverlay.setVisible(false).setAlpha(0);
        window.AG.addScore(10);
        this.updateHUD();
        this.isCinematicActive = false;
      }
    });

    this.blurOverlay.setVisible(true).setAlpha(0);
    this.tweens.add({
      targets: this.blurOverlay,
      alpha: 0.18,
      duration: 110,
      yoyo: true,
      repeat: 5,
      ease: "Sine.easeInOut"
    });
    this.tweens.add({
      targets: [this.leftForest, this.rightForest, this.centerTrack],
      alpha: 0.4,
      duration: 500,
      yoyo: true,
      ease: "Sine.easeInOut"
    });
    cam.shake(1000, 0.005);
    this.time.delayedCall(500, () => {
      const tintColor = Phaser.Math.RND.pick([0xff00ff, 0x00ffff]);
      this.leftForest.setTint(tintColor);
      this.rightForest.setTint(tintColor);
      this.time.delayedCall(120, () => {
        this.leftForest.clearTint();
        this.rightForest.clearTint();
      });
    });
    this.time.delayedCall(500, () => cam.flash(100, 255, 255, 255));
  }

  onHitManny(_car, human) {
    if (this.isInvulnerable) return;
    this.playAstroHit();
    this.isInvulnerable = true;
    this.tweens.add({ targets: this.car, alpha: 0.2, yoyo: true, repeat: 4, duration: 50 });
    this.time.delayedCall(500, () => {
      this.isInvulnerable = false;
      this.car.alpha = 1;
    });

    window.AG.loseHp(20);
    this.updateHUD();
    this.cameras.main.flash(180, 160, 0, 0);
    this.cameras.main.shake(180, 0.02);
    this.humans.remove(human, true, true);

    const msg = this.add
      .text(this.scale.width * 0.5, this.scale.height * 0.45, `YOU KILLED ${this.cinematicUsername}!`, {
        fontFamily: "Orbitron",
        fontSize: "40px",
        color: "#8b0000"
      })
      .setOrigin(0.5);

    this.tweens.add({
      targets: msg,
      alpha: 0,
      y: msg.y - 24,
      duration: 2500,
      ease: "Sine.easeOut",
      onComplete: () => msg.destroy()
    });
  }

  onHitAlien(_car, alien) {
    if (this.isInvulnerable) return;
    this.playBeamHit();
    this.isInvulnerable = true;
    this.tweens.add({ targets: this.car, alpha: 0.2, yoyo: true, repeat: 4, duration: 50 });
    this.time.delayedCall(500, () => {
      this.isInvulnerable = false;
      this.car.alpha = 1;
    });

    window.AG.loseHp(10);
    this.updateHUD();
    this.cameras.main.flash(140, 210, 20, 20);
    this.aliens.remove(alien, true, true);

    const ouch = this.add
      .text(this.scale.width * 0.5, 60, "OUCH! -10 HP", {
        fontFamily: "Orbitron",
        fontSize: `${window.AG.settings.popupSize}px`,
        color: "#ff6666"
      })
      .setOrigin(0.5)
      .setScrollFactor(0);
    this.tweens.add({
      targets: ouch,
      y: 30,
      alpha: 0,
      duration: 1500,
      ease: "Sine.easeOut",
      onComplete: () => ouch.destroy()
    });
  }

  update(_time, delta) {
    const dt = delta / 1000;
    const h = this.scale.height;
    const halfW = this.car.displayWidth * 0.5;
    const halfH = this.car.displayHeight * 0.5;

    if (this.nearMissCooldownMs > 0) this.nearMissCooldownMs -= delta;
    for (let i = 0; i < this.voidStars.length; i += 1) {
      const star = this.voidStars[i];
      star.y += 0.5;
      if (star.y > h) star.y = 0;
    }
    this.renderVoidStars();

    if (!this.isEndingSequenceStarted && window.AG.score >= 200) {
      this.startEndingSequence();
    }

    if (this.isRoadScrolling) {
      this.leftForest.tilePositionY -= 120 * dt;
      this.rightForest.tilePositionY -= 120 * dt;
      this.centerTrack.tilePositionY -= 450 * dt;
    }

    if (this.isEndingSequenceStarted || window.AG.hp <= 0) {
      this.stopEngineHum();
    }

    if (this.isCinematicActive) {
      this.updateHUD();
      return;
    }

    let dx = 0;
    let dy = 0;
    if (!this.playerControlLocked) {
      if (this.cursors.left.isDown || this.wasd.a.isDown) dx -= 1;
      if (this.cursors.right.isDown || this.wasd.d.isDown) dx += 1;
      if (this.cursors.up.isDown || this.wasd.w.isDown) dy -= 1;
      if (this.cursors.down.isDown || this.wasd.s.isDown) dy += 1;
    }
    this.updateEngineHum(dx !== 0 || dy !== 0);
    if (dx !== 0 || dy !== 0) {
      const len = Math.hypot(dx, dy);
      dx /= len;
      dy /= len;
      this.car.x += dx * this.moveSpeed * dt;
      this.car.y += dy * this.moveSpeed * dt;
    }

    this.car.x = Phaser.Math.Clamp(this.car.x, this.roadMinX + halfW, this.roadMaxX - halfW);
    this.car.y = Phaser.Math.Clamp(this.car.y, h * 0.35 + halfH, h - halfH - 16);
    this.humans.children.iterate((human) => {
      if (!human || !human.active) return;
      const baseX = human.getData("baseX") || human.x;
      const jitterAmp = human.getData("jitterAmp") || 2;
      human.x = baseX + Math.sin(_time * 0.5 + (human.getData("anglePhase") || 0)) * jitterAmp;
      human.angle = Math.sin(_time * 0.02 + (human.getData("anglePhase") || 0)) * 10;
      if (this.physics.overlap(this.car, human)) {
        if (!this.isInvulnerable) this.onHitManny(this.car, human);
        return;
      }
      if (human.y > h + 60) {
        this.humans.remove(human, true, true);
        return;
      }

      // Near miss trigger: close enough, but not a collision.
      const d = Phaser.Math.Distance.Between(this.car.x, this.car.y, human.x, human.y);
      const closest = human.getData("closestDist") || 9999;
      if (d < closest) human.setData("closestDist", d);
      const hasPassedCar = human.y > this.car.y + 8;
      if (
        hasPassedCar &&
        (human.getData("closestDist") || 9999) < 60 &&
        !human.getData("nearMissDone") &&
        this.nearMissCooldownMs <= 0
      ) {
        human.setData("nearMissDone", true);
        this.startNearMissCinematic(human);
      }
    });

    this.aliens.children.iterate((alien) => {
      if (!alien || !alien.active) return;
      const baseX = alien.getData("baseX") || alien.x;
      const amp = alien.getData("sineAmplitude") || 3;
      const speed = alien.getData("sineSpeed") || 0.005;
      const phase = alien.getData("sinePhase") || 0;
      alien.x = baseX + Math.sin(_time * speed + phase) * amp;
      const alienHalfW = alien.displayWidth * 0.5;
      alien.x = Phaser.Math.Clamp(alien.x, this.roadMinX + alienHalfW, this.roadMaxX - alienHalfW);
      if (this.physics.overlap(this.car, alien)) {
        if (!this.isInvulnerable) this.onHitAlien(this.car, alien);
        return;
      }
      if (alien.y > h + 70) {
        this.aliens.remove(alien, true, true);
        window.AG.addScore(5);
        this.updateHUD();
      }
    });

    // Keep HUD synced with global state in all cases.
    this.updateHUD();
  }
}
