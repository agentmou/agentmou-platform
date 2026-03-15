import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { HalftoneBackground } from '@/components/brand/halftone-background'
import { FadeContent } from '@/components/reactbits/fade-content'
import { SpotlightCard } from '@/components/reactbits/spotlight-card'
import { 
  Shield, 
  Lock, 
  Eye, 
  Key, 
  Users, 
  FileCheck, 
  AlertTriangle,
  Server
} from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Security - AgentMou',
  description: 'Enterprise-grade security for your AI agent operations.',
}

const capabilities = [
  {
    icon: Shield,
    title: 'Workspace Isolation',
    description: 'Each workspace operates in complete isolation. Data, agents, and workflows are segregated at the infrastructure level to prevent any cross-tenant access.',
    status: 'Available',
  },
  {
    icon: Users,
    title: 'Role-Based Access Control',
    description: 'Granular RBAC with predefined roles (Owner, Admin, Member, Viewer) and customizable permissions. Control who can install agents, manage integrations, or view sensitive data.',
    status: 'Available',
  },
  {
    icon: Eye,
    title: 'Comprehensive Audit Logs',
    description: 'Every action is logged with full context: who, what, when, and where. Export logs for compliance or integrate with your SIEM.',
    status: 'Available',
  },
  {
    icon: Key,
    title: 'Secrets Management',
    description: 'Securely store and manage API keys, tokens, and credentials. Automatic rotation policies and never exposed in logs or UI.',
    status: 'Available',
  },
  {
    icon: AlertTriangle,
    title: 'Human-in-the-Loop',
    description: 'Configure agents to require human approval for critical or high-risk actions. Set thresholds and approval workflows.',
    status: 'Available',
  },
  {
    icon: Lock,
    title: 'Encryption',
    description: 'All data encrypted at rest (AES-256) and in transit (TLS 1.3). Customer-managed keys available on Enterprise plans.',
    status: 'Available',
  },
  {
    icon: FileCheck,
    title: 'Compliance',
    description: 'SOC 2 Type II certification in progress. GDPR compliant with data processing agreements available.',
    status: 'In Progress',
  },
  {
    icon: Server,
    title: 'Data Residency',
    description: 'Choose where your data is stored. EU and US regions available, with more coming soon.',
    status: 'Roadmap',
  },
]

const practices = [
  {
    title: 'Secure Development',
    items: [
      'All code reviewed before merge',
      'Automated security scanning in CI/CD',
      'Regular penetration testing',
      'Bug bounty program',
    ],
  },
  {
    title: 'Infrastructure Security',
    items: [
      'Cloud-native architecture on AWS/GCP',
      'Network isolation with VPCs',
      'DDoS protection',
      '24/7 monitoring and alerting',
    ],
  },
  {
    title: 'Operational Security',
    items: [
      'Principle of least privilege',
      'Multi-factor authentication required',
      'Regular access reviews',
      'Incident response procedures',
    ],
  },
]

export default function SecurityPage() {
  return (
    <div>
      <HalftoneBackground variant="mint" intensity="med" className="pt-24 pb-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <FadeContent>
            <div className="mx-auto max-w-3xl text-center">
              <Badge variant="secondary" className="mb-6">
                Enterprise-grade security
              </Badge>
              <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
                Security you can trust
              </h1>
              <p className="mt-6 text-lg text-muted-foreground">
                  AgentMou is built with security at its core. We protect your data, your integrations, and your business.
              </p>
            </div>
          </FadeContent>
        </div>
      </HalftoneBackground>
      
      <div className="py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">

        <FadeContent>
          <div className="mt-24">
            <h2 className="text-center text-2xl font-bold">Security Capabilities</h2>
            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {capabilities.map((capability, i) => (
                <FadeContent key={capability.title} delay={i * 0.05}>
                  <SpotlightCard className="h-full rounded-md border border-border/50 bg-card">
                    <Card className="border-0 shadow-none bg-transparent">
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <div className="rounded-lg bg-muted p-2">
                            <capability.icon className="h-5 w-5 text-muted-foreground" />
                          </div>
                          <Badge 
                            variant="outline"
                            className={
                              capability.status === 'Available' 
                                ? 'bg-[oklch(0.55_0.15_145/0.1)] text-[oklch(0.45_0.15_145)] border-[oklch(0.55_0.15_145/0.2)]'
                                : capability.status === 'In Progress'
                                ? 'bg-[oklch(0.70_0.15_70/0.1)] text-[oklch(0.50_0.15_70)] border-[oklch(0.70_0.15_70/0.2)]'
                                : 'bg-muted text-muted-foreground'
                            }
                          >
                            {capability.status}
                          </Badge>
                        </div>
                        <CardTitle className="mt-4 text-base">{capability.title}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <CardDescription className="text-sm">
                          {capability.description}
                        </CardDescription>
                      </CardContent>
                    </Card>
                  </SpotlightCard>
                </FadeContent>
              ))}
            </div>
          </div>
        </FadeContent>

        <FadeContent>
          <div className="mt-24">
            <h2 className="text-center text-2xl font-bold">Security Practices</h2>
            <div className="mt-12 grid gap-8 md:grid-cols-3">
              {practices.map((practice) => (
                <div key={practice.title}>
                  <h3 className="font-semibold">{practice.title}</h3>
                  <ul className="mt-4 space-y-3">
                    {practice.items.map((item) => (
                      <li key={item} className="flex items-start gap-3">
                        <div className="mt-1.5 h-1.5 w-1.5 rounded-full bg-foreground" />
                        <span className="text-sm text-muted-foreground">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </FadeContent>

        <FadeContent>
          <div className="mt-24">
            <Card className="bg-muted/50">
              <CardContent className="py-12 text-center">
                <h2 className="text-2xl font-bold">Questions about security?</h2>
                <p className="mt-4 text-muted-foreground">
                  Our security team is happy to answer your questions and provide additional documentation.
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Contact us at security@agentmou.io
                </p>
              </CardContent>
            </Card>
          </div>
        </FadeContent>
        </div>
      </div>
    </div>
  )
}
