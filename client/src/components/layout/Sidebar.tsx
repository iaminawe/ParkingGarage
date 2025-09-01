import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  Building2,
  Car,
  Clock,
  BarChart3,
  Users,
  Settings,
  ParkingSquare,
} from 'lucide-react'
import { cn } from '@/utils/cn'
import { Separator } from '@/components/ui/separator'

const navigationItems = [
  {
    title: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    title: 'Vehicles',
    href: '/vehicles',
    icon: Car,
  },
  {
    title: 'Parking Spots',
    href: '/spots',
    icon: ParkingSquare,
  },
  {
    title: 'Garage Config',
    href: '/garages',
    icon: Building2,
  },
  {
    title: 'Sessions',
    href: '/sessions',
    icon: Clock,
  },
  {
    title: 'Analytics',
    href: '/analytics',
    icon: BarChart3,
  },
  {
    title: 'Users',
    href: '/users',
    icon: Users,
  },
]

const systemItems = [
  {
    title: 'Settings',
    href: '/settings',
    icon: Settings,
  },
]

export function Sidebar() {
  return (
    <div className="pb-12 w-64">
      <div className="space-y-4 py-4">
        <div className="px-3 py-2">
          <h2 className="mb-2 px-4 text-lg font-semibold tracking-tight">
            Navigation
          </h2>
          <div className="space-y-1">
            {navigationItems.map((item) => (
              <NavLink
                key={item.href}
                to={item.href}
                className={({ isActive }) =>
                  cn(
                    'flex items-center rounded-lg px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors',
                    isActive
                      ? 'bg-accent text-accent-foreground'
                      : 'text-muted-foreground'
                  )
                }
                end={item.href === '/'}
              >
                <item.icon className="mr-2 h-4 w-4" />
                {item.title}
              </NavLink>
            ))}
          </div>
        </div>
        
        <Separator />
        
        <div className="px-3 py-2">
          <h2 className="mb-2 px-4 text-lg font-semibold tracking-tight">
            System
          </h2>
          <div className="space-y-1">
            {systemItems.map((item) => (
              <NavLink
                key={item.href}
                to={item.href}
                className={({ isActive }) =>
                  cn(
                    'flex items-center rounded-lg px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors',
                    isActive
                      ? 'bg-accent text-accent-foreground'
                      : 'text-muted-foreground'
                  )
                }
              >
                <item.icon className="mr-2 h-4 w-4" />
                {item.title}
              </NavLink>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}