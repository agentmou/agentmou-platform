'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Copy, Check, User, Bot, ArrowRight, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { ChatMessage } from '@/lib/chat/types';
import { motion } from 'framer-motion';

interface ChatMessageBubbleProps {
  message: ChatMessage;
}

export function ChatMessageBubble({ message }: ChatMessageBubbleProps) {
  const [copied, setCopied] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const isUser = message.role === 'user';

  const handleCopy = async () => {
    await navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Parse markdown-like formatting (bold, bullets, code)
  const formatContent = (content: string) => {
    const lines = content.split('\n');
    return lines.map((line, i) => {
      // Inline code
      let formatted = line.replace(
        /`([^`]+)`/g,
        '<code class="rounded bg-muted-foreground/10 px-1 py-0.5 text-[13px] font-mono">$1</code>'
      );
      // Bold text
      formatted = formatted.replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold">$1</strong>');
      // Bullet points
      if (formatted.startsWith('- ')) {
        formatted = `<span class="flex gap-2"><span class="text-emerald-500 font-medium">•</span><span>${formatted.slice(2)}</span></span>`;
      }
      // Numbered lists
      const numberMatch = formatted.match(/^(\d+)\.\s/);
      if (numberMatch) {
        formatted = `<span class="flex gap-2"><span class="text-emerald-500 font-medium min-w-[1rem]">${numberMatch[1]}.</span><span>${formatted.slice(numberMatch[0].length)}</span></span>`;
      }
      return (
        <span
          key={i}
          className={cn(line === '' && 'block h-3')}
          dangerouslySetInnerHTML={{ __html: formatted || '&nbsp;' }}
        />
      );
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={cn('group flex gap-3', isUser && 'flex-row-reverse')}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Avatar */}
      <div
        className={cn(
          'flex h-8 w-8 shrink-0 items-center justify-center rounded-xl transition-all',
          isUser
            ? 'bg-gradient-to-br from-foreground to-foreground/80 text-background shadow-sm'
            : 'bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-sm shadow-emerald-500/20'
        )}
      >
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>

      {/* Message */}
      <div className={cn('flex max-w-[85%] flex-col gap-2', isUser && 'items-end')}>
        <div
          className={cn(
            'relative rounded-2xl px-4 py-3 text-sm leading-relaxed',
            isUser
              ? 'rounded-tr-md bg-primary text-primary-foreground'
              : 'rounded-tl-md bg-muted/70 ring-1 ring-border/50'
          )}
        >
          {/* AI sparkle indicator */}
          {!isUser && (
            <Sparkles className="absolute -left-1 -top-1 h-3 w-3 text-emerald-500 opacity-60" />
          )}

          <div className="space-y-1">{formatContent(message.content)}</div>
        </div>

        {/* Actions - improved styling */}
        {!isUser && message.actions && message.actions.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-1">
            {message.actions.map((action, i) => (
              <Link key={i} href={action.href}>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 rounded-lg border-emerald-500/30 bg-emerald-500/5 text-xs hover:bg-emerald-500/10 hover:border-emerald-500/50 transition-all group/btn"
                >
                  {action.label}
                  <ArrowRight className="ml-1.5 h-3 w-3 transition-transform group-hover/btn:translate-x-0.5" />
                </Button>
              </Link>
            ))}
          </div>
        )}

        {!isUser && message.citations && message.citations.length > 0 && (
          <div className="mt-1 space-y-2">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Sources
            </p>
            <div className="space-y-2">
              {message.citations.map((citation) => (
                <Link
                  key={citation.id}
                  href={citation.href}
                  className="block rounded-lg border border-border/50 bg-background/70 p-2 text-xs transition-colors hover:border-emerald-500/40 hover:bg-emerald-500/5"
                >
                  <p className="font-medium text-foreground">{citation.title}</p>
                  <p className="mt-1 text-muted-foreground">{citation.excerpt}</p>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Copy button - appears on hover */}
        {!isUser && message.content && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: isHovered ? 1 : 0 }}
            className="flex items-center gap-1"
          >
            <Button
              variant="ghost"
              size="sm"
              className="h-6 rounded-md px-2 text-[11px] text-muted-foreground hover:text-foreground"
              onClick={handleCopy}
            >
              {copied ? (
                <>
                  <Check className="mr-1 h-3 w-3 text-emerald-500" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="mr-1 h-3 w-3" />
                  Copy
                </>
              )}
            </Button>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
