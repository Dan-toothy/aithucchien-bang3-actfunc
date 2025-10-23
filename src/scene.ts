import Phaser from 'phaser'
import { AudioManager, ScoreManager, LivesManager } from './game'
import { QuestionManager, ApiClient } from './services'
import { GAME_SETTINGS } from './config/phaser.config'
import { QuestionOptions } from './types/Question'

export interface SceneTransitionOptions {
  fadeIn?: boolean
  fadeOut?: boolean
  duration?: number
  targetScene?: string
  data?: any
}

export abstract class BaseScene extends Phaser.Scene {
  protected isTransitioning = false
  protected audioManager: AudioManager

  constructor(config: string | Phaser.Types.Scenes.SettingsConfig) {
    super(config)
    this.audioManager = AudioManager.getInstance()
  }

  protected preloadSharedAssets(): void {
  }

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
      ...style
    }

    const buttonBg = this.add.rectangle(x, y, 200, 60, 0xdc2626)
    buttonBg.setInteractive({ useHandCursor: true })

    const buttonText = this.add.text(x, y, text, defaultStyle)
    buttonText.setOrigin(0.5)

    const container = this.add.container(0, 0, [buttonBg, buttonText])

    buttonBg.on('pointerover', () => {
      buttonBg.setScale(1.05)
      buttonBg.setFillStyle(0xff3333)
    })

    buttonBg.on('pointerout', () => {
      buttonBg.setScale(1)
      buttonBg.setFillStyle(0xdc2626)
    })

    buttonBg.on('pointerdown', () => {
      buttonBg.setScale(0.95)
    })

    buttonBg.on('pointerup', () => {
      buttonBg.setScale(1.05)
      callback()
    })

    return container
  }

  protected fadeIn(duration = 500, callback?: () => void): void {
    this.cameras.main.fadeIn(duration, 0, 0, 0)

    if (callback) {
      this.time.delayedCall(duration, callback)
    }
  }

  protected fadeOut(duration = 500, callback?: () => void): void {
    this.isTransitioning = true
    this.cameras.main.fadeOut(duration, 0, 0, 0)

    this.time.delayedCall(duration, () => {
      this.isTransitioning = false
      if (callback) callback()
    })
  }

  protected transitionToScene(
    sceneName: string,
    options: SceneTransitionOptions = {}
  ): void {
    const {
      fadeOut: shouldFadeOut = true,
      fadeIn: shouldFadeIn = true,
      duration = 500,
      data = {}
    } = options

    if (this.isTransitioning) return

    const startNextScene = () => {
      this.scene.start(sceneName, { ...data, fadeIn: shouldFadeIn, duration })
    }

    if (shouldFadeOut) {
      this.fadeOut(duration, startNextScene)
    } else {
      startNextScene()
    }
  }

  protected cleanup(): void {
    this.events.removeAllListeners()
    this.input.removeAllListeners()

    this.tweens.killAll()

    this.time.removeAllEvents()
  }

  protected setupEventListeners(): void {
    this.input.keyboard?.on('keydown-F', () => {
      if (this.scale.isFullscreen) {
        this.scale.stopFullscreen()
      } else {
        this.scale.startFullscreen()
      }
    })

    this.input.keyboard?.on('keydown-ESC', () => {
      if (!this.scene.isPaused()) {
        this.scene.pause()
        this.scene.launch('PauseScene')
      }
    })
  }

  protected getGameState(key: string): any {
    return this.registry.get(key)
  }

  protected setGameState(key: string, value: any): void {
    this.registry.set(key, value)
  }

  protected updateGameState(key: string, updates: object): void {
    const currentState = this.getGameState(key) || {}
    this.setGameState(key, { ...currentState, ...updates })
  }
}

export class MainMenuScene extends BaseScene {
  constructor() {
    super('MainMenuScene')
  }

  preload() {
    this.preloadSharedAssets()
  }

