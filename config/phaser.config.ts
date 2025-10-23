import Phaser from 'phaser'
import { MainMenuScene, GamePlayScene, GameOverScene } from '../scenes'

export const GAME_CONFIG: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 1280,
  height: 800,
  parent: 'phaser-game-container',
  backgroundColor: '#87CEEB',
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: false
    }
  },
  scale: {
    mode: Phaser.Scale.RESIZE,
    parent: 'phaser-game-container',
    width: '100%',
    height: '100%'
  },
  scene: [MainMenuScene, GamePlayScene, GameOverScene] // All game scenes
}

// Game constants
export const GAME_SETTINGS = {
  // 3D Perspective settings
  HORIZON_Y: 250,
  GROUND_Y: 700,
  VANISHING_POINT: { x: 640, y: 250 },

  // Lane settings
  LANES: 4,
  LANE_WIDTH_BOTTOM: 100,  // Lane width at player position
  LANE_WIDTH_TOP: 25,      // Lane width at horizon

  // Track dimensions
  TRACK_WIDTH_BOTTOM: 400, // Total track width at bottom
  TRACK_WIDTH_TOP: 100,    // Total track width at horizon

  // Speed settings
  BASE_SPEED: 2,        // Start much slower (was 5)
  SPEED_INCREMENT: 0.3, // Gradual increase
  MAX_SPEED: 5,         // Max is original starting speed
  APPROACH_SPEED: 8,

  // Game mechanics
  INITIAL_LIVES: 3,
  QUESTION_Z_TRIGGER: 0.1, // When obstacle reaches this Z, trigger question

  // 3D depth
  MAX_DEPTH: 100,          // Maximum Z depth
  SPAWN_DEPTH: 100,        // Where obstacles spawn

  // Points
  POINTS: {
    EASY: 10,
    MEDIUM: 20,
    HARD: 30,
    EXPERT: 40
  },

  // Difficulty
  DIFFICULTY_THRESHOLDS: {
    EASY: { min: 1, max: 10 },
    MEDIUM: { min: 11, max: 25 },
    HARD: { min: 26, max: 50 },
    EXPERT: { min: 51, max: 999 }
  },

  // Colors
  COLORS: {
    PRIMARY: '#DC2626',
    SECONDARY: '#FCD34D',
    SUCCESS: '#10B981',
    ERROR: '#EF4444',
    TRACK: '#555555',
    LANE_LINE: '#FFFFFF'
  }
}

