'use client'

import * as React from 'react'
import * as TabsPrimitive from '@radix-ui/react-tabs'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

const AnimatedTabs = TabsPrimitive.Root

const AnimatedTabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      'inline-flex items-center gap-6 border-b border-border',
      className
    )}
    {...props}
  />
))
AnimatedTabsList.displayName = TabsPrimitive.List.displayName

interface AnimatedTabsTriggerProps
  extends React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger> {
  layoutId?: string
}

const AnimatedTabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  AnimatedTabsTriggerProps
>(({ className, children, ...props }, ref) => {
  const [isSelected, setIsSelected] = React.useState(false)
  const triggerRef = React.useRef<HTMLButtonElement>(null)

  React.useEffect(() => {
    const trigger = triggerRef.current
    if (!trigger) return

    const observer = new MutationObserver(() => {
      setIsSelected(trigger.getAttribute('data-state') === 'active')
    })
    observer.observe(trigger, { attributes: true })
    setIsSelected(trigger.getAttribute('data-state') === 'active')
    return () => observer.disconnect()
  }, [])

  return (
    <TabsPrimitive.Trigger
      ref={(node) => {
        if (typeof ref === 'function') ref(node)
        else if (ref) ref.current = node
        ;(triggerRef as React.MutableRefObject<HTMLButtonElement | null>).current = node
      }}
      className={cn(
        'relative pb-3 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 data-[state=active]:text-foreground',
        className
      )}
      {...props}
    >
      {children}
      {isSelected && (
        <motion.div
          layoutId="tab-indicator"
          className="absolute bottom-0 left-0 right-0 h-px bg-foreground"
          initial={false}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        />
      )}
    </TabsPrimitive.Trigger>
  )
})
AnimatedTabsTrigger.displayName = TabsPrimitive.Trigger.displayName

const AnimatedTabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn('mt-6 focus-visible:outline-none', className)}
    {...props}
  >
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.15 }}
    >
      {children}
    </motion.div>
  </TabsPrimitive.Content>
))
AnimatedTabsContent.displayName = TabsPrimitive.Content.displayName

export { AnimatedTabs, AnimatedTabsList, AnimatedTabsTrigger, AnimatedTabsContent }