  create() {
    const data = this.scene.settings.data as any
    if (data?.fadeIn) {
      this.fadeIn(data.duration)
    }

    this.setupEventListeners()

    const { width, height } = this.cameras.main

    const graphics = this.add.graphics()
    graphics.fillGradientStyle(0x3b82f6, 0x3b82f6, 0x10b981, 0x10b981, 1)
    graphics.fillRect(0, 0, width, height)

    const title = this.add.text(width / 2, height * 0.25, 'NGƯỜI CHẠY TRI THỨC', {
      fontSize: '64px',
      color: '#DC2626',
      fontStyle: 'bold',
      fontFamily: 'Arial, sans-serif',
      stroke: '#FCD34D',
      strokeThickness: 4
    })
    title.setOrigin(0.5)
    title.setShadow(3, 3, '#333333', 2, true, true)

    const description = this.add.text(
      width / 2,
      height * 0.35,
      'Cùng ActFunc chạy và tìm hiểu thêm về Việt Nam nha!',
      {
        fontSize: '20px',
        color: '#ffffff',
        fontFamily: 'Arial, sans-serif'
      }
    )
    description.setOrigin(0.5)

    this.createButton(width / 2, height * 0.45, 'BẮT ĐẦU', () => {
      this.transitionToScene('GamePlayScene')
    })

    this.createButton(width / 2, height * 0.55, 'CÀI ĐẶT', () => {
      console.log('Settings clicked - not implemented yet')
    })

    this.createButton(width / 2, height * 0.65, 'HƯỚNG DẪN', () => {
      console.log('Instructions clicked - not implemented yet')
    })

    const version = this.add.text(width - 10, height - 10, 'v1.0.0', {
      fontSize: '14px',
      color: '#ffffff',
      fontFamily: 'Arial, sans-serif'
    })
    version.setOrigin(1, 1)

    this.tweens.add({
      targets: title,
      y: title.y + 10,
      duration: 2000,
      ease: 'Sine.inOut',
      yoyo: true,
      repeat: -1
    })

    this.createParticles()
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
      y: { min: 0, max: this.cameras.main.height }
    })

    if (!this.textures.exists('flares')) {
      const graphics = this.make.graphics({ x: 0, y: 0 }, false)
      graphics.fillStyle(0xffffff)
      graphics.fillCircle(8, 8, 8)
      graphics.generateTexture('flares', 16, 16)
      graphics.destroy()
    }
  }

  update() {
  }
}

export class GamePlayScene extends BaseScene {
  private score = 0
  private lives = GAME_SETTINGS.INITIAL_LIVES
  private currentSpeed = GAME_SETTINGS.BASE_SPEED
  private questionCount = 0
  private isPaused = false

  private scoreText!: Phaser.GameObjects.Text
  private livesText!: Phaser.GameObjects.Text
  private questionText!: Phaser.GameObjects.Text
  private streakText!: Phaser.GameObjects.Text
  private feedbackContainer!: Phaser.GameObjects.Container

  private player!: Phaser.GameObjects.Container
  private track!: Phaser.GameObjects.Graphics
  private roadStripes: Phaser.GameObjects.Graphics[] = []
  private stripeOffset = 0
  private currentLane = 1
  private targetLane = 1
  private laneTransition = 0

  private obstacles: Obstacle3D[] = []
  private emptyLanes: number[] = []
  private spawnTimer = 0
  private currentQuestion: any = null
  private questionActive = false

  private questionManager!: QuestionManager
  private scoreManager!: ScoreManager
  private livesManager!: LivesManager

  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys

  constructor() {
    super('GamePlayScene')
  }

  init() {
    this.score = 0
    this.lives = GAME_SETTINGS.INITIAL_LIVES
    this.currentSpeed = GAME_SETTINGS.BASE_SPEED
    this.questionCount = 0
    this.isPaused = false
    this.currentLane = 1
    this.targetLane = 1
    this.obstacles = []
    this.spawnTimer = 0
    this.questionActive = false
  }

  preload() {
    this.preloadSharedAssets()
    this.questionManager = QuestionManager.getInstance()
  }

  async create() {
    console.log('GamePlayScene create() started')

    this.cameras.main.setBackgroundColor(0x87CEEB)

    const testText = this.add.text(512, 384, 'Loading Game...', {
      fontSize: '32px',
      color: '#ffffff'
    })
    testText.setOrigin(0.5)

    try {
      await this.questionManager.loadQuestions('./data/questions.json')
      console.log('Questions loaded successfully')
      testText.destroy()
    } catch (error) {
      console.error('Failed to load questions:', error)
      testText.setText('Error loading questions!')
    }

    console.log('Creating track...')
    this.createTrack()

    console.log('Creating player...')
    this.createPlayer()

    console.log('Creating UI...')
    this.createUI()

    this.cursors = this.input.keyboard!.createCursorKeys()
    console.log('Controls setup')

    this.scoreManager = new ScoreManager()
    this.livesManager = new LivesManager(this, {
      startingLives: this.lives,
      maxLives: 5
    })
    console.log('Managers initialized')

    this.time.addEvent({
      delay: 3000,
      callback: () => this.spawnObstacle(),
      loop: true
    })
    console.log('Obstacle spawning started')
  }

  private createTrack() {
    this.track = this.add.graphics()
    this.drawTrack()
    this.createAnimatedStripes()
  }

