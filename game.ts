import Phaser from 'phaser'
import { Question, DifficultyLevel, QuestionOptions } from './types/Question'

interface AudioConfig {
  masterVolume: number
  musicVolume: number
  sfxVolume: number
  muted: boolean
}

export class AudioManager {
  private static instance: AudioManager
  private scene!: Phaser.Scene
  private sounds: Map<string, Phaser.Sound.BaseSound> = new Map()
  private backgroundMusic?: Phaser.Sound.BaseSound
  private config: AudioConfig
  private isMuted: boolean = false

  private constructor() {
    this.config = this.loadConfig()
  }

  public static getInstance(): AudioManager {
    if (!AudioManager.instance) {
      AudioManager.instance = new AudioManager()
    }
    return AudioManager.instance
  }

  public initialize(scene: Phaser.Scene): void {
    this.scene = scene
    this.preloadSounds()
  }

  private preloadSounds(): void {
    try {
      if (!this.scene.cache.audio.exists('bgMusic')) {
        this.scene.load.audio('bgMusic', ['./We Are Here.mp3', '/We Are Here.mp3', 'We Are Here.mp3'])
      }
    } catch (error) {
      console.warn('Could not load background music:', error)
    }

    this.generateSoundEffects()

    if (this.scene.load.list.size > 0) {
      this.scene.load.start()
    }
  }

  private generateSoundEffects(): void {
  }

  public createSounds(): void {
    this.createSynthSound('move', 200, 0.1, 'sine')
    this.createSynthSound('correct', 523, 0.3, 'square')
    this.createSynthSound('incorrect', 130, 0.3, 'sawtooth')
    this.createSynthSound('powerup', 880, 0.2, 'triangle')
    this.createSynthSound('damage', 100, 0.3, 'square')
    this.createSynthSound('gameOver', 65, 0.5, 'sawtooth')
    this.createSynthSound('achievement', 659, 0.3, 'sine')
    this.createSynthSound('countdown', 440, 0.1, 'square')
    this.createSynthSound('spawn', 330, 0.15, 'sine')
  }

  private createSynthSound(
    key: string,
    frequency: number,
    duration: number,
    waveform: OscillatorType
  ): void {
    const soundManager = this.scene.sound as any
    if (!soundManager.context) return

    const audioContext = soundManager.context as AudioContext
    const volume = this.scene.sound.volume

    const soundGenerator = () => {
      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()

      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)

      oscillator.frequency.value = frequency
      oscillator.type = waveform

      const now = audioContext.currentTime
      gainNode.gain.setValueAtTime(0, now)
      gainNode.gain.linearRampToValueAtTime(volume * this.config.sfxVolume, now + 0.01)
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration)

      oscillator.start(now)
      oscillator.stop(now + duration)
    }

    this.sounds.set(key, { play: soundGenerator } as any)
  }

  public playBackgroundMusic(): void {
    if (this.backgroundMusic && this.backgroundMusic.isPlaying) {
      return
    }

    if (this.scene.cache.audio.exists('bgMusic')) {
      this.backgroundMusic = this.scene.sound.add('bgMusic', {
        volume: this.config.musicVolume,
        loop: true
      })

      if (!this.isMuted) {
        this.backgroundMusic.play()
      }
    }
  }

  public stopBackgroundMusic(): void {
    if (this.backgroundMusic && this.backgroundMusic.isPlaying) {
      this.backgroundMusic.stop()
    }
  }

  public pauseBackgroundMusic(): void {
    if (this.backgroundMusic && this.backgroundMusic.isPlaying) {
      this.backgroundMusic.pause()
    }
  }

  public resumeBackgroundMusic(): void {
    if (this.backgroundMusic && !this.backgroundMusic.isPlaying && !this.isMuted) {
      this.backgroundMusic.resume()
    }
  }

  public playSFX(key: string, config?: Phaser.Types.Sound.SoundConfig): void {
    if (this.isMuted) return

    const sound = this.sounds.get(key)
    if (sound && typeof (sound as any).play === 'function') {
      (sound as any).play()
    } else {
      if (this.scene.cache.audio.exists(key)) {
        this.scene.sound.play(key, {
          volume: this.config.sfxVolume,
          ...config
        })
      }
    }
  }

  public playCorrectSound(): void {
    this.playSFX('correct')
    setTimeout(() => this.createSynthSound('correct2', 659, 0.2, 'square'), 100)
    setTimeout(() => this.createSynthSound('correct3', 784, 0.2, 'square'), 200)
  }

  public playIncorrectSound(): void {
    this.playSFX('incorrect')
  }

  public playMoveSound(): void {
    this.playSFX('move')
  }

  public playPowerupSound(): void {
    this.playSFX('powerup')
  }

  public playDamageSound(): void {
    this.playSFX('damage')
  }

  public playGameOverSound(): void {
    this.playSFX('gameOver')
    setTimeout(() => this.createSynthSound('gameOver2', 55, 0.4, 'sawtooth'), 200)
    setTimeout(() => this.createSynthSound('gameOver3', 44, 0.4, 'sawtooth'), 400)
  }

  public playAchievementSound(): void {
    this.playSFX('achievement')
    setTimeout(() => this.createSynthSound('achievement2', 784, 0.2, 'sine'), 100)
    setTimeout(() => this.createSynthSound('achievement3', 880, 0.3, 'sine'), 200)
  }

  public playCountdownSound(): void {
    this.playSFX('countdown')
  }

  public playSpawnSound(): void {
    this.playSFX('spawn')
  }

  public setMasterVolume(volume: number): void {
    this.config.masterVolume = Phaser.Math.Clamp(volume, 0, 1)
    this.scene.sound.volume = this.config.masterVolume
    this.saveConfig()
  }

  public setMusicVolume(volume: number): void {
    this.config.musicVolume = Phaser.Math.Clamp(volume, 0, 1)
    if (this.backgroundMusic) {
      (this.backgroundMusic as any).setVolume(this.config.musicVolume)
    }
    this.saveConfig()
  }

  public setSFXVolume(volume: number): void {
    this.config.sfxVolume = Phaser.Math.Clamp(volume, 0, 1)
    this.saveConfig()
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted
    this.config.muted = this.isMuted

    if (this.isMuted) {
      this.scene.sound.mute = true
      this.stopBackgroundMusic()
    } else {
      this.scene.sound.mute = false
      this.playBackgroundMusic()
    }

    this.saveConfig()
    return this.isMuted
  }

  public getMuteStatus(): boolean {
    return this.isMuted
  }

  private loadConfig(): AudioConfig {
    const saved = localStorage.getItem('knowledgeRunner_audioConfig')
    if (saved) {
      const config = JSON.parse(saved)
      this.isMuted = config.muted || false
      return config
    }

    return {
      masterVolume: 0.7,
      musicVolume: 0.5,
      sfxVolume: 0.6,
      muted: false
    }
  }

  private saveConfig(): void {
    localStorage.setItem('knowledgeRunner_audioConfig', JSON.stringify(this.config))
  }

  public getConfig(): AudioConfig {
    return { ...this.config }
  }

  public destroy(): void {
    this.stopBackgroundMusic()
    this.sounds.clear()
  }
}

