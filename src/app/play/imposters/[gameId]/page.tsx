'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { Team } from '@/types'

interface Game {
  id: string
  name: string
  teams: string
  currentMode: string
}

export default function ImpostersSignup({ params }: { params: Promise<{ gameId: string }> }) {
  const { gameId } = use(params)
  const router = useRouter()
  const [game, setGame] = useState<Game | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  // Signup form
  const [name, setName] = useState('')
  const [team, setTeam] = useState('')
  const [role, setRole] = useState<'participant' | 'voter'>('participant')

  useEffect(() => {
    const fetchGame = async () => {
      try {
        const res = await fetch(`/api/imposters?id=${gameId}`)
        const data = await res.json()
        if (data.success) {
          setGame(data.game)
        } else {
          setError('Game not found')
        }
      } catch {
        setError('Failed to load game')
      } finally {
        setLoading(false)
      }
    }
    fetchGame()
  }, [gameId])

  const handleJoin = async () => {
    if (!name.trim()) {
      setError('Please enter your name')
      return
    }
    if (!team) {
      setError('Please select a team')
      return
    }

    setSubmitting(true)
    setError('')

    try {
      const res = await fetch('/api/imposters/participants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'join',
          gameId,
          name: name.trim(),
          teamName: team,
          role
        })
      })

      const data = await res.json()
      if (data.success) {
        router.push(`/play/imposters/${gameId}/${data.participant.id}`)
      } else {
        setError(data.error || 'Failed to join')
        setSubmitting(false)
      }
    } catch {
      setError('Failed to join game')
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-app-gradient">
        <p className="text-white">Loading...</p>
      </div>
    )
  }

  if (!game) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-app-gradient">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="py-10 text-center">
            <p className="text-muted-foreground">{error || 'Game not found'}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Game already started - can't join
  if (game.currentMode !== 'signup') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-app-gradient">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="py-10 text-center">
            <p className="text-lg font-medium mb-2">Game Already Started</p>
            <p className="text-muted-foreground">
              Signups are closed. If you already joined, use your unique player link to rejoin.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const teams: Team[] = JSON.parse(game.teams)

  return (
    <div className="min-h-screen flex items-center justify-center bg-app-gradient p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Join {game.name}</CardTitle>
          <CardDescription>Sign up to participate in the game</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Input
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={submitting}
            />
          </div>

          <div className="space-y-2">
            <Select value={team} onValueChange={setTeam} disabled={submitting}>
              <SelectTrigger>
                <SelectValue placeholder="Select your team" />
              </SelectTrigger>
              <SelectContent>
                {teams.map((t) => (
                  <SelectItem key={t.name} value={t.name}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Select value={role} onValueChange={(v) => setRole(v as 'participant' | 'voter')} disabled={submitting}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="participant">Participant (answer questions)</SelectItem>
                <SelectItem value="voter">Voter (vote for imposter)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <Button className="w-full" onClick={handleJoin} disabled={submitting}>
            {submitting ? 'Joining...' : 'Join Game'}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
