class SceneGym extends Phaser.Scene {
  constructor() {
    super({ key: "SceneGym" });
  }

  preload() {
    this.load.image("road_texture", "assets/sprites/main_road.jpg");
    this.load.image("scenery_side", "assets/sprites/forest_map.webp");
    this.load.image("car", "assets/sprites/car_topdown.png");
    this.load.image("alien_obstacle", "assets/sprites/alien_beam.png");
    this.load.image("astro_human", "assets/sprites/astro_GG.gif");
    this.load.image("tumbleweed", "assets/sprites/tumbleweed_Pixel.png");
  }

  create() {
    const w = this.scale.width;
    const h = this.scale.height;

    this.cameras.main.setBackgroundColor("#000");

    this.roadMinX = 320;
    this.roadMaxX = 960;
    this.leftDesert = this.add.tileSprite(0, 0, 320, 720, "scenery_side");
    this.leftDesert.setOrigin(0, 0);
    this.leftDesert.setDepth(-2);
    this.leftDesertBaseScaleX = 1;
    this.leftDesert.setScale(this.leftDesertBaseScaleX, 1);

    this.rightDesert = this.add.tileSprite(960, 0, 320, 720, "scenery_side");
    this.rightDesert.setOrigin(0, 0);
    this.rightDesert.setFlipX(true);
    this.rightDesert.setDepth(-2);
    this.rightDesertBaseScaleX = 1;
    this.rightDesert.setScale(this.rightDesertBaseScaleX, 1);

    this.centerTrack = this.add.tileSprite(320, 0, 640, 720, "road_texture");
    this.centerTrack.setOrigin(0, 0);
    this.centerTrack.setDepth(-1);
    this.centerTrack.tilePositionX += 14;

    this.car = this.add.image(w * 0.5, h * 0.72, "car");
    this.car.setDisplaySize(48, 90);
    this.physics.add.existing(this.car);
    this.car.body.setAllowGravity(false);
    this.car.body.setImmovable(true);
    this.car.body.setSize(38, 74, true);

    const dotSize = 8;
    if (!this.textures.exists("ag-exhaust-dot")) {
      const g = this.make.graphics({ x: 0, y: 0, add: false });
      g.fillStyle(0xffffff, 1);
      g.fillCircle(dotSize / 2, dotSize / 2, dotSize / 2);
      g.generateTexture("ag-exhaust-dot", dotSize, dotSize);
      g.destroy();
    }
    this.exhaust = null;
    try {
      this.exhaust = this.add.particles(0, 0, "ag-exhaust-dot", {
        lifespan: 460,
        speed: { min: 45, max: 130 },
        angle: { min: 75, max: 105 },
        scale: { start: 0.5, end: 0 },
        quantity: 3,
        frequency: 40,
        tint: [0xff8c42, 0xffb347, 0xa8adb8, 0x8d939f],
        blendMode: "ADD",
        emitting: true
      });
    } catch (_err) {}

    this.aliens = this.physics.add.group();
    this.physics.add.overlap(this.car, this.aliens, this.onCarHitAlien, null, this);
    this.astros = this.physics.add.group();
    this.physics.add.overlap(this.car, this.astros, this.onCarHitAstro, null, this);

    this.time.addEvent({
      delay: 2100,
      loop: true,
      callback: this.spawnHazardWave,
      callbackScope: this
    });

    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasd = this.input.keyboard.addKeys({
      w: Phaser.Input.Keyboard.KeyCodes.W,
      a: Phaser.Input.Keyboard.KeyCodes.A,
      s: Phaser.Input.Keyboard.KeyCodes.S,
      d: Phaser.Input.Keyboard.KeyCodes.D
    });

    this.velocity = new Phaser.Math.Vector2(0, 0);
    this.maxSpeed = 300;
    this.accel = 2200;
    this.drag = 2600;
    this.hitStopMs = 0;
    this.wasMoving = false;
    this.hitFeedbackCooldownMs = 0;
    this.alienSerialGapMs = 520;
    this.nearMissCooldownMs = 0;
    this.isNearMissCinematic = false;
    this.blurOverlay = this.add
      .rectangle(w * 0.5, h * 0.5, w, h, 0xaad6ff, 0)
      .setDepth(1000)
      .setScrollFactor(0)
      .setVisible(false);
    this.createHUD();
    this.updateHUD();

    this.input.keyboard.once("keydown-SPACE", () => {
      this.transitionToPhase3();
    });
    this.input.keyboard.once("keydown-ENTER", () => {
      this.transitionToPhase3();
    });

  }

