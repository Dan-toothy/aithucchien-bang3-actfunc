import { BaseScene } from './BaseScene';
import { QuestionManager } from '../services';
import { GAME_SETTINGS } from '../config/phaser.config';
import { ScoreManager, LivesManager } from '../game';

interface Obstacle3D {
  sprite: Phaser.GameObjects.Container;
  lane: number;
  z: number;
  answerText: string;
  isCorrect: boolean;
}

export class GamePlayScene extends BaseScene {
  private score = 0;
  private lives = GAME_SETTINGS.INITIAL_LIVES;
  private currentSpeed = GAME_SETTINGS.BASE_SPEED;
  private questionCount = 0;
  private isPaused = false;

  private scoreText!: Phaser.GameObjects.Text;
  private livesText!: Phaser.GameObjects.Text;
  private questionText!: Phaser.GameObjects.Text;
  private streakText!: Phaser.GameObjects.Text;
  private feedbackContainer!: Phaser.GameObjects.Container;

  private player!: Phaser.GameObjects.Container;
  private track!: Phaser.GameObjects.Graphics;
  private roadStripes: Phaser.GameObjects.Graphics[] = [];
  private stripeOffset = 0;
  private currentLane = 1;
  private targetLane = 1;

  private obstacles: Obstacle3D[] = [];
  private emptyLanes: number[] = [];
  private currentQuestion: any = null;
  private questionActive = false;

  private questionManager!: QuestionManager;
  private scoreManager!: ScoreManager;
  private livesManager!: LivesManager;

  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;

  constructor() {
    super('GamePlayScene');
  }

  init() {
    this.score = 0;
    this.lives = GAME_SETTINGS.INITIAL_LIVES;
    this.currentSpeed = GAME_SETTINGS.BASE_SPEED;
    this.questionCount = 0;
    this.isPaused = false;
    this.currentLane = 1;
    this.targetLane = 1;
    this.obstacles = [];
    this.questionActive = false;
  }

  preload() {
    this.preloadSharedAssets();
    this.questionManager = QuestionManager.getInstance();
  }

  async create() {
    this.cameras.main.setBackgroundColor(0x87ceeb);

    const loadingText = this.add.text(this.cameras.main.width / 2, this.cameras.main.height / 2, 'Loading Game...', {
      fontSize: '32px',
      color: '#ffffff',
    }).setOrigin(0.5);

    try {
      await this.questionManager.loadQuestions('/data/questions.json');
      loadingText.destroy();
    } catch (error) {
      loadingText.setText('Error loading questions!');
      return;
    }

    this.createTrack();
    this.createPlayer();
    this.createUI();

    this.cursors = this.input.keyboard!.createCursorKeys();

    this.scoreManager = new ScoreManager();
    this.livesManager = new LivesManager(this, {
      startingLives: this.lives,
      maxLives: 5,
    });

    this.time.addEvent({
      delay: 3000,
      callback: () => this.spawnObstacle(),
      loop: true,
    });
  }

  private createTrack() {
    this.track = this.add.graphics();
    this.drawTrack();
    this.createAnimatedStripes();
  }

  private drawTrack() {
    this.track.clear();

    const { HORIZON_Y, GROUND_Y, VANISHING_POINT, TRACK_WIDTH_BOTTOM, TRACK_WIDTH_TOP } = GAME_SETTINGS;

    this.track.fillStyle(0x555555, 1);
    this.track.beginPath();
    this.track.moveTo(VANISHING_POINT.x - TRACK_WIDTH_TOP / 2, HORIZON_Y);
    this.track.lineTo(VANISHING_POINT.x + TRACK_WIDTH_TOP / 2, HORIZON_Y);
    this.track.lineTo(VANISHING_POINT.x + TRACK_WIDTH_BOTTOM / 2, GROUND_Y);
    this.track.lineTo(VANISHING_POINT.x - TRACK_WIDTH_BOTTOM / 2, GROUND_Y);
    this.track.closePath();
    this.track.fillPath();

    this.track.lineStyle(2, 0xffffff, 0.8);
    for (let i = 1; i < GAME_SETTINGS.LANES; i++) {
      const ratio = i / GAME_SETTINGS.LANES;
      const topX = VANISHING_POINT.x - TRACK_WIDTH_TOP / 2 + TRACK_WIDTH_TOP * ratio;
      const bottomX = VANISHING_POINT.x - TRACK_WIDTH_BOTTOM / 2 + TRACK_WIDTH_BOTTOM * ratio;
      this.track.beginPath();
      this.track.moveTo(topX, HORIZON_Y);
      this.track.lineTo(bottomX, GROUND_Y);
      this.track.strokePath();
    }
  }