  private drawTrack() {
    this.track.clear()

    const { HORIZON_Y, GROUND_Y, VANISHING_POINT, TRACK_WIDTH_BOTTOM, TRACK_WIDTH_TOP } = GAME_SETTINGS

    this.track.fillStyle(0x555555, 1)
    this.track.beginPath()

    this.track.moveTo(VANISHING_POINT.x - TRACK_WIDTH_TOP / 2, HORIZON_Y)
    this.track.lineTo(VANISHING_POINT.x + TRACK_WIDTH_TOP / 2, HORIZON_Y)

    this.track.lineTo(VANISHING_POINT.x + TRACK_WIDTH_BOTTOM / 2, GROUND_Y)
    this.track.lineTo(VANISHING_POINT.x - TRACK_WIDTH_BOTTOM / 2, GROUND_Y)

    this.track.closePath()
    this.track.fillPath()

    this.track.lineStyle(2, 0xffffff, 0.8)
    for (let i = 1; i < GAME_SETTINGS.LANES; i++) {
      const ratio = i / GAME_SETTINGS.LANES
      const topX = VANISHING_POINT.x - TRACK_WIDTH_TOP / 2 + (TRACK_WIDTH_TOP * ratio)
      const bottomX = VANISHING_POINT.x - TRACK_WIDTH_BOTTOM / 2 + (TRACK_WIDTH_BOTTOM * ratio)

      this.track.beginPath()
      this.track.moveTo(topX, HORIZON_Y)
      this.track.lineTo(bottomX, GROUND_Y)
      this.track.strokePath()
    }
  }

  private createAnimatedStripes() {
    this.roadStripes.forEach(stripe => stripe.destroy())
    this.roadStripes = []

    for (let i = 0; i < 10; i++) {
      const stripe = this.add.graphics()
      stripe.setDepth(2)
      this.roadStripes.push(stripe)
    }
  }

  private updateRoadStripes(delta: number) {
    const { HORIZON_Y, GROUND_Y, VANISHING_POINT, TRACK_WIDTH_TOP, TRACK_WIDTH_BOTTOM } = GAME_SETTINGS

    this.stripeOffset += this.currentSpeed * delta / 50
    if (this.stripeOffset > 1) this.stripeOffset -= 1

    this.roadStripes.forEach((stripe, index) => {
      stripe.clear()
      stripe.lineStyle(4, 0xffffff, 0.3)

      const t = (index / this.roadStripes.length + this.stripeOffset) % 1

      if (t < 0.9) {
        for (let lane = 1; lane < GAME_SETTINGS.LANES; lane++) {
          const ratio = lane / GAME_SETTINGS.LANES

          const topX = VANISHING_POINT.x - TRACK_WIDTH_TOP / 2 + (TRACK_WIDTH_TOP * ratio)
          const bottomX = VANISHING_POINT.x - TRACK_WIDTH_BOTTOM / 2 + (TRACK_WIDTH_BOTTOM * ratio)

          const startY = HORIZON_Y + (GROUND_Y - HORIZON_Y) * t
          const endY = HORIZON_Y + (GROUND_Y - HORIZON_Y) * Math.min(t + 0.05, 1)

          const startX = topX + (bottomX - topX) * t
          const endX = topX + (bottomX - topX) * Math.min(t + 0.05, 1)

          stripe.beginPath()
          stripe.moveTo(startX, startY)
          stripe.lineTo(endX, endY)
          stripe.strokePath()
        }
      }
    })
  }

  private createPlayer() {
    const playerY = GAME_SETTINGS.GROUND_Y - 50
    this.player = this.add.container(512, playerY)
    this.player.setDepth(100)

    const runner = this.createRunnerCharacter()
    this.player.add(runner)

    this.time.addEvent({
      delay: 150,
      callback: () => this.animateRunner(),
      loop: true
    })
  }

  private createRunnerCharacter(): Phaser.GameObjects.Container {
    const runner = this.add.container(0, 0)

    const body = this.add.rectangle(0, -10, 20, 25, 0xdc2626)

    const head = this.add.circle(0, -28, 8, 0xffd4a3)

    const hair = this.add.ellipse(0, -32, 14, 8, 0x000000)

    const leftArm = this.add.rectangle(-10, -8, 4, 16, 0xffd4a3)
    leftArm.setName('leftArm')
    const rightArm = this.add.rectangle(10, -8, 4, 16, 0xffd4a3)
    rightArm.setName('rightArm')

    const leftLeg = this.add.rectangle(-5, 8, 6, 18, 0x333333)
    leftLeg.setName('leftLeg')
    const rightLeg = this.add.rectangle(5, 8, 6, 18, 0x333333)
    rightLeg.setName('rightLeg')

    const leftFoot = this.add.rectangle(-5, 18, 8, 4, 0x000000)
    leftFoot.setName('leftFoot')
    const rightFoot = this.add.rectangle(5, 18, 8, 4, 0x000000)
    rightFoot.setName('rightFoot')

    runner.add([body, head, hair, leftArm, rightArm, leftLeg, rightLeg, leftFoot, rightFoot])
    runner.setName('runner')

    return runner
  }

