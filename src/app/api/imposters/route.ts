import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth'

// Get all games for admin or get specific game
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (id) {
      const game = await prisma.impostersGame.findUnique({
        where: { id },
        include: {
          participants: {
            orderBy: { createdAt: 'asc' }
          },
          votes: true
        }
      })

      if (!game) {
        return NextResponse.json({ error: 'Game not found' }, { status: 404 })
      }

      return NextResponse.json({ success: true, game })
    }

    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const games = await prisma.impostersGame.findMany({
      where: { adminId: session.adminId },
      include: {
        _count: { select: { participants: true } }
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({ success: true, games })
  } catch (error) {
    console.error('Error fetching games:', error)
    return NextResponse.json({ error: 'Failed to fetch games' }, { status: 500 })
  }
}

// Create new game
export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { name, teams, questionPairs, participantsPerTeam, votersPerTeam } = await request.json()

    if (!name || !teams || !questionPairs) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const game = await prisma.impostersGame.create({
      data: {
        adminId: session.adminId,
        name,
        teams: JSON.stringify(teams.map((t: string) => ({ name: t, score: 0 }))),
        questionPairs: JSON.stringify(questionPairs),
        participantsPerTeam: participantsPerTeam || 3,
        votersPerTeam: votersPerTeam || 5,
        currentMode: 'signup'
      }
    })

    return NextResponse.json({ success: true, game })
  } catch (error) {
    console.error('Error creating game:', error)
    return NextResponse.json({ error: 'Failed to create game' }, { status: 500 })
  }
}

// Update game mode
export async function PATCH(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id, action, mode, questionNumber, teams } = await request.json()

    if (!id) {
      return NextResponse.json({ error: 'Game ID required' }, { status: 400 })
    }

    const game = await prisma.impostersGame.findFirst({
      where: { id, adminId: session.adminId },
      include: { participants: true }
    })

    if (!game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 })
    }

    if (action === 'updateMode' && mode) {
      await prisma.impostersGame.update({
        where: { id },
        data: { currentMode: mode }
      })
      return NextResponse.json({ success: true })
    }

    if (action === 'startQuestion' && questionNumber !== undefined) {
      // Reset answers and fake question assignments for ALL participants
      await prisma.impostersParticipant.updateMany({
        where: {
          gameId: id,
          role: 'participant'
        },
        data: {
          answer: null,
          hasFakeQuestion: false,
          questionNumber: questionNumber
        }
      })

      // Clear votes for this question
      await prisma.impostersVote.deleteMany({
        where: { gameId: id, questionNumber }
      })

      // Refetch participants to get fresh data after reset
      const freshParticipants = await prisma.impostersParticipant.findMany({
        where: { gameId: id, role: 'participant' }
      })

      // Randomly assign fake question to ONE participant across ALL teams
      if (freshParticipants.length > 0) {
        const randomIndex = Math.floor(Math.random() * freshParticipants.length)
        const imposterId = freshParticipants[randomIndex].id

        await prisma.impostersParticipant.update({
          where: { id: imposterId },
          data: { hasFakeQuestion: true }
        })
      }

      await prisma.impostersGame.update({
        where: { id },
        data: {
          currentMode: `question-${questionNumber}`,
          currentQuestion: questionNumber
        }
      })

      return NextResponse.json({ success: true })
    }

    if (action === 'updateScores' && teams) {
      await prisma.impostersGame.update({
        where: { id },
        data: { teams: JSON.stringify(teams) }
      })
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('Error updating game:', error)
    return NextResponse.json({ error: 'Failed to update game' }, { status: 500 })
  }
}

// Delete game
export async function DELETE(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Game ID required' }, { status: 400 })
    }

    const game = await prisma.impostersGame.findFirst({
      where: { id, adminId: session.adminId }
    })

    if (!game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 })
    }

    // Delete in transaction to ensure atomicity
    await prisma.$transaction([
      // Delete votes first (they reference participants)
      prisma.impostersVote.deleteMany({ where: { gameId: id } }),
      // Delete participants
      prisma.impostersParticipant.deleteMany({ where: { gameId: id } }),
      // Delete game
      prisma.impostersGame.delete({ where: { id } })
    ])

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting game:', error)
    return NextResponse.json({ error: 'Failed to delete game' }, { status: 500 })
  }
}