export class Character extends Phaser.GameObjects.Sprite {
  private currentLane: number = 1
  private isMoving: boolean = false
  private moveSpeed: number = 300

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'runner')

    scene.add.existing(this)

    this.setScale(1.5)
    this.setOrigin(0.5, 0.5)

    this.createAnimations()
    this.play('run')
  }

  private createAnimations(): void {
    if (!this.scene.anims.exists('run')) {
      this.scene.anims.create({
        key: 'run',
        frames: this.scene.anims.generateFrameNumbers('runner', {
          start: 0,
          end: 7
        }),
        frameRate: 10,
        repeat: -1
      })
    }
  }

  public getCurrentLane(): number {
    return this.currentLane
  }

  public setCurrentLane(lane: number): void {
    this.currentLane = Phaser.Math.Clamp(lane, 0, 3)
  }

  public getIsMoving(): boolean {
    return this.isMoving
  }

  public moveToLane(targetLane: number, lanePositions: number[]): void {
    if (this.isMoving) return

    targetLane = Phaser.Math.Clamp(targetLane, 0, 3)
    if (targetLane === this.currentLane) return

    this.isMoving = true
    const targetX = lanePositions[targetLane]

    const rotationDirection = targetLane > this.currentLane ? 0.1 : -0.1

    this.scene.tweens.add({
      targets: this,
      x: targetX,
      rotation: rotationDirection,
      duration: this.moveSpeed,
      ease: 'Power2',
      onComplete: () => {
        this.rotation = 0
        this.isMoving = false
        this.currentLane = targetLane
        this.emitMoveComplete()
      }
    })
  }

  public canMoveLeft(): boolean {
    return this.currentLane > 0 && !this.isMoving
  }

  public canMoveRight(): boolean {
    return this.currentLane < 3 && !this.isMoving
  }

  private emitMoveComplete(): void {
    this.scene.events.emit('characterMoved', this.currentLane)
  }

  public update(): void {
  }

  public destroy(): void {
    if (this.scene) {
      this.scene.tweens.killTweensOf(this)
    }
    super.destroy()
  }
}

export function createRunnerSpriteSheet(scene: Phaser.Scene): void {
  if (scene.textures.exists('runner')) return

  const graphics = scene.make.graphics({ x: 0, y: 0 }, false)
  const frameWidth = 32
  const frameHeight = 48
  const frames = 8

  const rt = scene.add.renderTexture(0, 0, frameWidth * frames, frameHeight)
  rt.setVisible(false)

  for (let i = 0; i < frames; i++) {
    graphics.clear()

    const x = i * frameWidth + frameWidth / 2
    const y = frameHeight / 2

    graphics.fillStyle(0xdc2626)
    graphics.fillRect(x - 8, y - 10, 16, 20)

    graphics.fillStyle(0xffd4a3)
    graphics.fillCircle(x, y - 15, 6)

    graphics.fillStyle(0x333333)
    if (i % 2 === 0) {
      graphics.fillRect(x - 6, y + 10, 4, 8 + (i % 4))
      graphics.fillRect(x + 2, y + 10, 4, 8 - (i % 4))
    } else {
      graphics.fillRect(x - 6, y + 10, 4, 8 - (i % 4))
      graphics.fillRect(x + 2, y + 10, 4, 8 + (i % 4))
    }

    graphics.fillStyle(0xffd4a3)
    const armOffset = Math.sin(i * Math.PI / 4) * 3
    graphics.fillRect(x - 10, y - 5 + armOffset, 3, 10)
    graphics.fillRect(x + 7, y - 5 - armOffset, 3, 10)

    rt.draw(graphics, i * frameWidth, 0)
  }

  rt.saveTexture('runner')
  rt.destroy()
  graphics.destroy()
}

export class LaneManager {
  private lanePositions: number[] = []
  private laneWidth: number
  private numLanes: number = 4
  private screenWidth: number
  private laneLabels: string[] = ['A', 'B', 'C', 'D']

  constructor(scene: Phaser.Scene) {
    this.screenWidth = scene.cameras.main.width
    this.laneWidth = this.screenWidth / this.numLanes

    for (let i = 0; i < this.numLanes; i++) {
      this.lanePositions.push(i * this.laneWidth + this.laneWidth / 2)
    }
  }

  public getLanePositions(): number[] {
    return this.lanePositions
  }

  public getLanePosition(laneIndex: number): number {
    return this.lanePositions[Phaser.Math.Clamp(laneIndex, 0, this.numLanes - 1)]
  }

  public getLaneWidth(): number {
    return this.laneWidth
  }

  public getNumLanes(): number {
    return this.numLanes
  }

  public getLaneFromX(x: number): number {
    const lane = Math.floor(x / this.laneWidth)
    return Phaser.Math.Clamp(lane, 0, this.numLanes - 1)
  }

  public getLaneLabel(laneIndex: number): string {
    return this.laneLabels[Phaser.Math.Clamp(laneIndex, 0, this.numLanes - 1)]
  }

  public isValidLane(laneIndex: number): boolean {
    return laneIndex >= 0 && laneIndex < this.numLanes
  }

  public canMoveLeft(currentLane: number): boolean {
    return currentLane > 0
  }

  public canMoveRight(currentLane: number): boolean {
    return currentLane < this.numLanes - 1
  }

  public drawLanes(scene: Phaser.Scene, y: number, height: number): void {
    const graphics = scene.add.graphics()

    graphics.lineStyle(2, 0xffffff, 0.3)
    for (let i = 1; i < this.numLanes; i++) {
      const x = i * this.laneWidth
      graphics.beginPath()
      graphics.moveTo(x, y)
      graphics.lineTo(x, y + height)
      graphics.strokePath()
    }

    graphics.lineStyle(1, 0xffffff, 0.2)
    for (let i = 0; i < this.numLanes; i++) {
      const centerX = this.getLanePosition(i)

      for (let y = 0; y < height; y += 20) {
        graphics.beginPath()
        graphics.moveTo(centerX, y)
        graphics.lineTo(centerX, Math.min(y + 10, height))
        graphics.strokePath()
      }
    }

    for (let i = 0; i < this.numLanes; i++) {
      const x = this.getLanePosition(i)
      const label = scene.add.text(x, scene.cameras.main.height - 50, this.laneLabels[i], {
        fontSize: '32px',
        color: '#ffffff',
        fontFamily: 'Arial, sans-serif',
        stroke: '#000000',
        strokeThickness: 3
      })
      label.setOrigin(0.5)
      label.setAlpha(0.8)

      scene.tweens.add({
        targets: label,
        alpha: 1,
        duration: 1000,
        ease: 'Sine.inOut',
        yoyo: true,
        repeat: -1
      })
    }
  }

  public createLaneIndicator(scene: Phaser.Scene, currentLane: number): Phaser.GameObjects.Graphics {
    const graphics = scene.add.graphics()
    this.updateLaneIndicator(graphics, currentLane)
    return graphics
  }

  public updateLaneIndicator(graphics: Phaser.GameObjects.Graphics, currentLane: number): void {
    graphics.clear()

    const x = this.getLanePosition(currentLane)
    const y = graphics.scene.cameras.main.height - 80

    graphics.fillStyle(0xfcd34d, 0.3)
    graphics.fillCircle(x, y, 15)

    graphics.fillStyle(0xfcd34d, 0.5)
    graphics.fillCircle(x, y, 10)

    graphics.fillStyle(0xfcd34d, 1)
    graphics.fillCircle(x, y, 5)
  }

  public getNearestLane(x: number): number {
    let nearestLane = 0
    let minDistance = Math.abs(x - this.lanePositions[0])

    for (let i = 1; i < this.numLanes; i++) {
      const distance = Math.abs(x - this.lanePositions[i])
      if (distance < minDistance) {
        minDistance = distance
        nearestLane = i
      }
    }

    return nearestLane
  }
}

interface LivesConfig {
  maxLives: number
  startingLives: number
  invincibilityDuration: number
  recoveryThreshold: number
  maxRecoveries: number
  shieldDuration: number
}

export class LivesManager extends Phaser.Events.EventEmitter {
  private currentLives: number
  private maxLives: number
  private config: LivesConfig
  private invincible: boolean = false
  private invincibilityTimer?: Phaser.Time.TimerEvent
  private correctAnswersSinceLastDamage: number = 0
  private totalRecoveries: number = 0
  private hasShield: boolean = false
  private shieldTimer?: Phaser.Time.TimerEvent
  private scene: Phaser.Scene

  constructor(scene: Phaser.Scene, config?: Partial<LivesConfig>) {
    super()
    this.scene = scene
    this.config = {
      maxLives: 5,
      startingLives: 3,
      invincibilityDuration: 2000,
      recoveryThreshold: 10,
      maxRecoveries: 2,
      shieldDuration: 10000,
      ...config
    }

    this.maxLives = this.config.maxLives
    this.currentLives = this.config.startingLives
  }