  private animateRunner() {
    if (!this.player || this.isPaused) return

    const runner = this.player.getByName('runner') as Phaser.GameObjects.Container
    if (!runner) return

    const leftArm = runner.getByName('leftArm') as Phaser.GameObjects.Rectangle
    const rightArm = runner.getByName('rightArm') as Phaser.GameObjects.Rectangle
    const leftLeg = runner.getByName('leftLeg') as Phaser.GameObjects.Rectangle
    const rightLeg = runner.getByName('rightLeg') as Phaser.GameObjects.Rectangle
    const leftFoot = runner.getByName('leftFoot') as Phaser.GameObjects.Rectangle
    const rightFoot = runner.getByName('rightFoot') as Phaser.GameObjects.Rectangle

    const animState = leftArm.x > 0 ? 1 : -1

    leftArm.x = -10 * animState
    leftArm.y = -8 + Math.abs(animState) * 2
    rightArm.x = 10 * animState
    rightArm.y = -8 + Math.abs(animState) * 2

    leftLeg.y = 8 - animState * 2
    rightLeg.y = 8 + animState * 2
    leftFoot.y = 18 - animState * 3
    rightFoot.y = 18 + animState * 3
  }

  private createUI() {
    this.scoreText = this.add.text(20, 20, 'Score: 0', {
      fontSize: '24px',
      color: '#ffffff',
      backgroundColor: '#000000',
      padding: { x: 10, y: 5 }
    })
    this.scoreText.setDepth(200)

    this.livesText = this.add.text(20, 60, `Lives: ${this.lives}`, {
      fontSize: '24px',
      color: '#ffffff',
      backgroundColor: '#000000',
      padding: { x: 10, y: 5 }
    })
    this.livesText.setDepth(200)

    this.questionText = this.add.text(512, 50, '', {
      fontSize: '28px',
      color: '#ffff00',
      backgroundColor: '#000000',
      padding: { x: 20, y: 10 },
      align: 'center'
    })
    this.questionText.setOrigin(0.5)
    this.questionText.setDepth(200)
    this.questionText.setVisible(false)

    this.streakText = this.add.text(20, 100, 'Streak: 0', {
      fontSize: '20px',
      color: '#ffff00',
      backgroundColor: '#000000',
      padding: { x: 10, y: 5 }
    })
    this.streakText.setDepth(200)

    this.createFeedbackPopup()
  }

  private createFeedbackPopup() {
    this.feedbackContainer = this.add.container(512, 300)
    this.feedbackContainer.setDepth(300)
    this.feedbackContainer.setVisible(false)

    const bg = this.add.rectangle(0, 0, 300, 120, 0x000000, 0.9)
    bg.setStrokeStyle(4, 0xffffff)

    const feedbackText = this.add.text(0, -20, '', {
      fontSize: '32px',
      color: '#ffffff',
      fontStyle: 'bold',
      align: 'center'
    })
    feedbackText.setOrigin(0.5)
    feedbackText.setName('feedbackText')

    const detailText = this.add.text(0, 20, '', {
      fontSize: '20px',
      color: '#ffffff',
      align: 'center'
    })
    detailText.setOrigin(0.5)
    detailText.setName('detailText')

    this.feedbackContainer.add([bg, feedbackText, detailText])
  }

