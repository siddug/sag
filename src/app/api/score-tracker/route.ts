import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth'
import type { ScoreTeam, ScoreHistoryEntry } from '@/types'

// Get all games for admin or get specific game
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (id) {
      const game = await prisma.scoreTrackerGame.findUnique({
        where: { id }
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

    const games = await prisma.scoreTrackerGame.findMany({
      where: { adminId: session.adminId },
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

    const { name, teams } = await request.json()

    if (!name || !teams || !Array.isArray(teams)) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const teamsData: ScoreTeam[] = teams.map((t: { name: string; members: string[] }) => ({
      name: t.name,
      members: t.members || [],
      score: 0
    }))

    const game = await prisma.scoreTrackerGame.create({
      data: {
        adminId: session.adminId,
        name,
        teams: JSON.stringify(teamsData),
        scoreHistory: '[]'
      }
    })

    return NextResponse.json({ success: true, game })
  } catch (error) {
    console.error('Error creating game:', error)
    return NextResponse.json({ error: 'Failed to create game' }, { status: 500 })
  }
}

// Update scores
export async function PATCH(request: NextRequest) {
  try {
    const { id, teamName, delta } = await request.json()

    if (!id || !teamName || delta === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const game = await prisma.scoreTrackerGame.findUnique({
      where: { id }
    })

    if (!game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 })
    }

    const teams: ScoreTeam[] = JSON.parse(game.teams)
    const history: ScoreHistoryEntry[] = JSON.parse(game.scoreHistory)

    const teamIndex = teams.findIndex(t => t.name === teamName)
    if (teamIndex === -1) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 })
    }

    teams[teamIndex].score += delta
    history.push({
      team: teamName,
      delta,
      timestamp: new Date().toISOString()
    })

    await prisma.scoreTrackerGame.update({
      where: { id },
      data: {
        teams: JSON.stringify(teams),
        scoreHistory: JSON.stringify(history)
      }
    })

    return NextResponse.json({ success: true, teams })
  } catch (error) {
    console.error('Error updating scores:', error)
    return NextResponse.json({ error: 'Failed to update scores' }, { status: 500 })
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

    const game = await prisma.scoreTrackerGame.findFirst({
      where: { id, adminId: session.adminId }
    })

    if (!game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 })
    }

    await prisma.scoreTrackerGame.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting game:', error)
    return NextResponse.json({ error: 'Failed to delete game' }, { status: 500 })
  }
}
