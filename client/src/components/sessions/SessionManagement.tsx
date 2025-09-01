import { useState, useEffect } from 'react'
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { 
  Clock, 
  Search,
  Filter,
  Download,
  Calendar,
  DollarSign,
  Car,
  MapPin,
  CheckCircle,
  XCircle,
  AlertCircle,
  TrendingUp,
  TrendingDown
} from 'lucide-react'
import { apiService } from '@/services/api'
import type { ParkingSession, Vehicle, ParkingSpot } from '@/types/api-extensions'
import { useToast } from '@/hooks/use-toast'
import { format, formatDistanceToNow, parseISO } from 'date-fns'

interface SessionFilters {
  status: 'all' | 'active' | 'completed' | 'cancelled'
  dateRange: 'today' | 'week' | 'month' | 'all'
  search: string
}

export function SessionManagement() {
  const { toast } = useToast()
  const [sessions, setSessions] = useState<ParkingSession[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState<SessionFilters>({
    status: 'all',
    dateRange: 'today',
    search: ''
  })
  const [stats, setStats] = useState({
    totalSessions: 0,
    activeSessions: 0,
    totalRevenue: 0,
    averageDuration: 0,
    todayRevenue: 0,
    todaySessions: 0
  })

  useEffect(() => {
    fetchSessions()
    calculateStats()
  }, [filters])

  const fetchSessions = async () => {
    try {
      setLoading(true)
      const response = await apiService.getSessions()
      if (response.success) {
        setSessions(response.data)
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to fetch sessions',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const calculateStats = () => {
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    
    const todaySessions = sessions.filter(s => 
      new Date(s.entryTime) >= todayStart
    )
    
    const activeSessions = sessions.filter(s => s.status === 'active')
    const completedSessions = sessions.filter(s => s.status === 'completed')
    
    const totalRevenue = completedSessions.reduce((sum, s) => 
      sum + (s.totalCost || 0), 0
    )
    
    const todayRevenue = todaySessions
      .filter(s => s.status === 'completed')
      .reduce((sum, s) => sum + (s.totalCost || 0), 0)
    
    const durations = completedSessions
      .filter(s => s.exitTime)
      .map(s => {
        const entry = new Date(s.entryTime).getTime()
        const exit = new Date(s.exitTime!).getTime()
        return (exit - entry) / (1000 * 60) // minutes
      })
    
    const averageDuration = durations.length > 0
      ? durations.reduce((a, b) => a + b, 0) / durations.length
      : 0

    setStats({
      totalSessions: sessions.length,
      activeSessions: activeSessions.length,
      totalRevenue,
      averageDuration: Math.round(averageDuration),
      todayRevenue,
      todaySessions: todaySessions.length
    })
  }

  const handleEndSession = async (sessionId: string) => {
    try {
      const response = await apiService.endSession(sessionId)
      if (response.success) {
        toast({
          title: 'Success',
          description: `Session ended. Total: $${response.data.totalAmount || 0}`
        })
        fetchSessions()
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to end session',
        variant: 'destructive'
      })
    }
  }

  const handleCancelSession = async (sessionId: string) => {
    if (!confirm('Are you sure you want to cancel this session?')) return
    
    try {
      // In a real app, this would be a separate API endpoint
      const response = await apiService.endSession(sessionId)
      if (response.success) {
        toast({
          title: 'Success',
          description: 'Session cancelled'
        })
        fetchSessions()
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to cancel session',
        variant: 'destructive'
      })
    }
  }

  const getStatusIcon = (status: ParkingSession['status']) => {
    switch (status) {
      case 'active':
        return <AlertCircle className="h-4 w-4 text-blue-500" />
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'cancelled':
        return <XCircle className="h-4 w-4 text-red-500" />
      default:
        return null
    }
  }

  const getStatusColor = (status: ParkingSession['status']) => {
    switch (status) {
      case 'active':
        return 'bg-blue-100 text-blue-800'
      case 'completed':
        return 'bg-green-100 text-green-800'
      case 'cancelled':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getPaymentStatusColor = (status: ParkingSession['paymentStatus']) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'failed':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const filterSessions = () => {
    let filtered = [...sessions]
    
    // Status filter
    if (filters.status !== 'all') {
      filtered = filtered.filter(s => s.status === filters.status)
    }
    
    // Date range filter
    const now = new Date()
    switch (filters.dateRange) {
      case 'today':
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        filtered = filtered.filter(s => new Date(s.entryTime) >= todayStart)
        break
      case 'week':
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        filtered = filtered.filter(s => new Date(s.entryTime) >= weekAgo)
        break
      case 'month':
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        filtered = filtered.filter(s => new Date(s.entryTime) >= monthAgo)
        break
    }
    
    // Search filter
    if (filters.search) {
      const search = filters.search.toLowerCase()
      filtered = filtered.filter(s => 
        s.vehicleId.toLowerCase().includes(search) ||
        s.spotId.toLowerCase().includes(search) ||
        s.id.toLowerCase().includes(search)
      )
    }
    
    // Sort by entry time (most recent first)
    filtered.sort((a, b) => 
      new Date(b.entryTime).getTime() - new Date(a.entryTime).getTime()
    )
    
    return filtered
  }

  const exportSessions = () => {
    const data = filterSessions()
    const csv = [
      ['Session ID', 'Vehicle ID', 'Spot ID', 'Entry Time', 'Exit Time', 'Duration (min)', 'Total Cost', 'Status', 'Payment Status'],
      ...data.map(s => {
        const duration = s.exitTime 
          ? Math.round((new Date(s.exitTime).getTime() - new Date(s.entryTime).getTime()) / (1000 * 60))
          : 0
        return [
          s.id,
          s.vehicleId,
          s.spotId,
          format(parseISO(s.entryTime), 'yyyy-MM-dd HH:mm'),
          s.exitTime ? format(parseISO(s.exitTime), 'yyyy-MM-dd HH:mm') : '',
          duration.toString(),
          (s.totalCost || 0).toString(),
          s.status,
          s.paymentStatus
        ]
      })
    ].map(row => row.join(',')).join('\n')
    
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `parking-sessions-${format(new Date(), 'yyyy-MM-dd')}.csv`
    a.click()
  }

  const filteredSessions = filterSessions()

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Sessions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalSessions}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active Now</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.activeSessions}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Today's Sessions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.todaySessions}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.totalRevenue.toFixed(2)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Today's Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              ${stats.todayRevenue.toFixed(2)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Avg Duration</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.averageDuration} min</div>
          </CardContent>
        </Card>
      </div>

      {/* Main Management Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Session Management
          </CardTitle>
          <CardDescription>
            Monitor and manage all parking sessions
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search by session, vehicle, or spot ID..."
                value={filters.search}
                onChange={(e) => setFilters({...filters, search: e.target.value})}
                className="pl-10"
              />
            </div>
            <Select 
              value={filters.status} 
              onValueChange={(value: any) => setFilters({...filters, status: value})}
            >
              <SelectTrigger className="w-[180px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <Select 
              value={filters.dateRange} 
              onValueChange={(value: any) => setFilters({...filters, dateRange: value})}
            >
              <SelectTrigger className="w-[180px]">
                <Calendar className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Date range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">Last 7 Days</SelectItem>
                <SelectItem value="month">Last 30 Days</SelectItem>
                <SelectItem value="all">All Time</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={exportSessions} variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>

          {/* Sessions Table */}
          {loading ? (
            <div className="text-center py-8">Loading sessions...</div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Session ID</TableHead>
                    <TableHead>Vehicle</TableHead>
                    <TableHead>Spot</TableHead>
                    <TableHead>Entry Time</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Payment</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSessions.map((session) => {
                    const entryTime = parseISO(session.entryTime)
                    const exitTime = session.exitTime ? parseISO(session.exitTime) : null
                    const duration = exitTime 
                      ? Math.round((exitTime.getTime() - entryTime.getTime()) / (1000 * 60))
                      : Math.round((Date.now() - entryTime.getTime()) / (1000 * 60))
                    
                    return (
                      <TableRow key={session.id}>
                        <TableCell className="font-mono text-sm">
                          {session.id.slice(0, 8)}...
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Car className="h-4 w-4" />
                            {session.vehicleId.slice(0, 8)}...
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <MapPin className="h-4 w-4" />
                            {session.spotId}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">
                              {format(entryTime, 'MMM dd, yyyy')}
                            </div>
                            <div className="text-sm text-gray-500">
                              {format(entryTime, 'HH:mm')}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {session.status === 'active' ? (
                            <div className="flex items-center gap-1 text-blue-600">
                              <Clock className="h-4 w-4 animate-pulse" />
                              {duration} min
                            </div>
                          ) : (
                            <div>{duration} min</div>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <DollarSign className="h-4 w-4" />
                            {session.totalCost?.toFixed(2) || '0.00'}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={`gap-1 ${getStatusColor(session.status)}`}>
                            {getStatusIcon(session.status)}
                            {session.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant="outline" 
                            className={getPaymentStatusColor(session.paymentStatus)}
                          >
                            {session.paymentStatus}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {session.status === 'active' ? (
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={() => handleEndSession(session.id)}
                              >
                                End Session
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleCancelSession(session.id)}
                              >
                                Cancel
                              </Button>
                            </div>
                          ) : (
                            <Button size="sm" variant="outline" disabled>
                              View Details
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
              {filteredSessions.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No sessions found matching filters
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}