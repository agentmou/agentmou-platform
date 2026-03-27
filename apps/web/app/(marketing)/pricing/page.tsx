'use client';

import Link from 'next/link';
import { Check, ArrowRight } from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { MinimalButton } from '@/components/ui/minimal-button';
import { HalftoneBackground } from '@/components/brand/halftone-background';
import { FadeContent } from '@/components/reactbits/fade-content';
import { TiltedCard } from '@/components/reactbits/tilted-card';
const plans = [
  {
    name: 'Starter',
    price: '$29',
    description: 'For small teams getting started with AI automation',
    features: [
      '3 agents included',
      '1,000 runs/month',
      '5 integrations',
      'Email support',
      'Basic analytics',
      '7-day log retention',
    ],
    cta: 'Start free trial',
    highlight: false,
  },
  {
    name: 'Pro',
    price: '$99',
    description: 'For growing businesses that need more power',
    features: [
      '10 agents included',
      '10,000 runs/month',
      'Unlimited integrations',
      'Priority support',
      'Advanced analytics',
      '30-day log retention',
      'Custom workflows',
      'Team collaboration',
    ],
    cta: 'Start free trial',
    highlight: true,
  },
  {
    name: 'Scale',
    price: 'Custom',
    description: 'For enterprises with advanced requirements',
    features: [
      'Unlimited agents',
      'Unlimited runs',
      'Unlimited integrations',
      'Dedicated support',
      'Custom analytics',
      '90-day log retention',
      'Custom workflows',
      'SSO & SAML',
      'SLA guarantee',
      'On-premise option',
    ],
    cta: 'Contact sales',
    highlight: false,
  },
];

const comparisonFeatures = [
  { feature: 'Agents', starter: '3', pro: '10', scale: 'Unlimited' },
  { feature: 'Runs/month', starter: '1,000', pro: '10,000', scale: 'Unlimited' },
  { feature: 'Integrations', starter: '5', pro: 'Unlimited', scale: 'Unlimited' },
  { feature: 'Team members', starter: '3', pro: '10', scale: 'Unlimited' },
  { feature: 'Log retention', starter: '7 days', pro: '30 days', scale: '90 days' },
  { feature: 'Custom workflows', starter: '-', pro: 'Yes', scale: 'Yes' },
  { feature: 'API access', starter: 'Yes', pro: 'Yes', scale: 'Yes' },
  { feature: 'SSO/SAML', starter: '-', pro: '-', scale: 'Yes' },
  { feature: 'SLA', starter: '-', pro: '-', scale: '99.9%' },
  { feature: 'Support', starter: 'Email', pro: 'Priority', scale: 'Dedicated' },
];

const faqs = [
  {
    question: 'What is a run?',
    answer:
      'A run is a single execution of an agent or workflow. Each time an agent processes a request or a workflow triggers, it counts as one run.',
  },
  {
    question: 'Can I change plans at any time?',
    answer:
      'Yes, you can upgrade or downgrade your plan at any time. Changes take effect immediately, and billing is prorated.',
  },
  {
    question: 'Do you offer a free trial?',
    answer: 'Yes, all plans come with a 14-day free trial. No credit card required to start.',
  },
  {
    question: 'What payment methods do you accept?',
    answer: 'We accept all major credit cards, as well as invoicing for annual Enterprise plans.',
  },
  {
    question: 'Is there a discount for annual billing?',
    answer: 'Yes, you save 20% when you choose annual billing on any plan.',
  },
  {
    question: 'What happens if I exceed my run limit?',
    answer:
      'We will notify you when you reach 80% of your limit. If you exceed it, additional runs are billed at $0.01 per run for Starter and $0.005 for Pro.',
  },
];

