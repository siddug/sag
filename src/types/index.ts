// AI Game Types
export type AIGameType = 'flirt' | 'negotiate' | 'calm_kid' | 'reveal_secret' | 'custom'

export interface APIKeys {
  gemini?: string
  mistral?: string
  openai?: string
  claude?: string
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
  scoreDelta?: number
}

export interface AIResponse {
  message: string
  scoreDelta: number
  reasoning?: string
}

// Imposters Game Types
export interface Team {
  name: string
  score: number
}

export interface QuestionPair {
  realQ: string
  fakeQ: string
}

export type ImpostersMode =
  | 'signup'
  | 'game'
  | `question-${number}`
  | `question-${number}-vote`
  | `question-${number}-result`
  | 'finished'

// Score Tracker Types
export interface ScoreTeam {
  name: string
  members: string[]
  score: number
}

export interface ScoreHistoryEntry {
  team: string
  delta: number
  timestamp: string
}

// API Response Types
export interface APIResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
}
