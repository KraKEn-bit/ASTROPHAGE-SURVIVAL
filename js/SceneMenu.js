class SceneMenu extends Phaser.Scene {
  constructor() {
    super({ key: "SceneMenu" });
  }

  create() {
    const w = this.scale.width;
    const h = this.scale.height;

    this.cameras.main.setBackgroundColor("#0a0a12");

    this.add.text(w * 0.5, h * 0.38, "SCENE MENU", {
      fontFamily: "Orbitron",
      fontSize: "48px",
      color: "#d7e7ff"
    }).setOrigin(0.5);

    this.add.text(w * 0.5, h * 0.52, "Placeholder menu ready.", {
      fontFamily: "Orbitron",
      fontSize: "20px",
      color: "#9db6d9"
    }).setOrigin(0.5);

    this.add.text(w * 0.5, h * 0.62, "Press G to return to SceneGym", {
      fontFamily: "Orbitron",
      fontSize: "18px",
      color: "#66ff99"
    }).setOrigin(0.5);

    this.input.keyboard.once("keydown-G", () => {
      this.scene.start("SceneGym");
    });
  }
}