  private createAnimatedStripes() {
    this.roadStripes.forEach((stripe) => stripe.destroy());
    this.roadStripes = [];
    for (let i = 0; i < 10; i++) {
      const stripe = this.add.graphics();
      stripe.setDepth(2);
      this.roadStripes.push(stripe);
    }
  }

  private updateRoadStripes(delta: number) {
    const { HORIZON_Y, GROUND_Y, VANISHING_POINT, TRACK_WIDTH_TOP, TRACK_WIDTH_BOTTOM } = GAME_SETTINGS;
    this.stripeOffset += (this.currentSpeed * delta) / 50;
    if (this.stripeOffset > 1) this.stripeOffset -= 1;

    this.roadStripes.forEach((stripe, index) => {
      stripe.clear();
      stripe.lineStyle(4, 0xffffff, 0.3);
      const t = (index / this.roadStripes.length + this.stripeOffset) % 1;
      if (t < 0.9) {
        for (let lane = 1; lane < GAME_SETTINGS.LANES; lane++) {
          const ratio = lane / GAME_SETTINGS.LANES;
          const topX = VANISHING_POINT.x - TRACK_WIDTH_TOP / 2 + TRACK_WIDTH_TOP * ratio;
          const bottomX = VANISHING_POINT.x - TRACK_WIDTH_BOTTOM / 2 + TRACK_WIDTH_BOTTOM * ratio;
          const startY = HORIZON_Y + (GROUND_Y - HORIZON_Y) * t;
          const endY = HORIZON_Y + (GROUND_Y - HORIZON_Y) * Math.min(t + 0.05, 1);
          const startX = topX + (bottomX - topX) * t;
          const endX = topX + (bottomX - topX) * Math.min(t + 0.05, 1);
          stripe.beginPath();
          stripe.moveTo(startX, startY);
          stripe.lineTo(endX, endY);
          stripe.strokePath();
        }
      }
    });
  }

  private createPlayer() {
    const playerY = GAME_SETTINGS.GROUND_Y - 50;
    this.player = this.add.container(this.cameras.main.width / 2, playerY);
    this.player.setDepth(100);
    const runner = this.createRunnerCharacter();
    this.player.add(runner);
    this.time.addEvent({
      delay: 150,
      callback: () => this.animateRunner(),
      loop: true,
    });
  }

  private createRunnerCharacter(): Phaser.GameObjects.Container {
    const runner = this.add.container(0, 0);
    const body = this.add.rectangle(0, -10, 20, 25, 0xdc2626);
    const head = this.add.circle(0, -28, 8, 0xffd4a3);
    const hair = this.add.ellipse(0, -32, 14, 8, 0x000000);
    const leftArm = this.add.rectangle(-10, -8, 4, 16, 0xffd4a3);
    leftArm.setName('leftArm');
    const rightArm = this.add.rectangle(10, -8, 4, 16, 0xffd4a3);
    rightArm.setName('rightArm');
    const leftLeg = this.add.rectangle(-5, 8, 6, 18, 0x333333);
    leftLeg.setName('leftLeg');
    const rightLeg = this.add.rectangle(5, 8, 6, 18, 0x333333);
    rightLeg.setName('rightLeg');
    const leftFoot = this.add.rectangle(-5, 18, 8, 4, 0x000000);
    leftFoot.setName('leftFoot');
    const rightFoot = this.add.rectangle(5, 18, 8, 4, 0x000000);
    rightFoot.setName('rightFoot');
    runner.add([body, head, hair, leftArm, rightArm, leftLeg, rightLeg, leftFoot, rightFoot]);
    runner.setName('runner');
    return runner;
  }