  private showFeedback(correct: boolean, points?: number, penalty: boolean = false) {
    const feedbackText = this.feedbackContainer.getByName('feedbackText') as Phaser.GameObjects.Text
    const detailText = this.feedbackContainer.getByName('detailText') as Phaser.GameObjects.Text
    const bg = this.feedbackContainer.getAt(0) as Phaser.GameObjects.Rectangle

    if (penalty) {
      feedbackText.setText('KHÔNG CÓ ĐÁP ÁN!')
      feedbackText.setColor('#ff9900')
      detailText.setText('-500 điểm')
      detailText.setColor('#ff9900')
      bg.setStrokeStyle(4, 0xff9900)
    } else if (correct) {
      feedbackText.setText('ĐÚNG RỒI!')
      feedbackText.setColor('#00ff00')
      detailText.setText(`+${points} điểm`)
      detailText.setColor('#00ff00')
      bg.setStrokeStyle(4, 0x00ff00)
    } else {
      feedbackText.setText('SAI RỒI!')
      feedbackText.setColor('#ff0000')
      detailText.setText('-1 Mạng')
      detailText.setColor('#ff0000')
      bg.setStrokeStyle(4, 0xff0000)
    }

    this.feedbackContainer.setVisible(true)
    this.feedbackContainer.setScale(0)

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
              this.feedbackContainer.setVisible(false)
            }
          })
        })
      }
    })
  }

  private getLaneX(lane: number, z: number): number {
    const { VANISHING_POINT, TRACK_WIDTH_TOP, TRACK_WIDTH_BOTTOM } = GAME_SETTINGS

    const t = 1 - (z / GAME_SETTINGS.MAX_DEPTH)
    const trackWidth = TRACK_WIDTH_TOP + (TRACK_WIDTH_BOTTOM - TRACK_WIDTH_TOP) * t

    const laneRatio = (lane + 0.5) / GAME_SETTINGS.LANES
    return VANISHING_POINT.x - trackWidth / 2 + trackWidth * laneRatio
  }

  private getLaneY(z: number): number {
    const { HORIZON_Y, GROUND_Y } = GAME_SETTINGS
    const t = 1 - (z / GAME_SETTINGS.MAX_DEPTH)
    return HORIZON_Y + (GROUND_Y - HORIZON_Y) * t
  }

  private getScale(z: number): number {
    return 1 - (z / GAME_SETTINGS.MAX_DEPTH) * 0.8
  }

  private spawnObstacle() {
    try {
      if (this.questionActive || this.isPaused) return

      const question = this.questionManager.getNextQuestion()
      if (!question) {
        console.log('No question available')
        return
      }

      console.log('Spawning obstacle with question:', question.question)
      this.currentQuestion = question
      this.questionActive = true

      this.questionText.setText(question.question)
      this.questionText.setVisible(true)

      const options = question.options
      const correctAnswer = question.correct
      const lanes = [0, 1, 2, 3]

      for (let i = lanes.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [lanes[i], lanes[j]] = [lanes[j], lanes[i]]
      }

      const maxAnswers = this.questionCount < 5 ? 2 : 4

      let optionIndex = 0
      const optionKeys: (keyof QuestionOptions)[] = ['A', 'B', 'C', 'D']
      const availableOptions: {key: keyof QuestionOptions, text: string}[] = []

      optionKeys.forEach((key) => {
        const optionText = options[key]
        if (optionText) {
          availableOptions.push({key, text: optionText})
        }
      })

      let selectedOptions = availableOptions

      if (maxAnswers < availableOptions.length) {
        const correctOption = availableOptions.find(opt => opt.key === correctAnswer)
        const otherOptions = availableOptions.filter(opt => opt.key !== correctAnswer)

        for (let i = otherOptions.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [otherOptions[i], otherOptions[j]] = [otherOptions[j], otherOptions[i]]
        }

        selectedOptions = correctOption ? [correctOption, ...otherOptions.slice(0, maxAnswers - 1)] : otherOptions.slice(0, maxAnswers)
      }

      selectedOptions.forEach((opt) => {
        if (optionIndex < GAME_SETTINGS.LANES) {
          const lane = lanes[optionIndex]
          const obstacle = this.createObstacle3D(
            lane,
            `${opt.key}: ${opt.text}`,
            opt.key === correctAnswer
          )
          this.obstacles.push(obstacle)
          optionIndex++
        }
      })

      this.emptyLanes = lanes.slice(optionIndex)

      console.log(`Created ${optionIndex} obstacles, ${this.emptyLanes.length} empty lanes`)
    } catch (error) {
      console.error('Error in spawnObstacle:', error)
    }
  }

  private createObstacle3D(lane: number, answerText: string, isCorrect: boolean): Obstacle3D {
    const container = this.add.container(0, 0)

    const box = this.add.rectangle(0, 0, 120, 60, 0xFCD34D)
    box.setStrokeStyle(2, 0x000000)

    const text = this.add.text(0, 0, answerText, {
      fontSize: '14px',
      color: '#000000',
      align: 'center',
      fontStyle: 'bold',
      wordWrap: { width: 100, useAdvancedWrap: true }
    })
    text.setOrigin(0.5)

    container.add([box, text])
    container.setDepth(50)

    return {
      sprite: container,
      lane: lane,
      z: GAME_SETTINGS.SPAWN_DEPTH,
      answerText: answerText,
      isCorrect: isCorrect
    }
  }

  update(time: number, delta: number) {
    if (this.isPaused || !this.cursors) return

    this.updateRoadStripes(delta)

    this.handleControls()
    this.updatePlayerPosition(delta)

    this.updateObstacles(delta)

    this.checkCollisions()

    this.updateUI()
  }

  private handleControls() {
    if (!this.cursors) return

    if (this.cursors.left.isDown && this.targetLane > 0) {
      this.targetLane--
      this.cursors.left.reset()
    } else if (this.cursors.right.isDown && this.targetLane < GAME_SETTINGS.LANES - 1) {
      this.targetLane++
      this.cursors.right.reset()
    }
  }

  private updatePlayerPosition(delta: number) {
    const laneSpeed = 0.1
    this.currentLane += (this.targetLane - this.currentLane) * laneSpeed

    const playerX = this.getLaneX(this.currentLane, 5)
    this.player.x = playerX
  }

  private updateObstacles(delta: number) {
    const speed = this.currentSpeed * delta / 100

    this.obstacles = this.obstacles.filter(obstacle => {
      obstacle.z -= speed

      if (obstacle.z <= 0) {
        obstacle.sprite.destroy()
        return false
      }

      const x = this.getLaneX(obstacle.lane, obstacle.z)
      const y = this.getLaneY(obstacle.z)
      const scale = this.getScale(obstacle.z)

      obstacle.sprite.setPosition(x, y)
      obstacle.sprite.setScale(scale)

      return true
    })

    if (this.obstacles.length === 0 && this.questionActive) {
      this.questionActive = false
      this.questionText.setVisible(false)
    }
  }

  private checkCollisions() {
    let hitObstacle = false

    this.obstacles.forEach((obstacle, index) => {
      if (obstacle.z < GAME_SETTINGS.QUESTION_Z_TRIGGER + 2 && obstacle.z > GAME_SETTINGS.QUESTION_Z_TRIGGER) {
        const laneDiff = Math.abs(this.currentLane - obstacle.lane)

        if (laneDiff < 0.5) {
          this.handleAnswer(obstacle.isCorrect)
          hitObstacle = true

          obstacle.sprite.destroy()
          this.obstacles.splice(index, 1)

          this.clearCurrentObstacles()
        }
      }
    })

    if (!hitObstacle && this.questionActive && this.obstacles.length === 0) {
      const playerLaneIndex = Math.round(this.currentLane)
      if (this.emptyLanes.includes(playerLaneIndex)) {
        this.handleEmptyLane()
      }

      this.questionActive = false
      this.questionText.setVisible(false)
      this.emptyLanes = []
    }
  }

  private handleEmptyLane() {
    this.score = Math.max(0, this.score - 500)

    this.showFeedback(false, 0, true)

    this.cameras.main.flash(200, 255, 150, 0, false)
  }

  private handleAnswer(isCorrect: boolean) {
    if (isCorrect) {
      const points = this.scoreManager.calculateScore(true, 'medium', 10, false)
      this.score += points

      this.showFeedback(true, points)

      this.cameras.main.flash(200, 0, 255, 0, false)
    } else {
      this.lives--
      this.scoreManager.calculateScore(false, 'medium', 0, false)

      this.showFeedback(false)

      this.cameras.main.flash(200, 255, 0, 0, false)

      if (this.lives <= 0) {
        this.gameOver()
      }
    }

    this.questionCount++

    if (this.questionCount % 3 === 0) {
      this.currentSpeed = Math.min(this.currentSpeed + GAME_SETTINGS.SPEED_INCREMENT, GAME_SETTINGS.MAX_SPEED)
      console.log(`Speed increased to: ${this.currentSpeed}`)
    }
  }

  private clearCurrentObstacles() {
    this.obstacles.forEach(obstacle => {
      obstacle.sprite.destroy()
    })
    this.obstacles = []
    this.questionActive = false
    this.questionText.setVisible(false)
  }

  private updateUI() {
    this.scoreText.setText(`Score: ${this.score}`)
    this.livesText.setText(`Lives: ${this.lives}`)
    this.streakText.setText(`Streak: ${this.scoreManager.getCurrentStreak()}`)
  }

  private gameOver() {
    this.isPaused = true

    this.scoreManager.addScore(this.score)

    this.time.delayedCall(1000, () => {
      this.scene.start('GameOverScene', {
        score: this.score,
        questionCount: this.questionCount,
        fadeIn: true,
        duration: 500
      })
    })
  }
}