  public takeDamage(amount: number = 1): boolean {
    if (this.invincible) {
      this.emit('damageBlocked', { reason: 'invincible' })
      return false
    }

    if (this.hasShield) {
      this.removeShield()
      this.emit('damageBlocked', { reason: 'shield' })
      return false
    }

    const previousLives = this.currentLives
    this.currentLives = Math.max(0, this.currentLives - amount)

    this.correctAnswersSinceLastDamage = 0

    this.emit('damage', {
      previousLives,
      currentLives: this.currentLives,
      amount,
      isDead: this.currentLives <= 0
    })

    if (this.currentLives > 0) {
      this.startInvincibility()
    }

    return true
  }

  private startInvincibility(): void {
    if (this.invincible) return

    this.invincible = true
    this.emit('invincibilityStart', { duration: this.config.invincibilityDuration })

    if (this.invincibilityTimer) {
      this.invincibilityTimer.destroy()
    }

    this.invincibilityTimer = this.scene.time.delayedCall(
      this.config.invincibilityDuration,
      () => {
        this.invincible = false
        this.emit('invincibilityEnd')
      }
    )
  }

  public heal(amount: number = 1): boolean {
    if (this.currentLives >= this.maxLives) {
      return false
    }

    const previousLives = this.currentLives
    this.currentLives = Math.min(this.maxLives, this.currentLives + amount)

    this.emit('heal', {
      previousLives,
      currentLives: this.currentLives,
      amount: this.currentLives - previousLives
    })

    return true
  }

  public addCorrectAnswer(): void {
    this.correctAnswersSinceLastDamage++

    if (
      this.correctAnswersSinceLastDamage >= this.config.recoveryThreshold &&
      this.totalRecoveries < this.config.maxRecoveries &&
      this.currentLives < this.maxLives
    ) {
      this.recoverLife()
    }
  }

  private recoverLife(): void {
    this.heal(1)
    this.totalRecoveries++
    this.correctAnswersSinceLastDamage = 0

    this.emit('lifeRecovered', {
      totalRecoveries: this.totalRecoveries,
      remainingRecoveries: this.config.maxRecoveries - this.totalRecoveries
    })
  }

  public activateShield(): void {
    if (this.hasShield) {
      if (this.shieldTimer) {
        this.shieldTimer.destroy()
      }
    } else {
      this.hasShield = true
      this.emit('shieldActivated', { duration: this.config.shieldDuration })
    }

    this.shieldTimer = this.scene.time.delayedCall(this.config.shieldDuration, () => {
      this.removeShield()
    })
  }

  private removeShield(): void {
    this.hasShield = false
    if (this.shieldTimer) {
      this.shieldTimer.destroy()
      this.shieldTimer = undefined
    }
    this.emit('shieldRemoved')
  }

  public addExtraLife(): boolean {
    if (this.currentLives >= this.maxLives) {
      this.maxLives++
      this.currentLives++
      this.emit('maxLivesIncreased', { newMax: this.maxLives })
      return true
    }

    return this.heal(1)
  }

  public getLives(): number {
    return this.currentLives
  }

  public getMaxLives(): number {
    return this.maxLives
  }

  public isInvincible(): boolean {
    return this.invincible
  }

  public hasShieldActive(): boolean {
    return this.hasShield
  }

  public isDead(): boolean {
    return this.currentLives <= 0
  }

  public getRecoveryProgress(): number {
    return (this.correctAnswersSinceLastDamage / this.config.recoveryThreshold) * 100
  }

  public getRemainingRecoveries(): number {
    return this.config.maxRecoveries - this.totalRecoveries
  }

  public createHeartDisplay(x: number, y: number): Phaser.GameObjects.Container {
    const container = this.scene.add.container(x, y)
    const hearts: Phaser.GameObjects.Text[] = []

    for (let i = 0; i < this.maxLives; i++) {
      const heart = this.scene.add.text(i * 30, 0, '❤️', {
        fontSize: '24px',
        color: '#ffffff'
      })

      if (i >= this.currentLives) {
        heart.setAlpha(0.3)
      }

      hearts.push(heart)
      container.add(heart)
    }

    this.on('damage', () => this.updateHeartDisplay(hearts))
    this.on('heal', () => this.updateHeartDisplay(hearts))
    this.on('maxLivesIncreased', () => {
      const newHeart = this.scene.add.text(hearts.length * 30, 0, '❤️', {
        fontSize: '24px',
        color: '#ffffff'
      })
      hearts.push(newHeart)
      container.add(newHeart)
      this.updateHeartDisplay(hearts)
    })

    return container
  }

  private updateHeartDisplay(hearts: Phaser.GameObjects.Text[]): void {
    hearts.forEach((heart, index) => {
      if (index < this.currentLives) {
        heart.setAlpha(1)
        heart.setScale(1)

        if (index === this.currentLives - 1) {
          this.scene.tweens.add({
            targets: heart,
            scale: 1.2,
            duration: 200,
            yoyo: true,
            repeat: 2
          })
        }
      } else {
        heart.setAlpha(0.3)
        heart.setScale(1)
      }
    })
  }

  public createRecoveryBar(x: number, y: number): Phaser.GameObjects.Container {
    const container = this.scene.add.container(x, y)

    const bgBar = this.scene.add.rectangle(0, 0, 100, 10, 0x333333, 0.8)
    bgBar.setOrigin(0, 0.5)

    const progressBar = this.scene.add.rectangle(0, 0, 0, 10, 0x10b981, 1)
    progressBar.setOrigin(0, 0.5)

    const text = this.scene.add.text(-10, 0, 'Recovery:', {
      fontSize: '12px',
      color: '#ffffff'
    })
    text.setOrigin(1, 0.5)

    container.add([bgBar, progressBar, text])

    this.on('damage', () => {
      progressBar.width = 0
    })

    const updateProgress = () => {
      const progress = this.getRecoveryProgress()
      progressBar.width = (progress / 100) * 100

      if (progress >= 100) {
        this.scene.tweens.add({
          targets: progressBar,
          alpha: 0.5,
          duration: 200,
          yoyo: true,
          repeat: 2
        })
      }
    }

    this.on('correctAnswer', updateProgress)
    this.on('lifeRecovered', () => {
      progressBar.width = 0
    })

    if (this.getRemainingRecoveries() <= 0) {
      container.setVisible(false)
    }

    this.on('lifeRecovered', () => {
      if (this.getRemainingRecoveries() <= 0) {
        container.setVisible(false)
      }
    })

    return container
  }

  public createShieldDisplay(x: number, y: number): Phaser.GameObjects.Container {
    const container = this.scene.add.container(x, y)

    const shield = this.scene.add.text(0, 0, '🛡️', {
      fontSize: '24px'
    })
    shield.setVisible(false)

    container.add(shield)

    this.on('shieldActivated', () => {
      shield.setVisible(true)
      shield.setScale(0.5)

      this.scene.tweens.add({
        targets: shield,
        scale: 1,
        duration: 300,
        ease: 'Back.out'
      })

      this.scene.tweens.add({
        targets: shield,
        alpha: 0.7,
        duration: 1000,
        yoyo: true,
        repeat: -1
      })
    })

    this.on('shieldRemoved', () => {
      this.scene.tweens.add({
        targets: shield,
        scale: 0,
        alpha: 0,
        duration: 300,
        onComplete: () => {
          shield.setVisible(false)
          shield.setAlpha(1)
        }
      })
    })

    this.on('damageBlocked', (data: any) => {
      if (data.reason === 'shield') {
        this.scene.tweens.add({
          targets: shield,
          scale: 1.3,
          duration: 100,
          yoyo: true
        })
      }
    })

    return container
  }

  public reset(): void {
    this.currentLives = this.config.startingLives
    this.invincible = false
    this.correctAnswersSinceLastDamage = 0
    this.totalRecoveries = 0
    this.hasShield = false

    if (this.invincibilityTimer) {
      this.invincibilityTimer.destroy()
      this.invincibilityTimer = undefined
    }

    if (this.shieldTimer) {
      this.shieldTimer.destroy()
      this.shieldTimer = undefined
    }

    this.removeAllListeners()
  }

  public destroy(): void {
    this.reset()
    this.removeAllListeners()
  }
}