  transitionToPhase3() {
    const existing = document.getElementById("phase-transition-overlay");
    if (existing) return;
    const overlay = document.createElement("div");
    overlay.id = "phase-transition-overlay";
    overlay.style.cssText = "position:fixed; top:0; left:0; width:100vw; height:100vh; background:#000; z-index:9999; opacity:0; transition: opacity 2s ease-in-out; display:flex; justify-content:center; align-items:center; color:#4a90e2; font-family:monospace; font-size:24px;";
    overlay.innerText = "INITIATING PHASE 3...";
    document.body.appendChild(overlay);

    setTimeout(() => {
      overlay.style.opacity = "1";
    }, 50);

    setTimeout(() => {
      const currentUsername = new URLSearchParams(window.location.search).get("username") || "PILOT";
      window.location.href = `phase3-threejs/index.html?username=${encodeURIComponent(currentUsername)}`;
    }, 2500);
  }

  spawnAlien() {
    const roadLeft = this.roadMinX + 32;
    const roadRight = this.roadMaxX - 32;

    const x = Phaser.Math.Between(roadLeft, roadRight);
    const alien = this.aliens.create(x, -60, "alien_obstacle");
    alien.setScale(0.2);
    alien.body.setAllowGravity(false);
    alien.body.setVelocityY(220);
    alien.setData("baseX", x);
    alien.setData("sineAmplitude", Phaser.Math.Between(2, 6));
    alien.setData("sineSpeed", Phaser.Math.FloatBetween(0.0045, 0.0065));
    alien.setData("sinePhase", Phaser.Math.FloatBetween(0, Math.PI * 2));
    alien.body.setSize(alien.displayWidth * 0.72, alien.displayHeight * 0.72, true);
    alien.body.setOffset(alien.displayWidth * 0.14, alien.displayHeight * 0.14);

    this.tweens.add({
      targets: alien,
      scaleY: 0.19,
      duration: 200,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut"
    });

    this.tweens.add({
      targets: alien,
      scaleX: 0.21,
      duration: 200,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut"
    });

    this.tweens.add({
      targets: alien,
      alpha: { from: 0.8, to: 1 },
      duration: 220,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut"
    });
  }

  spawnAstro() {
    const roadLeft = this.roadMinX + 28;
    const roadRight = this.roadMaxX - 28;
    const x = Phaser.Math.Between(roadLeft, roadRight);
    const astro = this.astros.create(x, -64, "astro_human");
    astro.setScale(0.08);
    astro.body.setAllowGravity(false);
    astro.body.setVelocityY(200);
    astro.setData("sineAmplitude", Phaser.Math.Between(2, 5));
    astro.setData("sineSpeed", Phaser.Math.FloatBetween(0.004, 0.007));
    astro.setData("sinePhase", Phaser.Math.FloatBetween(0, Math.PI * 2));
    astro.body.setSize(astro.displayWidth * 0.65, astro.displayHeight * 0.8, true);
    astro.body.setOffset(astro.displayWidth * 0.17, astro.displayHeight * 0.1);

    // Fast panic walk fallback if GIF frames are static.
    this.tweens.add({
      targets: astro,
      scaleY: 0.17,
      duration: 150,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut"
    });
  }

  spawnHazardWave() {
    // Ordered sequences so hazards come one-after-another, not clumped.
    const sequences = [
      ["alien", "astro", "astro"], // 1 beam + 2 astro
      ["alien", "astro"], // 1 beam + 1 astro
      ["alien", "alien", "alien", "astro"], // 3 beam then 1 astro
      ["alien", "alien", "astro"], // 2 beam then 1 astro
      ["alien", "astro", "alien"] // interleaved
    ];
    const sequence = Phaser.Utils.Array.GetRandom(sequences);
    if (!sequence || sequence.length === 0) return;

    const xPositions = this.getSeparatedSpawnXs(sequence.length, 170);
    sequence.forEach((kind, idx) => {
      const x = xPositions[idx];
      const delay = idx * this.alienSerialGapMs;
      this.time.delayedCall(delay, () => {
        if (kind === "astro") this.spawnAstroAt(x);
        else this.spawnAlienAt(x);
      });
    });
  }

