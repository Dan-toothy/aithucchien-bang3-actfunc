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
    this.baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000'
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

      const questions = await this.fetchQuestions(source || '/data/questions.json')

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
	"id": 1,
	"difficulty": "easy",
	"question": "Trước khi ăn, chúng ta nên làm gì để giữ tay sạch sẽ?",
	"options": {
	  "A": "Rửa tay với xà phòng",
	  "B": "Lau tay vào quần",
	  "C": "Không cần làm gì cả"
	},
	"correct": "A",
	"explanation": "Rửa tay với xà phòng trước khi ăn giúp loại bỏ vi khuẩn có hại."
  },
  {
	"id": 2,
	"difficulty": "easy",
	"question": "Khi mua bánh kẹo, con nên chọn sản phẩm có bao bì như thế nào?",
	"options": {
	  "A": "Bao bì rách, hở",
	  "B": "Bao bì còn nguyên vẹn",
	  "C": "Không có bao bì"
	},
	"correct": "B",
	"explanation": "Bao bì nguyên vẹn giúp bảo vệ thực phẩm khỏi bụi bẩn và vi khuẩn."
  },
  {
	"id": 3,
	"difficulty": "easy",
	"question": "Nước uống nào sau đây là an toàn nhất?",
	"options": {
	  "A": "Nước đun sôi để nguội",
	  "B": "Nước lã từ vòi",
	  "C": "Nước hàng rong"
	},
	"correct": "A",
	"explanation": "Nước đun sôi để nguội đã được diệt khuẩn, an toàn cho sức khỏe."
  },
  {
	"id": 4,
	"difficulty": "easy",
	"question": "Khi thấy rau có màu sắc quá bóng, quá mỡ màng, con nên làm gì?",
	"options": {
	  "A": "Mua ngay vì quá ngon",
	  "B": "Cẩn thận, không mua",
	  "C": "Ăn thử xem có vị gì lạ không"
	},
	"correct": "B",
	"explanation": "Rau quả quá bóng bẩy có thể chứa hóa chất không tốt cho sức khỏe."
  },
  {
	"id": 5,
	"difficulty": "medium",
	"question": "Để phân biệt nước mắm thật, con có thể làm gì?",
	"options": {
	  "A": "Lắc chai",
	  "B": "Nếm thử",
	  "C": "Kiểm tra nhãn mác"
	},
	"correct": "C",
	"explanation": "Sản phẩm có nhãn mác, địa chỉ sản xuất rõ ràng thường đáng tin cậy hơn."
  },
  {
	"id": 6,
	"difficulty": "medium",
	"question": "Thức ăn bán ở cổng trường thường có màu sắc sặc sỡ, con nên làm gì?",
	"options": {
	  "A": "Mua ăn ngay",
	  "B": "Hỏi ý kiến bạn",
	  "C": "Hạn chế hoặc không ăn"
	},
	"correct": "C",
	"explanation": "Thực phẩm có màu sắc quá sặc sỡ có thể chứa phẩm màu công nghiệp, không tốt cho sức khỏe."
  },
  {
	"id": 7,
	"difficulty": "easy",
	"question": "Khi trái cây bị dập, nát một phần, con nên làm gì?",
	"options": {
	  "A": "Cắt bỏ phần hỏng",
	  "B": "Không nên ăn",
	  "C": "Rửa sạch rồi ăn cả quả"
	},
	"correct": "B",
	"explanation": "Phần dập nát là nơi vi khuẩn dễ phát triển và có thể lây lan ra cả quả."
  },
  {
	"id": 8,
	"difficulty": "medium",
	"question": "Hạn sử dụng trên bao bì sản phẩm cho con biết điều gì?",
	"options": {
	  "A": "Cho vui",
	  "B": "Ngày sản phẩm ngon nhất",
	  "C": "Ngày cuối cùng an toàn để sử dụng"
	},
	"correct": "C",
	"explanation": "Không nên sử dụng thực phẩm đã quá hạn sử dụng để đảm bảo an toàn."
  },
  {
	"id": 9,
	"difficulty": "easy",
	"question": "Thịt có màu lạ hoặc mùi hôi thì con nên làm gì?",
	"options": {
	  "A": "Rửa sạch rồi nấu chín kỹ",
	  "B": "Tuyệt đối không ăn",
	  "C": "Cắt bỏ phần có màu lạ"
	},
	"correct": "B",
	"explanation": "Thịt có dấu hiệu ôi thiu có thể gây ngộ độc thực phẩm, dù đã nấu chín."
  },
  {
	"id": 10,
	"difficulty": "hard",
	"question": "Làm thế nào để nhận biết bim bim, snack an toàn?",
	"options": {
	  "A": "Gói bim bim phồng to, cứng",
	  "B": "Có ghi rõ nhà sản xuất và HSD",
	  "C": "Được bán ở gần trường học"
	},
	"correct": "B",
	"explanation": "Thông tin rõ ràng trên bao bì là dấu hiệu của một sản phẩm được kiểm soát chất lượng."
  },
  {
	"id": 11,
	"difficulty": "medium",
	"question": "Tại sao không nên ăn đồ ăn vặt không rõ nguồn gốc bán ở cổng trường?",
	"options": {
	  "A": "Vì không ngon bằng đồ ăn mẹ nấu",
	  "B": "Vì có thể không hợp vệ sinh",
	  "C": "Vì đắt tiền"
	},
	"correct": "B",
	"explanation": "Đồ ăn vặt không rõ nguồn gốc thường không đảm bảo vệ sinh an toàn thực phẩm."
  },
  {
	"id": 12,
	"difficulty": "easy",
	"question": "Rau củ quả trước khi ăn sống (không nấu chín) cần được làm gì?",
	"options": {
	  "A": "Rửa sạch dưới vòi nước chảy",
	  "B": "Chỉ cần lau bằng khăn",
	  "C": "Không cần rửa"
	},
	"correct": "A",
	"explanation": "Rửa rau củ quả giúp loại bỏ bụi bẩn, thuốc trừ sâu và vi khuẩn."
  },
  {
	"id": 13,
	"difficulty": "medium",
	"question": "Nếu thấy một loại sữa có tên và bao bì gần giống một thương hiệu nổi tiếng, con nên làm gì?",
	"options": {
	  "A": "Mua uống thử vì chắc cũng ngon",
	  "B": "Kiểm tra kỹ tên thương hiệu",
	  "C": "Chọn loại rẻ hơn"
	},
	"correct": "B",
	"explanation": "Hàng giả, hàng nhái thường bắt chước các thương hiệu nổi tiếng. Cần kiểm tra kỹ để tránh mua phải sản phẩm kém chất lượng."
  },
  {
	"id": 14,
	"difficulty": "hard",
	"question": "Xiên que, cá viên chiên bán rong thường được chiên bằng loại dầu nào?",
	"options": {
	  "A": "Dầu ăn mới, sạch sẽ",
	  "B": "Dầu ăn đã được sử dụng",
	  "C": "Dầu ăn cũ cao cấp"
	},
	"correct": "B",
	"explanation": "Dầu chiên đi chiên lại nhiều lần có thể biến chất và gây hại cho sức khỏe."
  },
  {
	"id": 15,
	"difficulty": "easy",
	"question": "Thực phẩm bị mốc có ăn được không?",
	"options": {
	  "A": "Cắt bỏ phần mốc đi là ăn được",
	  "B": "Tuyệt đối không",
	  "C": "Nấu ở nhiệt độ cao sẽ hết mốc"
	},
	"correct": "B",
	"explanation": "Nấm mốc có thể tạo ra độc tố nguy hiểm, không thể loại bỏ bằng cách cắt bỏ hay đun nấu."
  },
  {
	"id": 16,
	"difficulty": "medium",
	"question": "Khi đi mua hàng, con nên chọn trứng gà như thế nào?",
	"options": {
	  "A": "Vỏ trứng có vết nứt, dính bẩn",
	  "B": "Vỏ trứng sạch sẽ, không có vết nứt",
	  "C": "Trứng có giá rẻ nhất"
	},
	"correct": "B",
	"explanation": "Vỏ trứng bị nứt là nơi vi khuẩn dễ dàng xâm nhập vào bên trong."
  },
  {
	"id": 17,
	"difficulty": "hard",
	"question": "Nước ngọt có màu lạ, vị khác thường được bán trong chai không nhãn mác ở cổng trường, con sẽ làm gì?",
	"options": {
	  "A": "Uống thử xem đó là vị gì",
	  "B": "Không uống và nói nhà trường biết",
	  "C": "Mua cho bạn bè uống cùng"
	},
	"correct": "B",
	"explanation": "Tuyệt đối không sử dụng thực phẩm, đồ uống không rõ nguồn gốc, không nhãn mác để bảo vệ sức khỏe của mình."
  },
  {
	"id": 18,
	"difficulty": "easy",
	"question": "Thức ăn đã nấu chín nên được bảo quản như thế nào nếu chưa ăn ngay?",
	"options": {
	  "A": "Để ở ngoài bàn ăn",
	  "B": "Cất trong tủ lạnh",
	  "C": "Để ở đâu cũng được"
	},
	"correct": "B",
	"explanation": "Bảo quản thức ăn trong tủ lạnh giúp ngăn chặn vi khuẩn phát triển."
  },
  {
	"id": 19,
	"difficulty": "medium",
	"question": "Để nhận biết thịt lợn có chứa chất tạo nạc (salbutamol), con có thể quan sát dấu hiệu nào?",
	"options": {
	  "A": "Thịt có lớp mỡ mỏng, màu đỏ tươi bất thường",
	  "B": "Thịt có màu hồng nhạt, lớp mỡ dày",
	  "C": "Thịt có mùi thơm"
	},
	"correct": "A",
	"explanation": "Thịt lợn siêu nạc có màu đỏ rực, lớp mỡ rất mỏng là dấu hiệu có thể chứa chất cấm."
  },
  {
	"id": 20,
	"difficulty": "hard",
	"question": "Nếu bạn con đang ăn một loại kẹo không rõ nguồn gốc mua ở cổng trường, con sẽ nói gì với bạn?",
	"options": {
	  "A": "Xin ăn thử một viên",
	  "B": "Kệ bạn, không quan tâm",
	  "C": "Khuyên bạn không nên ăn"
	},
	"correct": "C",
	"explanation": "Chia sẻ kiến thức về an toàn thực phẩm với bạn bè là một hành động tốt để cùng nhau bảo vệ sức khỏe."
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