  private animateRunner() {
    if (!this.player || this.isPaused) return;
    const runner = this.player.getByName('runner') as Phaser.GameObjects.Container;
    if (!runner) return;
    const leftArm = runner.getByName('leftArm') as Phaser.GameObjects.Rectangle;
    const rightArm = runner.getByName('rightArm') as Phaser.GameObjects.Rectangle;
    const leftLeg = runner.getByName('leftLeg') as Phaser.GameObjects.Rectangle;
    const rightLeg = runner.getByName('rightLeg') as Phaser.GameObjects.Rectangle;
    const leftFoot = runner.getByName('leftFoot') as Phaser.GameObjects.Rectangle;
    const rightFoot = runner.getByName('rightFoot') as Phaser.GameObjects.Rectangle;
    const animState = leftArm.x > 0 ? 1 : -1;
    leftArm.x = -10 * animState;
    leftArm.y = -8 + Math.abs(animState) * 2;
    rightArm.x = 10 * animState;
    rightArm.y = -8 + Math.abs(animState) * 2;
    leftLeg.y = 8 - animState * 2;
    rightLeg.y = 8 + animState * 2;
    leftFoot.y = 18 - animState * 3;
    rightFoot.y = 18 + animState * 3;
  }

  private createUI() {
    this.scoreText = this.add.text(20, 20, 'Score: 0', {
      fontSize: '24px',
      color: '#ffffff',
      backgroundColor: '#000000',
      padding: { x: 10, y: 5 },
    });
    this.scoreText.setDepth(200);
    this.livesText = this.add.text(20, 60, `Lives: ${this.lives}`, {
      fontSize: '24px',
      color: '#ffffff',
      backgroundColor: '#000000',
      padding: { x: 10, y: 5 },
    });
    this.livesText.setDepth(200);
    this.questionText = this.add.text(this.cameras.main.width / 2, 50, '', {
      fontSize: '28px',
      color: '#ffff00',
      backgroundColor: '#000000',
      padding: { x: 20, y: 10 },
      align: 'center',
    });
    this.questionText.setOrigin(0.5);
    this.questionText.setDepth(200);
    this.questionText.setVisible(false);
    this.streakText = this.add.text(20, 100, 'Streak: 0', {
      fontSize: '20px',
      color: '#ffff00',
      backgroundColor: '#000000',
      padding: { x: 10, y: 5 },
    });
    this.streakText.setDepth(200);
    this.createFeedbackPopup();
  }

  private createFeedbackPopup() {
    this.feedbackContainer = this.add.container(this.cameras.main.width / 2, 300);
    this.feedbackContainer.setDepth(300);
    this.feedbackContainer.setVisible(false);
    const bg = this.add.rectangle(0, 0, 300, 120, 0x000000, 0.9);
    bg.setStrokeStyle(4, 0xffffff);
    const feedbackText = this.add.text(0, -20, '', {
      fontSize: '32px',
      color: '#ffffff',
      fontStyle: 'bold',
      align: 'center',
    });
    feedbackText.setOrigin(0.5);
    feedbackText.setName('feedbackText');
    const detailText = this.add.text(0, 20, '', {
      fontSize: '20px',
      color: '#ffffff',
      align: 'center',
    });
    detailText.setOrigin(0.5);
    detailText.setName('detailText');
    this.feedbackContainer.add([bg, feedbackText, detailText]);
  }

  private showFeedback(correct: boolean, points?: number, penalty = false) {
    const feedbackText = this.feedbackContainer.getByName('feedbackText') as Phaser.GameObjects.Text;
    const detailText = this.feedbackContainer.getByName('detailText') as Phaser.GameObjects.Text;
    const bg = this.feedbackContainer.getAt(0) as Phaser.GameObjects.Rectangle;
    if (penalty) {
      feedbackText.setText('KHÔNG CÓ ĐÁP ÁN!');
      feedbackText.setColor('#ff9900');
      detailText.setText('-500 điểm');
      detailText.setColor('#ff9900');
      bg.setStrokeStyle(4, 0xff9900);
    } else if (correct) {
      feedbackText.setText('ĐÚNG RỒI!');
      feedbackText.setColor('#00ff00');
      detailText.setText(`+${points} điểm`);
      detailText.setColor('#00ff00');
      bg.setStrokeStyle(4, 0x00ff00);
    } else {
      feedbackText.setText('SAI RỒI!');
      feedbackText.setColor('#ff0000');
      detailText.setText('-1 Mạng');
      detailText.setColor('#ff0000');
      bg.setStrokeStyle(4, 0xff0000);
    }
    this.feedbackContainer.setVisible(true);
    this.feedbackContainer.setScale(0);
    this.tweens.add({
      targets: this.feedbackContainer,
      scale: 1,
      duration: 300,
      ease: 'Back.easeOut',
      onComplete: () => {
        this.time.delayedCall(1500, () => {
          this.tweens.add({
            targets: this.feedbackContainer,
            scale: 0,
            duration: 200,
            onComplete: () => {
              this.feedbackContainer.setVisible(false);
            },
          });
        });
      },
    });
  }

