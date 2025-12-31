'use client'

import { useState, useEffect, use } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import type { ChatMessage } from '@/types'

interface Session {
  id: string
  playerName: string | null
  currentScore: number
  chatHistory: string
  template: {
    name: string
    gameType: string
  }
}

export default function SharePage({ params }: { params: Promise<{ shareId: string }> }) {
  const { shareId } = use(params)
  const [session, setSession] = useState<Session | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchSession = async () => {
      try {
        const res = await fetch(`/api/ai-games/sessions?shareId=${shareId}`)
        const data = await res.json()

        if (data.success) {
          setSession(data.session)
          setMessages(JSON.parse(data.session.chatHistory || '[]'))
        } else {
          setError('Session not found')
        }
      } catch {
        setError('Failed to load session')
      } finally {
        setLoading(false)
      }
    }

    fetchSession()
  }, [shareId])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-app-gradient">
        <p className="text-white">Loading...</p>
      </div>
    )
  }

  if (error || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-app-gradient">
        <Card className="w-full max-w-md">
          <CardContent className="py-10 text-center">
            <p className="text-muted-foreground">{error || 'Session not found'}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-app-gradient p-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <Card className="mb-4">
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle>{session.template.name}</CardTitle>
                {session.playerName && (
                  <p className="text-sm text-muted-foreground mt-1">
                    Played by: {session.playerName}
                  </p>
                )}
              </div>
              <Badge variant="secondary" className="text-lg px-3 py-1">
                Final Score: {session.currentScore}
              </Badge>
            </div>
          </CardHeader>
        </Card>

        {/* Chat History */}
        <Card>
          <CardContent className="p-4">
            <ScrollArea className="h-[60vh]">
              <div className="space-y-4">
                {messages.map((msg, i) => (
                  <div
                    key={i}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg px-4 py-2 ${
                        msg.role === 'user'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                      {msg.role === 'assistant' && msg.scoreDelta !== undefined && msg.scoreDelta !== 0 && (
                        <p className={`text-xs mt-1 ${msg.scoreDelta > 0 ? 'text-green-500' : 'text-red-500'}`}>
                          {msg.scoreDelta > 0 ? '+' : ''}{msg.scoreDelta} points
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