export class QuestionObstacle extends Phaser.GameObjects.Container {
  private background!: Phaser.GameObjects.Rectangle
  private questionText!: Phaser.GameObjects.Text
  private questionData?: Question
  private isActive: boolean = false
  private hasBeenAnswered: boolean = false
  private speed: number = 200

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y)

    scene.add.existing(this)
    this.createComponents()
    this.setVisible(false)
    this.setActive(false)
  }

  private createComponents(): void {
    this.background = this.scene.add.rectangle(0, 0, 600, 120, 0x000000, 0.8)
    this.background.setStrokeStyle(3, 0xfcd34d, 1)

    this.questionText = this.scene.add.text(0, 0, '', {
      fontSize: '20px',
      color: '#ffffff',
      fontFamily: 'Arial, sans-serif',
      align: 'center',
      wordWrap: { width: 550 }
    })
    this.questionText.setOrigin(0.5)

    this.add([this.background, this.questionText])

    this.createRoundedCorners()
  }

  private createRoundedCorners(): void {
    const graphics = this.scene.add.graphics()

    graphics.fillStyle(0xffffff)
    graphics.fillRoundedRect(-300, -60, 600, 120, 15)

    const mask = graphics.createGeometryMask()
    this.background.setMask(mask)

    graphics.setVisible(false)
    this.add(graphics)
  }

  public setQuestion(question: Question): void {
    this.questionData = question
    this.questionText.setText(question.question)
    this.hasBeenAnswered = false
  }

  public getQuestion(): Question | undefined {
    return this.questionData
  }

  public activate(question: Question, speed: number = 200): void {
    this.setQuestion(question)
    this.speed = speed
    this.isActive = true
    this.hasBeenAnswered = false
    this.setVisible(true)
    this.setActive(true)

    this.setAlpha(0)
    this.scene.tweens.add({
      targets: this,
      alpha: 1,
      duration: 300,
      ease: 'Power2'
    })

    this.scene.tweens.add({
      targets: this,
      x: this.x + Phaser.Math.Between(-10, 10),
      duration: 2000,
      ease: 'Sine.inOut',
      yoyo: true,
      repeat: -1
    })
  }

  public deactivate(): void {
    this.isActive = false

    this.scene.tweens.add({
      targets: this,
      alpha: 0,
      duration: 200,
      onComplete: () => {
        this.setVisible(false)
        this.setActive(false)
        this.questionData = undefined
        this.setPosition(this.scene.cameras.main.centerX, -100)
      }
    })

    this.scene.tweens.killTweensOf(this)
  }

  public markAsAnswered(): void {
    this.hasBeenAnswered = true
  }

  public hasAnswered(): boolean {
    return this.hasBeenAnswered
  }

  public getIsActive(): boolean {
    return this.isActive
  }

  public updatePosition(delta: number): void {
    if (!this.isActive) return

    this.y += (this.speed * delta) / 1000

    if (this.y > this.scene.cameras.main.height + 100) {
      this.deactivate()
    }
  }

  public flash(color: number = 0xffffff): void {
    const originalTint = this.background.fillColor

    this.background.setFillStyle(color, 0.8)

    this.scene.time.delayedCall(100, () => {
      this.background.setFillStyle(originalTint, 0.8)
    })
  }

  public showCorrectFeedback(): void {
    this.flash(0x10b981)

    this.scene.tweens.add({
      targets: this,
      scale: 1.1,
      duration: 200,
      ease: 'Back.out',
      yoyo: true
    })
  }

  public showIncorrectFeedback(): void {
    this.flash(0xef4444)

    const originalX = this.x
    this.scene.tweens.add({
      targets: this,
      x: originalX + Phaser.Math.Between(-5, 5),
      duration: 50,
      ease: 'Linear',
      repeat: 3,
      onComplete: () => {
        this.x = originalX
      }
    })
  }
}

export class AnswerMarker extends Phaser.GameObjects.Container {
  private background!: Phaser.GameObjects.Rectangle
  private letterText!: Phaser.GameObjects.Text
  private glowEffect?: Phaser.GameObjects.Graphics
  private letter: string
  private laneIndex: number

  constructor(scene: Phaser.Scene, x: number, y: number, letter: string, laneIndex: number) {
    super(scene, x, y)

    this.letter = letter
    this.laneIndex = laneIndex

    scene.add.existing(this)
    this.createComponents()
    this.setVisible(false)
  }

  private createComponents(): void {
    this.background = this.scene.add.rectangle(0, 0, 60, 60, 0x333333, 0.8)

    this.letterText = this.scene.add.text(0, 0, this.letter, {
      fontSize: '32px',
      color: '#ffffff',
      fontFamily: 'Arial, sans-serif',
      fontStyle: 'bold'
    })
    this.letterText.setOrigin(0.5)

    this.add([this.background, this.letterText])
  }

  public show(): void {
    this.setVisible(true)
    this.setAlpha(0)

    this.scene.tweens.add({
      targets: this,
      alpha: 1,
      scale: { from: 0.5, to: 1 },
      duration: 300,
      ease: 'Back.out'
    })

    this.scene.tweens.add({
      targets: this,
      scale: 1.1,
      duration: 1000,
      ease: 'Sine.inOut',
      yoyo: true,
      repeat: -1
    })
  }

  public hide(): void {
    this.scene.tweens.add({
      targets: this,
      alpha: 0,
      scale: 0.5,
      duration: 200,
      onComplete: () => {
        this.setVisible(false)
        this.removeHighlight()
      }
    })
  }

  public highlightCorrect(): void {
    this.background.setFillStyle(0x10b981, 1)
    this.addGlow(0x10b981)
  }

  public highlightIncorrect(): void {
    this.background.setFillStyle(0xef4444, 1)
    this.addGlow(0xef4444)
  }

  public removeHighlight(): void {
    this.background.setFillStyle(0x333333, 0.8)

    if (this.glowEffect) {
      this.glowEffect.destroy()
      this.glowEffect = undefined
    }
  }

  private addGlow(color: number): void {
    if (this.glowEffect) {
      this.glowEffect.destroy()
    }

    this.glowEffect = this.scene.add.graphics()

    for (let i = 3; i > 0; i--) {
      this.glowEffect.fillStyle(color, 0.1 * i)
      this.glowEffect.fillCircle(0, 0, 30 + i * 10)
    }

    this.addAt(this.glowEffect, 0)
  }

  public getLaneIndex(): number {
    return this.laneIndex
  }

  public getLetter(): string {
    return this.letter
  }
}

interface SpawnerConfig {
  initialDelay: number
  minSpawnInterval: number
  maxSpawnInterval: number
  baseSpeed: number
  speedIncrement: number
  maxSpeed: number
  poolSize: number
  answerTime: number
}

export class ObstacleSpawner {
  private scene: Phaser.Scene
  private config: SpawnerConfig
  private obstaclePool: QuestionObstacle[] = []
  private answerMarkers: Map<number, AnswerMarker> = new Map()
  private activeObstacle: QuestionObstacle | null = null
  private questionManager: any
  private spawnTimer?: Phaser.Time.TimerEvent
  private currentSpeed: number
  private gameTime: number = 0
  private questionsSpawned: number = 0
  private isPaused: boolean = false
  private countdownTimer?: Phaser.Time.TimerEvent
  private countdownText?: Phaser.GameObjects.Text

  constructor(scene: Phaser.Scene, questionManager: any, config?: Partial<SpawnerConfig>) {
    this.scene = scene
    this.config = {
      initialDelay: 3000,
      minSpawnInterval: 8000,
      maxSpawnInterval: 12000,
      baseSpeed: 150,
      speedIncrement: 5,
      maxSpeed: 400,
      poolSize: 10,
      answerTime: 10000,
      ...config
    }

    this.currentSpeed = this.config.baseSpeed
    this.questionManager = questionManager

    this.initializePool()
    this.createAnswerMarkers()
    this.createCountdownDisplay()
  }

  private initializePool(): void {
    for (let i = 0; i < this.config.poolSize; i++) {
      const obstacle = new QuestionObstacle(
        this.scene,
        this.scene.cameras.main.centerX,
        -100
      )
      obstacle.setVisible(false)
      obstacle.setActive(false)
      this.obstaclePool.push(obstacle)
    }
  }

