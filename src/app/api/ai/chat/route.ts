import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { generateAIResponse } from '@/lib/ai/providers'
import type { ChatMessage, APIKeys } from '@/types'

export async function POST(request: NextRequest) {
  try {
    const { sessionId, message } = await request.json()

    if (!sessionId || !message) {
      return NextResponse.json({ error: 'Session ID and message required' }, { status: 400 })
    }

    const session = await prisma.aIGameSession.findUnique({
      where: { id: sessionId },
      include: { template: true }
    })

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    if (session.isFrozen) {
      return NextResponse.json({ error: 'Session is frozen' }, { status: 400 })
    }

    // Get chat history
    const chatHistory: ChatMessage[] = JSON.parse(session.chatHistory || '[]')

    // Add user message
    const userMessage: ChatMessage = {
      role: 'user',
      content: message
    }
    chatHistory.push(userMessage)

    // Get API keys
    const apiKeys: APIKeys = JSON.parse(session.template.apiKeys)

    // Generate AI response
    const aiResponse = await generateAIResponse(
      apiKeys,
      session.template.systemPrompt,
      chatHistory
    )

    // Add AI response to chat history
    const assistantMessage: ChatMessage = {
      role: 'assistant',
      content: aiResponse.message,
      scoreDelta: aiResponse.scoreDelta
    }
    chatHistory.push(assistantMessage)

    // Calculate new score
    const newScore = session.currentScore + aiResponse.scoreDelta

    // Update session
    await prisma.aIGameSession.update({
      where: { id: sessionId },
      data: {
        chatHistory: JSON.stringify(chatHistory),
        currentScore: newScore
      }
    })

    return NextResponse.json({
      success: true,
      message: aiResponse.message,
      scoreDelta: aiResponse.scoreDelta,
      currentScore: newScore,
      reasoning: aiResponse.reasoning
    })
  } catch (error) {
    console.error('Error in chat:', error)
    return NextResponse.json({ error: 'Failed to generate response' }, { status: 500 })
  }
}
