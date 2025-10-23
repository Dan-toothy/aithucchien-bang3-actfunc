import Phaser from 'phaser';

export class GamePlayScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GamePlayScene' });
  }

  create() {
    this.add.text(400, 300, 'Game Play', { fontSize: '64px', color: '#fff' }).setOrigin(0.5);
    this.input.on('pointerdown', () => this.scene.start('GameOverScene'));
  }
}
