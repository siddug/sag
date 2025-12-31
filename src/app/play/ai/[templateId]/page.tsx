'use client'

import { useState, useEffect, useRef, use } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import type { ChatMessage } from '@/types'

interface Session {
  id: string
  templateId: string
  playerName: string | null
  currentScore: number
  chatHistory: string
  isFrozen: boolean
  shareId: string | null
  template: {
    name: string
    gameType: string
    initialScore: number
  }
}

export default function AIGamePlayer({ params }: { params: Promise<{ templateId: string }> }) {
  const { templateId } = use(params)
  const [session, setSession] = useState<Session | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [playerName, setPlayerName] = useState('')
  const [showNamePrompt, setShowNamePrompt] = useState(true)
  const [error, setError] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)

  const createSession = async (name?: string) => {
    try {
      const res = await fetch('/api/ai-games/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateId, playerName: name })
      })
      const data = await res.json()
      if (data.success) {
        setSession(data.session)
        setMessages([])
        setShowNamePrompt(false)
      } else {
        setError(data.error || 'Failed to start game')
      }
    } catch {
      setError('Failed to connect to server')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // Just validate the template exists
    fetch(`/api/ai-games/sessions?id=check-template-${templateId}`)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [templateId])

  const handleStartGame = () => {
    setLoading(true)
    createSession(playerName || undefined)
  }

  const sendMessage = async () => {
    if (!input.trim() || !session || sending) return

    const userMessage = input.trim()
    setInput('')
    setSending(true)

    // Add user message immediately
    const newUserMessage: ChatMessage = { role: 'user', content: userMessage }
    setMessages(prev => [...prev, newUserMessage])

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: session.id, message: userMessage })
      })

      const data = await res.json()

      if (data.success) {
        const aiMessage: ChatMessage = {
          role: 'assistant',
          content: data.message,
          scoreDelta: data.scoreDelta
        }
        setMessages(prev => [...prev, aiMessage])
        setSession(prev => prev ? { ...prev, currentScore: data.currentScore } : null)
      } else {
        setError(data.error || 'Failed to get response')
      }
    } catch {
      setError('Failed to send message')
    } finally {
      setSending(false)
    }
  }

  const handleShare = async () => {
    if (!session) return

    try {
      const res = await fetch('/api/ai-games/sessions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: session.id, action: 'share' })
      })

      const data = await res.json()
      if (data.success && data.shareId) {
        const shareUrl = `${window.location.origin}/share/${data.shareId}`
        await navigator.clipboard.writeText(shareUrl)
        toast.success('Share link copied! Your score is now frozen.')
        setSession(prev => prev ? { ...prev, isFrozen: true, shareId: data.shareId } : null)
      }
    } catch {
      setError('Failed to share')
      toast.error('Failed to share. Please try again.')
    }
  }

  useEffect(() => {
    // Scroll to bottom when messages change
    const scrollContainer = scrollRef.current
    if (scrollContainer) {
      // Use setTimeout to ensure DOM is updated
      const timer = setTimeout(() => {
        // For ScrollArea, we need to scroll the viewport element
        const viewport = scrollContainer.querySelector('[data-radix-scroll-area-viewport]')
        if (viewport) {
          viewport.scrollTo({
            top: viewport.scrollHeight,
            behavior: 'smooth'
          })
        } else {
          // Fallback for direct scrolling
          scrollContainer.scrollTo({
            top: scrollContainer.scrollHeight,
            behavior: 'smooth'
          })
        }
      }, 50)
      
      return () => clearTimeout(timer)
    }
  }, [messages])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-app-gradient">
        <p className="text-white">Loading...</p>
      </div>
    )
  }

  if (showNamePrompt) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-app-gradient p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center">Ready to Play?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Input
                placeholder="Enter your name (optional)"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
              />
            </div>
            <Button className="w-full" onClick={handleStartGame}>
              Start Game
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-app-gradient">
        <p className="text-white">No session found</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-app-gradient p-4">
      <div className="max-w-2xl mx-auto h-[calc(100vh-2rem)] flex flex-col">
        {/* Header */}
        <Card className="mb-4">
          <CardContent className="py-3 flex justify-between items-center">
            <div>
              <h1 className="font-bold">{session.template?.name || 'AI Game'}</h1>
              {session.playerName && (
                <p className="text-sm text-muted-foreground">{session.playerName}</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-lg px-3 py-1">
                Score: {session?.currentScore ?? 0}
              </Badge>
              {!session?.isFrozen && messages.length > 0 && (
                <Button variant="outline" size="sm" onClick={handleShare}>
                  Share
                </Button>
              )}
              {session?.isFrozen && (
                <Badge variant="outline">Frozen</Badge>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Chat Area */}
        <Card className="flex-1 flex flex-col overflow-hidden">
          <ScrollArea className="flex-1 p-4 overflow-y-auto" ref={scrollRef}>
            <div className="space-y-4">
              {messages.length === 0 && (
                <p className="text-center text-muted-foreground py-8">
                  Send a message to start the conversation!
                </p>
              )}
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
              {sending && (
                <div className="flex justify-start">
                  <div className="bg-muted rounded-lg px-4 py-2">
                    <p className="text-muted-foreground">Thinking...</p>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Input Area */}
          {!session?.isFrozen && (
            <div className="p-4 border-t">
              {error && <p className="text-red-500 text-sm mb-2">{error}</p>}
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  sendMessage()
                }}
                className="flex gap-2"
              >
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Type your message..."
                  disabled={sending}
                />
                <Button type="submit" disabled={sending || !input.trim()}>
                  Send
                </Button>
              </form>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
