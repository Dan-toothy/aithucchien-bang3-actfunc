import { useState } from 'react'
import PhaserGame from './components/PhaserGame'
import './App.css'

function App() {
  const [currentScene, _setCurrentScene] = useState<string>('MainMenuScene')

  const handleGameStart = () => {
    console.log('Game initialized successfully!')
  }

  const handleGameOver = (score: number) => {
    console.log(`Game Over! Final Score: ${score}`)
  }

  return (
    <div className="App">
      <div className="game-container">
        <PhaserGame
          currentScene={currentScene}
          onGameStart={handleGameStart}
          onGameOver={handleGameOver}
        />
      </div>
    </div>
  )
}

export default App

