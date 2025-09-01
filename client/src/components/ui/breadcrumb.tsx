import React from 'react'
import { ChevronRight, Home } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { cn } from '@/utils/cn'

interface BreadcrumbItem {
  label: string
  href?: string
  icon?: React.ComponentType<{ className?: string }>
}

interface BreadcrumbProps {
  items?: BreadcrumbItem[]
  separator?: React.ReactNode
  showHomeIcon?: boolean
  className?: string
}

export function Breadcrumb({ 
  items, 
  separator = <ChevronRight className="h-4 w-4" />, 
  showHomeIcon = true,
  className 
}: BreadcrumbProps) {
  const location = useLocation()
  
  // Auto-generate breadcrumbs from current route if items not provided
  const breadcrumbItems = items || generateBreadcrumbs(location.pathname)

  if (breadcrumbItems.length === 0) {
    return null
  }

  return (
    <nav aria-label="Breadcrumb" className={cn('flex items-center space-x-1', className)}>
      <ol className="flex items-center space-x-1 text-sm text-muted-foreground">
        {breadcrumbItems.map((item, index) => {
          const isLast = index === breadcrumbItems.length - 1
          const Icon = item.icon

          return (
            <li key={index} className="flex items-center space-x-1">
              {index > 0 && (
                <span className="text-muted-foreground/60" aria-hidden="true">
                  {separator}
                </span>
              )}
              
              {item.href && !isLast ? (
                <Link
                  to={item.href}
                  className="flex items-center space-x-1 hover:text-foreground transition-colors"
                >
                  {Icon && <Icon className="h-4 w-4" />}
                  {index === 0 && showHomeIcon && !Icon && (
                    <Home className="h-4 w-4" />
                  )}
                  <span>{item.label}</span>
                </Link>
              ) : (
                <span
                  className={cn(
                    'flex items-center space-x-1',
                    isLast ? 'text-foreground font-medium' : 'text-muted-foreground'
                  )}
                  aria-current={isLast ? 'page' : undefined}
                >
                  {Icon && <Icon className="h-4 w-4" />}
                  {index === 0 && showHomeIcon && !Icon && (
                    <Home className="h-4 w-4" />
                  )}
                  <span>{item.label}</span>
                </span>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

// Auto-generate breadcrumbs from pathname
function generateBreadcrumbs(pathname: string): BreadcrumbItem[] {
  const segments = pathname.split('/').filter(Boolean)
  const breadcrumbs: BreadcrumbItem[] = [
    { label: 'Home', href: '/' }
  ]

  // Route name mappings
  const routeNames: Record<string, string> = {
    garages: 'Garages',
    vehicles: 'Vehicles',
    sessions: 'Sessions',
    analytics: 'Analytics',
    users: 'Users',
    settings: 'Settings',
    profile: 'Profile',
    dashboard: 'Dashboard',
  }

  let currentPath = ''
  
  segments.forEach((segment, index) => {
    currentPath += `/${segment}`
    const isLast = index === segments.length - 1
    
    // Try to get a friendly name, or format the segment
    const label = routeNames[segment] || formatSegment(segment)
    
    breadcrumbs.push({
      label,
      href: isLast ? undefined : currentPath,
    })
  })

  return breadcrumbs
}

// Format segment for display
function formatSegment(segment: string): string {
  // If it's a UUID or ID-like string, show as "ID"
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(segment)) {
    return 'Details'
  }
  
  // If it's a number, show as "ID: number"
  if (/^\d+$/.test(segment)) {
    return `ID: ${segment}`
  }
  
  // Otherwise, capitalize and format
  return segment
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

// Compact breadcrumb for mobile
export function CompactBreadcrumb({ 
  items, 
  className,
  maxItems = 2 
}: BreadcrumbProps & { maxItems?: number }) {
  const location = useLocation()
  const breadcrumbItems = items || generateBreadcrumbs(location.pathname)

  if (breadcrumbItems.length === 0) {
    return null
  }

  const displayItems = breadcrumbItems.length > maxItems
    ? [
        breadcrumbItems[0], // Always show first (Home)
        { label: '...' }, // Ellipsis
        ...breadcrumbItems.slice(-1) // Show last item
      ]
    : breadcrumbItems

  return (
    <nav aria-label="Breadcrumb" className={cn('flex items-center space-x-1', className)}>
      <ol className="flex items-center space-x-1 text-sm text-muted-foreground">
        {displayItems.map((item, index) => {
          const isLast = index === displayItems.length - 1
          const isEllipsis = item.label === '...'

          return (
            <li key={index} className="flex items-center space-x-1">
              {index > 0 && (
                <ChevronRight className="h-3 w-3 text-muted-foreground/60" />
              )}
              
              {isEllipsis ? (
                <span className="text-muted-foreground/60">...</span>
              ) : item.href && !isLast ? (
                <Link
                  to={item.href}
                  className="hover:text-foreground transition-colors max-w-24 truncate"
                >
                  {item.label}
                </Link>
              ) : (
                <span
                  className={cn(
                    'max-w-24 truncate',
                    isLast ? 'text-foreground font-medium' : 'text-muted-foreground'
                  )}
                  aria-current={isLast ? 'page' : undefined}
                >
                  {item.label}
                </span>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

export type { BreadcrumbItem, BreadcrumbProps }