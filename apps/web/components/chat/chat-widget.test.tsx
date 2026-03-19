import { createElement, type ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

vi.mock('./chat-panel', () => ({
  ChatPanel: () => null,
}))

vi.mock('framer-motion', () => ({
  AnimatePresence: ({ children }: { children: ReactNode }) => children,
  motion: new Proxy(
    {},
    {
      get: (_target, key: string | symbol) => {
        const tag = typeof key === 'string' ? key : 'div'

        return ({
          children,
          initial: _initial,
          animate: _animate,
          exit: _exit,
          transition: _transition,
          whileHover: _whileHover,
          whileTap: _whileTap,
          ...props
        }: {
          children?: ReactNode
          initial?: unknown
          animate?: unknown
          exit?: unknown
          transition?: unknown
          whileHover?: unknown
          whileTap?: unknown
          [key: string]: unknown
        }) => createElement(tag, props, children)
      },
    },
  ),
}))

import { ChatWidget } from './chat-widget'

describe('ChatWidget', () => {
  it('renders the closed radar pulse ring on the floating bubble', () => {
    const html = renderToStaticMarkup(<ChatWidget mode="public" />)

    expect(html).toContain('animate-ping')
    expect(html).toContain('bg-emerald-500/20')
  })
})