  private createAnswerMarkers(): void {
    const laneWidth = this.scene.cameras.main.width / 4
    const laneY = this.scene.cameras.main.height - 100
    const letters = ['A', 'B', 'C', 'D']

    for (let i = 0; i < 4; i++) {
      const x = laneWidth * i + laneWidth / 2
      const marker = new AnswerMarker(this.scene, x, laneY, letters[i], i)
      this.answerMarkers.set(i, marker)
    }
  }

  private createCountdownDisplay(): void {
    this.countdownText = this.scene.add.text(
      this.scene.cameras.main.width - 100,
      50,
      '',
      {
        fontSize: '32px',
        color: '#ffffff',
        backgroundColor: '#000000',
        padding: { x: 10, y: 5 },
        align: 'center'
      }
    )
    this.countdownText.setOrigin(0.5)
    this.countdownText.setVisible(false)
  }

  public start(): void {
    if (this.isPaused) {
      this.resume()
      return
    }

    this.gameTime = 0
    this.questionsSpawned = 0
    this.currentSpeed = this.config.baseSpeed

    this.scheduleNextSpawn(this.config.initialDelay)
  }

  public stop(): void {
    this.pause()
    this.reset()
  }

  public pause(): void {
    this.isPaused = true

    if (this.spawnTimer) {
      this.spawnTimer.remove()
      this.spawnTimer = undefined
    }

    if (this.countdownTimer) {
      this.countdownTimer.remove()
      this.countdownTimer = undefined
    }
  }

  public resume(): void {
    if (!this.isPaused) return

    this.isPaused = false
    this.scheduleNextSpawn(this.config.minSpawnInterval)
  }

  public reset(): void {
    this.obstaclePool.forEach(obstacle => {
      obstacle.deactivate()
      obstacle.setPosition(this.scene.cameras.main.centerX, -100)
    })

    this.answerMarkers.forEach(marker => marker.hide())

    if (this.spawnTimer) {
      this.spawnTimer.remove()
      this.spawnTimer = undefined
    }

    if (this.countdownTimer) {
      this.countdownTimer.remove()
      this.countdownTimer = undefined
    }

    if (this.countdownText) {
      this.countdownText.setVisible(false)
    }

    this.activeObstacle = null
    this.gameTime = 0
    this.questionsSpawned = 0
    this.currentSpeed = this.config.baseSpeed
    this.isPaused = false
  }

  private scheduleNextSpawn(delay: number): void {
    if (this.isPaused) return

    this.spawnTimer = this.scene.time.delayedCall(delay, () => {
      this.spawnObstacle()

      const nextInterval = Phaser.Math.Between(
        this.config.minSpawnInterval,
        this.config.maxSpawnInterval
      )

      this.scheduleNextSpawn(nextInterval)
    })
  }

  private spawnObstacle(): void {
    const obstacle = this.getInactiveObstacle()
    if (!obstacle) {
      console.warn('No available obstacles in pool')
      return
    }

    const question = this.questionManager.getNextQuestion()
    if (!question) {
      console.warn('No more questions available')
      return
    }

    obstacle.setPosition(this.scene.cameras.main.centerX, -100)

    obstacle.activate(question, this.currentSpeed)

    this.activeObstacle = obstacle
    this.questionsSpawned++

    this.scene.events.emit('obstacleSpawned')

    this.updateSpeed()

    this.showAnswerMarkers(question)

    this.startCountdown()
  }

  private getInactiveObstacle(): QuestionObstacle | null {
    for (const obstacle of this.obstaclePool) {
      if (!obstacle.getIsActive()) {
        return obstacle
      }
    }
    return null
  }

  private updateSpeed(): void {
    const speedBonus = this.questionsSpawned * this.config.speedIncrement
    this.currentSpeed = Math.min(
      this.config.baseSpeed + speedBonus,
      this.config.maxSpeed
    )
  }

  private showAnswerMarkers(question: Question): void {
    const options = question.options
    const letters = ['A', 'B', 'C', 'D'] as const

    letters.forEach((letter, index) => {
      const marker = this.answerMarkers.get(index)
      if (marker && options[letter]) {
        marker.show()
      } else if (marker) {
        marker.hide()
      }
    })
  }

  private startCountdown(): void {
    if (!this.countdownText) return

    let timeRemaining = this.config.answerTime / 1000

    this.countdownText.setVisible(true)
    this.countdownText.setText(timeRemaining.toString())

    this.updateCountdownColor(timeRemaining)

    this.countdownTimer = this.scene.time.addEvent({
      delay: 1000,
      repeat: timeRemaining - 1,
      callback: () => {
        timeRemaining--

        if (this.countdownText) {
          this.countdownText.setText(timeRemaining.toString())
          this.updateCountdownColor(timeRemaining)

          if (timeRemaining <= 3) {
            this.scene.events.emit('countdownTick')
            this.scene.tweens.add({
              targets: this.countdownText,
              scale: 1.2,
              duration: 200,
              yoyo: true,
              ease: 'Power2'
            })
          }
        }

        if (timeRemaining <= 0) {
          this.handleTimeUp()
        }
      }
    })
  }

  private updateCountdownColor(timeRemaining: number): void {
    if (!this.countdownText) return

    if (timeRemaining > 5) {
      this.countdownText.setColor('#10b981')
    } else if (timeRemaining > 3) {
      this.countdownText.setColor('#fcd34d')
    } else {
      this.countdownText.setColor('#ef4444')
    }
  }

  private handleTimeUp(): void {
    if (this.countdownTimer) {
      this.countdownTimer.remove()
      this.countdownTimer = undefined
    }

    if (this.countdownText) {
      this.countdownText.setVisible(false)
    }

    if (this.activeObstacle) {
      const question = this.activeObstacle.getQuestion()
      if (question) {
        this.scene.events.emit('questionTimeout', question)

        this.answerMarkers.forEach(marker => {
          marker.highlightIncorrect()
        })

        this.activeObstacle.showIncorrectFeedback()
      }

      this.scene.time.delayedCall(1000, () => {
        if (this.activeObstacle) {
          this.activeObstacle.deactivate()
          this.activeObstacle = null
        }

        this.answerMarkers.forEach(marker => marker.hide())
      })
    }
  }

  public update(delta: number): void {
    if (this.isPaused) return

    this.gameTime += delta

    this.obstaclePool.forEach(obstacle => {
      if (obstacle.getIsActive()) {
        obstacle.updatePosition(delta)
      }
    })
  }

  public checkCollision(playerLane: number): boolean {
    if (!this.activeObstacle || !this.activeObstacle.getIsActive()) {
      return false
    }

    const question = this.activeObstacle.getQuestion()
    if (!question || this.activeObstacle.hasAnswered()) {
      return false
    }

    const answers = ['A', 'B', 'C', 'D'] as const
    const selectedAnswer = answers[playerLane]

    const isCorrect = selectedAnswer === question.correct

    this.activeObstacle.markAsAnswered()

    if (this.countdownTimer) {
      this.countdownTimer.remove()
      this.countdownTimer = undefined
    }

    if (this.countdownText) {
      this.countdownText.setVisible(false)
    }

    const marker = this.answerMarkers.get(playerLane)
    if (marker) {
      if (isCorrect) {
        marker.highlightCorrect()
        this.activeObstacle.showCorrectFeedback()
      } else {
        marker.highlightIncorrect()
        this.activeObstacle.showIncorrectFeedback()

        const correctLane = answers.indexOf(question.correct)
        const correctMarker = this.answerMarkers.get(correctLane)
        if (correctMarker) {
          correctMarker.highlightCorrect()
        }
      }
    }

    this.scene.events.emit('questionAnswered', {
      question,
      answer: selectedAnswer,
      correct: isCorrect,
      timeRemaining: this.countdownTimer ? (this.countdownTimer as any).getRemaining() : 0
    })

    this.scene.time.delayedCall(1500, () => {
      if (this.activeObstacle) {
        this.activeObstacle.deactivate()
        this.activeObstacle = null
      }

      this.answerMarkers.forEach(marker => marker.hide())
    })

    return isCorrect
  }

  public getCurrentQuestion(): Question | undefined {
    return this.activeObstacle?.getQuestion()
  }