  getSeparatedSpawnXs(count, minGap) {
    const roadLeft = this.roadMinX + 36;
    const roadRight = this.roadMaxX - 36;
    const xs = [];
    let tries = 0;
    while (xs.length < count && tries < 100) {
      tries += 1;
      const x = Phaser.Math.Between(roadLeft, roadRight);
      const ok = xs.every((v) => Math.abs(v - x) >= minGap);
      if (ok) xs.push(x);
    }
    if (xs.length < count) {
      // Deterministic fallback spread across lanes.
      const laneStep = (roadRight - roadLeft) / (count + 1);
      for (let i = xs.length; i < count; i += 1) {
        xs.push(Math.round(roadLeft + laneStep * (i + 1)));
      }
    }
    Phaser.Utils.Array.Shuffle(xs);
    return xs;
  }

  spawnAlienAt(x) {
    const alien = this.aliens.create(x, -60, "alien_obstacle");
    alien.setScale(0.2);
    alien.body.setAllowGravity(false);
    alien.body.setVelocityY(220);
    alien.setData("baseX", x);
    alien.setData("sineAmplitude", Phaser.Math.Between(2, 6));
    alien.setData("sineSpeed", Phaser.Math.FloatBetween(0.0045, 0.0065));
    alien.setData("sinePhase", Phaser.Math.FloatBetween(0, Math.PI * 2));
    alien.body.setSize(alien.displayWidth * 0.72, alien.displayHeight * 0.72, true);
    alien.body.setOffset(alien.displayWidth * 0.14, alien.displayHeight * 0.14);

    this.tweens.add({
      targets: alien,
      scaleY: 0.19,
      duration: 200,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut"
    });

    this.tweens.add({
      targets: alien,
      scaleX: 0.21,
      duration: 200,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut"
    });

    this.tweens.add({
      targets: alien,
      alpha: { from: 0.8, to: 1 },
      duration: 220,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut"
    });
  }

  spawnAstroAt(x) {
    const astro = this.astros.create(x, -64, "astro_human");
    astro.setScale(0.08);
    astro.body.setAllowGravity(false);
    astro.body.setVelocityY(200);
    astro.setData("baseX", x);
    astro.setData("sineAmplitude", Phaser.Math.Between(2, 5));
    astro.setData("sineSpeed", Phaser.Math.FloatBetween(0.004, 0.007));
    astro.setData("sinePhase", Phaser.Math.FloatBetween(0, Math.PI * 2));
    astro.body.setSize(astro.displayWidth * 0.65, astro.displayHeight * 0.8, true);
    astro.body.setOffset(astro.displayWidth * 0.17, astro.displayHeight * 0.1);

    this.tweens.add({
      targets: astro,
      scaleY: 0.17,
      duration: 150,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut"
    });
  }

  createHUD() {
    this.heartTexts = [];
    for (let i = 0; i < 5; i += 1) {
      const heart = this.add
        .text(16 + i * 24, 16, "♥", {
          fontFamily: "Arial",
          fontSize: "22px",
          color: "#ff4b4b"
        })
        .setScrollFactor(0)
        .setDepth(1100);
      this.heartTexts.push(heart);
    }

    this.hpBarBg = this.add.rectangle(16, 46, 100, 12, 0x606060).setOrigin(0, 0.5);
    this.hpBarBg.setScrollFactor(0).setDepth(1100);

    this.hpBarFill = this.add.rectangle(16, 46, 100, 12, 0xff2b2b).setOrigin(0, 0.5);
    this.hpBarFill.setScrollFactor(0).setDepth(1101);

    this.scoreText = this.add
      .text(this.scale.width - 16, 12, "SCORE: 0", {
        fontFamily: "Orbitron",
        fontSize: "22px",
        color: "#ffffff"
      })
      .setOrigin(1, 0)
      .setScrollFactor(0)
      .setDepth(1101);
  }

  updateHUD() {
    const lives = window.AG.lives;
    const hpRatio = Phaser.Math.Clamp(window.AG.hp / 100, 0, 1);
    this.heartTexts.forEach((heart, i) => {
      heart.setAlpha(i < lives ? 1 : 0.2);
    });
    this.hpBarFill.scaleX = hpRatio;
    this.scoreText.setText(`SCORE: ${window.AG.score}`);
  }

