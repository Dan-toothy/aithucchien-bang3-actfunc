import { useEffect, useRef } from 'react'
import Phaser from 'phaser'
import { GAME_CONFIG } from '../config/phaser.config'

interface PhaserGameProps {
  currentScene?: string
  onGameOver?: (score: number) => void
  onGameStart?: () => void
}

export default function PhaserGame({
  currentScene,
  onGameOver: _onGameOver,
  onGameStart
}: PhaserGameProps) {
  const gameRef = useRef<Phaser.Game | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (containerRef.current && !gameRef.current) {
      // Initialize Phaser game
      const config: Phaser.Types.Core.GameConfig = {
        ...GAME_CONFIG,
        parent: containerRef.current,
        callbacks: {
          postBoot: (game: Phaser.Game) => {
            // Resize game to fit container
            game.scale.resize(containerRef.current!.offsetWidth, 600)
          }
        }
      }

      gameRef.current = new Phaser.Game(config)

      // Set up event listeners
      if (gameRef.current && onGameStart) {
        onGameStart()
      }
    }

    return () => {
      // Cleanup Phaser game on unmount
      if (gameRef.current) {
        gameRef.current.destroy(true, false)
        gameRef.current = null
      }
    }
  }, [onGameStart])

  useEffect(() => {
    // Switch scenes if needed
    if (gameRef.current && currentScene) {
      const sceneManager = gameRef.current.scene
      if (sceneManager.getScene(currentScene)) {
        sceneManager.start(currentScene)
      }
    }
  }, [currentScene])

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (gameRef.current && containerRef.current) {
        gameRef.current.scale.resize(containerRef.current.offsetWidth, 600)
      }
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return (
    <div
      ref={containerRef}
      id="phaser-game-container"
      className="w-full h-[600px] rounded-lg overflow-hidden shadow-inner"
    />
  )
}

