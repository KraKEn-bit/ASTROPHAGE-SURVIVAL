// Scaffold — space combat in Step 9
class ScenePhase2 extends Phaser.Scene {
  constructor() {
    super({ key: 'ScenePhase2' });
  }

  create() {
    const w = this.scale.width;
    const h = this.scale.height;
    this.add.rectangle(w / 2, h / 2, w, h, 0x050510);
    this.add
      .text(w / 2, h / 2, 'ScenePhase2 — space combat (Step 9)\n\nSPACE: Phase 3', {
        fontFamily: 'Orbitron',
        fontSize: '20px',
        color: '#aaddff',
        align: 'center'
      })
      .setOrigin(0.5);

    const transitionToNextPhase = () => {
      const overlay = document.createElement("div");
      overlay.style.cssText = "position:fixed; top:0; left:0; width:100vw; height:100vh; background:#000; z-index:9999; opacity:0; transition: opacity 2s ease-in-out; display:flex; justify-content:center; align-items:center; color:#4a90e2; font-family:monospace; font-size:24px;";
      overlay.innerText = "INITIATING PHASE 3...";
      document.body.appendChild(overlay);

      setTimeout(() => {
        overlay.style.opacity = "1";
      }, 50);

      setTimeout(() => {
        const currentUsername = new URLSearchParams(window.location.search).get("username") || "PILOT";
        window.location.href = `./phase3-threejs/index.html?username=${encodeURIComponent(currentUsername)}`;
      }, 2500);
    };

    this.input.keyboard.once("keydown-SPACE", () => {
      transitionToNextPhase();
    });
  }
}
