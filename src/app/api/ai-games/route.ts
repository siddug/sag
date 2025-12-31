import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function GET() {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const templates = await prisma.aIGameTemplate.findMany({
      where: { adminId: session.adminId },
      include: {
        _count: {
          select: { sessions: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({ success: true, templates })
  } catch (error) {
    console.error('Error fetching templates:', error)
    return NextResponse.json({ error: 'Failed to fetch templates' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { name, gameType, systemPrompt, scoringInstructions, initialScore, apiKeys } = await request.json()

    if (!name || !gameType || !systemPrompt || !apiKeys) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const template = await prisma.aIGameTemplate.create({
      data: {
        adminId: session.adminId,
        name,
        gameType,
        systemPrompt,
        scoringInstructions: scoringInstructions || null,
        initialScore: initialScore || 0,
        apiKeys: JSON.stringify(apiKeys)
      }
    })

    return NextResponse.json({ success: true, template })
  } catch (error) {
    console.error('Error creating template:', error)
    return NextResponse.json({ error: 'Failed to create template' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Template ID required' }, { status: 400 })
    }

    // Verify ownership
    const template = await prisma.aIGameTemplate.findFirst({
      where: { id, adminId: session.adminId }
    })

    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    }

    // Delete all sessions first
    await prisma.aIGameSession.deleteMany({
      where: { templateId: id }
    })

    // Delete template
    await prisma.aIGameTemplate.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting template:', error)
    return NextResponse.json({ error: 'Failed to delete template' }, { status: 500 })
  }
}
