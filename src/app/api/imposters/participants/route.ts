import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// Get participant info or join game
export async function POST(request: NextRequest) {
  try {
    const { gameId, name, teamName, role, action, participantId, answer, votedForId, questionNumber } = await request.json()

    // Join game
    if (action === 'join') {
      if (!gameId || !name || !teamName || !role) {
        return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
      }

      const game = await prisma.impostersGame.findUnique({
        where: { id: gameId }
      })

      if (!game) {
        return NextResponse.json({ error: 'Game not found' }, { status: 404 })
      }

      if (game.currentMode !== 'signup') {
        return NextResponse.json({ error: 'Game has already started' }, { status: 400 })
      }

      // Check if name is already taken in this game
      const existing = await prisma.impostersParticipant.findFirst({
        where: { gameId, name }
      })

      if (existing) {
        return NextResponse.json({ error: 'Name already taken' }, { status: 400 })
      }

      const participant = await prisma.impostersParticipant.create({
        data: {
          gameId,
          name,
          teamName,
          role
        }
      })

      return NextResponse.json({ success: true, participant })
    }

    // Submit answer
    if (action === 'submitAnswer') {
      if (!participantId || answer === undefined) {
        return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
      }

      await prisma.impostersParticipant.update({
        where: { id: participantId },
        data: { answer }
      })

      return NextResponse.json({ success: true })
    }

    // Cast vote
    if (action === 'vote') {
      if (!participantId || !votedForId || !gameId || questionNumber === undefined) {
        return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
      }

      // Check if already voted
      const existingVote = await prisma.impostersVote.findFirst({
        where: { voterId: participantId, questionNumber, gameId }
      })

      if (existingVote) {
        return NextResponse.json({ error: 'Already voted' }, { status: 400 })
      }

      await prisma.impostersVote.create({
        data: {
          gameId,
          questionNumber,
          voterId: participantId,
          votedForId
        }
      })

      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('Error with participant:', error)
    return NextResponse.json({ error: 'Operation failed' }, { status: 500 })
  }
}

// Get participant by ID or by gameId+participantId
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const gameId = searchParams.get('gameId')
    const participantId = searchParams.get('participantId')

    let participant

    if (id) {
      // Lookup by participant ID directly
      participant = await prisma.impostersParticipant.findUnique({
        where: { id },
        include: {
          game: true,
          votesCast: true
        }
      })
    } else if (gameId && participantId) {
      // Lookup by gameId + participantId
      participant = await prisma.impostersParticipant.findFirst({
        where: { 
          id: participantId,
          gameId 
        },
        include: {
          game: true,
          votesCast: true
        }
      })
    } else {
      return NextResponse.json({ error: 'Participant ID or gameId+participantId required' }, { status: 400 })
    }

    if (!participant) {
      return NextResponse.json({ error: 'Participant not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, participant })
  } catch (error) {
    console.error('Error fetching participant:', error)
    return NextResponse.json({ error: 'Failed to fetch participant' }, { status: 500 })
  }
}

// Delete participant
export async function DELETE(request: NextRequest) {
  try {
    const { participantId, gameId } = await request.json()

    if (!participantId || !gameId) {
      return NextResponse.json({ error: 'Participant ID and game ID required' }, { status: 400 })
    }

    // Check if game exists
    const game = await prisma.impostersGame.findUnique({
      where: { id: gameId }
    })

    if (!game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 })
    }

    // Delete participant
    await prisma.impostersParticipant.delete({
      where: { id: participantId }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting participant:', error)
    return NextResponse.json({ error: 'Failed to delete participant' }, { status: 500 })
  }
}
