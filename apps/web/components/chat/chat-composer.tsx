'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Loader2, Mic } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

interface ChatComposerProps {
  onSend: (content: string) => void;
  disabled?: boolean;
  footerHint?: string;
  placeholder?: string;
}

export function ChatComposer({
  onSend,
  disabled,
  footerHint = 'Press Enter to send, Shift+Enter for new line',
  placeholder = 'Type your message...',
}: ChatComposerProps) {
  const [value, setValue] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
    }
  }, [value]);

  const handleSubmit = () => {
    if (!value.trim() || disabled) return;
    onSend(value.trim());
    setValue('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="border-t border-border/50 bg-background/50 p-3">
      <div
        className={cn(
          'flex items-end gap-2 rounded-xl border bg-background p-1 transition-all duration-200',
          isFocused
            ? 'border-emerald-500/50 ring-2 ring-emerald-500/10'
            : 'border-border/50 hover:border-border'
        )}
      >
        <Textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder}
          disabled={disabled}
          className="min-h-[40px] max-h-[120px] resize-none border-0 bg-transparent px-3 py-2.5 text-sm focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground/60"
          rows={1}
        />

        <div className="flex items-center gap-1 pr-1 pb-1">
          {/* Voice input button (decorative) */}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground"
            disabled
            title="Voice input (coming soon)"
          >
            <Mic className="h-4 w-4" />
          </Button>

          {/* Send button */}
          <Button
            onClick={handleSubmit}
            disabled={!value.trim() || disabled}
            size="icon"
            className={cn(
              'h-8 w-8 shrink-0 rounded-lg transition-all',
              value.trim()
                ? 'bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-sm shadow-emerald-500/20 hover:shadow-emerald-500/30'
                : 'bg-muted text-muted-foreground'
            )}
          >
            {disabled ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Keyboard hint */}
      <p className="mt-2 text-center text-[10px] text-muted-foreground/50">{footerHint}</p>
    </div>
  );
}