export default function PricingPage() {
  return (
    <div>
      <HalftoneBackground variant="mint" intensity="med" className="pt-24 pb-16">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <FadeContent>
            <div className="text-center">
              <p className="text-editorial-tiny mb-4">Pricing</p>
              <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">Simple, transparent</h1>
              <p className="mt-6 text-muted-foreground max-w-lg mx-auto">
                Choose the plan that fits your needs. All plans include a 14-day free trial.
              </p>
            </div>
          </FadeContent>
        </div>
      </HalftoneBackground>

      <div className="mx-auto max-w-7xl px-6 lg:px-8 pb-24">
        <div className="mt-20 grid gap-8 lg:grid-cols-3">
          {plans.map((plan, i) => (
            <FadeContent key={plan.name} delay={i * 0.1}>
              <TiltedCard className="h-full">
                <div
                  className={`relative h-full rounded-md border bg-card ${
                    plan.highlight ? 'border-foreground' : 'border-border/50'
                  }`}
                >
                  <div className="p-8">
                    {plan.highlight && (
                      <div className="absolute -top-3 left-6">
                        <span className="bg-foreground text-background px-3 py-1 text-[10px] uppercase tracking-wide font-medium">
                          Most popular
                        </span>
                      </div>
                    )}

                    <div className="mb-6">
                      <h3 className="text-lg font-semibold">{plan.name}</h3>
                      <p className="text-sm text-muted-foreground mt-1">{plan.description}</p>
                    </div>

                    <div className="mb-8">
                      <span className="text-4xl font-bold tracking-tight">{plan.price}</span>
                      {plan.price !== 'Custom' && (
                        <span className="text-muted-foreground text-sm">/month</span>
                      )}
                    </div>

                    <ul className="space-y-3 mb-8">
                      {plan.features.map((feature) => (
                        <li key={feature} className="flex items-start gap-3">
                          <Check className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                          <span className="text-sm">{feature}</span>
                        </li>
                      ))}
                    </ul>

                    <Link href="/app/demo-workspace/dashboard" className="block">
                      <MinimalButton
                        className="w-full"
                        variant={plan.highlight ? 'default' : 'outline'}
                      >
                        {plan.cta}
                      </MinimalButton>
                    </Link>
                  </div>
                </div>
              </TiltedCard>
            </FadeContent>
          ))}
        </div>

        <FadeContent>
          <div className="mt-32">
            <h2 className="text-center text-2xl font-bold tracking-tight mb-12">Compare plans</h2>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px]">
                <thead>
                  <tr className="border-b border-border/50">
                    <th className="py-4 text-left text-editorial-tiny">Feature</th>
                    <th className="py-4 text-center text-editorial-tiny">Starter</th>
                    <th className="py-4 text-center text-editorial-tiny">Pro</th>
                    <th className="py-4 text-center text-editorial-tiny">Scale</th>
                  </tr>
                </thead>
                <tbody>
                  {comparisonFeatures.map((row) => (
                    <tr key={row.feature} className="border-b border-border/30">
                      <td className="py-4 text-sm font-medium">{row.feature}</td>
                      <td className="py-4 text-center text-sm text-muted-foreground">
                        {row.starter}
                      </td>
                      <td className="py-4 text-center text-sm text-muted-foreground">{row.pro}</td>
                      <td className="py-4 text-center text-sm text-muted-foreground">
                        {row.scale}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </FadeContent>

        <FadeContent>
          <div className="mt-32">
            <h2 className="text-center text-2xl font-bold tracking-tight mb-12">Questions</h2>
            <div className="mx-auto max-w-2xl">
              <Accordion type="single" collapsible className="w-full">
                {faqs.map((faq, index) => (
                  <AccordionItem key={index} value={`item-${index}`} className="border-border/50">
                    <AccordionTrigger className="text-left text-sm font-medium hover:no-underline">
                      {faq.question}
                    </AccordionTrigger>
                    <AccordionContent className="text-sm text-muted-foreground">
                      {faq.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          </div>
        </FadeContent>

        <FadeContent>
          <div className="mt-32 text-center">
            <h2 className="text-3xl font-bold tracking-tight mb-4">Ready to get started?</h2>
            <p className="text-muted-foreground mb-8">
              Start your 14-day free trial today. No credit card required.
            </p>
            <Link href="/app/demo-workspace/dashboard">
              <MinimalButton size="lg">
                Try the demo
                <ArrowRight className="h-4 w-4" />
              </MinimalButton>
            </Link>
          </div>
        </FadeContent>
      </div>
    </div>
  );
}
