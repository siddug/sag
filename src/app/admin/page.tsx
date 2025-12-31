import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

const games = [
  {
    title: 'AI Games',
    description: 'Create and manage AI-powered games (Flirt, Negotiate, Calm the Kid, Reveal Secret)',
    href: '/admin/ai-games',
    emoji: '🤖',
  },
  {
    title: 'Imposters',
    description: 'Run the group deception game with questions and voting',
    href: '/admin/imposters',
    emoji: '🕵️',
  },
  {
    title: 'Score Tracker',
    description: 'Simple score tracking for team competitions',
    href: '/admin/score-tracker',
    emoji: '📊',
  },
]

export default function AdminDashboard() {
  return (
    <div className="min-h-screen bg-app-gradient p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">Admin Dashboard</h1>
            <p className="text-gray-300">Sid&apos;s Annual Games Control Center</p>
          </div>
          <form action="/api/auth" method="POST">
            <input type="hidden" name="action" value="logout" />
            <Button variant="outline" asChild>
              <Link href="/">Exit</Link>
            </Button>
          </form>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {games.map((game) => (
            <Link key={game.href} href={game.href}>
              <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer hover:scale-105 transition-transform">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <span className="text-2xl">{game.emoji}</span>
                    {game.title}
                  </CardTitle>
                  <CardDescription>{game.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button className="w-full">Manage</Button>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
