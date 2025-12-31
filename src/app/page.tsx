import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

const games = [
  {
    title: 'Flirt with AI',
    description: 'Can you charm an AI date? Score points with your best pickup lines!',
    emoji: '💘',
    time: '5 mins',
  },
  {
    title: 'Negotiate with AI',
    description: 'Haggle down the price of a premium item. Lower price = better score!',
    emoji: '💰',
    time: '5 mins',
  },
  {
    title: 'Imposters',
    description: 'One person gets a different question. Spot the imposter!',
    emoji: '🕵️',
    time: '15 mins',
  },
  {
    title: 'Calm the Kid',
    description: 'An AI child is throwing a tantrum. Can you calm them down?',
    emoji: '👶',
    time: '5 mins',
  },
  {
    title: 'Reveal the Secret',
    description: 'The AI has a secret. Can you get them to reveal it?',
    emoji: '🔐',
    time: '5 mins',
  },
  {
    title: 'Score Tracker',
    description: 'Simple team score tracking for any competition.',
    emoji: '📊',
    time: 'Ongoing',
  },
]

export default function Home() {
  return (
    <div className="min-h-screen bg-app-gradient">
      {/* Hero */}
      <div className="container mx-auto px-4 py-16 text-center">
        <h1 className="text-5xl md:text-7xl font-bold text-white mb-4">
          Sid&apos;s Annual Games
        </h1>
        <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
          A collection of fun party games featuring AI challenges, group deception, and more!
        </p>
        <div className="flex gap-4 justify-center">
          <Button asChild size="lg" className="text-lg px-8">
            <Link href="/login">Admin Login</Link>
          </Button>
        </div>
      </div>

      {/* Games Grid */}
      <div className="container mx-auto px-4 pb-16">
        <h2 className="text-3xl font-bold text-white text-center mb-8">Games</h2>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 max-w-5xl mx-auto">
          {games.map((game) => (
            <Card key={game.title} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="text-4xl mb-2">{game.emoji}</div>
                <CardTitle>{game.title}</CardTitle>
                <CardDescription>{game.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <span className="text-sm text-muted-foreground">
                  Duration: {game.time}
                </span>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* How it Works */}
      <div className="container mx-auto px-4 pb-16">
        <h2 className="text-3xl font-bold text-white text-center mb-8">How It Works</h2>
        <div className="grid gap-6 md:grid-cols-3 max-w-4xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="text-2xl">1</span> Admin Creates
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Login with a secret phrase and create your games with custom settings.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="text-2xl">2</span> Share Links
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Each game gets a unique link. Share it with players to join.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="text-2xl">3</span> Play & Score
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Players compete, scores are tracked, and winners are crowned!
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Footer */}
      <footer className="container mx-auto px-4 py-8 text-center text-gray-400 text-sm">
        Made for Sid&apos;s Annual Games celebration
      </footer>
    </div>
  )
}
