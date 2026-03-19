'use client'

import { useState } from 'react'
import { MessageCircle, X, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ChatPanel } from './chat-panel'
import type { ChatMode, WorkspaceContextSnapshot } from '@/lib/chat/types'
import { motion, AnimatePresence } from 'framer-motion'

interface ChatWidgetProps {
  mode: ChatMode
  workspaceId?: string
  contextSnapshot?: WorkspaceContextSnapshot
}

export function ChatWidget({ mode, workspaceId, contextSnapshot }: ChatWidgetProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const hoverLabel =
    mode === 'public' ? 'Open demo assistant' : 'Open assistant preview'

  return (
    <>
      {/* Chat panel with animation */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
          >
            <ChatPanel
              mode={mode}
              workspaceId={workspaceId}
              contextSnapshot={contextSnapshot}
              onClose={() => setIsOpen(false)}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating button */}
      <div className="fixed bottom-6 right-6 z-50">
        {/* Tooltip on hover */}
        <AnimatePresence>
          {isHovered && !isOpen && (
            <motion.div
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              className="absolute right-full mr-3 top-1/2 -translate-y-1/2 whitespace-nowrap"
            >
              <div className="rounded-lg bg-foreground px-3 py-1.5 text-sm font-medium text-background shadow-lg">
                {hoverLabel}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Button with glow effect */}
        <motion.button
          onClick={() => setIsOpen(!isOpen)}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className={cn(
            "relative flex h-14 w-14 items-center justify-center rounded-full transition-all duration-300",
            "shadow-lg hover:shadow-xl",
            isOpen
              ? "bg-muted text-muted-foreground"
              : "bg-gradient-to-br from-emerald-500 to-emerald-600 text-white"
          )}
        >
          {!isOpen && (
            <span className="absolute inset-0 rounded-full bg-emerald-500/20 animate-ping" />
          )}
          
          {/* Icon with transition */}
          <motion.div
            initial={false}
            animate={{ rotate: isOpen ? 90 : 0 }}
            transition={{ duration: 0.2 }}
          >
            {isOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <div className="relative">
                <MessageCircle className="h-6 w-6" />
                <Sparkles className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-2.5 w-2.5 text-yellow-300" />
              </div>
            )}
          </motion.div>
        </motion.button>
      </div>
    </>
  )
}
