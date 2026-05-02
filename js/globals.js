// E:\VVVGame\js\globals.js
// SINGLE SOURCE OF TRUTH — all game state lives here
// Never create other globals. Access via window.AG everywhere.

window.AG = {

  // Player info
  playerName: "Commander",

  // Lives & scoring
  lives: 5,
  score: 0,
  hp: 100,

  // Settings (persisted to localStorage)
  settings: {
    audio:     true,
    bw:        false,
    popupSize: 24
  },

  // Methods
  addScore(n) {
    this.score += Math.max(0, Number(n) || 0);
    if (window.AGUI) window.AGUI.updateScore();
  },

  loseLife() {
    this.lives = Math.max(0, this.lives - 1);
    this.hp = 100;
    if (window.AGUI) window.AGUI.updateLives();
    if (window.AGUI) window.AGUI.updateHp();
    if (this.lives <= 0 && typeof window !== "undefined" && window.dispatchEvent) {
      window.dispatchEvent(new CustomEvent("ag:gameover"));
    }
    return this.lives;
  },

  loseHp(amount) {
    amount = Math.max(0, Number(amount) || 0);
    window.AG.hp -= amount;
    if (window.AG.hp <= 0) {
      window.AG.lives -= 1;
      window.AG.hp = 100; // Reset HP after losing a life
    }
    if (window.AG.lives < 0) window.AG.lives = 0;
    if (window.AGUI) window.AGUI.updateLives();
    if (window.AGUI) window.AGUI.updateHp();
    if (window.AG.lives <= 0 && typeof window !== "undefined" && window.dispatchEvent) {
      window.dispatchEvent(new CustomEvent("ag:gameover"));
    }
    return window.AG.hp;
  },

  reset() {
    this.lives = 5;
    this.score = 0;
    this.hp    = 100;
  },

  saveSettings() {
    localStorage.setItem('ag_settings', JSON.stringify(this.settings));
  },

  loadSettings() {
    try {
      const s = JSON.parse(localStorage.getItem('ag_settings'));
      if (s) Object.assign(this.settings, s);
    } catch(e) {}
  }
};

// Load saved settings on boot
window.AG.loadSettings();