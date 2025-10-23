export type DifficultyLevel = 'easy' | 'medium' | 'hard' | 'expert'
export type AnswerOption = 'A' | 'B' | 'C' | 'D'

export interface QuestionOptions {
  A: string
  B?: string
  C?: string
  D?: string
}

export interface Question {
  id: number
  difficulty: DifficultyLevel
  question: string
  options: QuestionOptions
  correct: AnswerOption
  explanation: string
  category?: string
  imageUrl?: string
}

export interface QuestionHistory {
  questionId: number
  answeredCorrectly: boolean
  answerTime: number
  timestamp: Date
}

export interface QuestionStats {
  totalQuestions: number
  questionsAnswered: number
  correctAnswers: number
  wrongAnswers: number
  currentStreak: number
  bestStreak: number
  averageAnswerTime: number
  questionsByDifficulty: {
    easy: number
    medium: number
    hard: number
    expert: number
  }
}

export interface ValidationResult {
  valid: boolean
  errors: string[]
  warnings?: string[]
}

export interface QuestionPool {
  all: Question[]
  available: Question[]
  answered: Set<number>
  currentDifficulty: DifficultyLevel
}

export interface QuestionConfig {
  minQuestionsPerDifficulty: number
  difficultyProgression: {
    easy: { min: 1, max: 10 }
    medium: { min: 11, max: 25 }
    hard: { min: 26, max: 50 }
    expert: { min: 51, max: 999 }
  }
  optionCountByDifficulty: {
    easy: 2
    medium: 3
    hard: 4
    expert: 4
  }
  cacheEnabled: boolean
  cacheDurationDays: number
}

