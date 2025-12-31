'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'
import type { Team, QuestionPair } from '@/types'

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
  participantsPerTeam: number
  votersPerTeam: number
  currentMode: string
  currentQuestion: number
  participants: Participant[]
  votes: Vote[]
  _count?: { participants: number }
}

export default function ImpostersAdmin() {
  const [games, setGames] = useState<Game[]>([])
  const [selectedGame, setSelectedGame] = useState<Game | null>(null)
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    teams: '',
    questionPairs: '',
    participantsPerTeam: 3,
    votersPerTeam: 5,
  })

  useEffect(() => {
    fetchGames()
  }, [])

  const fetchGames = async () => {
    try {
      const res = await fetch('/api/imposters')
      const data = await res.json()
      if (data.success) {
        setGames(data.games)
      }
    } catch (error) {
      console.error('Error fetching games:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchGameDetails = async (id: string) => {
    try {
      const res = await fetch(`/api/imposters?id=${id}`, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' }
      })
      const data = await res.json()
      if (data.success) {
        setSelectedGame(data.game)
        return data.game
      }
    } catch (error) {
      console.error('Error fetching game:', error)
    }
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const teams = formData.teams.split('\n').map(t => t.trim()).filter(Boolean)
    const questionPairs: QuestionPair[] = formData.questionPairs.split('\n\n').map(block => {
      const lines = block.split('\n')
      return {
        realQ: lines[0]?.replace(/^R:\s*/, '') || '',
        fakeQ: lines[1]?.replace(/^F:\s*/, '') || ''
      }
    }).filter(q => q.realQ && q.fakeQ)

    if (teams.length < 2) {
      toast.error('Need at least 2 teams')
      return
    }

    if (questionPairs.length < 1) {
      toast.error('Need at least 1 question pair')
      return
    }

    try {
      const res = await fetch('/api/imposters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          teams,
          questionPairs,
          participantsPerTeam: formData.participantsPerTeam,
          votersPerTeam: formData.votersPerTeam
        })
      })

      const data = await res.json()
      if (data.success) {
        setIsDialogOpen(false)
        setFormData({
          name: '',
          teams: '',
          questionPairs: '',
          participantsPerTeam: 3,
          votersPerTeam: 5,
        })
        fetchGames()
      }
    } catch (error) {
      console.error('Error creating game:', error)
    }
  }

  const [deletingId, setDeletingId] = useState<string | null>(null)

  const handleDelete = async (id: string) => {
    // First click sets deletingId, second click confirms
    if (deletingId !== id) {
      setDeletingId(id)
      toast('Click Delete again to confirm', { duration: 3000 })
      // Reset after 3 seconds
      setTimeout(() => setDeletingId(null), 3000)
      return
    }

    setDeletingId(null)

    try {
      const res = await fetch(`/api/imposters?id=${id}`, { method: 'DELETE' })
      const data = await res.json()

      if (data.success) {
        toast.success('Game deleted successfully')
        if (selectedGame?.id === id) {
          setSelectedGame(null)
        }
        fetchGames()
      } else {
        toast.error(data.error || 'Failed to delete game')
      }
    } catch (error) {
      console.error('Error deleting game:', error)
      toast.error('Failed to delete game')
    }
  }

  const updateGameMode = async (mode: string) => {
    if (!selectedGame) return

    try {
      const res = await fetch('/api/imposters', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedGame.id,
          action: 'updateMode',
          mode
        })
      })
      const data = await res.json()
      if (data.success) {
        await fetchGameDetails(selectedGame.id)
      } else {
        toast.error(data.error || 'Failed to update game mode')
      }
    } catch (error) {
      console.error('Error updating mode:', error)
      toast.error('Failed to update game mode')
    }
  }

  const startQuestion = async (questionNumber: number) => {
    if (!selectedGame) return

    try {
      const res = await fetch('/api/imposters', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedGame.id,
          action: 'startQuestion',
          questionNumber
        })
      })
      const data = await res.json()
      if (data.success) {
        toast.success(`Question ${questionNumber} started!`)
        await fetchGameDetails(selectedGame.id)
      } else {
        toast.error(data.error || 'Failed to start question')
      }
    } catch (error) {
      console.error('Error starting question:', error)
      toast.error('Failed to start question')
    }
  }

  const updateScores = async (teamName: string, delta: number) => {
    if (!selectedGame) return

    const teams: Team[] = JSON.parse(selectedGame.teams)
    const updatedTeams = teams.map(t =>
      t.name === teamName ? { ...t, score: t.score + delta } : t
    )

    try {
      await fetch('/api/imposters', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedGame.id,
          action: 'updateScores',
          teams: updatedTeams
        })
      })
      fetchGameDetails(selectedGame.id)
    } catch (error) {
      console.error('Error updating scores:', error)
    }
  }

  const copyPlayLink = (id: string) => {
    const url = `${window.location.origin}/play/imposters/${id}`
    navigator.clipboard.writeText(url)
    toast.success('Play link copied!')
  }

  const removeParticipant = async (participantId: string) => {
    if (!window.confirm('Are you sure you want to remove this participant? This cannot be undone.')) {
      return
    }

    if (!selectedGame?.id) {
      toast.error('No game selected')
      return
    }

    try {
      const res = await fetch('/api/imposters/participants', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          participantId,
          gameId: selectedGame.id
        })
      })

      const data = await res.json()
      if (data.success) {
        toast.success('Participant removed successfully')
        fetchGameDetails(selectedGame.id)
      } else {
        toast.error(data.error || 'Failed to remove participant')
      }
    } catch (error) {
      console.error('Error removing participant:', error)
      toast.error('Failed to remove participant')
    }
  }

  // Polling for live updates
  useEffect(() => {
    if (!selectedGame) return

    const interval = setInterval(() => {
      fetchGameDetails(selectedGame.id)
    }, 3000)

    return () => clearInterval(interval)
  }, [selectedGame?.id])

  if (selectedGame) {
    const teams: Team[] = JSON.parse(selectedGame.teams)
    const questionPairs: QuestionPair[] = JSON.parse(selectedGame.questionPairs)
    const participants = selectedGame.participants || []
    const votes = selectedGame.votes || []

    const currentQuestionData = questionPairs[selectedGame.currentQuestion - 1]

    return (
      <div className="min-h-screen bg-app-gradient p-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <div>
              <button
                onClick={() => setSelectedGame(null)}
                className="text-gray-300 hover:text-white text-sm mb-2 inline-block"
              >
                ← Back to Games
              </button>
              <h1 className="text-2xl font-bold text-white">{selectedGame.name}</h1>
              <Badge variant="secondary">{selectedGame.currentMode}</Badge>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => copyPlayLink(selectedGame.id)}>
                Copy Player Link
              </Button>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Teams & Scores */}
            <Card>
              <CardHeader>
                <CardTitle>Teams & Scores</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {teams.map((team) => {
                    const teamParticipants = participants.filter(p => p.teamName === team.name)
                    return (
                      <div key={team.name} className="flex justify-between items-center p-3 bg-muted rounded-lg">
                        <div>
                          <p className="font-medium">{team.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {teamParticipants.length} joined
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button size="sm" variant="outline" onClick={() => updateScores(team.name, -10)}>-10</Button>
                          <span className="text-xl font-bold w-12 text-center">{team.score}</span>
                          <Button size="sm" variant="outline" onClick={() => updateScores(team.name, 10)}>+10</Button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Participants */}
            <Card>
              <CardHeader>
                <CardTitle>Participants</CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue={teams[0]?.name}>
                  <TabsList className="grid w-full" style={{ gridTemplateColumns: `repeat(${teams.length}, 1fr)` }}>
                    {teams.map((team) => (
                      <TabsTrigger key={team.name} value={team.name}>{team.name}</TabsTrigger>
                    ))}
                  </TabsList>
                  {teams.map((team) => (
                    <TabsContent key={team.name} value={team.name}>
                      <div className="space-y-2">
                        {participants
                          .filter(p => p.teamName === team.name)
                          .map(p => (
                            <div key={p.id} className="flex justify-between items-center p-2 bg-muted rounded">
                              <span>{p.name}</span>
                              <div className="flex gap-1 items-center">
                                <Badge variant={p.role === 'participant' ? 'default' : 'secondary'}>
                                  {p.role}
                                </Badge>
                                {p.hasFakeQuestion && <Badge variant="destructive">Fake Q</Badge>}
                                {p.answer && <Badge variant="outline">Answered</Badge>}
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-6 px-2"
                                  onClick={() => {
                                    const participantUrl = `${window.location.origin}/play/imposters/${selectedGame.id}/${p.id}`
                                    navigator.clipboard.writeText(participantUrl)
                                    toast.success('Individual player link copied!')
                                  }}
                                >
                                  Copy Player Link
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  className="h-6 px-2"
                                  onClick={() => removeParticipant(p.id)}
                                >
                                  Remove
                                </Button>
                              </div>
                            </div>
                          ))}
                        {participants.filter(p => p.teamName === team.name).length === 0 && (
                          <p className="text-muted-foreground text-sm">No participants yet</p>
                        )}
                      </div>
                    </TabsContent>
                  ))}
                </Tabs>
              </CardContent>
            </Card>

            {/* Game Controls */}
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Game Controls</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {selectedGame.currentMode === 'signup' && (
                  <Button onClick={() => updateGameMode('game')}>
                    Start Game (Close Signups)
                  </Button>
                )}

                {selectedGame.currentMode === 'game' && (
                  <div className="space-y-4">
                    <p className="text-muted-foreground">Ready to start questions</p>
                    <Button onClick={() => startQuestion(1)}>
                      Send Question 1
                    </Button>
                  </div>
                )}

                {selectedGame.currentMode.startsWith('question-') && !selectedGame.currentMode.includes('-vote') && !selectedGame.currentMode.includes('-result') && (
                  <div className="space-y-4">
                    <div className="p-4 bg-muted rounded-lg">
                      <p className="font-medium">Current Question {selectedGame.currentQuestion}</p>
                      <p className="text-sm"><strong>Real Q:</strong> {currentQuestionData?.realQ}</p>
                      <p className="text-sm"><strong>Fake Q:</strong> {currentQuestionData?.fakeQ}</p>
                    </div>

                    {/* Answer Status */}
                    <div className="p-4 bg-muted rounded-lg">
                      <p className="font-medium mb-2">Answer Status ({participants.filter(p => p.role === 'participant' && p.questionNumber === selectedGame.currentQuestion && p.answer).length} / {participants.filter(p => p.role === 'participant' && p.questionNumber === selectedGame.currentQuestion).length})</p>
                      <div className="space-y-1">
                        {participants.filter(p => p.role === 'participant' && p.questionNumber === selectedGame.currentQuestion).map(p => (
                          <div key={p.id} className={`text-sm p-2 rounded flex justify-between items-center ${p.answer ? 'bg-green-100 dark:bg-green-900' : 'bg-yellow-100 dark:bg-yellow-900'}`}>
                            <span>
                              <strong>{p.name}</strong>
                              <span className="text-muted-foreground ml-1">({p.teamName})</span>
                              {p.hasFakeQuestion && <Badge variant="destructive" className="ml-2">Imposter</Badge>}
                            </span>
                            {p.answer ? (
                              <Badge variant="secondary">Answered</Badge>
                            ) : (
                              <Badge variant="outline">Waiting...</Badge>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    <Button onClick={() => updateGameMode(`question-${selectedGame.currentQuestion}-vote`)}>
                      Reveal Answers & Start Voting
                    </Button>
                  </div>
                )}

                {selectedGame.currentMode.includes('-vote') && (
                  <div className="space-y-4">
                    <div className="p-4 bg-muted rounded-lg">
                      <p className="font-medium">Voting for Question {selectedGame.currentQuestion}</p>
                      <p className="text-sm"><strong>Real Q:</strong> {currentQuestionData?.realQ}</p>
                      <div className="mt-2">
                        <p className="text-sm font-medium">Answers:</p>
                        {participants
                          .filter(p => p.role === 'participant' && p.questionNumber === selectedGame.currentQuestion)
                          .map(p => (
                            <div key={p.id} className="text-sm p-2 bg-background rounded mt-1">
                              <strong>{p.name}:</strong> {p.answer || '(no answer)'}
                              {p.hasFakeQuestion && <Badge variant="destructive" className="ml-2">Imposter</Badge>}
                            </div>
                          ))}
                      </div>
                    </div>

                    {/* Voting Status */}
                    <div className="p-4 bg-muted rounded-lg">
                      <p className="font-medium mb-2">Voting Status ({votes.filter(v => v.questionNumber === selectedGame.currentQuestion).length} / {participants.filter(p => p.role === 'voter').length})</p>
                      <div className="space-y-1">
                        {participants.filter(p => p.role === 'voter').map(voter => {
                          const voterVote = votes.find(v => v.voterId === voter.id && v.questionNumber === selectedGame.currentQuestion)
                          const votedForParticipant = voterVote ? participants.find(p => p.id === voterVote.votedForId) : null
                          return (
                            <div key={voter.id} className={`text-sm p-2 rounded flex justify-between items-center ${voterVote ? 'bg-green-100 dark:bg-green-900' : 'bg-yellow-100 dark:bg-yellow-900'}`}>
                              <span>
                                <strong>{voter.name}</strong>
                                <span className="text-muted-foreground ml-1">({voter.teamName})</span>
                              </span>
                              {voterVote ? (
                                <Badge variant="secondary">Voted for {votedForParticipant?.name}</Badge>
                              ) : (
                                <Badge variant="outline">Not voted</Badge>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>

                    <Button onClick={() => updateGameMode(`question-${selectedGame.currentQuestion}-result`)}>
                      Show Results
                    </Button>
                  </div>
                )}

                {selectedGame.currentMode.includes('-result') && (
                  <div className="space-y-4">
                    <div className="p-4 bg-muted rounded-lg">
                      <p className="font-medium">Results for Question {selectedGame.currentQuestion}</p>
                      {participants
                        .filter(p => p.role === 'participant' && p.questionNumber === selectedGame.currentQuestion)
                        .map(p => {
                          const voteCount = votes.filter(v => v.votedForId === p.id && v.questionNumber === selectedGame.currentQuestion).length
                          return (
                            <div key={p.id} className={`p-2 rounded mt-1 ${p.hasFakeQuestion ? 'bg-red-100 dark:bg-red-900' : 'bg-background'}`}>
                              <strong>{p.name}</strong> ({p.teamName}) - {voteCount} votes
                              {p.hasFakeQuestion && <Badge variant="destructive" className="ml-2">IMPOSTER!</Badge>}
                            </div>
                          )
                        })}
                    </div>
                    {selectedGame.currentQuestion < questionPairs.length ? (
                      <Button onClick={() => startQuestion(selectedGame.currentQuestion + 1)}>
                        Next Question ({selectedGame.currentQuestion + 1})
                      </Button>
                    ) : (
                      <Button onClick={() => updateGameMode('finished')}>
                        End Game
                      </Button>
                    )}
                  </div>
                )}

                {selectedGame.currentMode === 'finished' && (
                  <div className="text-center py-8">
                    <p className="text-2xl font-bold mb-4">Game Over!</p>
                    <div className="space-y-2">
                      {teams.sort((a, b) => b.score - a.score).map((team, i) => (
                        <p key={team.name} className={i === 0 ? 'text-xl font-bold' : ''}>
                          {i === 0 ? '🏆 ' : ''}{team.name}: {team.score} points
                        </p>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-app-gradient p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <Link href="/admin" className="text-gray-300 hover:text-white text-sm mb-2 inline-block">
              ← Back to Dashboard
            </Link>
            <h1 className="text-3xl font-bold text-white">Imposters</h1>
            <p className="text-gray-300">Manage deception games</p>
          </div>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>+ Create Game</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create Imposters Game</DialogTitle>
                <DialogDescription>
                  Set up a new game with teams and questions
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Game Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., Round 1"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="teams">Teams (one per line)</Label>
                  <Textarea
                    id="teams"
                    value={formData.teams}
                    onChange={(e) => setFormData(prev => ({ ...prev, teams: e.target.value }))}
                    placeholder="Team Alpha&#10;Team Beta&#10;Team Gamma"
                    rows={4}
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="participantsPerTeam">Participants per team</Label>
                    <Input
                      id="participantsPerTeam"
                      type="number"
                      min={1}
                      value={formData.participantsPerTeam}
                      onChange={(e) => setFormData(prev => ({ ...prev, participantsPerTeam: parseInt(e.target.value) || 3 }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="votersPerTeam">Voters per team</Label>
                    <Input
                      id="votersPerTeam"
                      type="number"
                      min={1}
                      value={formData.votersPerTeam}
                      onChange={(e) => setFormData(prev => ({ ...prev, votersPerTeam: parseInt(e.target.value) || 5 }))}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="questionPairs">Question Pairs</Label>
                  <p className="text-xs text-muted-foreground mb-2">
                    Format: <code className="bg-muted px-1 rounded">R:</code> for real question, <code className="bg-muted px-1 rounded">F:</code> for fake question (imposter gets this). Separate pairs with a blank line.
                  </p>
                  <Textarea
                    id="questionPairs"
                    value={formData.questionPairs}
                    onChange={(e) => setFormData(prev => ({ ...prev, questionPairs: e.target.value }))}
                    placeholder={`R: What's your favorite childhood memory?
F: What's your favorite adult beverage?

R: If you could have any superpower, what would it be?
F: If you could commit any crime, what would it be?

R: What's the best gift you've ever received?
F: What's the worst lie you've ever told?`}
                    rows={10}
                    required
                  />
                </div>

                <Button type="submit" className="w-full">Create Game</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {loading ? (
          <p className="text-white">Loading...</p>
        ) : games.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center">
              <p className="text-muted-foreground">No games created yet. Click "Create Game" to get started.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
            {games.map((game) => (
              <Card key={game.id} className="cursor-pointer hover:shadow-lg transition-shadow h-full" onClick={() => fetchGameDetails(game.id)}>
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg">{game.name}</CardTitle>
                  <CardDescription className="mt-2">
                    <Badge variant="secondary">{game.currentMode}</Badge>
                    <span className="ml-2 text-xs">{game._count?.participants || 0} participants</span>
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex gap-2 flex-col sm:flex-row">
                  <Button variant="outline" size="sm" className="flex-1" onClick={(e) => { e.stopPropagation(); copyPlayLink(game.id) }}>
                    Copy Player Link
                  </Button>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        fetchGameDetails(game.id)
                      }}
                    >
                      Manage Game
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={(e) => { e.stopPropagation(); handleDelete(game.id) }}
                    >
                      {deletingId === game.id ? 'Confirm?' : 'Delete'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
