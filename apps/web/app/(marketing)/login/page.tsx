'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Bot } from 'lucide-react'
import { HalftoneBackground } from '@/components/brand/halftone-background'
import { HalftoneIllustration } from '@/components/brand/halftone-illustration'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    
    // Simulate login delay
    await new Promise((resolve) => setTimeout(resolve, 1000))
    
    // Mock login - redirect to demo workspace
    router.push('/app/demo-workspace/dashboard')
  }

  return (
    <HalftoneBackground variant="mint" intensity="low" className="min-h-[calc(100vh-4rem)]">
      <div className="relative flex min-h-[calc(100vh-4rem)] items-center justify-center py-12">
        {/* Subtle robot illustration */}
        <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-64 opacity-50">
          <HalftoneIllustration type="robot-head" opacity={0.05} />
        </div>
        
        <Card className="relative z-10 w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-foreground">
            <Bot className="h-6 w-6 text-background" />
          </div>
          <CardTitle className="text-2xl">Welcome back</CardTitle>
          <CardDescription>Sign in to your AgentMou account</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Signing in...' : 'Sign in'}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              {"Don't have an account? "}
              <Link href="/app/demo-workspace/dashboard" className="font-medium text-foreground hover:underline">
                Get started
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
      </div>
    </HalftoneBackground>
  )
}
