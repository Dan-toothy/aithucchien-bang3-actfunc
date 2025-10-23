import { BaseScene } from './BaseScene';

export class MainMenuScene extends BaseScene {
  constructor() {
    super('MainMenuScene');
  }

  preload() {
    this.preloadSharedAssets();
  }

  create() {
    const data = this.scene.settings.data as any;
    if (data?.fadeIn) {
      this.fadeIn(data.duration);
    }

    this.setupEventListeners();

    const { width, height } = this.cameras.main;

    const graphics = this.add.graphics();
    graphics.fillGradientStyle(0x3b82f6, 0x3b82f6, 0x10b981, 0x10b981, 1);
    graphics.fillRect(0, 0, width, height);

    const title = this.add.text(width / 2, height * 0.25, 'NGƯỜI CHẠY TRI THỨC', {
      fontSize: '64px',
      color: '#DC2626',
      fontStyle: 'bold',
      fontFamily: 'Arial, sans-serif',
      stroke: '#FCD34D',
      strokeThickness: 4,
    });
    title.setOrigin(0.5);
    title.setShadow(3, 3, '#333333', 2, true, true);

    const description = this.add.text(
      width / 2,
      height * 0.35,
      'Cùng ActFunc chạy và tìm hiểu thêm về Việt Nam nha!',
      {
        fontSize: '20px',
        color: '#ffffff',
        fontFamily: 'Arial, sans-serif',
      }
    );
    description.setOrigin(0.5);

    this.createButton(width / 2, height * 0.45, 'BẮT ĐẦU', () => {
      this.transitionToScene('GamePlayScene');
    });

    this.createButton(width / 2, height * 0.55, 'CÀI ĐẶT', () => {
      console.log('Settings clicked - not implemented yet');
    });

    this.createButton(width / 2, height * 0.65, 'HƯỚNG DẪN', () => {
      console.log('Instructions clicked - not implemented yet');
    });

    const version = this.add.text(width - 10, height - 10, 'v1.0.0', {
      fontSize: '14px',
      color: '#ffffff',
      fontFamily: 'Arial, sans-serif',
    });
    version.setOrigin(1, 1);

    this.tweens.add({
      targets: title,
      y: title.y + 10,
      duration: 2000,
      ease: 'Sine.inOut',
      yoyo: true,
      repeat: -1,
    });

    this.createParticles();
  }

  private createParticles(): void {
    this.add.particles(0, 0, 'flares', {
      frame: 'white',
      color: [0xfcd34d, 0xdc2626, 0xffffff],
      lifespan: 4000,
      angle: { min: 0, max: 360 },
      scale: { start: 0.3, end: 0 },
      quantity: 1,
      frequency: 1000,
      alpha: { start: 0.6, end: 0 },
      blendMode: 'ADD',
      x: { min: 0, max: this.cameras.main.width },
      y: { min: 0, max: this.cameras.main.height },
    });

    if (!this.textures.exists('flares')) {
      const graphics = this.make.graphics({ x: 0, y: 0 }, false);
      graphics.fillStyle(0xffffff);
      graphics.fillCircle(8, 8, 8);
      graphics.generateTexture('flares', 16, 16);
      graphics.destroy();
    }
  }

  update() {}
}