  public getActiveObstacle(): QuestionObstacle | null {
    return this.activeObstacle
  }

  public getQuestionsSpawned(): number {
    return this.questionsSpawned
  }

  public getCurrentSpeed(): number {
    return this.currentSpeed
  }

  public destroy(): void {
    this.reset()

    this.obstaclePool.forEach(obstacle => obstacle.destroy())
    this.obstaclePool = []

    this.answerMarkers.forEach(marker => marker.destroy())
    this.answerMarkers.clear()

    if (this.countdownText) {
      this.countdownText.destroy()
      this.countdownText = undefined
    }
  }
}

interface ScoreConfig {
  baseCorrectScore: number
  baseIncorrectPenalty: number
  timeBonus: {
    maxBonus: number
    decayRate: number
  }
  streakMultipliers: number[]
  difficultyMultipliers: Record<DifficultyLevel, number>
  comboTimeWindow: number
  perfectStreakThreshold: number
}

interface ScoreEvent {
  type: 'correct' | 'incorrect' | 'timeout' | 'movement'
  points: number
  timestamp: number
  difficulty?: DifficultyLevel
  timeRemaining?: number
}

interface Achievement {
  id: string
  name: string
  description: string
  unlocked: boolean
  unlockedAt?: Date
}

export class ScoreManager {
  private score: number = 0
  private highScore: number = 0
  private currentStreak: number = 0
  private bestStreak: number = 0
  private totalCorrect: number = 0
  private totalIncorrect: number = 0
  private perfectStreak: number = 0
  private lastAnswerTime: number = 0
  private scoreHistory: ScoreEvent[] = []
  private config: ScoreConfig
  private achievements: Map<string, Achievement>
  private scoreChangeCallbacks: ((score: number) => void)[] = []
  private streakChangeCallbacks: ((streak: number) => void)[] = []
  private achievementCallbacks: ((achievement: Achievement) => void)[] = []

  constructor(config?: Partial<ScoreConfig>) {
    this.config = {
      baseCorrectScore: 100,
      baseIncorrectPenalty: 50,
      timeBonus: {
        maxBonus: 50,
        decayRate: 5
      },
      streakMultipliers: [1, 1.2, 1.5, 2, 2.5, 3],
      difficultyMultipliers: {
        easy: 1,
        medium: 1.5,
        hard: 2,
        expert: 3
      },
      comboTimeWindow: 3000,
      perfectStreakThreshold: 10,
      ...config
    }

    this.achievements = new Map()
    this.initializeAchievements()
    this.loadHighScore()
  }

  private initializeAchievements(): void {
    const achievementList: Achievement[] = [
      {
        id: 'first_correct',
        name: 'Bắt Đầu Tốt',
        description: 'Trả lời đúng câu hỏi đầu tiên',
        unlocked: false
      },
      {
        id: 'streak_5',
        name: 'Chuỗi 5',
        description: 'Đạt chuỗi 5 câu trả lời đúng',
        unlocked: false
      },
      {
        id: 'streak_10',
        name: 'Chuỗi 10',
        description: 'Đạt chuỗi 10 câu trả lời đúng',
        unlocked: false
      },
      {
        id: 'streak_20',
        name: 'Bậc Thầy',
        description: 'Đạt chuỗi 20 câu trả lời đúng',
        unlocked: false
      },
      {
        id: 'perfect_10',
        name: 'Hoàn Hảo',
        description: 'Trả lời đúng 10 câu liên tiếp với thời gian tối đa',
        unlocked: false
      },
      {
        id: 'speed_demon',
        name: 'Tốc Độ',
        description: 'Trả lời đúng trong vòng 2 giây',
        unlocked: false
      },
      {
        id: 'score_1000',
        name: 'Ngàn Điểm',
        description: 'Đạt 1000 điểm',
        unlocked: false
      },
      {
        id: 'score_5000',
        name: 'Năm Ngàn',
        description: 'Đạt 5000 điểm',
        unlocked: false
      },
      {
        id: 'score_10000',
        name: 'Vạn Điểm',
        description: 'Đạt 10000 điểm',
        unlocked: false
      },
      {
        id: 'comeback',
        name: 'Trở Lại',
        description: 'Đạt chuỗi 5 sau khi mất mạng',
        unlocked: false
      }
    ]

    achievementList.forEach(achievement => {
      this.achievements.set(achievement.id, achievement)
    })
  }

  private loadHighScore(): void {
    const saved = localStorage.getItem('knowledgeRunner_highScore')
    this.highScore = saved ? parseInt(saved) : 0
  }

  private saveHighScore(): void {
    if (this.score > this.highScore) {
      this.highScore = this.score
      localStorage.setItem('knowledgeRunner_highScore', this.highScore.toString())
    }
  }

  public calculateScore(
    isCorrect: boolean,
    difficulty: DifficultyLevel = 'easy',
    timeRemaining: number = 0,
    isTimeout: boolean = false
  ): number {
    const currentTime = Date.now()
    let points = 0

    if (isTimeout) {
      this.resetStreak()
      this.recordEvent({
        type: 'timeout',
        points: 0,
        timestamp: currentTime
      })
      return 0
    }

    if (isCorrect) {
      points = this.config.baseCorrectScore

      points *= this.config.difficultyMultipliers[difficulty]

      const timeBonus = this.calculateTimeBonus(timeRemaining)
      points += timeBonus

      const streakMultiplier = this.getStreakMultiplier()
      points *= streakMultiplier

      if (this.lastAnswerTime > 0) {
        const timeSinceLastAnswer = currentTime - this.lastAnswerTime
        if (timeSinceLastAnswer < this.config.comboTimeWindow) {
          points *= 1.5
        }
      }

      this.incrementStreak()

      if (timeRemaining > 8000) {
        this.perfectStreak++
      } else {
        this.perfectStreak = 0
      }

      this.totalCorrect++
      this.checkAchievements(true, timeRemaining)
    } else {
      points = -this.config.baseIncorrectPenalty
      this.resetStreak()
      this.totalIncorrect++
      this.checkAchievements(false, timeRemaining)
    }

    this.lastAnswerTime = currentTime

    points = Math.round(points)

    this.addScore(points)

    this.recordEvent({
      type: isCorrect ? 'correct' : 'incorrect',
      points,
      timestamp: currentTime,
      difficulty,
      timeRemaining
    })

    return points
  }

  private calculateTimeBonus(timeRemaining: number): number {
    const secondsRemaining = timeRemaining / 1000

    const bonus = Math.max(
      0,
      this.config.timeBonus.maxBonus - secondsRemaining * this.config.timeBonus.decayRate
    )

    return Math.round(bonus)
  }

  private getStreakMultiplier(): number {
    const multipliers = this.config.streakMultipliers

    if (this.currentStreak === 0) return multipliers[0]
    if (this.currentStreak <= 2) return multipliers[1]
    if (this.currentStreak <= 5) return multipliers[2]
    if (this.currentStreak <= 9) return multipliers[3]
    if (this.currentStreak <= 14) return multipliers[4]
    return multipliers[5]
  }

  private incrementStreak(): void {
    this.currentStreak++
    if (this.currentStreak > this.bestStreak) {
      this.bestStreak = this.currentStreak
    }

    this.streakChangeCallbacks.forEach(callback => callback(this.currentStreak))
  }

  private resetStreak(): void {
    this.currentStreak = 0
    this.perfectStreak = 0

    this.streakChangeCallbacks.forEach(callback => callback(0))
  }

  private checkAchievements(isCorrect: boolean, timeRemaining: number): void {
    if (!isCorrect) return

    if (this.totalCorrect === 1) {
      this.unlockAchievement('first_correct')
    }

    if (this.currentStreak === 5) {
      this.unlockAchievement('streak_5')
    }
    if (this.currentStreak === 10) {
      this.unlockAchievement('streak_10')
    }
    if (this.currentStreak === 20) {
      this.unlockAchievement('streak_20')
    }

    if (this.perfectStreak === this.config.perfectStreakThreshold) {
      this.unlockAchievement('perfect_10')
    }

    if (timeRemaining > 8000) {
      this.unlockAchievement('speed_demon')
    }

    if (this.score >= 1000 && this.score - this.getLastPoints() < 1000) {
      this.unlockAchievement('score_1000')
    }
    if (this.score >= 5000 && this.score - this.getLastPoints() < 5000) {
      this.unlockAchievement('score_5000')
    }
    if (this.score >= 10000 && this.score - this.getLastPoints() < 10000) {
      this.unlockAchievement('score_10000')
    }
  }

