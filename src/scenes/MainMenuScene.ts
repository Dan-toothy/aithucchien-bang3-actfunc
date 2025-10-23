import Phaser from 'phaser';

export class MainMenuScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MainMenuScene' });
  }

  create() {
    this.add.text(400, 300, 'Main Menu', { fontSize: '64px', color: '#fff' }).setOrigin(0.5);
    this.input.on('pointerdown', () => this.scene.start('GamePlayScene'));
  }
}
