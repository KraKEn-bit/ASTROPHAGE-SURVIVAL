// Scaffold — credits in Step 11
class SceneGameOver extends Phaser.Scene {
  constructor() {
    super({ key: 'SceneGameOver' });
  }

  init(data) {
    this.reason = data && data.reason ? data.reason : 'fail';
  }

  create() {
    const w = this.scale.width;
    const h = this.scale.height;
    this.add.rectangle(w / 2, h / 2, w, h, 0x000000);
    this.add
      .text(
        w / 2,
        h / 2,
        'SceneGameOver (Step 11)\nreason: ' + this.reason + '\n\nSPACE: main menu',
        {
          fontFamily: 'Orbitron',
          fontSize: '22px',
          color: '#ff6666',
          align: 'center'
        }
      )
      .setOrigin(0.5);

    this.input.keyboard.once('keydown-SPACE', () => this.scene.start('SceneMenu'));
  }
}
