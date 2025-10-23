import Phaser from 'phaser';
import { AudioManager } from '../game';

export interface SceneTransitionOptions {
  fadeIn?: boolean;
  fadeOut?: boolean;
  duration?: number;
  targetScene?: string;
  data?: any;
}

export abstract class BaseScene extends Phaser.Scene {
  protected isTransitioning = false;
  protected audioManager: AudioManager;

  constructor(config: string | Phaser.Types.Scenes.SettingsConfig) {
    super(config);
    this.audioManager = AudioManager.getInstance();
  }

  protected preloadSharedAssets(): void {}

  protected createButton(
    x: number,
    y: number,
    text: string,
    callback: () => void,
    style?: Phaser.Types.GameObjects.Text.TextStyle
  ): Phaser.GameObjects.Container {
    const defaultStyle: Phaser.Types.GameObjects.Text.TextStyle = {
      fontSize: '24px',
      color: '#ffffff',
      fontFamily: 'Arial, sans-serif',
      ...style,
    };

    const buttonBg = this.add.rectangle(x, y, 200, 60, 0xdc2626);
    buttonBg.setInteractive({ useHandCursor: true });

    const buttonText = this.add.text(x, y, text, defaultStyle);
    buttonText.setOrigin(0.5);

    const container = this.add.container(0, 0, [buttonBg, buttonText]);

    buttonBg.on('pointerover', () => {
      buttonBg.setScale(1.05);
      buttonBg.setFillStyle(0xff3333);
    });

    buttonBg.on('pointerout', () => {
      buttonBg.setScale(1);
      buttonBg.setFillStyle(0xdc2626);
    });

    buttonBg.on('pointerdown', () => {
      buttonBg.setScale(0.95);
    });

    buttonBg.on('pointerup', () => {
      buttonBg.setScale(1.05);
      callback();
    });

    return container;
  }

  protected fadeIn(duration = 500, callback?: () => void): void {
    this.cameras.main.fadeIn(duration, 0, 0, 0);

    if (callback) {
      this.time.delayedCall(duration, callback);
    }
  }

  protected fadeOut(duration = 500, callback?: () => void): void {
    this.isTransitioning = true;
    this.cameras.main.fadeOut(duration, 0, 0, 0);

    this.time.delayedCall(duration, () => {
      this.isTransitioning = false;
      if (callback) callback();
    });
  }

  protected transitionToScene(
    sceneName: string,
    options: SceneTransitionOptions = {}
  ): void {
    const {
      fadeOut: shouldFadeOut = true,
      fadeIn: shouldFadeIn = true,
      duration = 500,
      data = {},
    } = options;

    if (this.isTransitioning) return;

    const startNextScene = () => {
      this.scene.start(sceneName, { ...data, fadeIn: shouldFadeIn, duration });
    };

    if (shouldFadeOut) {
      this.fadeOut(duration, startNextScene);
    } else {
      startNextScene();
    }
  }

  protected cleanup(): void {
    this.events.removeAllListeners();
    this.input.removeAllListeners();

    this.tweens.killAll();

    this.time.removeAllEvents();
  }

  protected setupEventListeners(): void {
    this.input.keyboard?.on('keydown-F', () => {
      if (this.scale.isFullscreen) {
        this.scale.stopFullscreen();
      } else {
        this.scale.startFullscreen();
      }
    });

    this.input.keyboard?.on('keydown-ESC', () => {
      if (!this.scene.isPaused()) {
        this.scene.pause();
        this.scene.launch('PauseScene');
      }
    });
  }

  protected getGameState(key: string): any {
    return this.registry.get(key);
  }

  protected setGameState(key: string, value: any): void {
    this.registry.set(key, value);
  }

  protected updateGameState(key: string, updates: object): void {
    const currentState = this.getGameState(key) || {};
    this.setGameState(key, { ...currentState, ...updates });
  }
}
