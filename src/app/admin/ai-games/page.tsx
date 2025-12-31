'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { DEFAULT_PROMPTS } from '@/lib/ai/providers'
import { toast } from 'sonner'
import type { AIGameType } from '@/types'

interface Template {
  id: string
  name: string
  gameType: string
  systemPrompt: string
  initialScore: number
  apiKeys: string
  createdAt: string
  _count: { sessions: number }
}

const GAME_TYPES: { value: AIGameType; label: string; emoji: string }[] = [
  { value: 'flirt', label: 'Flirt with AI', emoji: '💘' },
  { value: 'negotiate', label: 'Negotiate with AI', emoji: '💰' },
  { value: 'calm_kid', label: 'Calm the Kid', emoji: '👶' },
  { value: 'reveal_secret', label: 'Reveal the Secret', emoji: '🔐' },
  { value: 'custom', label: 'Custom Game', emoji: '🎮' },
]

export default function AIGamesAdmin() {
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false)
  const [templateToDelete, setTemplateToDelete] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    gameType: 'flirt' as AIGameType,
    systemPrompt: DEFAULT_PROMPTS.flirt,
    initialScore: 0,
    geminiKey: '',
    mistralKey: '',
    openaiKey: '',
    claudeKey: '',
  })

  useEffect(() => {
    fetchTemplates()
  }, [])

  const fetchTemplates = async () => {
    try {
      const res = await fetch('/api/ai-games')
      const data = await res.json()
      if (data.success) {
        setTemplates(data.templates)
      }
    } catch (error) {
      console.error('Error fetching templates:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleGameTypeChange = (value: AIGameType) => {
    setFormData(prev => ({
      ...prev,
      gameType: value,
      systemPrompt: value !== 'custom' && DEFAULT_PROMPTS[value] ? DEFAULT_PROMPTS[value] : prev.systemPrompt,
      initialScore: value === 'negotiate' ? 1000 : value === 'calm_kid' ? 10 : 0
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const apiKeys = {
      ...(formData.geminiKey && { gemini: formData.geminiKey }),
      ...(formData.mistralKey && { mistral: formData.mistralKey }),
      ...(formData.openaiKey && { openai: formData.openaiKey }),
      ...(formData.claudeKey && { claude: formData.claudeKey }),
    }

    if (Object.keys(apiKeys).length === 0) {
      toast.error('Please provide at least one API key')
      return
    }

    try {
      const res = await fetch('/api/ai-games', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          gameType: formData.gameType,
          systemPrompt: formData.systemPrompt,
          initialScore: formData.initialScore,
          apiKeys
        })
      })

      const data = await res.json()
      if (data.success) {
        setIsDialogOpen(false)
        setFormData({
          name: '',
          gameType: 'flirt',
          systemPrompt: DEFAULT_PROMPTS.flirt,
          initialScore: 0,
          geminiKey: '',
          mistralKey: '',
          openaiKey: '',
          claudeKey: '',
        })
        fetchTemplates()
      }
    } catch (error) {
      console.error('Error creating template:', error)
    }
  }

  const handleDelete = async (id: string) => {
    setTemplateToDelete(id)
    setIsDeleteConfirmOpen(true)
  }

  const confirmDelete = async () => {
    if (!templateToDelete) return
    
    try {
      await fetch(`/api/ai-games?id=${templateToDelete}`, { method: 'DELETE' })
      fetchTemplates()
      setIsDeleteConfirmOpen(false)
      setTemplateToDelete(null)
    } catch (error) {
      console.error('Error deleting template:', error)
    }
  }

  const copyPlayLink = (id: string) => {
    const url = `${window.location.origin}/play/ai/${id}`
    navigator.clipboard.writeText(url)
    toast.success('Play link copied!')
  }

  return (
    <div className="min-h-screen bg-app-gradient p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <Link href="/admin" className="text-gray-300 hover:text-white text-sm mb-2 inline-block">
              ← Back to Dashboard
            </Link>
            <h1 className="text-3xl font-bold text-white">AI Games</h1>
            <p className="text-gray-300">Create and manage AI-powered games</p>
          </div>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>+ Create Game</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create AI Game</DialogTitle>
                <DialogDescription>
                  Configure a new AI-powered game for players
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Game Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., Flirt Challenge Round 1"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="gameType">Game Type</Label>
                  <Select value={formData.gameType} onValueChange={handleGameTypeChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {GAME_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.emoji} {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="initialScore">Starting Score</Label>
                  <Input
                    id="initialScore"
                    type="number"
                    value={formData.initialScore}
                    onChange={(e) => setFormData(prev => ({ ...prev, initialScore: parseInt(e.target.value) || 0 }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="systemPrompt">System Prompt</Label>
                  <Textarea
                    id="systemPrompt"
                    value={formData.systemPrompt}
                    onChange={(e) => setFormData(prev => ({ ...prev, systemPrompt: e.target.value }))}
                    rows={10}
                    required
                  />
                </div>

                <div className="border-t pt-4">
                  <Label className="text-base font-semibold">API Keys (at least one required)</Label>
                  <p className="text-sm text-muted-foreground mb-3">
                    Providers are tried in order: Gemini → Mistral → OpenAI → Claude
                  </p>

                  <div className="grid gap-3">
                    <div className="space-y-1">
                      <Label htmlFor="geminiKey" className="text-sm">Google Gemini API Key</Label>
                      <Input
                        id="geminiKey"
                        type="password"
                        value={formData.geminiKey}
                        onChange={(e) => setFormData(prev => ({ ...prev, geminiKey: e.target.value }))}
                        placeholder="AIza..."
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="mistralKey" className="text-sm">Mistral API Key</Label>
                      <Input
                        id="mistralKey"
                        type="password"
                        value={formData.mistralKey}
                        onChange={(e) => setFormData(prev => ({ ...prev, mistralKey: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="openaiKey" className="text-sm">OpenAI API Key</Label>
                      <Input
                        id="openaiKey"
                        type="password"
                        value={formData.openaiKey}
                        onChange={(e) => setFormData(prev => ({ ...prev, openaiKey: e.target.value }))}
                        placeholder="sk-..."
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="claudeKey" className="text-sm">Anthropic Claude API Key</Label>
                      <Input
                        id="claudeKey"
                        type="password"
                        value={formData.claudeKey}
                        onChange={(e) => setFormData(prev => ({ ...prev, claudeKey: e.target.value }))}
                        placeholder="sk-ant-..."
                      />
                    </div>
                  </div>
                </div>

                <Button type="submit" className="w-full">Create Game</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {loading ? (
          <p className="text-white">Loading...</p>
        ) : templates.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center">
              <p className="text-muted-foreground">No games created yet. Click &quot;Create Game&quot; to get started.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
            {templates.map((template) => {
              const gameType = GAME_TYPES.find(t => t.value === template.gameType)
              return (
                <Card key={template.id} className="h-full">
                  <CardHeader className="pb-4">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <span className="text-2xl">{gameType?.emoji || '🎮'}</span>
                      {template.name}
                    </CardTitle>
                    <CardDescription className="flex items-center gap-2 mt-2">
                      <Badge variant="secondary">{gameType?.label || template.gameType}</Badge>
                      <span className="text-xs">{template._count.sessions} sessions</span>
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="text-sm text-muted-foreground">
                      Starting score: {template.initialScore}
                    </div>
                    <div className="flex gap-2 flex-col sm:flex-row">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => copyPlayLink(template.id)}
                      >
                        Copy Player Link
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDelete(template.id)}
                      >
                        Delete
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}

        {/* Delete Confirmation Dialog */}
        <Dialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Confirm Deletion</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete this game template and all its sessions?
                This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-end gap-3 mt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setIsDeleteConfirmOpen(false)
                  setTemplateToDelete(null)
                }}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={confirmDelete}
              >
                Delete
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
