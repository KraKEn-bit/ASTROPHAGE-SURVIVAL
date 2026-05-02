// Step 6 — intro typewriter → Phase 1
class SceneCinematic extends Phaser.Scene {
  constructor() {
    super({ key: "SceneCinematic" });
  }

  create() {
    this.cameras.main.fadeIn(400, 0, 0, 0);

    const w = this.scale.width;
    const h = this.scale.height;
    const name = window.AG.playerName || "Commander";
    this.fullText =
      "Hello, " +
      name +
      ". Welcome aboard. Let's go fight the Astrophage.";

    this.add.rectangle(w / 2, h / 2, w, h, 0x000000);

    this.lineText = this.add
      .text(w / 2, h / 2, "", {
        fontFamily: "Cinzel",
        fontSize: "28px",
        color: "#ffffff",
        align: "center",
        wordWrap: { width: w - 160, useAdvancedWrap: true }
      })
      .setOrigin(0.5);

    this.cursorOn = true;
    this.cursorBlink = this.time.addEvent({
      delay: 520,
      loop: true,
      callback: () => {
        this.cursorOn = !this.cursorOn;
        this.refreshLine();
      }
    });

    this.charIndex = 0;
    this.typeDone = false;

    this.typeEvent = this.time.addEvent({
      delay: 48,
      loop: true,
      callback: () => {
        if (this.typeDone) return;
        this.charIndex++;
        if (this.charIndex >= this.fullText.length) {
          this.typeDone = true;
          this.typeEvent.remove(false);
          this.refreshLine();
          this.time.delayedCall(3000, () => {
            this.cursorBlink.remove(false);
            this.cameras.main.fadeOut(600, 0, 0, 0);
            this.cameras.main.once("camerafadeoutcomplete", () => {
              this.scene.start("ScenePhase1");
            });
          });
          return;
        }
        this.refreshLine();
      }
    });
  }

  refreshLine() {
    const shown = this.fullText.substring(0, this.charIndex);
    const c = this.typeDone || !this.cursorOn ? "" : "▌";
    this.lineText.setText(shown + c);
  }
}
