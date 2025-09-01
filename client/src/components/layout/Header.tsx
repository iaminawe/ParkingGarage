import { Building2, Wifi, WifiOff } from 'lucide-react'
import { useSocket } from '@/providers'
import { cn } from '@/utils/cn'

export function Header() {
  const { isConnected } = useSocket()

  return (
    <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-14 items-center px-4">
        <div className="flex items-center space-x-2">
          <Building2 className="h-6 w-6" />
          <h1 className="text-lg font-semibold">Parking Garage Management</h1>
        </div>
        
        <div className="ml-auto flex items-center space-x-4">
          {/* Connection Status */}
          <div className="flex items-center space-x-2">
            {isConnected ? (
              <>
                <Wifi className="h-4 w-4 text-green-500" />
                <span className="text-sm text-muted-foreground">Connected</span>
              </>
            ) : (
              <>
                <WifiOff className="h-4 w-4 text-red-500" />
                <span className="text-sm text-muted-foreground">Disconnected</span>
              </>
            )}
          </div>
          
          {/* User Info Placeholder */}
          <div className="flex items-center space-x-2">
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-sm font-medium">A</span>
            </div>
            <span className="text-sm">Admin</span>
          </div>
        </div>
      </div>
    </header>
  )
}