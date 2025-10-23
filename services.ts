import {
  Question,
  QuestionPool,
  QuestionHistory,
  QuestionStats,
  DifficultyLevel,
  QuestionConfig,
  ValidationResult,
  AnswerOption,
  QuestionOptions
} from './types/Question'

interface ScoreSubmission {
  score: number
  questionsAnswered: number
  accuracy: number
  bestStreak: number
  difficultyReached: 'easy' | 'medium' | 'hard' | 'expert'
}

interface SessionScore {
  id: string
  sessionId: string
  score: number
  questionsAnswered: number
  accuracy: number
  bestStreak: number
  difficultyReached: string
  timestamp: string
  rank?: number
}

interface SessionStats {
  sessionId: string
  totalGames: number
  bestScore: number
  averageScore: number
  bestStreak: number
  averageAccuracy: number
  totalQuestions: number
  currentScores: SessionScore[]
}

export class ApiClient {
  private static instance: ApiClient
  private baseUrl: string
  private sessionId: string | null = null

  private constructor() {
    this.baseUrl = import.meta.env.VITE_API_URL
    this.loadSession()
  }

  public static getInstance(): ApiClient {
    if (!ApiClient.instance) {
      ApiClient.instance = new ApiClient()
    }
    return ApiClient.instance
  }

  private loadSession(): void {
    const savedSession = sessionStorage.getItem('knowledgeRunner_sessionId')
    if (savedSession) {
      this.sessionId = savedSession
    }
  }

  private saveSession(): void {
    if (this.sessionId) {
      sessionStorage.setItem('knowledgeRunner_sessionId', this.sessionId)
    }
  }

