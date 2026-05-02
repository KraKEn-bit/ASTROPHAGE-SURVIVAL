// Scaffold — dialogue in Step 8
class SceneConversation extends Phaser.Scene {
  constructor() {
    super({ key: 'SceneConversation' });
  }

  create() {
    const w = this.scale.width;
    const h = this.scale.height;
    this.add.rectangle(w / 2, h / 2, w, h, 0x0d0d18);
    this.add
      .text(w / 2, h / 2, 'SceneConversation (Step 8)\n\nSPACE: Phase 2', {
        fontFamily: 'Cinzel',
        fontSize: '20px',
        color: '#dddddd',
        align: 'center'
      })
      .setOrigin(0.5);

    this.input.keyboard.once('keydown-SPACE', () => this.scene.start('ScenePhase2'));
  }
}