  onCarHitAlien(_car, alien) {
    if (this.hitFeedbackCooldownMs > 0) return;
    this.hitFeedbackCooldownMs = 180;

    window.AG.loseHp(10);
    this.updateHUD();
    this.cameras.main.shake(180, 0.02);
    this.cameras.main.flash(130, 255, 60, 60);

    const popup = this.add.text(this.car.x, this.car.y - 30, "OUCH! -10 HP", {
      fontFamily: "Orbitron",
      fontSize: `${window.AG.settings.popupSize}px`,
      color: "#66ffcc"
    }).setOrigin(0.5);

    this.tweens.add({
      targets: popup,
      y: popup.y - 36,
      alpha: 0,
      duration: 650,
      ease: "Sine.easeOut",
      onComplete: () => popup.destroy()
    });

    alien.destroy();
  }

  onCarHitAstro(_car, astro) {
    if (this.hitFeedbackCooldownMs > 0) return;
    this.hitFeedbackCooldownMs = 180;

    window.AG.loseHp(20);
    this.updateHUD();
    this.cameras.main.shake(200, 0.02);
    this.cameras.main.flash(150, 220, 40, 40);

    const popup = this.add.text(this.car.x, this.car.y - 30, "ASTRO HIT! -20 HP", {
      fontFamily: "Orbitron",
      fontSize: `${window.AG.settings.popupSize}px`,
      color: "#ff6666"
    }).setOrigin(0.5);
    this.tweens.add({
      targets: popup,
      y: popup.y - 34,
      alpha: 0,
      duration: 700,
      ease: "Sine.easeOut",
      onComplete: () => popup.destroy()
    });

    astro.destroy();
  }

  playWhooshSfx() {
    if (typeof Howler !== "undefined") {
      try {
        const whoosh = new Howl({
          src: ["assets/spaceship_sounds/spaceship/mp3/utility/eff1.mp3"],
          volume: 0.4
        });
        whoosh.play();
      } catch (e) {
        // Optional audio, keep gameplay running.
      }
    }
  }

