'use client'

import { useState, useEffect, useRef } from 'react'
import { use } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import type { QuestionPair } from '@/types'

interface Participant {
  id: string
  name: string
  teamName: string
  role: string
  hasFakeQuestion: boolean
  answer: string | null
  questionNumber: number | null
}

interface Vote {
  id: string
  voterId: string
  votedForId: string
  questionNumber: number
}

interface Game {
  id: string
  name: string
  teams: string
  questionPairs: string
  currentMode: string
  currentQuestion: number
  participants: Participant[]
  votes: Vote[]
}

export default function ImpostersParticipant({ params }: { params: Promise<{ gameId: string, participantId: string }> }) {
  const { gameId, participantId } = use(params)
  const [game, setGame] = useState<Game | null>(null)
  const [participant, setParticipant] = useState<Participant | null>(null)
  const [answer, setAnswer] = useState('')
  const [votedForId, setVotedForId] = useState('')
  const [hasVoted, setHasVoted] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [questionPairs, setQuestionPairs] = useState<QuestionPair[]>([])
  const lastQuestionRef = useRef<number | null>(null)
  const lastGameQuestionRef = useRef<number | null>(null)

  const fetchGameData = async () => {
    try {
      // Fetch game data with no-cache to ensure fresh data
      const gameRes = await fetch(`/api/imposters?id=${gameId}`, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' }
      })
      const gameData = await gameRes.json()

      if (!gameData.success) {
        setError('Game not found')
        return
      }

      setGame(gameData.game)
      setQuestionPairs(JSON.parse(gameData.game.questionPairs))

      // Check if game question changed (for resetting voter selection)
      const gameQuestionChanged = lastGameQuestionRef.current !== null &&
                                  lastGameQuestionRef.current !== gameData.game.currentQuestion
      lastGameQuestionRef.current = gameData.game.currentQuestion

      // Check if we've already voted this round
      const myVote = gameData.game.votes?.find(
        (v: Vote) => v.voterId === participantId && v.questionNumber === gameData.game.currentQuestion
      )
      setHasVoted(!!myVote)

      // Reset vote selection only when question changes
      if (gameQuestionChanged) {
        setVotedForId('')
      }

      // Find participant from game data (more consistent than separate fetch)
      const myParticipant = gameData.game.participants.find(
        (p: Participant) => p.id === participantId
      )

      if (myParticipant) {
        // Check if question changed using ref (avoids stale closure issues)
        const questionChanged = lastQuestionRef.current !== null &&
                                lastQuestionRef.current !== myParticipant.questionNumber

        // Update the ref with current question number
        lastQuestionRef.current = myParticipant.questionNumber

        setParticipant(myParticipant)

        // If participant already submitted answer, show it
        if (myParticipant.answer) {
          setAnswer(myParticipant.answer)
        } else if (questionChanged) {
          // Only reset answer input when question actually changes
          setAnswer('')
          setVotedForId('')
          setHasVoted(false)
        }
        // Otherwise, keep the current answer input as-is (user is typing)
      } else {
        setError('Participant not found')
      }
    } catch {
      setError('Failed to load game data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchGameData()

    // Poll for updates every 3 seconds
    const interval = setInterval(fetchGameData, 3000)
    return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameId, participantId])

  const handleSubmitAnswer = async () => {
    if (!participant || !answer.trim()) return

    try {
      const res = await fetch('/api/imposters/participants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'submitAnswer',
          participantId: participant.id,
          answer: answer.trim()
        })
      })

      const data = await res.json()
      if (data.success) {
        toast.success('Answer submitted!')
        setParticipant(prev => prev ? { ...prev, answer: answer.trim() } : null)
      } else {
        toast.error(data.error || 'Failed to submit answer')
      }
    } catch {
      toast.error('Failed to submit answer')
    }
  }

  const handleSubmitVote = async () => {
    if (!participant || !votedForId || !game) return

    try {
      const res = await fetch('/api/imposters/participants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'vote',
          participantId: participant.id,
          votedForId,
          gameId,
          questionNumber: game.currentQuestion
        })
      })

      const data = await res.json()
      if (data.success) {
        toast.success('Vote submitted!')
        setHasVoted(true)
      } else {
        toast.error(data.error || 'Failed to submit vote')
      }
    } catch {
      toast.error('Failed to submit vote')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-app-gradient">
        <p className="text-white">Loading...</p>
      </div>
    )
  }

  if (error || !game || !participant) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-app-gradient">
        <Card>
          <CardContent className="py-10 text-center">
            <p className="text-muted-foreground">{error || 'Game or participant not found'}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const currentQuestionPair = questionPairs[game.currentQuestion - 1]
  const isParticipant = participant.role === 'participant'
  const isVoter = participant.role === 'voter'
  const hasAnswered = !!participant.answer && participant.questionNumber === game.currentQuestion

  // Parse game mode
  const isSignupOrGame = game.currentMode === 'signup' || game.currentMode === 'game'
  const isQuestionMode = game.currentMode.startsWith('question-') &&
                         !game.currentMode.includes('-vote') &&
                         !game.currentMode.includes('-result')
  const isVoteMode = game.currentMode.includes('-vote')
  const isResultMode = game.currentMode.includes('-result')
  const isFinished = game.currentMode === 'finished'

  // Get participants who answered current question
  const currentParticipants = game.participants.filter(
    p => p.role === 'participant' && p.questionNumber === game.currentQuestion
  )

  // Get my question (real or fake - player doesn't know which)
  const myQuestion = participant.hasFakeQuestion ? currentQuestionPair?.fakeQ : currentQuestionPair?.realQ

  // Get vote counts for results
  const getVoteCount = (pId: string) => {
    if (!game.votes) return 0
    return game.votes.filter(v => v.votedForId === pId && v.questionNumber === game.currentQuestion).length
  }

  // Find the imposter for results
  const imposter = currentParticipants.find(p => p.hasFakeQuestion)

  // Parse teams for scores
  const teams = JSON.parse(game.teams)

  return (
    <div className="min-h-screen bg-app-gradient p-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <Card className="mb-4">
          <CardContent className="py-3 flex justify-between items-center">
            <div>
              <h1 className="font-bold text-lg">{game.name}</h1>
              <p className="text-sm text-muted-foreground">Imposters Game</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">{participant.role}</Badge>
              <Badge variant="outline">{participant.teamName}</Badge>
            </div>
          </CardContent>
        </Card>

        {/* Player Info with Link */}
        <Card className="mb-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Welcome, {participant.name}!</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-2">
              Save this link to return to your game:
            </p>
            <div className="flex gap-2">
              <code className="flex-1 text-xs bg-muted p-2 rounded truncate">
                {typeof window !== 'undefined' ? window.location.href : ''}
              </code>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  navigator.clipboard.writeText(window.location.href)
                  toast.success('Link copied!')
                }}
              >
                Copy
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* WAITING FOR GAME TO START */}
        {isSignupOrGame && (
          <Card>
            <CardContent className="py-10 text-center">
              <p className="text-lg font-medium mb-2">Waiting for game to start...</p>
              <p className="text-muted-foreground animate-pulse">The game master will start the game soon.</p>
            </CardContent>
          </Card>
        )}

        {/* QUESTION MODE - ANSWERING */}
        {isQuestionMode && (
          <>
            {isParticipant ? (
              <Card>
                <CardHeader>
                  <CardTitle>Question {game.currentQuestion}</CardTitle>
                  <CardDescription>Answer the question below</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-4 bg-muted rounded-lg">
                    <p className="font-medium">{myQuestion}</p>
                  </div>

                  {hasAnswered ? (
                    <div className="text-center py-4">
                      <Badge variant="secondary" className="mb-2">Answer Submitted</Badge>
                      <p className="p-4 bg-muted rounded-lg mt-2">{participant.answer}</p>
                      <p className="text-sm text-muted-foreground mt-4 animate-pulse">
                        Waiting for others to answer...
                      </p>
                    </div>
                  ) : (
                    <>
                      <Textarea
                        value={answer}
                        onChange={(e) => setAnswer(e.target.value)}
                        placeholder="Type your answer here..."
                        className="min-h-[100px]"
                      />
                      <Button
                        className="w-full"
                        onClick={handleSubmitAnswer}
                        disabled={!answer.trim()}
                      >
                        Submit Answer
                      </Button>
                    </>
                  )}
                </CardContent>
              </Card>
            ) : (
              // Voter waiting for participants
              <Card>
                <CardHeader>
                  <CardTitle>Question {game.currentQuestion}</CardTitle>
                </CardHeader>
                <CardContent className="text-center py-6">
                  <p className="text-muted-foreground animate-pulse">
                    Waiting for participants to submit their answers...
                  </p>
                  <p className="text-sm text-muted-foreground mt-4">
                    {currentParticipants.filter(p => p.answer).length} / {currentParticipants.length} answered
                  </p>
                </CardContent>
              </Card>
            )}
          </>
        )}

        {/* VOTE MODE */}
        {isVoteMode && (
          <>
            {isParticipant ? (
              // Participants see all answers and defend
              <Card>
                <CardHeader>
                  <CardTitle>Defend Your Answer!</CardTitle>
                  <CardDescription>The real question was:</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-4 bg-primary/10 rounded-lg border border-primary">
                    <p className="font-medium">{currentQuestionPair?.realQ}</p>
                  </div>

                  <div className="space-y-3">
                    <p className="text-sm font-medium text-muted-foreground">All answers:</p>
                    {currentParticipants.map(p => (
                      <div
                        key={p.id}
                        className={`p-3 rounded-lg ${p.id === participant.id ? 'bg-primary/10 border-2 border-primary' : 'bg-muted'}`}
                      >
                        <p className="font-medium">
                          {p.name} ({p.teamName})
                          {p.id === participant.id && <span className="text-primary ml-2">(You)</span>}
                        </p>
                        <p className="text-sm mt-1">{p.answer}</p>
                      </div>
                    ))}
                  </div>

                  <p className="text-center text-muted-foreground animate-pulse">
                    Voters are voting... Defend your answer if questioned!
                  </p>
                </CardContent>
              </Card>
            ) : (
              // Voters vote
              <Card>
                <CardHeader>
                  <CardTitle>Vote for the Imposter</CardTitle>
                  <CardDescription>Who had the FAKE question?</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-4 bg-primary/10 rounded-lg border border-primary">
                    <p className="text-sm text-muted-foreground">The real question was:</p>
                    <p className="font-medium mt-1">{currentQuestionPair?.realQ}</p>
                  </div>

                  {hasVoted ? (
                    <div className="text-center py-4">
                      <Badge variant="secondary">Vote Submitted</Badge>
                      <p className="text-sm text-muted-foreground mt-4 animate-pulse">
                        Waiting for other voters...
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="space-y-2">
                        {currentParticipants.map(p => (
                          <button
                            key={p.id}
                            onClick={() => setVotedForId(p.id)}
                            className={`w-full p-3 rounded-lg text-left transition-colors ${
                              votedForId === p.id
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted hover:bg-muted/80'
                            }`}
                          >
                            <p className="font-medium">{p.name} ({p.teamName})</p>
                            <p className="text-sm opacity-80 mt-1">{p.answer}</p>
                          </button>
                        ))}
                      </div>

                      <Button
                        className="w-full"
                        onClick={handleSubmitVote}
                        disabled={!votedForId}
                      >
                        Submit Vote
                      </Button>
                    </>
                  )}
                </CardContent>
              </Card>
            )}
          </>
        )}

        {/* RESULT MODE - REVEAL */}
        {isResultMode && (
          <Card>
            <CardHeader>
              <CardTitle>Question {game.currentQuestion} Results</CardTitle>
              <CardDescription>The imposter has been revealed!</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Real vs Fake Question */}
              <div className="grid gap-3">
                <div className="p-3 bg-green-500/10 border border-green-500 rounded-lg">
                  <p className="text-xs text-green-600 font-medium">REAL QUESTION</p>
                  <p className="font-medium">{currentQuestionPair?.realQ}</p>
                </div>
                <div className="p-3 bg-red-500/10 border border-red-500 rounded-lg">
                  <p className="text-xs text-red-600 font-medium">FAKE QUESTION (Imposter&apos;s)</p>
                  <p className="font-medium">{currentQuestionPair?.fakeQ}</p>
                </div>
              </div>

              {/* Answers with votes */}
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Results:</p>
                {currentParticipants.map(p => {
                  const votes = getVoteCount(p.id)
                  const isImposter = p.hasFakeQuestion
                  return (
                    <div
                      key={p.id}
                      className={`p-3 rounded-lg ${isImposter ? 'bg-red-500/20 border-2 border-red-500' : 'bg-muted'}`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium">
                            {p.name} ({p.teamName})
                            {isImposter && (
                              <Badge variant="destructive" className="ml-2">IMPOSTER</Badge>
                            )}
                          </p>
                          <p className="text-sm mt-1">{p.answer}</p>
                        </div>
                        <Badge variant="outline">{votes} votes</Badge>
                      </div>
                    </div>
                  )
                })}
              </div>

              <p className="text-center text-muted-foreground animate-pulse">
                Waiting for next question...
              </p>
            </CardContent>
          </Card>
        )}

        {/* GAME FINISHED */}
        {isFinished && (
          <Card>
            <CardHeader>
              <CardTitle>Game Over!</CardTitle>
              <CardDescription>Final Scores</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {teams.sort((a: {name: string, score: number}, b: {name: string, score: number}) => b.score - a.score).map((t: {name: string, score: number}, i: number) => (
                  <div
                    key={t.name}
                    className={`p-4 rounded-lg flex justify-between items-center ${
                      i === 0 ? 'bg-yellow-500/20 border border-yellow-500' : 'bg-muted'
                    }`}
                  >
                    <span className="font-medium">
                      {i === 0 && '🏆 '}{t.name}
                    </span>
                    <Badge variant="secondary">{t.score} pts</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