  private getLaneX(lane: number, z: number): number {
    const { VANISHING_POINT, TRACK_WIDTH_TOP, TRACK_WIDTH_BOTTOM } = GAME_SETTINGS;
    const t = 1 - z / GAME_SETTINGS.MAX_DEPTH;
    const trackWidth = TRACK_WIDTH_TOP + (TRACK_WIDTH_BOTTOM - TRACK_WIDTH_TOP) * t;
    const laneRatio = (lane + 0.5) / GAME_SETTINGS.LANES;
    return VANISHING_POINT.x - trackWidth / 2 + trackWidth * laneRatio;
  }

  private getLaneY(z: number): number {
    const { HORIZON_Y, GROUND_Y } = GAME_SETTINGS;
    const t = 1 - z / GAME_SETTINGS.MAX_DEPTH;
    return HORIZON_Y + (GROUND_Y - HORIZON_Y) * t;
  }

  private getScale(z: number): number {
    return 1 - (z / GAME_SETTINGS.MAX_DEPTH) * 0.8;
  }

  private spawnObstacle() {
    if (this.questionActive || this.isPaused) return;
    const question = this.questionManager.getNextQuestion();
    if (!question) return;
    this.currentQuestion = question;
    this.questionActive = true;
    this.questionText.setText(question.question);
    this.questionText.setVisible(true);
    const options = question.options;
    const correctAnswer = question.correct;
    const lanes = [0, 1, 2, 3];
    for (let i = lanes.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [lanes[i], lanes[j]] = [lanes[j], lanes[i]];
    }
    const maxAnswers = this.questionCount < 5 ? 2 : 4;
    let optionIndex = 0;
    const optionKeys = ['A', 'B', 'C', 'D'] as const;
    const availableOptions: { key: 'A' | 'B' | 'C' | 'D'; text: string }[] = [];
    optionKeys.forEach((key) => {
      const optionText = options[key];
      if (optionText) {
        availableOptions.push({ key, text: optionText });
      }
    });
    let selectedOptions = availableOptions;
    if (maxAnswers < availableOptions.length) {
      const correctOption = availableOptions.find((opt) => opt.key === correctAnswer);
      const otherOptions = availableOptions.filter((opt) => opt.key !== correctAnswer);
      for (let i = otherOptions.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [otherOptions[i], otherOptions[j]] = [otherOptions[j], otherOptions[i]];
      }
      selectedOptions = correctOption ? [correctOption, ...otherOptions.slice(0, maxAnswers - 1)] : otherOptions.slice(0, maxAnswers);
    }
    selectedOptions.forEach((opt) => {
      if (optionIndex < GAME_SETTINGS.LANES) {
        const lane = lanes[optionIndex];
        const obstacle = this.createObstacle3D(lane, `${opt.key}: ${opt.text}`, opt.key === correctAnswer);
        this.obstacles.push(obstacle);
        optionIndex++;
      }
    });
    this.emptyLanes = lanes.slice(optionIndex);
  }

  private createObstacle3D(lane: number, answerText: string, isCorrect: boolean): Obstacle3D {
    const container = this.add.container(0, 0);
    const box = this.add.rectangle(0, 0, 120, 60, 0xfcd34d);
    box.setStrokeStyle(2, 0x000000);
    const text = this.add.text(0, 0, answerText, {
      fontSize: '14px',
      color: '#000000',
      align: 'center',
      fontStyle: 'bold',
      wordWrap: { width: 100, useAdvancedWrap: true },
    });
    text.setOrigin(0.5);
    container.add([box, text]);
    container.setDepth(50);
    return {
      sprite: container,
      lane: lane,
      z: GAME_SETTINGS.SPAWN_DEPTH,
      answerText: answerText,
      isCorrect: isCorrect,
    };
  }