  startNearMissCinematic(astro) {
    if (this.isNearMissCinematic) return;
    this.isNearMissCinematic = true;
    this.nearMissCooldownMs = 1200;

    const cam = this.cameras.main;
    const focusX = Phaser.Math.Clamp(this.car.x, this.roadMinX + 120, this.roadMaxX - 120);
    const focusY = Phaser.Math.Clamp(this.car.y, 220, this.scale.height - 120);
    this.physics.world.pause();
    cam.pan(focusX, focusY, 180, "Cubic.easeOut", true);
    cam.zoomTo(1.8, 220, "Cubic.easeOut");
    this.playWhooshSfx();

    const bgTargets = [this.leftDesert, this.rightDesert, this.centerTrack];
    this.car.setAngle(0);
    if (astro && astro.setAngle) astro.setAngle(0);
    const fgTargets = [this.car, astro];
    this.tweens.add({
      targets: bgTargets,
      angle: "+=360",
      duration: 1000,
      ease: "Cubic.easeInOut"
    });
    this.tweens.add({
      targets: fgTargets,
      angle: "-=360",
      duration: 1000,
      ease: "Cubic.easeInOut"
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
    cam.shake(220, 0.005);
    this.time.delayedCall(500, () => cam.flash(100, 255, 255, 255));

    this.time.delayedCall(1000, () => {
      bgTargets.forEach((o) => o && o.setAngle(0));
      this.car.setAngle(0);
      this.aliens.children.iterate((a) => a && a.active && a.setAngle(0));
      this.astros.children.iterate((a) => a && a.active && a.setAngle(0));
      cam.zoomTo(1, 220, "Cubic.easeInOut");
      cam.pan(this.scale.width * 0.5, this.scale.height * 0.5, 220, "Cubic.easeInOut", true);
      this.blurOverlay.setVisible(false).setAlpha(0);
      this.physics.world.resume();
      window.AG.addScore(10);
      this.updateHUD();
      this.isNearMissCinematic = false;
    });
  }

  update(_time, delta) {
    const dt = delta / 1000;
    const h = this.scale.height;
    if (this.hitFeedbackCooldownMs > 0) this.hitFeedbackCooldownMs -= delta;
    if (this.nearMissCooldownMs > 0) this.nearMissCooldownMs -= delta;

    this.leftDesert.tilePositionY -= 120 * dt;
    this.rightDesert.tilePositionY -= 120 * dt;
    this.centerTrack.tilePositionY -= 450 * dt;
    const hazeA = Math.sin(_time * 0.0026) * 3.2;
    const hazeB = Math.sin(_time * 0.0064) * 1.4;
    this.leftDesert.tilePositionX = 20 + hazeA + hazeB;
    this.rightDesert.tilePositionX = 20 - hazeA + hazeB;
    this.leftDesert.setScale(
      this.leftDesertBaseScaleX + Math.sin(_time * 0.0018) * 0.003,
      1
    );
    this.rightDesert.setScale(
      this.rightDesertBaseScaleX + Math.sin(_time * 0.0018 + 1.3) * 0.003,
      1
    );

    if (this.isNearMissCinematic) {
      this.updateHUD();
      return;
    }

    let ix = 0;
    let iy = 0;
    if (this.cursors.left.isDown || this.wasd.a.isDown) ix -= 1;
    if (this.cursors.right.isDown || this.wasd.d.isDown) ix += 1;
    if (this.cursors.up.isDown || this.wasd.w.isDown) iy -= 1;
    if (this.cursors.down.isDown || this.wasd.s.isDown) iy += 1;

    const isMoving = ix !== 0 || iy !== 0;
    if (isMoving && !this.wasMoving) {
      this.hitStopMs = 55;
      this.cameras.main.shake(60, 0.003);
    }
    this.wasMoving = isMoving;
    if (this.hitStopMs > 0) this.hitStopMs -= delta;

    if (isMoving) {
      const len = Math.hypot(ix, iy);
      ix /= len;
      iy /= len;
    }

    const desiredX = ix * this.maxSpeed;
    const desiredY = iy * this.maxSpeed;
    const accelAmount = (isMoving ? this.accel : this.drag) * dt;
    this.velocity.x = Phaser.Math.Linear(
      this.velocity.x,
      desiredX,
      Phaser.Math.Clamp(accelAmount / this.maxSpeed, 0, 1)
    );
    this.velocity.y = Phaser.Math.Linear(
      this.velocity.y,
      desiredY,
      Phaser.Math.Clamp(accelAmount / this.maxSpeed, 0, 1)
    );

    const hitStopScale = this.hitStopMs > 0 ? 0.35 : 1;
    this.car.x += this.velocity.x * dt * hitStopScale;
    this.car.y += this.velocity.y * dt * hitStopScale;

    const halfW = this.car.displayWidth * 0.5;
    const halfH = this.car.displayHeight * 0.5;
    const roadLeft = this.roadMinX + halfW;
    const roadRight = this.roadMaxX - halfW;
    this.car.x = Phaser.Math.Clamp(this.car.x, roadLeft, roadRight);
    this.car.y = Phaser.Math.Clamp(this.car.y, h * 0.38 + halfH, h - halfH - 24);
    if (this.exhaust && this.exhaust.setPosition) {
      this.exhaust.setPosition(this.car.x, this.car.y + 52);
    }

    this.aliens.children.iterate((alien) => {
      if (!alien || !alien.active) return;
      alien.x += Math.sin(_time * 0.005 + alien.y) * 2;
      alien.x = Phaser.Math.Clamp(alien.x, this.roadMinX + 20, this.roadMaxX - 20);
      if (alien.y > h + 90) alien.destroy();
    });
    this.astros.children.iterate((astro) => {
      if (!astro || !astro.active) return;
      const baseX = astro.getData("baseX") || astro.x;
      const amp = astro.getData("sineAmplitude") || 4;
      const speed = astro.getData("sineSpeed") || 0.005;
      const phase = astro.getData("sinePhase") || 0;
      astro.x = baseX + Math.cos(_time * speed + phase) * amp;
      const half = astro.displayWidth * 0.5;
      astro.x = Phaser.Math.Clamp(astro.x, this.roadMinX + half, this.roadMaxX - half);
      const d = Phaser.Math.Distance.Between(this.car.x, this.car.y, astro.x, astro.y);
      const closest = astro.getData("closestDist") || 9999;
      if (d < closest) astro.setData("closestDist", d);
      const hasPassedCar = astro.y > this.car.y + 8;
      if (
        hasPassedCar &&
        (astro.getData("closestDist") || 9999) < 60 &&
        !astro.getData("nearMissDone") &&
        this.nearMissCooldownMs <= 0
      ) {
        astro.setData("nearMissDone", true);
        this.startNearMissCinematic(astro);
      }
      if (astro.y > h + 90) astro.destroy();
    });
    this.updateHUD();
  }
}
