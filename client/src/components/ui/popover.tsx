import React, { createContext, useContext, useState, useRef, useEffect, useCallback } from 'react'
import { cn } from '@/utils/cn'

interface PopoverContextValue {
  open: boolean
  setOpen: (open: boolean) => void
  triggerRef: React.RefObject<HTMLElement | null>
}

const PopoverContext = createContext<PopoverContextValue | undefined>(undefined)

interface PopoverProps {
  children: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export const Popover: React.FC<PopoverProps> = ({
  children,
  open: controlledOpen,
  onOpenChange
}) => {
  const [internalOpen, setInternalOpen] = useState(false)
  const triggerRef = useRef<HTMLElement | null>(null)

  const isControlled = controlledOpen !== undefined
  const open = isControlled ? controlledOpen : internalOpen
  
  const setOpen = useCallback((newOpen: boolean) => {
    if (isControlled) {
      onOpenChange?.(newOpen)
    } else {
      setInternalOpen(newOpen)
    }
  }, [isControlled, onOpenChange])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (triggerRef.current && !triggerRef.current.contains(event.target as Node)) {
        const popoverContent = document.querySelector('[data-popover-content="true"]')
        if (popoverContent && !popoverContent.contains(event.target as Node)) {
          setOpen(false)
        }
      }
    }

    if (open) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [open, setOpen])

  return (
    <PopoverContext.Provider value={{ open, setOpen, triggerRef }}>
      <div className="relative">
        {children}
      </div>
    </PopoverContext.Provider>
  )
}

interface PopoverTriggerProps {
  children: React.ReactElement
  asChild?: boolean
}

export const PopoverTrigger: React.FC<PopoverTriggerProps> = ({
  children,
  asChild = false
}) => {
  const context = useContext(PopoverContext)
  if (!context) {
    throw new Error('PopoverTrigger must be used within a Popover')
  }

  const { open, setOpen, triggerRef } = context

  const handleClick = () => {
    setOpen(!open)
  }

  if (asChild) {
    return React.cloneElement(children, {
      ref: triggerRef,
      onClick: handleClick,
      'aria-expanded': open,
      'aria-haspopup': 'dialog'
    } as React.HTMLAttributes<HTMLElement>)
  }

  return (
    <button
      ref={triggerRef as React.RefObject<HTMLButtonElement>}
      onClick={handleClick}
      aria-expanded={open}
      aria-haspopup="dialog"
    >
      {children}
    </button>
  )
}

interface PopoverContentProps {
  children: React.ReactNode
  className?: string
  align?: 'start' | 'center' | 'end'
  side?: 'top' | 'right' | 'bottom' | 'left'
  sideOffset?: number
  alignOffset?: number
}

export const PopoverContent: React.FC<PopoverContentProps> = ({
  children,
  className,
  align = 'center',
  side = 'bottom',
  sideOffset = 4,
  alignOffset = 0
}) => {
  const context = useContext(PopoverContext)
  if (!context) {
    throw new Error('PopoverContent must be used within a Popover')
  }

  const { open, triggerRef } = context
  const [position, setPosition] = useState({ top: 0, left: 0 })
  const contentRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (open && triggerRef.current && contentRef.current) {
      const triggerRect = triggerRef.current.getBoundingClientRect()
      const contentRect = contentRef.current.getBoundingClientRect()
      const viewportHeight = window.innerHeight
      const viewportWidth = window.innerWidth

      let top = 0
      let left = 0

      // Calculate position based on side
      switch (side) {
        case 'top':
          top = triggerRect.top - contentRect.height - sideOffset
          break
        case 'bottom':
          top = triggerRect.bottom + sideOffset
          break
        case 'left':
          left = triggerRect.left - contentRect.width - sideOffset
          top = triggerRect.top + (triggerRect.height - contentRect.height) / 2
          break
        case 'right':
          left = triggerRect.right + sideOffset
          top = triggerRect.top + (triggerRect.height - contentRect.height) / 2
          break
      }

      // Calculate alignment for top/bottom sides
      if (side === 'top' || side === 'bottom') {
        switch (align) {
          case 'start':
            left = triggerRect.left + alignOffset
            break
          case 'end':
            left = triggerRect.right - contentRect.width - alignOffset
            break
          case 'center':
          default:
            left = triggerRect.left + (triggerRect.width - contentRect.width) / 2 + alignOffset
            break
        }
      }

      // Ensure content stays within viewport
      if (left + contentRect.width > viewportWidth) {
        left = viewportWidth - contentRect.width - 8
      }
      if (left < 8) {
        left = 8
      }
      if (top + contentRect.height > viewportHeight) {
        top = viewportHeight - contentRect.height - 8
      }
      if (top < 8) {
        top = 8
      }

      setPosition({ top, left })
    }
  }, [open, side, align, sideOffset, alignOffset, triggerRef])

  if (!open) return null

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40" />
      
      {/* Content */}
      <div
        ref={contentRef}
        data-popover-content="true"
        className={cn(
          "fixed z-50 w-72 rounded-md border bg-popover p-4 text-popover-foreground shadow-md",
          "animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
          className
        )}
        style={{
          top: position.top,
          left: position.left
        }}
      >
        {children}
      </div>
    </>
  )
}

export default Popover