import { BaseScene } from './BaseScene';
import { ApiClient } from '../services';

export class GameOverScene extends BaseScene {
  private finalScore = 0;
  private questionsAnswered = 0;
  private bestStreak = 0;
  private accuracy = 0;
  private apiClient: ApiClient;

  constructor() {
    super('GameOverScene');
    this.apiClient = ApiClient.getInstance();
  }

  init(data: any) {
    this.finalScore = data.score || 0;
    this.questionsAnswered = data.questionCount || 0;
    this.bestStreak = data.bestStreak || 0;
    this.accuracy = data.accuracy || 0;
  }

  preload() {
    this.preloadSharedAssets();
  }

  async create() {
    this.fadeIn(500);
    this.setupEventListeners();
    await this.submitScore();

    const { width, height } = this.cameras.main;

    const graphics = this.add.graphics();
    graphics.fillGradientStyle(0x2c3e50, 0x2c3e50, 0x34495e, 0x34495e, 1);
    graphics.fillRect(0, 0, width, height);

    const gameOverText = this.add.text(width / 2, height * 0.15, 'KẾT THÚC', {
      fontSize: '64px',
      color: '#DC2626',
      fontStyle: 'bold',
      fontFamily: 'Arial, sans-serif',
      stroke: '#ffffff',
      strokeThickness: 4,
    });
    gameOverText.setOrigin(0.5);

    const scoreLabel = this.add.text(width / 2, height * 0.35, 'ĐIỂM SỐ CỦA BẠN', {
      fontSize: '24px',
      color: '#FCD34D',
      fontFamily: 'Arial, sans-serif',
    });
    scoreLabel.setOrigin(0.5);

    const scoreText = this.add.text(width / 2, height * 0.42, this.finalScore.toString(), {
      fontSize: '72px',
      color: '#ffffff',
      fontStyle: 'bold',
      fontFamily: 'Arial, sans-serif',
      stroke: '#FCD34D',
      strokeThickness: 3,
    });
    scoreText.setOrigin(0.5);

    const questionsText = this.add.text(
      width / 2,
      height * 0.52,
      `Câu hỏi đã trả lời: ${this.questionsAnswered}`,
      {
        fontSize: '20px',
        color: '#ffffff',
        fontFamily: 'Arial, sans-serif',
      }
    );
    questionsText.setOrigin(0.5);

    const performanceMsg = this.getPerformanceMessage();
    const performanceText = this.add.text(width / 2, height * 0.58, performanceMsg, {
      fontSize: '18px',
      color: '#10B981',
      fontFamily: 'Arial, sans-serif',
      align: 'center',
    });
    performanceText.setOrigin(0.5);

    this.createButton(width / 2, height * 0.8, 'MENU CHÍNH', () => {
      this.transitionToScene('MainMenuScene');
    });

    this.animateScore(scoreText);
    this.checkHighScore();

    const highScore = this.getGameState('highScore') || 0;
    if (this.finalScore >= highScore) {
      this.createNewHighScoreEffect(width / 2, height * 0.28);
    }

    const highScoreText = this.add.text(width / 2, height * 0.9, `Điểm cao nhất: ${highScore}`, {
      fontSize: '16px',
      color: '#ffffff',
      fontFamily: 'Arial, sans-serif',
    });
    highScoreText.setOrigin(0.5);

    this.displaySessionScores();
  }

  private async submitScore(): Promise<void> {
    try {
      const difficultyLevel = this.getDifficultyLevel();
      await this.apiClient.submitScore({
        score: this.finalScore,
        questionsAnswered: this.questionsAnswered,
        accuracy: this.accuracy,
        bestStreak: this.bestStreak,
        difficultyReached: difficultyLevel,
      });
    } catch (error) {
      console.error('Failed to submit score:', error);
    }
  }

  private getDifficultyLevel(): 'easy' | 'medium' | 'hard' | 'expert' {
    if (this.questionsAnswered >= 50) return 'expert';
    if (this.questionsAnswered >= 25) return 'hard';
    if (this.questionsAnswered >= 10) return 'medium';
    return 'easy';
  }

