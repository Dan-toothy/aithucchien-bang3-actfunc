import Phaser from 'phaser';

export class GameOverScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameOverScene' });
  }

  create() {
    this.add.text(400, 300, 'Game Over', { fontSize: '64px', color: '#fff' }).setOrigin(0.5);
    this.input.on('pointerdown', () => this.scene.start('MainMenuScene'));
  }
}