interface Obstacle3D {
  sprite: Phaser.GameObjects.Container
  lane: number
  z: number
  answerText: string
  isCorrect: boolean
}

export class GameOverScene extends BaseScene {
  private finalScore = 0
  private questionsAnswered = 0
  private bestStreak = 0
  private accuracy = 0
  private apiClient: ApiClient

  constructor() {
    super('GameOverScene')
    this.apiClient = ApiClient.getInstance()
  }

  init(data: any) {
    this.finalScore = data.score || 0
    this.questionsAnswered = data.questionCount || 0
    this.bestStreak = data.bestStreak || 0
    this.accuracy = data.accuracy || 0
  }

  preload() {
    this.preloadSharedAssets()
  }

  async create() {
    this.fadeIn(500)

    this.setupEventListeners()

    await this.submitScore()

    const { width, height } = this.cameras.main

    const graphics = this.add.graphics()
    graphics.fillGradientStyle(0x2c3e50, 0x2c3e50, 0x34495e, 0x34495e, 1)
    graphics.fillRect(0, 0, width, height)

    const gameOverText = this.add.text(width / 2, height * 0.15, 'KẾT THÚC', {
      fontSize: '64px',
      color: '#DC2626',
      fontStyle: 'bold',
      fontFamily: 'Arial, sans-serif',
      stroke: '#ffffff',
      strokeThickness: 4
    })
    gameOverText.setOrigin(0.5)

    const scoreLabel = this.add.text(
      width / 2,
      height * 0.35,
      'ĐIỂM SỐ CỦA BẠN',
      {
        fontSize: '24px',
        color: '#FCD34D',
        fontFamily: 'Arial, sans-serif'
      }
    )
    scoreLabel.setOrigin(0.5)

    const scoreText = this.add.text(
      width / 2,
      height * 0.42,
      this.finalScore.toString(),
      {
        fontSize: '72px',
        color: '#ffffff',
        fontStyle: 'bold',
        fontFamily: 'Arial, sans-serif',
        stroke: '#FCD34D',
        strokeThickness: 3
      }
    )
    scoreText.setOrigin(0.5)

    const questionsText = this.add.text(
      width / 2,
      height * 0.52,
      `Câu hỏi đã trả lời: ${this.questionsAnswered}`,
      {
        fontSize: '20px',
        color: '#ffffff',
        fontFamily: 'Arial, sans-serif'
      }
    )
    questionsText.setOrigin(0.5)

    const performanceMsg = this.getPerformanceMessage()
    const performanceText = this.add.text(
      width / 2,
      height * 0.58,
      performanceMsg,
      {
        fontSize: '18px',
        color: '#10B981',
        fontFamily: 'Arial, sans-serif',
        align: 'center'
      }
    )
    performanceText.setOrigin(0.5)

    this.createButton(width / 2, height * 0.7, 'CHƠI LẠI', () => {
      this.transitionToScene('GamePlayScene')
    })

    this.createButton(width / 2, height * 0.8, 'MENU CHÍNH', () => {
      this.transitionToScene('MainMenuScene')
    })

    this.animateScore(scoreText)

    this.checkHighScore()

    const highScore = this.getGameState('highScore') || 0
    if (this.finalScore >= highScore) {
      this.createNewHighScoreEffect(width / 2, height * 0.28)
    }

    const highScoreText = this.add.text(
      width / 2,
      height * 0.9,
      `Điểm cao nhất: ${highScore}`,
      {
        fontSize: '16px',
        color: '#ffffff',
        fontFamily: 'Arial, sans-serif'
      }
    )
    highScoreText.setOrigin(0.5)

    this.displaySessionScores()
  }

