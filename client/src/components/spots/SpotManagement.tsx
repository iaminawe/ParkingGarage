import React, { useState, useEffect } from 'react'
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { 
  ParkingSquare, 
  Filter,
  RefreshCw,
  Zap,
  Accessibility,
  Car,
  Truck,
  Bike,
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock,
  Search
} from 'lucide-react'
import { apiService } from '@/services/api'
import type { ParkingSpot, ParkingGarage } from '@/types/api-extensions'
import { toast } from '@/components/ui/use-toast'
import { cn } from '@/lib/utils'

interface SpotFilters {
  status: 'all' | ParkingSpot['status']
  type: 'all' | ParkingSpot['type']
  floor: string
  bay: string
  search: string
}

interface SpotManagementProps {
  garageId?: string
}

export function SpotManagement({ garageId = 'default' }: SpotManagementProps = {}) {
  const [spots, setSpots] = useState<ParkingSpot[]>([])
  const [garages, setGarages] = useState<ParkingGarage[]>([])
  const [selectedGarage, setSelectedGarage] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState<SpotFilters>({
    status: 'all',
    type: 'all',
    floor: 'all',
    bay: 'all',
    search: ''
  })
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

  useEffect(() => {
    fetchGarages()
  }, [])

  useEffect(() => {
    if (selectedGarage) {
      fetchSpots()
    }
  }, [selectedGarage])

  const fetchGarages = async () => {
    try {
      const response = await apiService.getGarages()
      if (response.success && response.data.length > 0) {
        setGarages(response.data)
        setSelectedGarage(response.data[0].id)
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to fetch garages',
        variant: 'destructive'
      })
    }
  }

  const fetchSpots = async () => {
    try {
      setLoading(true)
      const response = await apiService.getSpots(selectedGarage)
      if (response.success) {
        setSpots(response.data)
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to fetch parking spots',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleStatusChange = async (spotId: string, newStatus: ParkingSpot['status']) => {
    try {
      const response = await apiService.updateSpotStatus(spotId, newStatus)
      if (response.success) {
        toast({
          title: 'Success',
          description: `Spot status updated to ${newStatus}`
        })
        fetchSpots()
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update spot status',
        variant: 'destructive'
      })
    }
  }

  const getSpotIcon = (type: ParkingSpot['type']) => {
    switch (type) {
      case 'compact':
        return <Car className="h-4 w-4" />
      case 'standard':
        return <ParkingSquare className="h-4 w-4" />
      case 'large':
        return <Truck className="h-4 w-4" />
      case 'motorcycle':
        return <Bike className="h-4 w-4" />
      case 'electric':
        return <Zap className="h-4 w-4" />
      case 'handicapped':
        return <Accessibility className="h-4 w-4" />
      default:
        return <ParkingSquare className="h-4 w-4" />
    }
  }

  const getStatusIcon = (status: ParkingSpot['status']) => {
    switch (status) {
      case 'available':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'occupied':
        return <XCircle className="h-4 w-4 text-red-500" />
      case 'maintenance':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />
      case 'reserved':
        return <Clock className="h-4 w-4 text-blue-500" />
      default:
        return null
    }
  }

  const getStatusColor = (status: ParkingSpot['status']) => {
    switch (status) {
      case 'available':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'occupied':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'maintenance':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'reserved':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const filteredSpots = spots.filter(spot => {
    if (filters.status !== 'all' && spot.status !== filters.status) return false
    if (filters.type !== 'all' && spot.type !== filters.type) return false
    if (filters.floor !== 'all' && spot.floor !== filters.floor) return false
    if (filters.bay !== 'all' && spot.bay !== filters.bay) return false
    if (filters.search && !spot.spotNumber.toLowerCase().includes(filters.search.toLowerCase())) return false
    return true
  })

  const floors = [...new Set(spots.map(s => s.floor))].sort()
  const bays = [...new Set(spots.filter(s => filters.floor === 'all' || s.floor === filters.floor).map(s => s.bay))].sort()

  const spotStats = {
    total: spots.length,
    available: spots.filter(s => s.status === 'available').length,
    occupied: spots.filter(s => s.status === 'occupied').length,
    maintenance: spots.filter(s => s.status === 'maintenance').length,
    reserved: spots.filter(s => s.status === 'reserved').length
  }

  const occupancyRate = spotStats.total > 0 
    ? Math.round((spotStats.occupied / spotStats.total) * 100) 
    : 0

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Spots</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{spotStats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Available</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{spotStats.available}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Occupied</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{spotStats.occupied}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Maintenance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{spotStats.maintenance}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Occupancy Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{occupancyRate}%</div>
          </CardContent>
        </Card>
      </div>

      {/* Main Management Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ParkingSquare className="h-5 w-5" />
            Spot Management
          </CardTitle>
          <CardDescription>
            Monitor and manage all parking spots
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="space-y-4 mb-6">
            <div className="flex gap-4 items-end">
              <div className="flex-1">
                <label className="text-sm font-medium mb-1 block">Garage</label>
                <Select value={selectedGarage} onValueChange={setSelectedGarage}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select garage" />
                  </SelectTrigger>
                  <SelectContent>
                    {garages.map(garage => (
                      <SelectItem key={garage.id} value={garage.id}>
                        {garage.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1">
                <label className="text-sm font-medium mb-1 block">Search</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search spot number..."
                    value={filters.search}
                    onChange={(e) => setFilters({...filters, search: e.target.value})}
                    className="pl-10"
                  />
                </div>
              </div>
              <Button onClick={fetchSpots} variant="outline">
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>

            <div className="flex gap-4">
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
                  <SelectItem value="available">Available</SelectItem>
                  <SelectItem value="occupied">Occupied</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                  <SelectItem value="reserved">Reserved</SelectItem>
                </SelectContent>
              </Select>

              <Select 
                value={filters.type} 
                onValueChange={(value: any) => setFilters({...filters, type: value})}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="compact">Compact</SelectItem>
                  <SelectItem value="standard">Standard</SelectItem>
                  <SelectItem value="large">Large</SelectItem>
                  <SelectItem value="motorcycle">Motorcycle</SelectItem>
                  <SelectItem value="electric">Electric</SelectItem>
                  <SelectItem value="handicapped">Handicapped</SelectItem>
                </SelectContent>
              </Select>

              <Select 
                value={filters.floor} 
                onValueChange={(value) => setFilters({...filters, floor: value, bay: 'all'})}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by floor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Floors</SelectItem>
                  {floors.map(floor => (
                    <SelectItem key={floor} value={floor}>Floor {floor}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select 
                value={filters.bay} 
                onValueChange={(value) => setFilters({...filters, bay: value})}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by bay" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Bays</SelectItem>
                  {bays.map(bay => (
                    <SelectItem key={bay} value={bay}>Bay {bay}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="ml-auto">
                <div className="flex gap-2">
                  <Button
                    variant={viewMode === 'grid' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setViewMode('grid')}
                  >
                    Grid
                  </Button>
                  <Button
                    variant={viewMode === 'list' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setViewMode('list')}
                  >
                    List
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Spots Display */}
          {loading ? (
            <div className="text-center py-8">Loading spots...</div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-8 gap-2">
              {filteredSpots.map((spot) => (
                <div
                  key={spot.id}
                  className={cn(
                    "relative p-3 rounded-lg border-2 cursor-pointer transition-all hover:shadow-md",
                    getStatusColor(spot.status)
                  )}
                  onClick={() => {
                    if (spot.status === 'available') {
                      handleStatusChange(spot.id, 'reserved')
                    } else if (spot.status === 'reserved') {
                      handleStatusChange(spot.id, 'available')
                    }
                  }}
                >
                  <div className="flex flex-col items-center space-y-1">
                    <div className="flex items-center gap-1">
                      {getSpotIcon(spot.type)}
                      {getStatusIcon(spot.status)}
                    </div>
                    <div className="text-xs font-medium">{spot.spotNumber}</div>
                    <div className="text-xs opacity-75">F{spot.floor}-B{spot.bay}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="border rounded-lg">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium">Spot</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Location</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Type</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Status</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Rate</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredSpots.map((spot) => (
                    <tr key={spot.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium">{spot.spotNumber}</td>
                      <td className="px-4 py-3">Floor {spot.floor}, Bay {spot.bay}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {getSpotIcon(spot.type)}
                          <span className="capitalize">{spot.type}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge className={cn("gap-1", getStatusColor(spot.status))}>
                          {getStatusIcon(spot.status)}
                          {spot.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">${spot.hourlyRate}/hr</td>
                      <td className="px-4 py-3">
                        <Select 
                          value={spot.status}
                          onValueChange={(value: ParkingSpot['status']) => handleStatusChange(spot.id, value)}
                        >
                          <SelectTrigger className="w-[140px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="available">Available</SelectItem>
                            <SelectItem value="occupied">Occupied</SelectItem>
                            <SelectItem value="maintenance">Maintenance</SelectItem>
                            <SelectItem value="reserved">Reserved</SelectItem>
                          </SelectContent>
                        </Select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredSpots.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No spots found matching filters
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}