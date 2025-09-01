import React, { useState, useCallback } from 'react'
import { Plus, Search, Filter, Download, Trash2, Edit } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { Loading } from '@/components/ui/loading'
import { VehicleList } from './VehicleList'
import { VehicleForm } from './VehicleForm'
import { VehicleDetails } from './VehicleDetails'
import { VehicleHistory } from './VehicleHistory'
import { useVehicleManagement } from '../hooks/useVehicleManagement'
import type { Vehicle, VehicleFilters, VehicleType, VehicleStatus } from '@/types/api'

interface VehicleManagementProps {
  className?: string
}

export const VehicleManagement: React.FC<VehicleManagementProps> = ({ className }) => {
  const [activeTab, setActiveTab] = useState('list')
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null)
  const [bulkSelection, setBulkSelection] = useState<string[]>([])

  // Filters and search
  const [filters, setFilters] = useState<VehicleFilters>({})
  const [searchQuery, setSearchQuery] = useState('')

  const {
    vehicles,
    loading,
    error,
    pagination,
    metrics,
    createVehicle,
    updateVehicle,
    deleteVehicle,
    bulkDeleteVehicles,
    searchVehicles,
    exportVehicles,
    refreshVehicles
  } = useVehicleManagement(filters)

  // Event handlers
  const handleCreateVehicle = useCallback(async (vehicleData: Partial<Vehicle>) => {
    try {
      await createVehicle(vehicleData)
      setIsFormOpen(false)
      await refreshVehicles()
    } catch (error) {
      console.error('Failed to create vehicle:', error)
    }
  }, [createVehicle, refreshVehicles])

  const handleUpdateVehicle = useCallback(async (vehicleData: Partial<Vehicle>) => {
    if (!editingVehicle) return
    
    try {
      await updateVehicle(editingVehicle.id, vehicleData)
      setEditingVehicle(null)
      setIsFormOpen(false)
      await refreshVehicles()
    } catch (error) {
      console.error('Failed to update vehicle:', error)
    }
  }, [editingVehicle, updateVehicle, refreshVehicles])

  const handleDeleteVehicle = useCallback(async (vehicleId: string) => {
    try {
      await deleteVehicle(vehicleId)
      await refreshVehicles()
    } catch (error) {
      console.error('Failed to delete vehicle:', error)
    }
  }, [deleteVehicle, refreshVehicles])

  const handleBulkDelete = useCallback(async () => {
    if (bulkSelection.length === 0) return
    
    try {
      await bulkDeleteVehicles(bulkSelection)
      setBulkSelection([])
      await refreshVehicles()
    } catch (error) {
      console.error('Failed to delete vehicles:', error)
    }
  }, [bulkSelection, bulkDeleteVehicles, refreshVehicles])

  const handleSearch = useCallback(async (query: string) => {
    setSearchQuery(query)
    if (query.trim()) {
      await searchVehicles(query)
    } else {
      await refreshVehicles()
    }
  }, [searchVehicles, refreshVehicles])

  const handleFilterChange = useCallback((newFilters: Partial<VehicleFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }))
  }, [])

  const handleExport = useCallback(async () => {
    try {
      await exportVehicles(filters)
    } catch (error) {
      console.error('Failed to export vehicles:', error)
    }
  }, [exportVehicles, filters])

  const openEditForm = useCallback((vehicle: Vehicle) => {
    setEditingVehicle(vehicle)
    setIsFormOpen(true)
  }, [])

  const openCreateForm = useCallback(() => {
    setEditingVehicle(null)
    setIsFormOpen(true)
  }, [])

  const closeForm = useCallback(() => {
    setIsFormOpen(false)
    setEditingVehicle(null)
  }, [])

  const selectVehicle = useCallback((vehicle: Vehicle) => {
    setSelectedVehicle(vehicle)
    setActiveTab('details')
  }, [])

  const viewVehicleHistory = useCallback((vehicle: Vehicle) => {
    setSelectedVehicle(vehicle)
    setActiveTab('history')
  }, [])

  if (loading && !vehicles.length) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loading size="lg" />
      </div>
    )
  }

  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl font-bold">Vehicle Management</CardTitle>
              <CardDescription>
                Manage vehicles, track parking history, and monitor vehicle status
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                onClick={handleExport}
                className="hidden md:flex"
              >
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
              <Button onClick={openCreateForm}>
                <Plus className="h-4 w-4 mr-2" />
                Add Vehicle
              </Button>
            </div>
          </div>

          {/* Metrics Summary */}
          {metrics && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">{metrics.totalVehicles}</div>
                <div className="text-sm text-muted-foreground">Total Vehicles</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{metrics.activeVehicles}</div>
                <div className="text-sm text-muted-foreground">Active</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{metrics.currentlyParked}</div>
                <div className="text-sm text-muted-foreground">Currently Parked</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">{metrics.totalSessions}</div>
                <div className="text-sm text-muted-foreground">Total Sessions</div>
              </div>
            </div>
          )}

          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row gap-2 mt-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by license plate or owner..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select
              value={filters.type || 'all'}
              onValueChange={(value) => handleFilterChange({ type: value === 'all' ? undefined : value as VehicleType })}
            >
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Vehicle Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="car">Car</SelectItem>
                <SelectItem value="motorcycle">Motorcycle</SelectItem>
                <SelectItem value="truck">Truck</SelectItem>
                <SelectItem value="van">Van</SelectItem>
                <SelectItem value="bus">Bus</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={filters.status || 'all'}
              onValueChange={(value) => handleFilterChange({ status: value === 'all' ? undefined : value as VehicleStatus })}
            >
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="blocked">Blocked</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Bulk Actions */}
          {bulkSelection.length > 0 && (
            <div className="flex items-center gap-2 p-3 bg-muted rounded-md mt-4">
              <span className="text-sm">
                {bulkSelection.length} vehicle{bulkSelection.length > 1 ? 's' : ''} selected
              </span>
              <Separator orientation="vertical" className="h-4" />
              <Button
                variant="destructive"
                size="sm"
                onClick={handleBulkDelete}
                disabled={loading}
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Delete
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setBulkSelection([])}
              >
                Clear Selection
              </Button>
            </div>
          )}
        </CardHeader>

        <CardContent>
          {error && (
            <Alert className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="list">Vehicle List</TabsTrigger>
              <TabsTrigger value="details" disabled={!selectedVehicle}>
                Vehicle Details
              </TabsTrigger>
              <TabsTrigger value="history" disabled={!selectedVehicle}>
                Parking History
              </TabsTrigger>
            </TabsList>

            <TabsContent value="list" className="mt-4">
              <VehicleList
                vehicles={vehicles}
                loading={loading}
                pagination={pagination}
                selectedVehicles={bulkSelection}
                onSelectionChange={setBulkSelection}
                onVehicleSelect={selectVehicle}
                onVehicleEdit={openEditForm}
                onVehicleDelete={handleDeleteVehicle}
                onViewHistory={viewVehicleHistory}
              />
            </TabsContent>

            <TabsContent value="details" className="mt-4">
              {selectedVehicle ? (
                <VehicleDetails
                  vehicle={selectedVehicle}
                  onEdit={() => openEditForm(selectedVehicle)}
                  onViewHistory={() => viewVehicleHistory(selectedVehicle)}
                />
              ) : (
                <div className="text-center text-muted-foreground py-8">
                  Select a vehicle from the list to view details
                </div>
              )}
            </TabsContent>

            <TabsContent value="history" className="mt-4">
              {selectedVehicle ? (
                <VehicleHistory
                  vehicle={selectedVehicle}
                  onBack={() => setActiveTab('details')}
                />
              ) : (
                <div className="text-center text-muted-foreground py-8">
                  Select a vehicle from the list to view parking history
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Vehicle Form Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingVehicle ? 'Edit Vehicle' : 'Add New Vehicle'}
            </DialogTitle>
            <DialogDescription>
              {editingVehicle 
                ? 'Update vehicle information and settings'
                : 'Enter vehicle details to register a new vehicle'
              }
            </DialogDescription>
          </DialogHeader>
          <VehicleForm
            vehicle={editingVehicle}
            onSubmit={editingVehicle ? handleUpdateVehicle : handleCreateVehicle}
            onCancel={closeForm}
            loading={loading}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default VehicleManagement