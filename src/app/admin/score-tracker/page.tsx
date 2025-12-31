'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import type { ScoreTeam } from '@/types'

interface Game {
  id: string
  name: string
  teams: string
  createdAt: string
}

interface TeamInput {
  name: string
  members: string
}

export default function ScoreTrackerAdmin() {
  const [games, setGames] = useState<Game[]>([])
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [gameName, setGameName] = useState('')
  const [teams, setTeams] = useState<TeamInput[]>([{ name: '', members: '' }])

  useEffect(() => {
    fetchGames()
  }, [])

  const fetchGames = async () => {
    try {
      const res = await fetch('/api/score-tracker')
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

  const addTeam = () => {
    setTeams(prev => [...prev, { name: '', members: '' }])
  }

  const removeTeam = (index: number) => {
    setTeams(prev => prev.filter((_, i) => i !== index))
  }

  const updateTeam = (index: number, field: 'name' | 'members', value: string) => {
    setTeams(prev => prev.map((t, i) => i === index ? { ...t, [field]: value } : t))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const validTeams = teams
      .filter(t => t.name.trim())
      .map(t => ({
        name: t.name.trim(),
        members: t.members.split(',').map(m => m.trim()).filter(Boolean)
      }))

    if (validTeams.length < 2) {
      toast.error('Need at least 2 teams')
      return
    }

    try {
      const res = await fetch('/api/score-tracker', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: gameName,
          teams: validTeams
        })
      })

      const data = await res.json()
      if (data.success) {
        setIsDialogOpen(false)
        setGameName('')
        setTeams([{ name: '', members: '' }])
        fetchGames()
      }
    } catch (error) {
      console.error('Error creating game:', error)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this score tracker?')) return

    try {
      await fetch(`/api/score-tracker?id=${id}`, { method: 'DELETE' })
      fetchGames()
    } catch (error) {
      console.error('Error deleting game:', error)
    }
  }

  const copyPlayLink = (id: string) => {
    const url = `${window.location.origin}/play/score/${id}`
    navigator.clipboard.writeText(url)
    toast.success('Score tracker link copied!')
  }

  return (
    <div className="min-h-screen bg-app-gradient p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <Link href="/admin" className="text-gray-300 hover:text-white text-sm mb-2 inline-block">
              ← Back to Dashboard
            </Link>
            <h1 className="text-3xl font-bold text-white">Score Tracker</h1>
            <p className="text-gray-300">Track team scores during competitions</p>
          </div>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>+ New Tracker</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create Score Tracker</DialogTitle>
                <DialogDescription>
                  Set up teams and their members
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Game Name</Label>
                  <Input
                    id="name"
                    value={gameName}
                    onChange={(e) => setGameName(e.target.value)}
                    placeholder="e.g., Annual Games 2024"
                    required
                  />
                </div>

                <div className="space-y-3">
                  <Label>Teams</Label>
                  {teams.map((team, index) => (
                    <div key={index} className="space-y-2 p-4 bg-muted rounded-lg">
                      <div className="flex gap-2">
                        <Input
                          placeholder="Team name"
                          value={team.name}
                          onChange={(e) => updateTeam(index, 'name', e.target.value)}
                        />
                        {teams.length > 1 && (
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            onClick={() => removeTeam(index)}
                          >
                            Remove
                          </Button>
                        )}
                      </div>
                      <Input
                        placeholder="Members (comma-separated): John, Jane, Bob"
                        value={team.members}
                        onChange={(e) => updateTeam(index, 'members', e.target.value)}
                      />
                    </div>
                  ))}
                  <Button type="button" variant="outline" onClick={addTeam}>
                    + Add Team
                  </Button>
                </div>

                <Button type="submit" className="w-full">Create Tracker</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {loading ? (
          <p className="text-white">Loading...</p>
        ) : games.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center">
              <p className="text-muted-foreground">No score trackers yet. Click "New Tracker" to get started.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
            {games.map((game) => {
              const teamsData: ScoreTeam[] = JSON.parse(game.teams)
              return (
                <Card key={game.id} className="h-full">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-lg">{game.name}</CardTitle>
                    <CardDescription className="mt-2">
                      {teamsData.length} teams
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="space-y-1">
                      {teamsData.map((team) => (
                        <div key={team.name} className="flex justify-between items-center text-sm">
                          <span>{team.name}</span>
                          <Badge variant="secondary">{team.score}</Badge>
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-2 flex-col sm:flex-row">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => copyPlayLink(game.id)}
                      >
                        Copy Admin Link
                      </Button>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => window.open(`/play/score/${game.id}`, '_blank')}
                        >
                          Enter Room
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDelete(game.id)}
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
