// Scaffold — lab puzzle in Step 10
class ScenePhase3 extends Phaser.Scene {
  constructor() {
    super({ key: 'ScenePhase3' });
  }

  create() {
    const w = this.scale.width;
    const h = this.scale.height;
    this.add.rectangle(w / 2, h / 2, w, h, 0x121018);
    this.add
      .text(w / 2, h / 2, 'ScenePhase3 — lab (Step 10)\n\nSPACE: Game Over (win)', {
        fontFamily: 'Orbitron',
        fontSize: '20px',
        color: '#ffccaa',
        align: 'center'
      })
      .setOrigin(0.5);

    this.input.keyboard.once('keydown-SPACE', () =>
      this.scene.start('SceneGameOver', { reason: 'win' })
    );
  }
}
