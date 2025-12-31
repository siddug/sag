import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { hashPhrase, verifyPhrase, createSession, setSessionCookie, clearSession } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const { phrase, action } = await request.json()

    if (action === 'logout') {
      await clearSession()
      return NextResponse.json({ success: true })
    }

    if (!phrase || typeof phrase !== 'string' || phrase.length < 3) {
      return NextResponse.json(
        { success: false, error: 'Phrase must be at least 3 characters' },
        { status: 400 }
      )
    }

    // Try to find existing admin with this phrase
    const admins = await prisma.admin.findMany()

    for (const admin of admins) {
      const matches = await verifyPhrase(phrase, admin.phraseHash)
      if (matches) {
        const token = await createSession(admin.id)
        await setSessionCookie(token)
        return NextResponse.json({ success: true, adminId: admin.id })
      }
    }

    // No match found - create new admin
    const phraseHash = await hashPhrase(phrase)
    const newAdmin = await prisma.admin.create({
      data: { phraseHash }
    })

    const token = await createSession(newAdmin.id)
    await setSessionCookie(token)

    return NextResponse.json({ success: true, adminId: newAdmin.id, isNew: true })
  } catch (error) {
    console.error('Auth error:', error)
    return NextResponse.json(
      { success: false, error: 'Authentication failed' },
      { status: 500 }
    )
  }
}