  private async displaySessionScores(): Promise<void> {
    try {
      const scores = await this.apiClient.getSessionScores(5);
      if (scores.length > 0) {
        const { width } = this.cameras.main;
        const scoresTitle = this.add.text(width - 150, 120, 'TOP SESSION', {
          fontSize: '18px',
          color: '#FCD34D',
          fontFamily: 'Arial, sans-serif',
          fontStyle: 'bold',
        });
        scoresTitle.setOrigin(0.5);
        scores.forEach((score, index) => {
          const isCurrentScore = score.score === this.finalScore && score.questionsAnswered === this.questionsAnswered;
          const scoreText = this.add.text(width - 150, 160 + index * 30, `${index + 1}. ${score.score}`, {
            fontSize: '16px',
            color: isCurrentScore ? '#10B981' : '#ffffff',
            fontFamily: 'Arial, sans-serif',
            fontStyle: isCurrentScore ? 'bold' : 'normal',
          });
          scoreText.setOrigin(0.5);
          if (isCurrentScore) {
            this.tweens.add({
              targets: scoreText,
              scale: 1.1,
              duration: 500,
              ease: 'Sine.inOut',
              yoyo: true,
              repeat: 2,
            });
          }
        });
        if (this.apiClient.isBackendAvailable()) {
          const statusText = this.add.text(width - 150, 340, '🟢 Online', {
            fontSize: '12px',
            color: '#10B981',
            fontFamily: 'Arial, sans-serif',
          });
          statusText.setOrigin(0.5);
        }
      }
    } catch (error) {
      console.error('Failed to load session scores:', error);
    }
  }

  private getPerformanceMessage(): string {
    if (this.finalScore >= 5000) {
      return 'Xuất sắc! Bạn là chuyên gia về an toàn thực phẩm!'
    } else if (this.finalScore >= 3000) {
      return 'Tuyệt vời! Kiến thức của bạn rất tốt!'
    } else if (this.finalScore >= 1000) {
      return 'Tốt! Hãy tiếp tục cố gắng!'
    } else if (this.finalScore >= 500) {
      return 'Khá tốt! Bạn hãy cố gắng hơn nữa nhé!'
    } else {
      return 'Hãy thử lại! Bạn sẽ làm tốt hơn ở lần sau nè!'
    }
  }


  private animateScore(scoreText: Phaser.GameObjects.Text): void {
    const startScore = 0;
    const endScore = this.finalScore;
    const duration = 2000;
    this.tweens.addCounter({
      from: startScore,
      to: endScore,
      duration: duration,
      ease: 'Power2',
      onUpdate: (tween) => {
        const value = tween.getValue();
        if (value !== null) {
          scoreText.setText(Math.floor(value).toString());
        }
      },
    });
    this.tweens.add({
      targets: scoreText,
      scale: 1.2,
      duration: 300,
      ease: 'Power2',
      yoyo: true,
      delay: duration,
    });
  }

  private checkHighScore(): void {
    const currentHighScore = this.getGameState('highScore') || 0;
    if (this.finalScore > currentHighScore) {
      this.setGameState('highScore', this.finalScore);
    }
  }

  private createNewHighScoreEffect(x: number, y: number): void {
    const newHighScore = this.add.text(x, y, 'ĐIỂM CAO MỚI!', {
      fontSize: '24px',
      color: '#FFD700',
      fontStyle: 'bold',
      fontFamily: 'Arial, sans-serif',
      stroke: '#FF6347',
      strokeThickness: 2,
    });
    newHighScore.setOrigin(0.5);
    this.tweens.add({
      targets: newHighScore,
      scale: 1.1,
      duration: 500,
      ease: 'Sine.inOut',
      yoyo: true,
      repeat: -1,
    });
    this.createSparkles(x, y);
  }

  private createSparkles(x: number, y: number): void {
    if (!this.textures.exists('sparkle')) {
      const graphics = this.make.graphics({ x: 0, y: 0 }, false);
      graphics.fillStyle(0xffd700);
      graphics.beginPath();
      graphics.moveTo(8, 2);
      graphics.lineTo(10, 6);
      graphics.lineTo(14, 6);
      graphics.lineTo(10, 9);
      graphics.lineTo(12, 14);
      graphics.lineTo(8, 11);
      graphics.lineTo(4, 14);
      graphics.lineTo(6, 9);
      graphics.lineTo(2, 6);
      graphics.lineTo(6, 6);
      graphics.closePath();
      graphics.fillPath();
      graphics.generateTexture('sparkle', 16, 16);
      graphics.destroy();
    }
    const particles = this.add.particles(x, y, 'sparkle', {
      speed: { min: 50, max: 150 },
      scale: { start: 0.5, end: 0 },
      lifespan: 1000,
      quantity: 2,
      frequency: 200,
      alpha: { start: 1, end: 0 },
      rotate: { start: 0, end: 360 },
      blendMode: 'ADD',
    });
    this.time.delayedCall(3000, () => {
      particles.stop();
    });
  }

  update() {}

  shutdown() {
    this.cleanup();
  }
}
