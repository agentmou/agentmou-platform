'use client';

import { Bot, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';

export function ChatTypingIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex gap-3"
    >
      {/* Avatar matching message bubble style */}
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-sm shadow-emerald-500/20">
        <Bot className="h-4 w-4" />
      </div>

      {/* Typing bubble */}
      <div className="relative rounded-2xl rounded-tl-md bg-muted/70 ring-1 ring-border/50 px-4 py-3">
        {/* Sparkle indicator */}
        <Sparkles className="absolute -left-1 -top-1 h-3 w-3 text-emerald-500 opacity-60" />

        <div className="flex items-center gap-1.5">
          {/* Animated dots with emerald color */}
          <motion.span
            animate={{ scale: [1, 1.2, 1], opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 1, repeat: Infinity, delay: 0 }}
            className="h-2 w-2 rounded-full bg-emerald-500"
          />
          <motion.span
            animate={{ scale: [1, 1.2, 1], opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 1, repeat: Infinity, delay: 0.2 }}
            className="h-2 w-2 rounded-full bg-emerald-500"
          />
          <motion.span
            animate={{ scale: [1, 1.2, 1], opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 1, repeat: Infinity, delay: 0.4 }}
            className="h-2 w-2 rounded-full bg-emerald-500"
          />
        </div>
      </div>
    </motion.div>
  );
}