  private unlockAchievement(id: string): void {
    const achievement = this.achievements.get(id)
    if (achievement && !achievement.unlocked) {
      achievement.unlocked = true
      achievement.unlockedAt = new Date()

      const unlockedAchievements = this.getUnlockedAchievements()
      localStorage.setItem(
        'knowledgeRunner_achievements',
        JSON.stringify(unlockedAchievements)
      )

      this.achievementCallbacks.forEach(callback => callback(achievement))
    }
  }

  private getLastPoints(): number {
    if (this.scoreHistory.length === 0) return 0
    return this.scoreHistory[this.scoreHistory.length - 1].points
  }

  private recordEvent(event: ScoreEvent): void {
    this.scoreHistory.push(event)

    if (this.scoreHistory.length > 100) {
      this.scoreHistory.shift()
    }
  }

  public addScore(points: number): void {
    this.score += points
    this.score = Math.max(0, this.score)

    this.saveHighScore()

    this.scoreChangeCallbacks.forEach(callback => callback(this.score))
  }

  public addMovementBonus(): void {
    const points = 5
    this.addScore(points)

    this.recordEvent({
      type: 'movement',
      points,
      timestamp: Date.now()
    })
  }

  public getScore(): number {
    return this.score
  }

  public getHighScore(): number {
    return this.highScore
  }

  public getCurrentStreak(): number {
    return this.currentStreak
  }

  public getBestStreak(): number {
    return this.bestStreak
  }

  public getTotalCorrect(): number {
    return this.totalCorrect
  }

  public getTotalIncorrect(): number {
    return this.totalIncorrect
  }

  public getAccuracy(): number {
    const total = this.totalCorrect + this.totalIncorrect
    if (total === 0) return 0
    return (this.totalCorrect / total) * 100
  }

  public getUnlockedAchievements(): Achievement[] {
    return Array.from(this.achievements.values()).filter(a => a.unlocked)
  }

  public getAllAchievements(): Achievement[] {
    return Array.from(this.achievements.values())
  }

  public getScoreHistory(): ScoreEvent[] {
    return [...this.scoreHistory]
  }

  public onScoreChange(callback: (score: number) => void): void {
    this.scoreChangeCallbacks.push(callback)
  }

  public onStreakChange(callback: (streak: number) => void): void {
    this.streakChangeCallbacks.push(callback)
  }

  public onAchievementUnlocked(callback: (achievement: Achievement) => void): void {
    this.achievementCallbacks.push(callback)
  }

  public reset(): void {
    this.score = 0
    this.currentStreak = 0
    this.totalCorrect = 0
    this.totalIncorrect = 0
    this.perfectStreak = 0
    this.lastAnswerTime = 0
    this.scoreHistory = []
  }

  public resetAll(): void {
    this.reset()
    this.bestStreak = 0
    this.highScore = 0

    this.achievements.forEach(achievement => {
      achievement.unlocked = false
      achievement.unlockedAt = undefined
    })

    localStorage.removeItem('knowledgeRunner_highScore')
    localStorage.removeItem('knowledgeRunner_achievements')
  }
}

export type SwipeDirection = 'left' | 'right' | 'up' | 'down' | null

export interface SwipeEvent {
  direction: SwipeDirection
  distance: number
  velocity: number
  duration: number
}

export class SwipeDetector {
  private scene: Phaser.Scene
  private startX: number = 0
  private startY: number = 0
  private startTime: number = 0
  private isTracking: boolean = false
  private threshold: number
  private minVelocity: number = 0.3
  private swipeCooldown: number = 200
  private lastSwipeTime: number = 0
  private onSwipeCallback?: (event: SwipeEvent) => void

  constructor(
    scene: Phaser.Scene,
    threshold: number = 50,
    onSwipe?: (event: SwipeEvent) => void
  ) {
    this.scene = scene
    this.threshold = threshold
    this.onSwipeCallback = onSwipe

    this.setupListeners()
  }

  private setupListeners(): void {
    this.scene.input.on('pointerdown', this.onPointerDown, this)
    this.scene.input.on('pointermove', this.onPointerMove, this)
    this.scene.input.on('pointerup', this.onPointerUp, this)
    this.scene.input.on('pointercancel', this.onPointerCancel, this)
  }

  private onPointerDown(pointer: Phaser.Input.Pointer): void {
    const now = Date.now()

    if (now - this.lastSwipeTime < this.swipeCooldown) {
      return
    }

    this.startX = pointer.x
    this.startY = pointer.y
    this.startTime = now
    this.isTracking = true
  }

  private onPointerMove(pointer: Phaser.Input.Pointer): void {
    if (!this.isTracking) return

    if (this.scene.tweens) {
      const deltaX = pointer.x - this.startX
      const deltaY = pointer.y - this.startY
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY)

      if (distance > this.threshold / 2) {
      }
    }
  }

  private onPointerUp(pointer: Phaser.Input.Pointer): void {
    if (!this.isTracking) return

    this.isTracking = false

    const endX = pointer.x
    const endY = pointer.y
    const endTime = Date.now()

    const deltaX = endX - this.startX
    const deltaY = endY - this.startY
    const duration = endTime - this.startTime

    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY)
    const velocity = distance / duration

    if (distance < this.threshold || velocity < this.minVelocity) {
      return
    }

    const direction = this.getSwipeDirection(deltaX, deltaY)

    if (direction) {
      this.lastSwipeTime = endTime

      const swipeEvent: SwipeEvent = {
        direction,
        distance,
        velocity,
        duration
      }

      this.scene.events.emit('swipe', swipeEvent)

      if (this.onSwipeCallback) {
        this.onSwipeCallback(swipeEvent)
      }
    }
  }

  private onPointerCancel(): void {
    this.isTracking = false
  }

  private getSwipeDirection(deltaX: number, deltaY: number): SwipeDirection {
    const absX = Math.abs(deltaX)
    const absY = Math.abs(deltaY)

    if (absX > absY) {
      return deltaX > 0 ? 'right' : 'left'
    } else if (absY > absX * 0.5) {
      return deltaY > 0 ? 'down' : 'up'
    }

    return null
  }

  public setThreshold(threshold: number): void {
    this.threshold = threshold
  }

  public setMinVelocity(velocity: number): void {
    this.minVelocity = velocity
  }

  public setSwipeCooldown(cooldown: number): void {
    this.swipeCooldown = cooldown
  }

  public destroy(): void {
    this.scene.input.off('pointerdown', this.onPointerDown, this)
    this.scene.input.off('pointermove', this.onPointerMove, this)
    this.scene.input.off('pointerup', this.onPointerUp, this)
    this.scene.input.off('pointercancel', this.onPointerCancel, this)
    this.onSwipeCallback = undefined
  }
}

export class LaneTouchZones {
  private scene: Phaser.Scene
  private zones: Phaser.GameObjects.Zone[] = []
  private laneWidth: number
  private onLaneTapCallback?: (lane: number) => void

  constructor(
    scene: Phaser.Scene,
    numLanes: number = 4,
    onLaneTap?: (lane: number) => void
  ) {
    this.scene = scene
    this.laneWidth = scene.cameras.main.width / numLanes
    this.onLaneTapCallback = onLaneTap

    this.createZones(numLanes)
  }

  private createZones(numLanes: number): void {
    const height = this.scene.cameras.main.height

    for (let i = 0; i < numLanes; i++) {
      const x = i * this.laneWidth + this.laneWidth / 2
      const zone = this.scene.add.zone(x, height / 2, this.laneWidth, height)

      zone.setInteractive()
      zone.on('pointerdown', () => {
        if (this.onLaneTapCallback) {
          this.onLaneTapCallback(i)
        }
        this.scene.events.emit('laneTap', i)
      })

      this.zones.push(zone)

      if (this.scene.game.config.physics?.arcade?.debug) {
        const graphics = this.scene.add.graphics()
        graphics.lineStyle(2, 0x00ff00, 0.3)
        graphics.strokeRect(
          i * this.laneWidth,
          0,
          this.laneWidth,
          height
        )
      }
    }
  }

