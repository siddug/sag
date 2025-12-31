import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { nanoid } from 'nanoid'

// Create new session for a template
export async function POST(request: NextRequest) {
  try {
    const { templateId, playerName } = await request.json()

    if (!templateId) {
      return NextResponse.json({ error: 'Template ID required' }, { status: 400 })
    }

    const template = await prisma.aIGameTemplate.findUnique({
      where: { id: templateId }
    })

    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    }

    const session = await prisma.aIGameSession.create({
      data: {
        templateId,
        playerName: playerName || null,
        currentScore: template.initialScore,
        chatHistory: '[]'
      },
      include: { template: true }
    })

    return NextResponse.json({ success: true, session })
  } catch (error) {
    console.error('Error creating session:', error)
    return NextResponse.json({ error: 'Failed to create session' }, { status: 500 })
  }
}

// Get session by ID
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const shareId = searchParams.get('shareId')

    if (shareId) {
      const session = await prisma.aIGameSession.findUnique({
        where: { shareId },
        include: { template: true }
      })

      if (!session) {
        return NextResponse.json({ error: 'Session not found' }, { status: 404 })
      }

      return NextResponse.json({ success: true, session })
    }

    if (!id) {
      return NextResponse.json({ error: 'Session ID required' }, { status: 400 })
    }

    const session = await prisma.aIGameSession.findUnique({
      where: { id },
      include: { template: true }
    })

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, session })
  } catch (error) {
    console.error('Error fetching session:', error)
    return NextResponse.json({ error: 'Failed to fetch session' }, { status: 500 })
  }
}

// Update session (share/freeze)
export async function PATCH(request: NextRequest) {
  try {
    const { id, action, playerName } = await request.json()

    if (!id) {
      return NextResponse.json({ error: 'Session ID required' }, { status: 400 })
    }

    if (action === 'share') {
      const shareId = nanoid(10)
      const session = await prisma.aIGameSession.update({
        where: { id },
        data: {
          isFrozen: true,
          shareId
        }
      })

      return NextResponse.json({ success: true, shareId: session.shareId })
    }

    if (action === 'updateName' && playerName) {
      const session = await prisma.aIGameSession.update({
        where: { id },
        data: { playerName }
      })

      return NextResponse.json({ success: true, session })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('Error updating session:', error)
    return NextResponse.json({ error: 'Failed to update session' }, { status: 500 })
  }
}