  private async submitScore(): Promise<void> {
    try {
      const difficultyLevel = this.getDifficultyLevel()

      await this.apiClient.submitScore({
        score: this.finalScore,
        questionsAnswered: this.questionsAnswered,
        accuracy: this.accuracy,
        bestStreak: this.bestStreak,
        difficultyReached: difficultyLevel
      })
    } catch (error) {
      console.error('Failed to submit score:', error)
    }
  }

  private getDifficultyLevel(): 'easy' | 'medium' | 'hard' | 'expert' {
    if (this.questionsAnswered >= 50) return 'expert'
    if (this.questionsAnswered >= 25) return 'hard'
    if (this.questionsAnswered >= 10) return 'medium'
    return 'easy'
  }

  private async displaySessionScores(): Promise<void> {
    try {
      const scores = await this.apiClient.getSessionScores(5)

      if (scores.length > 0) {
        const { width } = this.cameras.main

        const scoresTitle = this.add.text(
          width - 150,
          120,
          'TOP SESSION',
          {
            fontSize: '18px',
            color: '#FCD34D',
            fontFamily: 'Arial, sans-serif',
            fontStyle: 'bold'
          }
        )
        scoresTitle.setOrigin(0.5)

        scores.forEach((score, index) => {
          const isCurrentScore = score.score === this.finalScore &&
                                score.questionsAnswered === this.questionsAnswered

          const scoreText = this.add.text(
            width - 150,
            160 + index * 30,
            `${index + 1}. ${score.score}`,
            {
              fontSize: '16px',
              color: isCurrentScore ? '#10B981' : '#ffffff',
              fontFamily: 'Arial, sans-serif',
              fontStyle: isCurrentScore ? 'bold' : 'normal'
            }
          )
          scoreText.setOrigin(0.5)

          if (isCurrentScore) {
            this.tweens.add({
              targets: scoreText,
              scale: 1.1,
              duration: 500,
              ease: 'Sine.inOut',
              yoyo: true,
              repeat: 2
            })
          }
        })

        if (this.apiClient.isBackendAvailable()) {
          const statusText = this.add.text(
            width - 150,
            340,
            '🟢 Online',
            {
              fontSize: '12px',
              color: '#10B981',
              fontFamily: 'Arial, sans-serif'
            }
          )
          statusText.setOrigin(0.5)
        }
      }
    } catch (error) {
      console.error('Failed to load session scores:', error)
    }
  }