  public setEnabled(enabled: boolean): void {
    this.zones.forEach(zone => {
      zone.setInteractive(enabled)
    })
  }

  public destroy(): void {
    this.zones.forEach(zone => {
      zone.destroy()
    })
    this.zones = []
    this.onLaneTapCallback = undefined
  }
}

export class VisualEffects {
  private scene: Phaser.Scene
  private dustEmitter?: Phaser.GameObjects.Particles.ParticleEmitter
  private speedTrailEmitter?: Phaser.GameObjects.Particles.ParticleEmitter
  private afterImages: Phaser.GameObjects.Sprite[] = []

  constructor(scene: Phaser.Scene) {
    this.scene = scene
    this.createParticleTextures()
  }

  private createParticleTextures(): void {
    if (!this.scene.textures.exists('dust')) {
      const graphics = this.scene.make.graphics({ x: 0, y: 0 }, false)
      graphics.fillStyle(0xffffff, 1)
      graphics.fillCircle(4, 4, 4)
      graphics.generateTexture('dust', 8, 8)
      graphics.destroy()
    }

    if (!this.scene.textures.exists('speedTrail')) {
      const graphics = this.scene.make.graphics({ x: 0, y: 0 }, false)
      graphics.fillStyle(0xfcd34d, 1)
      graphics.fillRect(0, 0, 16, 2)
      graphics.generateTexture('speedTrail', 16, 2)
      graphics.destroy()
    }

    if (!this.scene.textures.exists('star')) {
      const graphics = this.scene.make.graphics({ x: 0, y: 0 }, false)
      graphics.fillStyle(0xffffff, 1)

      const centerX = 8
      const centerY = 8
      const spikes = 5
      const outerRadius = 8
      const innerRadius = 4

      graphics.beginPath()
      for (let i = 0; i < spikes * 2; i++) {
        const radius = i % 2 === 0 ? outerRadius : innerRadius
        const angle = (Math.PI * 2 * i) / (spikes * 2)
        const x = centerX + Math.cos(angle - Math.PI / 2) * radius
        const y = centerY + Math.sin(angle - Math.PI / 2) * radius

        if (i === 0) {
          graphics.moveTo(x, y)
        } else {
          graphics.lineTo(x, y)
        }
      }
      graphics.closePath()
      graphics.fillPath()

      graphics.generateTexture('star', 16, 16)
      graphics.destroy()
    }
  }

  public createDustEffect(x: number, y: number): void {
    const emitter = this.scene.add.particles(x, y, 'dust', {
      speed: { min: 20, max: 60 },
      scale: { start: 0.5, end: 0 },
      alpha: { start: 0.6, end: 0 },
      lifespan: 500,
      quantity: 3,
      angle: { min: 160, max: 200 },
      gravityY: 50,
      tint: 0x999999
    })

    this.scene.time.delayedCall(100, () => {
      emitter.stop()

      this.scene.time.delayedCall(600, () => {
        emitter.destroy()
      })
    })
  }

  public createSpeedTrail(character: Phaser.GameObjects.Sprite, duration: number = 300): void {
    if (this.speedTrailEmitter) {
      this.speedTrailEmitter.stop()
      this.speedTrailEmitter.destroy()
    }

    this.speedTrailEmitter = this.scene.add.particles(character.x, character.y, 'speedTrail', {
      speed: 0,
      scale: { start: 1, end: 0 },
      alpha: { start: 0.5, end: 0 },
      lifespan: 200,
      frequency: 20,
      follow: character
    })

    this.scene.time.delayedCall(duration, () => {
      if (this.speedTrailEmitter) {
        this.speedTrailEmitter.stop()

        this.scene.time.delayedCall(300, () => {
          if (this.speedTrailEmitter) {
            this.speedTrailEmitter.destroy()
            this.speedTrailEmitter = undefined
          }
        })
      }
    })
  }

  public createAfterImage(character: Phaser.GameObjects.Sprite): void {
    const afterImage = this.scene.add.sprite(character.x, character.y, character.texture.key)
    afterImage.setFrame(character.frame.name)
    afterImage.setScale(character.scaleX, character.scaleY)
    afterImage.setRotation(character.rotation)
    afterImage.setAlpha(0.5)
    afterImage.setTint(0xfcd34d)

    this.scene.tweens.add({
      targets: afterImage,
      alpha: 0,
      scaleX: character.scaleX * 0.8,
      scaleY: character.scaleY * 0.8,
      duration: 300,
      ease: 'Power2',
      onComplete: () => {
        afterImage.destroy()
        const index = this.afterImages.indexOf(afterImage)
        if (index > -1) {
          this.afterImages.splice(index, 1)
        }
      }
    })

    this.afterImages.push(afterImage)
  }

  public screenShake(intensity: number = 5, duration: number = 100): void {
    this.scene.cameras.main.shake(duration, intensity * 0.01)
  }

  public createLaneChangeEffect(fromX: number, toX: number, y: number): void {
    const swoosh = this.scene.add.rectangle(fromX, y, 2, 40, 0xfcd34d, 0.6)

    this.scene.tweens.add({
      targets: swoosh,
      x: toX,
      scaleX: 20,
      alpha: 0,
      duration: 200,
      ease: 'Power2',
      onComplete: () => {
        swoosh.destroy()
      }
    })

    const midX = (fromX + toX) / 2
    const emitter = this.scene.add.particles(midX, y, 'star', {
      speed: { min: 50, max: 100 },
      scale: { start: 0.3, end: 0 },
      alpha: { start: 0.8, end: 0 },
      lifespan: 400,
      quantity: 5,
      angle: { min: 0, max: 360 },
      tint: [0xfcd34d, 0xffffff, 0xdc2626]
    })

    this.scene.time.delayedCall(50, () => {
      emitter.stop()

      this.scene.time.delayedCall(500, () => {
        emitter.destroy()
      })
    })
  }

  public createScorePopup(x: number, y: number, text: string, color: number = 0xffffff): void {
    const popup = this.scene.add.text(x, y, text, {
      fontSize: '24px',
      color: `#${color.toString(16).padStart(6, '0')}`,
      fontStyle: 'bold',
      fontFamily: 'Arial, sans-serif',
      stroke: '#000000',
      strokeThickness: 3
    })
    popup.setOrigin(0.5)

    this.scene.tweens.add({
      targets: popup,
      y: y - 50,
      alpha: 0,
      scale: 1.5,
      duration: 1000,
      ease: 'Power2',
      onComplete: () => {
        popup.destroy()
      }
    })
  }

  public flashColor(target: Phaser.GameObjects.Sprite, color: number = 0xffffff, duration: number = 100): void {
    const originalTint = target.tintTopLeft

    target.setTint(color)

    this.scene.time.delayedCall(duration, () => {
      target.setTint(originalTint)
    })
  }

  public createGlowEffect(x: number, y: number, color: number = 0xfcd34d): Phaser.GameObjects.Graphics {
    const glow = this.scene.add.graphics()

    for (let i = 3; i >= 0; i--) {
      const alpha = 0.1 * (i + 1)
      const radius = 20 + (3 - i) * 10

      glow.fillStyle(color, alpha)
      glow.fillCircle(x, y, radius)
    }

    this.scene.tweens.add({
      targets: glow,
      alpha: 0.5,
      scaleX: 1.2,
      scaleY: 1.2,
      duration: 500,
      ease: 'Sine.inOut',
      yoyo: true,
      repeat: -1
    })

    return glow
  }

  public cleanup(): void {
    if (this.dustEmitter) {
      this.dustEmitter.destroy()
    }
    if (this.speedTrailEmitter) {
      this.speedTrailEmitter.destroy()
    }

    this.afterImages.forEach(image => {
      if (image && image.scene) {
        image.destroy()
      }
    })
    this.afterImages = []
  }
}

