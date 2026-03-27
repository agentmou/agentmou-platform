'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Copy, Check, ChevronDown, ChevronRight } from 'lucide-react';

interface JsonViewerProps {
  data: unknown;
  className?: string;
  maxHeight?: string;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
}

export function JsonViewer({
  data,
  className,
  maxHeight = '300px',
  collapsible = false,
  defaultCollapsed = false,
}: JsonViewerProps) {
  const [copied, setCopied] = useState(false);
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const formattedJson = JSON.stringify(data, null, 2);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(formattedJson);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={cn('relative rounded-md border border-border/50 bg-muted/20', className)}>
      {/* Header with copy button */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border/30">
        {collapsible && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-[10px] uppercase tracking-wide text-muted-foreground hover:text-foreground"
            onClick={() => setCollapsed(!collapsed)}
          >
            {collapsed ? (
              <ChevronRight className="h-3 w-3 mr-1" />
            ) : (
              <ChevronDown className="h-3 w-3 mr-1" />
            )}
            {collapsed ? 'Expand' : 'Collapse'}
          </Button>
        )}
        {!collapsible && (
          <span className="text-[10px] uppercase tracking-wide text-muted-foreground">JSON</span>
        )}
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-2 text-[10px] uppercase tracking-wide text-muted-foreground hover:text-foreground"
          onClick={handleCopy}
        >
          {copied ? (
            <>
              <Check className="h-3 w-3 mr-1" />
              Copied
            </>
          ) : (
            <>
              <Copy className="h-3 w-3 mr-1" />
              Copy
            </>
          )}
        </Button>
      </div>

      {/* JSON content */}
      {!collapsed && (
        <pre
          className="overflow-auto px-3 py-3 text-xs font-mono text-foreground/90 leading-relaxed"
          style={{ maxHeight }}
        >
          {formattedJson}
        </pre>
      )}
    </div>
  );
}