  update(time: number, delta: number) {
    if (this.isPaused || !this.cursors) return;
    this.updateRoadStripes(delta);
    this.handleControls();
    this.updatePlayerPosition(delta);
    this.updateObstacles(delta);
    this.checkCollisions();
    this.updateUI();
  }

  private handleControls() {
    if (!this.cursors) return;
    if (this.cursors.left.isDown && this.targetLane > 0) {
      this.targetLane--;
      this.cursors.left.reset();
    } else if (this.cursors.right.isDown && this.targetLane < GAME_SETTINGS.LANES - 1) {
      this.targetLane++;
      this.cursors.right.reset();
    }
  }

  private updatePlayerPosition(delta: number) {
    const laneSpeed = 0.1;
    this.currentLane += (this.targetLane - this.currentLane) * laneSpeed;
    const playerX = this.getLaneX(this.currentLane, 5);
    this.player.x = playerX;
  }

  private updateObstacles(delta: number) {
    const speed = (this.currentSpeed * delta) / 100;
    this.obstacles = this.obstacles.filter((obstacle) => {
      obstacle.z -= speed;
      if (obstacle.z <= 0) {
        obstacle.sprite.destroy();
        return false;
      }
      const x = this.getLaneX(obstacle.lane, obstacle.z);
      const y = this.getLaneY(obstacle.z);
      const scale = this.getScale(obstacle.z);
      obstacle.sprite.setPosition(x, y);
      obstacle.sprite.setScale(scale);
      return true;
    });
    if (this.obstacles.length === 0 && this.questionActive) {
      this.questionActive = false;
      this.questionText.setVisible(false);
    }
  }

  private checkCollisions() {
    let hitObstacle = false;
    this.obstacles.forEach((obstacle, index) => {
      if (obstacle.z < GAME_SETTINGS.QUESTION_Z_TRIGGER + 2 && obstacle.z > GAME_SETTINGS.QUESTION_Z_TRIGGER) {
        const laneDiff = Math.abs(this.currentLane - obstacle.lane);
        if (laneDiff < 0.5) {
          this.handleAnswer(obstacle.isCorrect);
          hitObstacle = true;
          obstacle.sprite.destroy();
          this.obstacles.splice(index, 1);
          this.clearCurrentObstacles();
        }
      }
    });
    if (!hitObstacle && this.questionActive && this.obstacles.length === 0) {
      const playerLaneIndex = Math.round(this.currentLane);
      if (this.emptyLanes.includes(playerLaneIndex)) {
        this.handleEmptyLane();
      }
      this.questionActive = false;
      this.questionText.setVisible(false);
      this.emptyLanes = [];
    }
  }

  private handleEmptyLane() {
    this.score = Math.max(0, this.score - 500);
    this.showFeedback(false, 0, true);
    this.cameras.main.flash(200, 255, 150, 0, false);
  }

  private handleAnswer(isCorrect: boolean) {
    if (isCorrect) {
      const points = this.scoreManager.calculateScore(true, 'medium', 10, false);
      this.score += points;
      this.showFeedback(true, points);
      this.cameras.main.flash(200, 0, 255, 0, false);
    } else {
      this.lives--;
      this.scoreManager.calculateScore(false, 'medium', 0, false);
      this.showFeedback(false);
      this.cameras.main.flash(200, 255, 0, 0, false);
      if (this.lives <= 0) {
        this.gameOver();
      }
    }
    this.questionCount++;
    if (this.questionCount % 3 === 0) {
      this.currentSpeed = Math.min(this.currentSpeed + GAME_SETTINGS.SPEED_INCREMENT, GAME_SETTINGS.MAX_SPEED);
    }
  }

  private clearCurrentObstacles() {
    this.obstacles.forEach((obstacle) => {
      obstacle.sprite.destroy();
    });
    this.obstacles = [];
    this.questionActive = false;
    this.questionText.setVisible(false);
  }

  private updateUI() {
    this.scoreText.setText(`Score: ${this.score}`);
    this.livesText.setText(`Lives: ${this.lives}`);
    this.streakText.setText(`Streak: ${this.scoreManager.getCurrentStreak()}`);
  }

  private gameOver() {
    this.isPaused = true;
    this.scoreManager.addScore(this.score);
    this.time.delayedCall(1000, () => {
      this.scene.start('GameOverScene', {
        score: this.score,
        questionCount: this.questionCount,
        fadeIn: true,
        duration: 500,
      });
    });
  }
}
