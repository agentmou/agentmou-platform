'use client';

import { ArrowRight, Lightbulb } from 'lucide-react';
import { QUICK_PROMPTS, type ChatMode } from '@/lib/chat/types';
import { motion } from 'framer-motion';

interface ChatQuickPromptsProps {
  mode: ChatMode;
  onSelect: (prompt: string) => void;
}

export function ChatQuickPrompts({ mode, onSelect }: ChatQuickPromptsProps) {
  const prompts = QUICK_PROMPTS[mode];

  return (
    <div className="border-t border-border/50 bg-gradient-to-t from-muted/30 to-transparent px-4 py-3">
      <div className="flex items-center gap-1.5 mb-2">
        <Lightbulb className="h-3 w-3 text-amber-500" />
        <p className="text-[11px] font-medium text-muted-foreground">Suggested prompts</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {prompts.map((prompt, i) => (
          <motion.button
            key={i}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            onClick={() => onSelect(prompt)}
            className="group flex items-center gap-1.5 rounded-lg border border-border/50 bg-background/80 px-3 py-2 text-xs text-muted-foreground transition-all hover:border-emerald-500/30 hover:bg-emerald-500/5 hover:text-foreground"
          >
            <span>{prompt}</span>
            <ArrowRight className="h-3 w-3 opacity-0 -translate-x-1 transition-all group-hover:opacity-100 group-hover:translate-x-0 text-emerald-500" />
          </motion.button>
        ))}
      </div>
    </div>
  );
}
