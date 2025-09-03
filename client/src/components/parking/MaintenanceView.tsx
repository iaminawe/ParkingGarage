import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Spinner } from '@/components/ui/loading'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter
} from '@/components/ui/dialog'
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import { 
  Wrench, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Plus, 
  Search,
  Calendar,
  User,
  MapPin
} from 'lucide-react'

interface MaintenanceViewProps {
  garageId: string
  sharedState: {
    selectedFloor: number
    searchQuery: string
    statusFilter: string
    typeFilter: string
    lastRefresh: Date
  }
  className?: string
}

interface MaintenanceTicket {
  id: string
  spotId: string
  spotLocation: string
  priority: 'low' | 'medium' | 'high' | 'critical'
  status: 'open' | 'in_progress' | 'completed' | 'deferred'
  type: string
  title: string
  description: string
  reportedBy: string
  assignedTo?: string
  createdAt: string
  updatedAt: string
  estimatedCompletion?: string
  actualCompletion?: string
}

interface MaintenanceStats {
  openTickets: number
  inProgressTickets: number
  completedToday: number
  averageResolutionTime: number
  criticalIssues: number
}

export const MaintenanceView: React.FC<MaintenanceViewProps> = ({
  garageId,
  sharedState,
  className = ''
}) => {
  const [tickets, setTickets] = useState<MaintenanceTicket[]>([])
  const [stats, setStats] = useState<MaintenanceStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [priorityFilter, setPriorityFilter] = useState<string>('all')
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [newTicket, setNewTicket] = useState({
    spotLocation: '',
    priority: 'medium' as const,
    type: '',
    title: '',
    description: '',
    assignedTo: ''
  })

  useEffect(() => {
    const loadMaintenanceData = async () => {
      setLoading(true)
      
      // Simulate API call - replace with real implementation
      await new Promise(resolve => setTimeout(resolve, 800))
      
      // Mock data
      setStats({
        openTickets: 7,
        inProgressTickets: 3,
        completedToday: 5,
        averageResolutionTime: 4.2,
        criticalIssues: 1
      })

      setTickets([
        {
          id: 'MT001',
          spotId: 'spot-1-a-15',
          spotLocation: 'Floor 1, Bay A, Spot 15',
          priority: 'critical',
          status: 'open',
          type: 'Electrical',
          title: 'EV Charging Station Not Working',
          description: 'Charging station displays error code E204. Customer unable to charge vehicle.',
          reportedBy: 'John Smith',
          assignedTo: 'Mike Johnson',
          createdAt: '2024-01-15T09:30:00Z',
          updatedAt: '2024-01-15T09:30:00Z',
          estimatedCompletion: '2024-01-15T14:00:00Z'
        },
        {
          id: 'MT002',
          spotId: 'spot-2-b-08',
          spotLocation: 'Floor 2, Bay B, Spot 8',
          priority: 'high',
          status: 'in_progress',
          type: 'Mechanical',
          title: 'Parking Barrier Stuck',
          description: 'Entry barrier remains in down position, preventing access to spot.',
          reportedBy: 'Sarah Wilson',
          assignedTo: 'David Brown',
          createdAt: '2024-01-14T16:45:00Z',
          updatedAt: '2024-01-15T08:15:00Z',
          estimatedCompletion: '2024-01-15T12:00:00Z'
        },
        {
          id: 'MT003',
          spotId: 'spot-1-c-22',
          spotLocation: 'Floor 1, Bay C, Spot 22',
          priority: 'medium',
          status: 'open',
          type: 'Lighting',
          title: 'Overhead Light Not Working',
          description: 'Overhead LED light is not functioning, making spot poorly lit.',
          reportedBy: 'Mike Davis',
          createdAt: '2024-01-14T14:20:00Z',
          updatedAt: '2024-01-14T14:20:00Z'
        },
        {
          id: 'MT004',
          spotId: 'spot-3-a-05',
          spotLocation: 'Floor 3, Bay A, Spot 5',
          priority: 'low',
          status: 'deferred',
          type: 'Cleaning',
          title: 'Oil Stain on Parking Surface',
          description: 'Large oil stain visible on parking spot surface.',
          reportedBy: 'Lisa Anderson',
          createdAt: '2024-01-13T11:10:00Z',
          updatedAt: '2024-01-14T09:00:00Z'
        },
        {
          id: 'MT005',
          spotId: 'spot-2-d-12',
          spotLocation: 'Floor 2, Bay D, Spot 12',
          priority: 'medium',
          status: 'completed',
          type: 'Signage',
          title: 'Spot Number Sign Missing',
          description: 'Spot identification number sign has fallen off.',
          reportedBy: 'Tom Wilson',
          assignedTo: 'Alex Chen',
          createdAt: '2024-01-12T13:30:00Z',
          updatedAt: '2024-01-14T16:45:00Z',
          actualCompletion: '2024-01-14T16:45:00Z'
        }
      ])
      
      setLoading(false)
    }

    loadMaintenanceData()
  }, [garageId, sharedState.lastRefresh])

  const filteredTickets = tickets.filter(ticket => {
    const matchesSearch = searchQuery === '' || 
      ticket.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.spotLocation.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.id.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesStatus = statusFilter === 'all' || ticket.status === statusFilter
    const matchesPriority = priorityFilter === 'all' || ticket.priority === priorityFilter
    
    return matchesSearch && matchesStatus && matchesPriority
  })

  const getPriorityColor = (priority: MaintenanceTicket['priority']) => {
    switch (priority) {
      case 'critical': return 'destructive'
      case 'high': return 'warning'
      case 'medium': return 'secondary'
      default: return 'outline'
    }
  }

  const getStatusColor = (status: MaintenanceTicket['status']) => {
    switch (status) {
      case 'completed': return 'success'
      case 'in_progress': return 'warning'
      case 'deferred': return 'secondary'
      default: return 'outline'
    }
  }

  const getStatusIcon = (status: MaintenanceTicket['status']) => {
    switch (status) {
      case 'completed': return <CheckCircle2 className="h-4 w-4" />
      case 'in_progress': return <Clock className="h-4 w-4" />
      default: return <AlertTriangle className="h-4 w-4" />
    }
  }

  const handleCreateTicket = () => {
    // In real implementation, this would make an API call
    console.log('Creating ticket:', newTicket)
    setCreateDialogOpen(false)
    setNewTicket({
      spotLocation: '',
      priority: 'medium',
      type: '',
      title: '',
      description: '',
      assignedTo: ''
    })
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString() + ' ' + 
           new Date(dateString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Spinner size="lg" />
      </div>
    )
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-8 w-8 text-orange-600" />
              <div>
                <div className="text-2xl font-semibold">{stats?.openTickets}</div>
                <div className="text-sm text-muted-foreground">Open Tickets</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Clock className="h-8 w-8 text-blue-600" />
              <div>
                <div className="text-2xl font-semibold">{stats?.inProgressTickets}</div>
                <div className="text-sm text-muted-foreground">In Progress</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
              <div>
                <div className="text-2xl font-semibold">{stats?.completedToday}</div>
                <div className="text-sm text-muted-foreground">Completed Today</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Clock className="h-8 w-8 text-purple-600" />
              <div>
                <div className="text-2xl font-semibold">{stats?.averageResolutionTime}h</div>
                <div className="text-sm text-muted-foreground">Avg Resolution</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-8 w-8 text-red-600" />
              <div>
                <div className="text-2xl font-semibold">{stats?.criticalIssues}</div>
                <div className="text-sm text-muted-foreground">Critical Issues</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Controls */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="flex items-center gap-4 flex-1">
              <div className="relative max-w-sm">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search tickets..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="deferred">Deferred</SelectItem>
                </SelectContent>
              </Select>

              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priority</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Create Ticket
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Create Maintenance Ticket</DialogTitle>
                  <DialogDescription>
                    Report a new maintenance issue for a parking spot.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Spot Location</label>
                    <Input
                      placeholder="e.g., Floor 1, Bay A, Spot 15"
                      value={newTicket.spotLocation}
                      onChange={(e) => setNewTicket({...newTicket, spotLocation: e.target.value})}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium">Priority</label>
                      <Select value={newTicket.priority} onValueChange={(value: 'low' | 'medium' | 'high' | 'critical') => setNewTicket({...newTicket, priority: value})}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="critical">Critical</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Type</label>
                      <Select value={newTicket.type} onValueChange={(value) => setNewTicket({...newTicket, type: value})}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Electrical">Electrical</SelectItem>
                          <SelectItem value="Mechanical">Mechanical</SelectItem>
                          <SelectItem value="Lighting">Lighting</SelectItem>
                          <SelectItem value="Signage">Signage</SelectItem>
                          <SelectItem value="Cleaning">Cleaning</SelectItem>
                          <SelectItem value="Safety">Safety</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Title</label>
                    <Input
                      placeholder="Brief description of the issue"
                      value={newTicket.title}
                      onChange={(e) => setNewTicket({...newTicket, title: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Description</label>
                    <Textarea
                      placeholder="Detailed description of the maintenance issue"
                      value={newTicket.description}
                      onChange={(e) => setNewTicket({...newTicket, description: e.target.value})}
                      rows={3}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Assign To (Optional)</label>
                    <Input
                      placeholder="Technician name"
                      value={newTicket.assignedTo}
                      onChange={(e) => setNewTicket({...newTicket, assignedTo: e.target.value})}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateTicket}>
                    Create Ticket
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>

      {/* Tickets Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5" />
            Maintenance Tickets ({filteredTickets.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ticket ID</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Issue</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Assigned To</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTickets.map((ticket) => (
                <TableRow key={ticket.id}>
                  <TableCell className="font-medium">{ticket.id}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{ticket.spotLocation}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{ticket.title}</div>
                      <div className="text-sm text-muted-foreground">{ticket.type}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getPriorityColor(ticket.priority)}>
                      {ticket.priority.charAt(0).toUpperCase() + ticket.priority.slice(1)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(ticket.status)}
                      <Badge variant={getStatusColor(ticket.status)}>
                        {ticket.status.replace('_', ' ').charAt(0).toUpperCase() + ticket.status.slice(1)}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell>
                    {ticket.assignedTo ? (
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{ticket.assignedTo}</span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">Unassigned</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3 text-muted-foreground" />
                      <span className="text-xs">{formatDate(ticket.createdAt)}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Button variant="outline" size="sm">
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

export default MaintenanceView