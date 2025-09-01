import React, { useState, useEffect, useMemo } from 'react'
import { 
  ArrowLeft, 
  Download, 
  Calendar, 
  Clock, 
  DollarSign, 
  MapPin,
  TrendingUp,
  TrendingDown,
  Filter,
  RefreshCw
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { DataTable, Column } from '@/components/ui/data-table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loading } from '@/components/ui/loading'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { formatDate, formatCurrency, formatDuration } from '@/utils/formatting'
import { exportToCsv } from '@/utils/export'
import { apiService } from '@/services/api'
import type { VehicleWithParkingInfo, ParkingSession } from '@/types/api'

interface VehicleHistoryProps {
  vehicle: VehicleWithParkingInfo
  onBack?: () => void
  className?: string
}

interface SessionStats {
  totalSessions: number
  totalSpent: number
  totalDuration: number
  averageDuration: number
  averageCost: number
  longestSession: number
  shortestSession: number
}

export const VehicleHistory: React.FC<VehicleHistoryProps> = ({
  vehicle,
  onBack,
  className,
}) => {
  const [sessions, setSessions] = useState<ParkingSession[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dateFilter, setDateFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  })

  // Load parking sessions
  useEffect(() => {
    const loadSessions = async () => {
      setLoading(true)
      setError(null)
      
      try {
        const response = await apiService.getSessions()
        if (response.success) {
          const vehicleSessions = response.data
            .filter(session => session.vehicleId === vehicle.id)
            .sort((a, b) => new Date(b.entryTime).getTime() - new Date(a.entryTime).getTime())
          
          setSessions(vehicleSessions)
          setPagination(prev => ({
            ...prev,
            total: vehicleSessions.length,
            totalPages: Math.ceil(vehicleSessions.length / prev.limit)
          }))
        }
      } catch (err) {
        console.error('Failed to load sessions:', err)
        setError('Failed to load parking history')
      } finally {
        setLoading(false)
      }
    }

    loadSessions()
  }, [vehicle.id])

  // Filter sessions based on selected filters
  const filteredSessions = useMemo(() => {
    let filtered = sessions

    // Date filter
    if (dateFilter !== 'all') {
      const now = new Date()
      const filterDate = new Date()
      
      switch (dateFilter) {
        case '7days':
          filterDate.setDate(now.getDate() - 7)
          break
        case '30days':
          filterDate.setDate(now.getDate() - 30)
          break
        case '90days':
          filterDate.setDate(now.getDate() - 90)
          break
        case '1year':
          filterDate.setFullYear(now.getFullYear() - 1)
          break
      }
      
      filtered = filtered.filter(session => 
        new Date(session.entryTime) >= filterDate
      )
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(session => session.status === statusFilter)
    }

    return filtered
  }, [sessions, dateFilter, statusFilter])

  // Calculate statistics
  const stats: SessionStats = useMemo(() => {
    const completedSessions = filteredSessions.filter(s => s.status === 'completed')
    const durations = completedSessions
      .map(s => s.duration || 0)
      .filter(d => d > 0)
    
    const costs = completedSessions
      .map(s => s.totalCost || 0)
      .filter(c => c > 0)

    return {
      totalSessions: filteredSessions.length,
      totalSpent: costs.reduce((sum, cost) => sum + cost, 0),
      totalDuration: durations.reduce((sum, duration) => sum + duration, 0),
      averageDuration: durations.length > 0 ? durations.reduce((sum, d) => sum + d, 0) / durations.length : 0,
      averageCost: costs.length > 0 ? costs.reduce((sum, c) => sum + c, 0) / costs.length : 0,
      longestSession: durations.length > 0 ? Math.max(...durations) : 0,
      shortestSession: durations.length > 0 ? Math.min(...durations) : 0,
    }
  }, [filteredSessions])

  // DataTable columns
  const columns: Column<ParkingSession>[] = useMemo(() => [
    {
      key: 'entryTime',
      header: 'Entry Time',
      sortable: true,
      render: (value) => (
        <div>
          <div className="font-medium">{formatDate(value)}</div>
          <div className="text-sm text-muted-foreground">
            {new Date(value).toLocaleTimeString()}
          </div>
        </div>
      ),
    },
    {
      key: 'exitTime',
      header: 'Exit Time',
      render: (value, session) => (
        <div>
          {value ? (
            <>
              <div className="font-medium">{formatDate(value)}</div>
              <div className="text-sm text-muted-foreground">
                {new Date(value).toLocaleTimeString()}
              </div>
            </>
          ) : (
            <Badge variant="secondary">In Progress</Badge>
          )}
        </div>
      ),
    },
    {
      key: 'duration',
      header: 'Duration',
      sortable: true,
      render: (value, session) => {
        if (!value && session.status === 'active') {
          const currentDuration = Math.floor(
            (new Date().getTime() - new Date(session.entryTime).getTime()) / 60000
          )
          return (
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3 text-green-600" />
              <span>{formatDuration(currentDuration)}</span>
            </div>
          )
        }
        return value ? formatDuration(value) : '-'
      },
    },
    {
      key: 'spotId',
      header: 'Location',
      render: (value, session) => (
        <div className="flex items-center gap-1">
          <MapPin className="h-3 w-3 text-muted-foreground" />
          <span>
            {session.spot ? 
              `Spot ${session.spot.spotNumber} - Floor ${session.spot.floor}` : 
              'Unknown'
            }
          </span>
        </div>
      ),
    },
    {
      key: 'totalCost',
      header: 'Cost',
      sortable: true,
      className: 'text-right',
      render: (value) => (
        <div className="text-right font-medium">
          {value ? formatCurrency(value) : '-'}
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (value) => (
        <Badge variant={
          value === 'completed' ? 'default' : 
          value === 'active' ? 'secondary' : 
          'outline'
        }>
          {value.charAt(0).toUpperCase() + value.slice(1)}
        </Badge>
      ),
    },
    {
      key: 'paymentStatus',
      header: 'Payment',
      render: (value) => (
        <Badge variant={
          value === 'paid' ? 'default' :
          value === 'pending' ? 'secondary' :
          'destructive'
        }>
          {value.charAt(0).toUpperCase() + value.slice(1)}
        </Badge>
      ),
    },
  ], [])

  // Export to CSV
  const handleExport = async () => {
    const exportData = filteredSessions.map(session => ({
      'Entry Time': formatDate(session.entryTime),
      'Exit Time': session.exitTime ? formatDate(session.exitTime) : 'In Progress',
      'Duration': session.duration ? formatDuration(session.duration) : 'In Progress',
      'Location': session.spot ? `Spot ${session.spot.spotNumber} - Floor ${session.spot.floor}` : 'Unknown',
      'Cost': session.totalCost ? formatCurrency(session.totalCost) : '',
      'Status': session.status,
      'Payment Status': session.paymentStatus,
    }))

    const filename = `${vehicle.licensePlate}_parking_history_${new Date().toISOString().split('T')[0]}.csv`
    exportToCsv(exportData, filename)
  }

  const refreshData = async () => {
    setError(null)
    setLoading(true)
    try {
      const response = await apiService.getSessions()
      if (response.success) {
        const vehicleSessions = response.data
          .filter(session => session.vehicleId === vehicle.id)
          .sort((a, b) => new Date(b.entryTime).getTime() - new Date(a.entryTime).getTime())
        
        setSessions(vehicleSessions)
      }
    } catch (err) {
      setError('Failed to refresh data')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={className}>
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        {onBack && (
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        )}
        <div className="flex-1">
          <h2 className="text-2xl font-bold">Parking History</h2>
          <p className="text-muted-foreground">
            Complete parking history for {vehicle.licensePlate}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={refreshData} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="outline" onClick={handleExport} disabled={loading}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {error && (
        <Alert className="mb-6">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Sessions</p>
                <p className="text-2xl font-bold">{stats.totalSessions}</p>
              </div>
              <Calendar className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Spent</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(stats.totalSpent)}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Average Duration</p>
                <p className="text-2xl font-bold text-blue-600">
                  {formatDuration(stats.averageDuration)}
                </p>
              </div>
              <Clock className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Average Cost</p>
                <p className="text-2xl font-bold text-orange-600">
                  {formatCurrency(stats.averageCost)}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Additional Statistics */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Session Insights</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600 flex items-center justify-center gap-2">
                <TrendingUp className="h-6 w-6" />
                {formatDuration(stats.longestSession)}
              </div>
              <div className="text-sm text-muted-foreground">Longest Session</div>
            </div>
            
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600 flex items-center justify-center gap-2">
                <TrendingDown className="h-6 w-6" />
                {formatDuration(stats.shortestSession)}
              </div>
              <div className="text-sm text-muted-foreground">Shortest Session</div>
            </div>

            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600">
                {formatDuration(stats.totalDuration)}
              </div>
              <div className="text-sm text-muted-foreground">Total Time Parked</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4 items-center">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Filters:</span>
            </div>
            
            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="7days">Last 7 Days</SelectItem>
                <SelectItem value="30days">Last 30 Days</SelectItem>
                <SelectItem value="90days">Last 90 Days</SelectItem>
                <SelectItem value="1year">Last Year</SelectItem>
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>

            <div className="text-sm text-muted-foreground ml-auto">
              Showing {filteredSessions.length} of {sessions.length} sessions
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sessions Table */}
      <Card>
        <CardHeader>
          <CardTitle>Parking Sessions</CardTitle>
          <CardDescription>
            Detailed history of all parking sessions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            data={filteredSessions}
            columns={columns}
            loading={loading}
            pagination={pagination}
            onPageChange={(page) => setPagination(prev => ({ ...prev, page }))}
            onPageSizeChange={(limit) => setPagination(prev => ({ 
              ...prev, 
              limit,
              totalPages: Math.ceil(prev.total / limit)
            }))}
            emptyMessage="No parking sessions found for the selected filters."
          />
        </CardContent>
      </Card>
    </div>
  )
}

export default VehicleHistory