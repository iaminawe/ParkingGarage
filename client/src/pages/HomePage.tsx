import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Building2, Car, Clock, Users } from 'lucide-react'

const statsCards = [
  {
    title: 'Total Garages',
    value: '8',
    description: 'Active parking garages',
    icon: Building2,
    color: 'text-blue-500',
  },
  {
    title: 'Active Sessions',
    value: '142',
    description: 'Currently parked vehicles',
    icon: Car,
    color: 'text-green-500',
  },
  {
    title: 'Avg. Duration',
    value: '2.5h',
    description: 'Average parking time',
    icon: Clock,
    color: 'text-orange-500',
  },
  {
    title: 'Total Users',
    value: '1,247',
    description: 'Registered customers',
    icon: Users,
    color: 'text-purple-500',
  },
]

export function HomePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome to the Parking Garage Management System
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statsCards.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">{stat.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Activity */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Sessions</CardTitle>
            <CardDescription>Latest parking sessions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { license: 'ABC-123', garage: 'Downtown Garage', time: '10 min ago' },
                { license: 'XYZ-789', garage: 'Mall Parking', time: '25 min ago' },
                { license: 'DEF-456', garage: 'Airport Garage', time: '1 hour ago' },
              ].map((session, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{session.license}</p>
                    <p className="text-xs text-muted-foreground">{session.garage}</p>
                  </div>
                  <p className="text-xs text-muted-foreground">{session.time}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Garage Status</CardTitle>
            <CardDescription>Current availability overview</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { name: 'Downtown Garage', available: 45, total: 200, utilization: 77.5 },
                { name: 'Mall Parking', available: 123, total: 300, utilization: 59.0 },
                { name: 'Airport Garage', available: 89, total: 500, utilization: 82.2 },
              ].map((garage, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">{garage.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {garage.available}/{garage.total} available
                    </p>
                  </div>
                  <div className="w-full bg-secondary rounded-full h-2">
                    <div 
                      className="bg-primary h-2 rounded-full" 
                      style={{ width: `${garage.utilization}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* System Status */}
      <Card>
        <CardHeader>
          <CardTitle>System Status</CardTitle>
          <CardDescription>Real-time system monitoring</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="flex items-center space-x-2">
              <div className="h-3 w-3 rounded-full bg-green-500" />
              <span className="text-sm">API Services</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="h-3 w-3 rounded-full bg-green-500" />
              <span className="text-sm">Database</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="h-3 w-3 rounded-full bg-green-500" />
              <span className="text-sm">WebSocket</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}