  private getPerformanceMessage(): string {
    if (this.finalScore >= 1000) {
      return 'Xuất sắc! Bạn là chuyên gia lịch sử!'
    } else if (this.finalScore >= 500) {
      return 'Tuyệt vời! Kiến thức của bạn rất tốt!'
    } else if (this.finalScore >= 200) {
      return 'Tốt! Hãy tiếp tục cố gắng!'
    } else if (this.finalScore >= 100) {
      return 'Khá tốt! Còn nhiều điều để học!'
    } else {
      return 'Hãy thử lại! Bạn sẽ làm tốt hơn!'
    }
  }

  private animateScore(scoreText: Phaser.GameObjects.Text): void {
    const startScore = 0
    const endScore = this.finalScore
    const duration = 2000

    this.tweens.addCounter({
      from: startScore,
      to: endScore,
      duration: duration,
      ease: 'Power2',
      onUpdate: tween => {
        const value = tween.getValue()
        if (value !== null) {
          scoreText.setText(Math.floor(value).toString())
        }
      }
    })

    this.tweens.add({
      targets: scoreText,
      scale: 1.2,
      duration: 300,
      ease: 'Power2',
      yoyo: true,
      delay: duration
    })
  }

  private checkHighScore(): void {
    const currentHighScore = this.getGameState('highScore') || 0

    if (this.finalScore > currentHighScore) {
      this.setGameState('highScore', this.finalScore)
    }
  }

  private createNewHighScoreEffect(x: number, y: number): void {
    const newHighScore = this.add.text(x, y, 'ĐIỂM CAO MỚI!', {
      fontSize: '24px',
      color: '#FFD700',
      fontStyle: 'bold',
      fontFamily: 'Arial, sans-serif',
      stroke: '#FF6347',
      strokeThickness: 2
    })
    newHighScore.setOrigin(0.5)

    this.tweens.add({
      targets: newHighScore,
      scale: 1.1,
      duration: 500,
      ease: 'Sine.inOut',
      yoyo: true,
      repeat: -1
    })

    this.createSparkles(x, y)
  }

  private createSparkles(x: number, y: number): void {
    if (!this.textures.exists('sparkle')) {
      const graphics = this.make.graphics({ x: 0, y: 0 }, false)
      graphics.fillStyle(0xffd700)
      graphics.beginPath()
      graphics.moveTo(8, 2)
      graphics.lineTo(10, 6)
      graphics.lineTo(14, 6)
      graphics.lineTo(10, 9)
      graphics.lineTo(12, 14)
      graphics.lineTo(8, 11)
      graphics.lineTo(4, 14)
      graphics.lineTo(6, 9)
      graphics.lineTo(2, 6)
      graphics.lineTo(6, 6)
      graphics.closePath()
      graphics.fillPath()
      graphics.generateTexture('sparkle', 16, 16)
      graphics.destroy()
    }

    const particles = this.add.particles(x, y, 'sparkle', {
      speed: { min: 50, max: 150 },
      scale: { start: 0.5, end: 0 },
      lifespan: 1000,
      quantity: 2,
      frequency: 200,
      alpha: { start: 1, end: 0 },
      rotate: { start: 0, end: 360 },
      blendMode: 'ADD'
    })

    this.time.delayedCall(3000, () => {
      particles.stop()
    })
  }

  update() {
  }

  shutdown() {
    this.cleanup()
  }
}

