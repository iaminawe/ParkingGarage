import React from 'react'
import { Loader2, Building2 } from 'lucide-react'
import { cn } from '@/utils/cn'

// Full page loader
export function FullPageLoader() {
  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="flex flex-col items-center space-y-4">
        <div className="relative">
          <Building2 className="h-8 w-8 text-primary" />
          <Loader2 className="h-4 w-4 animate-spin absolute -top-1 -right-1 text-primary" />
        </div>
        <div className="text-center space-y-2">
          <p className="text-sm font-medium">Loading Parking Garage System</p>
          <p className="text-xs text-muted-foreground">Please wait a moment...</p>
        </div>
      </div>
    </div>
  )
}

// Inline spinner
interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function Spinner({ size = 'md', className }: SpinnerProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
  }

  return (
    <Loader2
      className={cn('animate-spin', sizeClasses[size], className)}
    />
  )
}

// Button loader
export function ButtonLoader({ children, loading, ...props }: {
  children: React.ReactNode
  loading?: boolean
  className?: string
}) {
  return (
    <div className={cn('flex items-center space-x-2', props.className)}>
      {loading && <Spinner size="sm" />}
      <span className={loading ? 'opacity-70' : ''}>{children}</span>
    </div>
  )
}

// Page section loader
interface PageLoaderProps {
  title?: string
  description?: string
  className?: string
}

export function PageLoader({ title, description, className }: PageLoaderProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-12 space-y-4', className)}>
      <Spinner size="lg" />
      {title && (
        <h3 className="text-lg font-semibold">{title}</h3>
      )}
      {description && (
        <p className="text-sm text-muted-foreground text-center max-w-sm">
          {description}
        </p>
      )}
    </div>
  )
}

// Card skeleton
export function CardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('rounded-lg border bg-card p-6 space-y-4', className)}>
      <div className="space-y-2">
        <div className="h-4 bg-muted rounded animate-pulse" />
        <div className="h-4 bg-muted rounded w-2/3 animate-pulse" />
      </div>
      <div className="space-y-2">
        <div className="h-3 bg-muted rounded animate-pulse" />
        <div className="h-3 bg-muted rounded w-1/2 animate-pulse" />
      </div>
    </div>
  )
}

// Table skeleton
export function TableSkeleton({ 
  rows = 5, 
  columns = 4,
  className 
}: { 
  rows?: number
  columns?: number
  className?: string 
}) {
  return (
    <div className={cn('space-y-4', className)}>
      {/* Table header skeleton */}
      <div className="flex space-x-4">
        {Array.from({ length: columns }).map((_, i) => (
          <div
            key={i}
            className="h-4 bg-muted rounded flex-1 animate-pulse"
          />
        ))}
      </div>
      
      {/* Table rows skeleton */}
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex space-x-4">
            {Array.from({ length: columns }).map((_, j) => (
              <div
                key={j}
                className="h-4 bg-muted rounded flex-1 animate-pulse"
                style={{
                  animationDelay: `${(i * columns + j) * 0.1}s`,
                }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

// List skeleton
export function ListSkeleton({ 
  items = 6,
  showAvatar = false,
  className 
}: { 
  items?: number
  showAvatar?: boolean
  className?: string 
}) {
  return (
    <div className={cn('space-y-4', className)}>
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="flex items-center space-x-3">
          {showAvatar && (
            <div className="h-10 w-10 bg-muted rounded-full animate-pulse" />
          )}
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-muted rounded animate-pulse" />
            <div className="h-3 bg-muted rounded w-2/3 animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  )
}

// Chart skeleton
export function ChartSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('space-y-4', className)}>
      {/* Chart title skeleton */}
      <div className="h-6 bg-muted rounded w-1/3 animate-pulse" />
      
      {/* Chart area skeleton */}
      <div className="h-64 bg-muted rounded animate-pulse" />
      
      {/* Legend skeleton */}
      <div className="flex justify-center space-x-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center space-x-2">
            <div className="h-3 w-3 bg-muted rounded animate-pulse" />
            <div className="h-3 bg-muted rounded w-16 animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  )
}

// Dashboard skeleton
export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* Stats cards skeleton */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
      
      {/* Charts section skeleton */}
      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-4">
          <ChartSkeleton />
        </div>
        <div className="space-y-4">
          <CardSkeleton />
          <ListSkeleton items={4} />
        </div>
      </div>
      
      {/* Table section skeleton */}
      <div className="space-y-4">
        <div className="h-6 bg-muted rounded w-48 animate-pulse" />
        <TableSkeleton />
      </div>
    </div>
  )
}