  public async createSession(): Promise<string> {
    try {
      const response = await fetch(`${this.baseUrl}/session/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error('Failed to create session')
      }

      const data = await response.json()
      this.sessionId = data.session_id
      this.saveSession()

      return this.sessionId || ''
    } catch (error) {
      console.error('Error creating session:', error)
      this.sessionId = `local-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      this.saveSession()
      return this.sessionId || ''
    }
  }

  public async ensureSession(): Promise<string> {
    if (!this.sessionId) {
      await this.createSession()
    }
    return this.sessionId || ''
  }

  public async submitScore(submission: ScoreSubmission): Promise<SessionScore | null> {
    try {
      await this.ensureSession()

      const response = await fetch(
        `${this.baseUrl}/score/submit?session_id=${this.sessionId}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            score: submission.score,
            questions_answered: submission.questionsAnswered,
            accuracy: submission.accuracy,
            best_streak: submission.bestStreak,
            difficulty_reached: submission.difficultyReached
          })
        }
      )

      if (!response.ok) {
        throw new Error('Failed to submit score')
      }

      const data = await response.json()

      return {
        id: data.id,
        sessionId: data.session_id,
        score: data.score,
        questionsAnswered: data.questions_answered,
        accuracy: data.accuracy,
        bestStreak: data.best_streak,
        difficultyReached: data.difficulty_reached,
        timestamp: data.timestamp,
        rank: data.rank
      }
    } catch (error) {
      console.error('Error submitting score:', error)
      this.storeScoreLocally(submission)
      return null
    }
  }

  public async getSessionScores(limit?: number): Promise<SessionScore[]> {
    try {
      await this.ensureSession()

      let url = `${this.baseUrl}/session/${this.sessionId}/scores`
      if (limit) {
        url += `?limit=${limit}`
      }

      const response = await fetch(url)

      if (!response.ok) {
        throw new Error('Failed to get scores')
      }

      const data = await response.json()

      return data.map((item: any) => ({
        id: item.id,
        sessionId: item.session_id,
        score: item.score,
        questionsAnswered: item.questions_answered,
        accuracy: item.accuracy,
        bestStreak: item.best_streak,
        difficultyReached: item.difficulty_reached,
        timestamp: item.timestamp,
        rank: item.rank
      }))
    } catch (error) {
      console.error('Error getting scores:', error)
      return this.getLocalScores(limit)
    }
  }

  public async getSessionStats(): Promise<SessionStats | null> {
    try {
      await this.ensureSession()

      const response = await fetch(`${this.baseUrl}/session/${this.sessionId}/stats`)

      if (!response.ok) {
        throw new Error('Failed to get stats')
      }

      const data = await response.json()

      return {
        sessionId: data.session_id,
        totalGames: data.total_games,
        bestScore: data.best_score,
        averageScore: data.average_score,
        bestStreak: data.best_streak,
        averageAccuracy: data.average_accuracy,
        totalQuestions: data.total_questions,
        currentScores: data.current_scores.map((item: any) => ({
          id: item.id,
          sessionId: item.session_id,
          score: item.score,
          questionsAnswered: item.questions_answered,
          accuracy: item.accuracy,
          bestStreak: item.best_streak,
          difficultyReached: item.difficulty_reached,
          timestamp: item.timestamp,
          rank: item.rank
        }))
      }
    } catch (error) {
      console.error('Error getting stats:', error)
      return this.getLocalStats()
    }
  }

  public async clearSession(): Promise<void> {
    try {
      if (this.sessionId && !this.sessionId.startsWith('local-')) {
        await fetch(`${this.baseUrl}/session/${this.sessionId}`, {
          method: 'DELETE'
        })
      }
    } catch (error) {
      console.error('Error clearing session:', error)
    }

    this.sessionId = null
    sessionStorage.removeItem('knowledgeRunner_sessionId')
    sessionStorage.removeItem('knowledgeRunner_localScores')
  }

  private storeScoreLocally(submission: ScoreSubmission): void {
    const localScores = this.getLocalScores()
    const newScore: SessionScore = {
      id: `local-${Date.now()}`,
      sessionId: this.sessionId || 'local',
      score: submission.score,
      questionsAnswered: submission.questionsAnswered,
      accuracy: submission.accuracy,
      bestStreak: submission.bestStreak,
      difficultyReached: submission.difficultyReached,
      timestamp: new Date().toISOString()
    }

    localScores.push(newScore)

    localScores.sort((a, b) => b.score - a.score)
    localScores.forEach((score, index) => {
      score.rank = index + 1
    })

    sessionStorage.setItem('knowledgeRunner_localScores', JSON.stringify(localScores))
  }

  private getLocalScores(limit?: number): SessionScore[] {
    const stored = sessionStorage.getItem('knowledgeRunner_localScores')
    if (!stored) return []

    const scores = JSON.parse(stored) as SessionScore[]
    scores.sort((a, b) => b.score - a.score)

    if (limit) {
      return scores.slice(0, limit)
    }

    return scores
  }

  private getLocalStats(): SessionStats {
    const scores = this.getLocalScores()

    if (scores.length === 0) {
      return {
        sessionId: this.sessionId || 'local',
        totalGames: 0,
        bestScore: 0,
        averageScore: 0,
        bestStreak: 0,
        averageAccuracy: 0,
        totalQuestions: 0,
        currentScores: []
      }
    }

    const totalGames = scores.length
    const bestScore = Math.max(...scores.map(s => s.score))
    const averageScore = scores.reduce((sum, s) => sum + s.score, 0) / totalGames
    const bestStreak = Math.max(...scores.map(s => s.bestStreak))
    const averageAccuracy = scores.reduce((sum, s) => sum + s.accuracy, 0) / totalGames
    const totalQuestions = scores.reduce((sum, s) => sum + s.questionsAnswered, 0)

    return {
      sessionId: this.sessionId || 'local',
      totalGames,
      bestScore,
      averageScore,
      bestStreak,
      averageAccuracy,
      totalQuestions,
      currentScores: scores.slice(0, 10)
    }
  }

  public isBackendAvailable(): boolean {
    return this.sessionId ? !this.sessionId.startsWith('local-') : false
  }
}

export class QuestionManager {
  private static instance: QuestionManager
  private questionPool: QuestionPool
  private history: QuestionHistory[] = []
  private config: QuestionConfig
  private loadPromise: Promise<void> | null = null

  private constructor() {
    this.questionPool = {
      all: [],
      available: [],
      answered: new Set(),
      currentDifficulty: 'easy'
    }

    this.config = {
      minQuestionsPerDifficulty: 5,
      difficultyProgression: {
        easy: { min: 1, max: 10 },
        medium: { min: 11, max: 25 },
        hard: { min: 26, max: 50 },
        expert: { min: 51, max: 999 }
      },
      optionCountByDifficulty: {
        easy: 2,
        medium: 3,
        hard: 4,
        expert: 4
      },
      cacheEnabled: true,
      cacheDurationDays: 7
    }
  }

  public static getInstance(): QuestionManager {
    if (!QuestionManager.instance) {
      QuestionManager.instance = new QuestionManager()
    }
    return QuestionManager.instance
  }

  public async loadQuestions(source?: string): Promise<void> {
    if (this.loadPromise) {
      return this.loadPromise
    }

    this.loadPromise = this.loadQuestionsInternal(source)
    await this.loadPromise
    this.loadPromise = null
  }

  private async loadQuestionsInternal(source?: string): Promise<void> {
    try {
      if (this.config.cacheEnabled) {
        const cached = this.loadFromCache()
        if (cached) {
          this.questionPool.all = cached
          this.questionPool.available = [...cached]
          this.shuffleQuestions()
          return
        }
      }

      const questions = await this.fetchQuestions(source || '/data/questions.json');

      this.questionPool.all = questions
      this.questionPool.available = [...questions]
      this.shuffleQuestions()

      if (this.config.cacheEnabled) {
        this.saveToCache(questions)
      }
    } catch (error) {
      console.error('Failed to load questions:', error)
      this.loadFallbackQuestions()
    }
  }

  private async fetchQuestions(source: string): Promise<Question[]> {
    const response = await fetch(source)
    if (!response.ok) {
      throw new Error(`Failed to fetch questions: ${response.statusText}`)
    }
    const data = await response.json()
    return data.questions || []
  }

  private loadFromCache(): Question[] | null {
    try {
      const cacheKey = 'knowledgeRunner_questions'
      const cacheTimestampKey = 'knowledgeRunner_questions_timestamp'

      const cached = localStorage.getItem(cacheKey)
      const timestamp = localStorage.getItem(cacheTimestampKey)

      if (!cached || !timestamp) return null

      const cacheAge = Date.now() - parseInt(timestamp)
      const maxAge = this.config.cacheDurationDays * 24 * 60 * 60 * 1000

      if (cacheAge > maxAge) {
        localStorage.removeItem(cacheKey)
        localStorage.removeItem(cacheTimestampKey)
        return null
      }

      return JSON.parse(cached)
    } catch (error) {
      console.error('Cache loading failed:', error)
      return null
    }
  }

  private saveToCache(questions: Question[]): void {
    try {
      localStorage.setItem('knowledgeRunner_questions', JSON.stringify(questions))
      localStorage.setItem('knowledgeRunner_questions_timestamp', Date.now().toString())
    } catch (error) {
      console.error('Cache saving failed:', error)
    }
  }

  public getNextQuestion(): Question | null {
    this.updateDifficulty()

    const availableQuestions = this.getAvailableQuestionsByDifficulty(
      this.questionPool.currentDifficulty
    )

    if (availableQuestions.length === 0) {
      const anyAvailable = this.questionPool.available.filter(
        q => !this.questionPool.answered.has(q.id)
      )

      if (anyAvailable.length === 0) {
        this.resetQuestionPool()
        return this.getNextQuestion()
      }

      return anyAvailable[0]
    }

    const randomIndex = Math.floor(Math.random() * availableQuestions.length)
    const question = availableQuestions[randomIndex]

    this.questionPool.answered.add(question.id)

    return question
  }

  private getAvailableQuestionsByDifficulty(difficulty: DifficultyLevel): Question[] {
    return this.questionPool.available.filter(
      q => q.difficulty === difficulty && !this.questionPool.answered.has(q.id)
    )
  }

  public getQuestionsByDifficulty(difficulty: DifficultyLevel): Question[] {
    return this.questionPool.all.filter(q => q.difficulty === difficulty)
  }

  private updateDifficulty(): void {
    const answeredCount = this.questionPool.answered.size
    const progression = this.config.difficultyProgression

    if (answeredCount <= progression.easy.max) {
      this.questionPool.currentDifficulty = 'easy'
    } else if (answeredCount <= progression.medium.max) {
      this.questionPool.currentDifficulty = 'medium'
    } else if (answeredCount <= progression.hard.max) {
      this.questionPool.currentDifficulty = 'hard'
    } else {
      this.questionPool.currentDifficulty = 'expert'
    }
  }

  public shuffleQuestions(): void {
    const array = this.questionPool.available
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[array[i], array[j]] = [array[j], array[i]]
    }
  }

  public resetQuestionPool(): void {
    this.questionPool.available = [...this.questionPool.all]
    this.questionPool.answered.clear()
    this.questionPool.currentDifficulty = 'easy'
    this.history = []
    this.shuffleQuestions()
  }

  public recordAnswer(
    questionId: number,
    correct: boolean,
    answerTime: number
  ): void {
    this.history.push({
      questionId,
      answeredCorrectly: correct,
      answerTime,
      timestamp: new Date()
    })
  }

  public getStats(): QuestionStats {
    const stats: QuestionStats = {
      totalQuestions: this.questionPool.all.length,
      questionsAnswered: this.history.length,
      correctAnswers: this.history.filter(h => h.answeredCorrectly).length,
      wrongAnswers: this.history.filter(h => !h.answeredCorrectly).length,
      currentStreak: this.calculateCurrentStreak(),
      bestStreak: this.calculateBestStreak(),
      averageAnswerTime: this.calculateAverageAnswerTime(),
      questionsByDifficulty: {
        easy: this.getQuestionsByDifficulty('easy').length,
        medium: this.getQuestionsByDifficulty('medium').length,
        hard: this.getQuestionsByDifficulty('hard').length,
        expert: this.getQuestionsByDifficulty('expert').length
      }
    }
    return stats
  }

  private calculateCurrentStreak(): number {
    let streak = 0
    for (let i = this.history.length - 1; i >= 0; i--) {
      if (this.history[i].answeredCorrectly) {
        streak++
      } else {
        break
      }
    }
    return streak
  }

  private calculateBestStreak(): number {
    let bestStreak = 0
    let currentStreak = 0

    for (const record of this.history) {
      if (record.answeredCorrectly) {
        currentStreak++
        bestStreak = Math.max(bestStreak, currentStreak)
      } else {
        currentStreak = 0
      }
    }

    return bestStreak
  }

  private calculateAverageAnswerTime(): number {
    if (this.history.length === 0) return 0

    const totalTime = this.history.reduce((sum, h) => sum + h.answerTime, 0)
    return totalTime / this.history.length
  }

  public getCurrentDifficulty(): DifficultyLevel {
    return this.questionPool.currentDifficulty
  }

  public getTotalQuestions(): number {
    return this.questionPool.all.length
  }

  public getAnsweredCount(): number {
    return this.questionPool.answered.size
  }

  private loadFallbackQuestions(): void {
    this.questionPool.all = this.getDefaultQuestions()
    this.questionPool.available = [...this.questionPool.all]
    this.shuffleQuestions()
  }

  private getDefaultQuestions(): Question[] {
    return [
      {
        id: 1,
        difficulty: 'easy',
        question: 'Ngày Quốc khánh Việt Nam là ngày nào?',
        options: { A: '2 tháng 9', B: '30 tháng 4' },
        correct: 'A',
        explanation: 'Ngày 2/9/1945, Chủ tịch Hồ Chí Minh đọc Tuyên ngôn độc lập',
        category: 'Lịch sử'
      },
      {
        id: 2,
        difficulty: 'easy',
        question: 'Thủ đô của Việt Nam là gì?',
        options: { A: 'Hà Nội', B: 'Hồ Chí Minh' },
        correct: 'A',
        explanation: 'Hà Nội là thủ đô của Việt Nam từ năm 1010',
        category: 'Địa lý'
      }
    ]
  }
}

export class QuestionValidator {
  private static readonly REQUIRED_FIELDS = [
    'id',
    'difficulty',
    'question',
    'options',
    'correct',
    'explanation'
  ]

  private static readonly VALID_DIFFICULTIES: DifficultyLevel[] = [
    'easy',
    'medium',
    'hard',
    'expert'
  ]

  private static readonly VALID_ANSWERS: AnswerOption[] = ['A', 'B', 'C', 'D']

  private static readonly OPTION_COUNT_BY_DIFFICULTY: Record<DifficultyLevel, number> = {
    easy: 2,
    medium: 3,
    hard: 4,
    expert: 4
  }

  public static validateQuestion(question: any): ValidationResult {
    const errors: string[] = []
    const warnings: string[] = []

    if (!question || typeof question !== 'object') {
      return {
        valid: false,
        errors: ['Question must be an object']
      }
    }

    for (const field of this.REQUIRED_FIELDS) {
      if (!(field in question)) {
        errors.push(`Missing required field: ${field}`)
      }
    }

    if ('id' in question) {
      if (typeof question.id !== 'number' || question.id < 1) {
        errors.push('Question ID must be a positive number')
      }
    }

    if ('difficulty' in question) {
      if (!this.VALID_DIFFICULTIES.includes(question.difficulty)) {
        errors.push(
          `Invalid difficulty: ${question.difficulty}. Must be one of: ${this.VALID_DIFFICULTIES.join(', ')}`
        )
      }
    }

    if ('question' in question) {
      if (typeof question.question !== 'string' || question.question.trim().length === 0) {
        errors.push('Question text must be a non-empty string')
      } else if (question.question.length > 500) {
        warnings.push('Question text is very long (>500 characters)')
      }
    }

    if ('options' in question) {
      const optionErrors = this.validateOptions(question.options, question.difficulty)
      errors.push(...optionErrors.errors)
      warnings.push(...(optionErrors.warnings || []))
    }

    if ('correct' in question && 'options' in question) {
      if (!this.VALID_ANSWERS.includes(question.correct)) {
        errors.push(`Invalid correct answer: ${question.correct}. Must be A, B, C, or D`)
      } else if (!(question.correct in question.options)) {
        errors.push(`Correct answer ${question.correct} is not in the options`)
      }
    }

    if ('explanation' in question) {
      if (typeof question.explanation !== 'string' || question.explanation.trim().length === 0) {
        errors.push('Explanation must be a non-empty string')
      }
    }

    if ('category' in question) {
      if (typeof question.category !== 'string') {
        warnings.push('Category should be a string')
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings: warnings.length > 0 ? warnings : undefined
    }
  }

  private static validateOptions(
    options: any,
    difficulty?: DifficultyLevel
  ): ValidationResult {
    const errors: string[] = []
    const warnings: string[] = []

    if (!options || typeof options !== 'object') {
      return {
        valid: false,
        errors: ['Options must be an object']
      }
    }

    if (!('A' in options) || typeof options.A !== 'string' || options.A.trim().length === 0) {
      errors.push('Option A is required and must be a non-empty string')
    }

    const actualOptions = ['A', 'B', 'C', 'D'].filter(
      key => key in options && options[key] && options[key].trim().length > 0
    )

    if (difficulty) {
      const expectedCount = this.OPTION_COUNT_BY_DIFFICULTY[difficulty]

      if (actualOptions.length !== expectedCount) {
        errors.push(
          `Difficulty '${difficulty}' requires exactly ${expectedCount} options, but ${actualOptions.length} were provided`
        )
      }
    }

    const optionValues = actualOptions.map(key => options[key].toLowerCase().trim())
    const uniqueOptions = new Set(optionValues)

    if (uniqueOptions.size !== optionValues.length) {
      errors.push('Duplicate option values found')
    }

    for (const key of actualOptions) {
      if (options[key].length > 200) {
        warnings.push(`Option ${key} is very long (>200 characters)`)
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings: warnings.length > 0 ? warnings : undefined
    }
  }

  public static validateQuestionBank(data: any): ValidationResult {
    const errors: string[] = []
    const warnings: string[] = []

    if (!data || !data.questions) {
      return {
        valid: false,
        errors: ['Data must contain a questions array']
      }
    }

    if (!Array.isArray(data.questions)) {
      return {
        valid: false,
        errors: ['questions must be an array']
      }
    }

    if (data.questions.length === 0) {
      return {
        valid: false,
        errors: ['Questions array is empty']
      }
    }

    const seenIds = new Set<number>()

    data.questions.forEach((question: any, index: number) => {
      const result = this.validateQuestion(question)

      if (!result.valid) {
        errors.push(`Question at index ${index}: ${result.errors.join(', ')}`)
      }

      if (result.warnings) {
        warnings.push(`Question at index ${index}: ${result.warnings.join(', ')}`)
      }

      if (question.id) {
        if (seenIds.has(question.id)) {
          errors.push(`Duplicate question ID: ${question.id}`)
        }
        seenIds.add(question.id)
      }
    })

    const difficultyCount = this.checkDifficultyDistribution(data.questions)
    if (difficultyCount.easy < 5) {
      warnings.push('Less than 5 easy questions')
    }
    if (difficultyCount.medium < 5) {
      warnings.push('Less than 5 medium questions')
    }
    if (difficultyCount.hard < 5) {
      warnings.push('Less than 5 hard questions')
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings: warnings.length > 0 ? warnings : undefined
    }
  }

  private static checkDifficultyDistribution(questions: any[]): Record<string, number> {
    const count: Record<string, number> = {
      easy: 0,
      medium: 0,
      hard: 0,
      expert: 0
    }

    questions.forEach(q => {
      if (q.difficulty && count[q.difficulty] !== undefined) {
        count[q.difficulty]++
      }
    })

    return count
  }

  public static sanitizeQuestion(question: Question): Question {
    return {
      ...question,
      question: this.sanitizeText(question.question),
      explanation: this.sanitizeText(question.explanation),
      options: {
        A: this.sanitizeText(question.options.A),
        B: question.options.B ? this.sanitizeText(question.options.B) : undefined,
        C: question.options.C ? this.sanitizeText(question.options.C) : undefined,
        D: question.options.D ? this.sanitizeText(question.options.D) : undefined
      } as QuestionOptions
    }
  }

  private static sanitizeText(text: string): string {
    return text
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;')
  }
}
