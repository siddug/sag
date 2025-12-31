'use client'

import { useState, useEffect, use } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import type { ScoreTeam } from '@/types'

interface Game {
  id: string
  name: string
  teams: string
}

const SCORE_BUTTONS = [
  { value: 1, color: 'bg-green-400 hover:bg-green-500' },
  { value: -1, color: 'bg-red-300 hover:bg-red-400' },
  { value: 5, color: 'bg-green-500 hover:bg-green-600' },
  { value: 10, color: 'bg-green-600 hover:bg-green-700' },
  { value: 15, color: 'bg-green-700 hover:bg-green-800' },
  { value: 50, color: 'bg-emerald-600 hover:bg-emerald-700' },
  { value: -5, color: 'bg-red-400 hover:bg-red-500' },
  { value: -10, color: 'bg-red-500 hover:bg-red-600' },
  { value: -15, color: 'bg-red-600 hover:bg-red-700' },
  { value: -50, color: 'bg-rose-600 hover:bg-rose-700' },
]

export default function ScoreTrackerPlayer({ params }: { params: Promise<{ gameId: string }> }) {
  const { gameId } = use(params)
  const [game, setGame] = useState<Game | null>(null)
  const [teams, setTeams] = useState<ScoreTeam[]>([])
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchGame = async () => {
    try {
      const res = await fetch(`/api/score-tracker?id=${gameId}`)
      const data = await res.json()
      if (data.success) {
        setGame(data.game)
        setTeams(JSON.parse(data.game.teams))
      } else {
        setError('Game not found')
      }
    } catch {
      setError('Failed to load game')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchGame()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameId])

  // Polling for live updates
  useEffect(() => {
    const interval = setInterval(fetchGame, 5000)
    return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameId])

  const updateScore = async (teamName: string, delta: number) => {
    try {
      const res = await fetch('/api/score-tracker', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: gameId, teamName, delta })
      })

      const data = await res.json()
      if (data.success) {
        setTeams(data.teams)
      }
    } catch {
      console.error('Failed to update score')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-app-gradient">
        <p className="text-white">Loading...</p>
      </div>
    )
  }

  if (error || !game) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-app-gradient">
        <Card className="w-full max-w-md">
          <CardContent className="py-10 text-center">
            <p className="text-muted-foreground">{error || 'Game not found'}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const selectedTeamData = teams.find(t => t.name === selectedTeam)

  return (
    <div className="min-h-screen bg-app-gradient p-4">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <Card className="mb-4">
          <CardHeader className="py-3">
            <CardTitle className="text-center">{game.name}</CardTitle>
          </CardHeader>
        </Card>

        {/* Team Selector */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
          {teams.map((team) => (
            <button
              key={team.name}
              onClick={() => setSelectedTeam(team.name)}
              className={`flex-shrink-0 px-4 py-3 rounded-lg transition-colors ${
                selectedTeam === team.name
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-card hover:bg-muted'
              }`}
            >
              <p className="font-medium whitespace-nowrap">{team.name}</p>
              <p className="text-2xl font-bold">{team.score}</p>
            </button>
          ))}
        </div>

        {/* Score Buttons */}
        {selectedTeam && (
          <Card>
            <CardHeader className="py-3 flex flex-row items-center justify-between">
              <CardTitle className="text-lg">{selectedTeam}</CardTitle>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-xl px-3 py-1">
                  {selectedTeamData?.score || 0}
                </Badge>
                {selectedTeamData && selectedTeamData.members.length > 0 && (
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm">
                        Members
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>{selectedTeam} Members</DialogTitle>
                      </DialogHeader>
                      <ScrollArea className="max-h-[60vh]">
                        <div className="space-y-2">
                          {selectedTeamData.members.map((member, i) => (
                            <div key={i} className="p-3 bg-muted rounded-lg">
                              {member}
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </DialogContent>
                  </Dialog>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-3">
                {SCORE_BUTTONS.map((btn) => (
                  <Button
                    key={btn.value}
                    className={`h-16 text-lg font-bold text-white ${btn.color}`}
                    onClick={() => updateScore(selectedTeam, btn.value)}
                  >
                    {btn.value > 0 ? '+' : ''}{btn.value}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {!selectedTeam && (
          <Card>
            <CardContent className="py-10 text-center">
              <p className="text-muted-foreground">Select a team above to update scores</p>
            </CardContent>
          </Card>
        )}

        {/* Scoreboard Summary */}
        <Card className="mt-4">
          <CardHeader className="py-3">
            <CardTitle className="text-lg">Scoreboard</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {[...teams].sort((a, b) => b.score - a.score).map((team, i) => (
                <div
                  key={team.name}
                  className={`flex justify-between items-center p-3 rounded-lg ${
                    i === 0 ? 'bg-yellow-100 dark:bg-yellow-900/30' : 'bg-muted'
                  }`}
                >
                  <span className="font-medium">
                    {i === 0 && '🏆 '}{team.name}
                  </span>
                  <Badge variant={i === 0 ? 'default' : 'secondary'}>
                    {team.score}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
