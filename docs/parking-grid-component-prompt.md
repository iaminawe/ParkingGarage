# Parking Grid Component - Bolt.new Prompt

## 🎯 Component Overview

Create a **Parking Grid Component** using **React + TypeScript + shadcn/ui** that displays an interactive garage floor map with real-time spot status updates. This component integrates with an existing parking garage management API and provides a visual interface for spot management.

## 🔌 API Integration

### Base API URL
```
http://localhost:3000/api
```

### Key Endpoints
```typescript
// Get spots with filtering
GET /api/spots?floor=1&status=AVAILABLE&type=REGULAR

// Update spot status
PATCH /api/spots/:id
Body: { status: 'OCCUPIED' | 'AVAILABLE' | 'RESERVED' | 'MAINTENANCE' }

// Get garage configuration
GET /api/garage
```

### WebSocket Events
```typescript
// Real-time updates
socket.on('spot:updated', (spotData) => {
  // Update grid in real-time
})
```

## 📊 Data Models

### ParkingSpot Interface
```typescript
interface ParkingSpot {
  id: number
  spotNumber: string
  spotType: 'REGULAR' | 'COMPACT' | 'ELECTRIC' | 'HANDICAPPED'
  status: 'AVAILABLE' | 'OCCUPIED' | 'RESERVED' | 'MAINTENANCE'
  floorId: number
  level: number
  section?: string
  width?: number
  length?: number
  features?: string[]
  currentVehicle?: {
    licensePlate: string
    checkInTime: Date
  }
}
```

## 🎨 UI Requirements

### Visual Design
- **Grid Layout**: CSS Grid or Flexbox for spot arrangement
- **Spot Visualization**: Square/rectangular cards representing parking spots
- **Color Coding**: 
  - 🟢 Available (green)
  - 🔴 Occupied (red) 
  - 🟡 Reserved (yellow)
  - ⚫ Maintenance (gray)
- **Spot Types**: Icons/symbols for different spot types
  - 🚗 Regular
  - 🏎️ Compact
  - ⚡ Electric (with charging icon)
  - ♿ Handicapped (accessibility icon)

### Interactive Features
- **Click to Select**: Click spot to view details or change status
- **Hover Effects**: Show spot information on hover
- **Status Toggle**: Quick status change for operators
- **Zoom Controls**: Zoom in/out for better visibility
- **Floor Selector**: Switch between garage floors

### shadcn/ui Components to Use
```typescript
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
```

## 🛠️ Component Structure

### Main Component: ParkingGrid
```typescript
interface ParkingGridProps {
  floorId: number
  onSpotSelect?: (spot: ParkingSpot) => void
  onSpotUpdate?: (spotId: number, updates: Partial<ParkingSpot>) => void
  editable?: boolean
  showFilters?: boolean
}
```

### Child Components Needed
1. **SpotCard** - Individual parking spot representation
2. **FloorSelector** - Switch between floors
3. **FilterControls** - Filter by status, type, etc.
4. **SpotDetailsModal** - Detailed spot information
5. **GridControls** - Zoom, view options, refresh

## 🎯 Functional Requirements

### Core Features
```typescript
// 1. Display spots in grid layout
const spots = await fetchSpots({ floorId, status, type })

// 2. Real-time updates via WebSocket
useEffect(() => {
  socket.on('spot:updated', (updatedSpot) => {
    setSpots(prev => prev.map(spot => 
      spot.id === updatedSpot.id ? updatedSpot : spot
    ))
  })
}, [])

// 3. Click handling
const handleSpotClick = (spot: ParkingSpot) => {
  if (editable) {
    // Show edit modal or quick status toggle
  } else {
    // Show details only
  }
}

// 4. Status updates
const updateSpotStatus = async (spotId: number, status: SpotStatus) => {
  await api.patch(`/spots/${spotId}`, { status })
  // Optimistic update
}
```

### Advanced Features
- **Search & Filter**: Filter by spot number, type, status
- **Bulk Operations**: Select multiple spots for bulk status updates
- **Grid Density**: Adjust spot size/spacing
- **Export View**: Generate printable floor plan
- **Accessibility**: Keyboard navigation, screen reader support

## 🎨 Styling Requirements

### Grid Layout
```css
.parking-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
  gap: 8px;
  padding: 16px;
}

.spot-card {
  aspect-ratio: 1;
  border: 2px solid;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
}
```

### Status Colors (using CSS variables)
```css
.spot-available { border-color: hsl(var(--success)); background: hsl(var(--success)/0.1); }
.spot-occupied { border-color: hsl(var(--destructive)); background: hsl(var(--destructive)/0.1); }
.spot-reserved { border-color: hsl(var(--warning)); background: hsl(var(--warning)/0.1); }
.spot-maintenance { border-color: hsl(var(--muted)); background: hsl(var(--muted)/0.1); }
```

## 📱 Responsive Design

### Breakpoints
- **Mobile (< 768px)**: 4-6 spots per row, larger touch targets
- **Tablet (768px - 1024px)**: 8-10 spots per row
- **Desktop (> 1024px)**: 12+ spots per row, hover interactions

### Mobile Optimizations
- Larger spot cards for touch interaction
- Swipe gestures for floor navigation
- Bottom sheet for spot details
- Simplified filter controls

## 🔧 Implementation Example

### Basic Component Structure
```typescript
export function ParkingGrid({ floorId, onSpotSelect, editable = false }: ParkingGridProps) {
  const [spots, setSpots] = useState<ParkingSpot[]>([])
  const [filters, setFilters] = useState({ status: 'ALL', type: 'ALL' })
  const [selectedSpot, setSelectedSpot] = useState<ParkingSpot | null>(null)
  const [loading, setLoading] = useState(true)

  // Fetch spots
  useEffect(() => {
    fetchSpots()
  }, [floorId, filters])

  // Real-time updates
  useEffect(() => {
    const socket = io('http://localhost:3000')
    socket.on('spot:updated', handleSpotUpdate)
    return () => socket.disconnect()
  }, [])

  const filteredSpots = useMemo(() => {
    return spots.filter(spot => {
      if (filters.status !== 'ALL' && spot.status !== filters.status) return false
      if (filters.type !== 'ALL' && spot.spotType !== filters.type) return false
      return true
    })
  }, [spots, filters])

  return (
    <div className="parking-grid-container">
      <FilterControls filters={filters} onFiltersChange={setFilters} />
      
      <div className="parking-grid">
        {filteredSpots.map(spot => (
          <SpotCard 
            key={spot.id}
            spot={spot}
            onClick={() => handleSpotClick(spot)}
            editable={editable}
          />
        ))}
      </div>

      {selectedSpot && (
        <SpotDetailsModal 
          spot={selectedSpot}
          onClose={() => setSelectedSpot(null)}
          onUpdate={handleSpotUpdate}
        />
      )}
    </div>
  )
}
```

### SpotCard Component
```typescript
function SpotCard({ spot, onClick, editable }: SpotCardProps) {
  const statusColors = {
    AVAILABLE: 'spot-available',
    OCCUPIED: 'spot-occupied', 
    RESERVED: 'spot-reserved',
    MAINTENANCE: 'spot-maintenance'
  }

  const typeIcons = {
    REGULAR: '🚗',
    COMPACT: '🏎️', 
    ELECTRIC: '⚡',
    HANDICAPPED: '♿'
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Card 
            className={cn(
              'spot-card cursor-pointer hover:shadow-md transition-all',
              statusColors[spot.status]
            )}
            onClick={() => onClick(spot)}
          >
            <CardContent className="p-2 text-center">
              <div className="text-lg">{typeIcons[spot.spotType]}</div>
              <div className="text-xs font-mono">{spot.spotNumber}</div>
              <Badge variant="outline" className="text-xs mt-1">
                {spot.status}
              </Badge>
            </CardContent>
          </Card>
        </TooltipTrigger>
        <TooltipContent>
          <p>Spot {spot.spotNumber}</p>
          <p>{spot.spotType} - {spot.status}</p>
          {spot.currentVehicle && (
            <p>Vehicle: {spot.currentVehicle.licensePlate}</p>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
```

## 🚀 Usage Example

```typescript
// In your dashboard or garage management page
function GarageFloorView() {
  const [selectedFloor, setSelectedFloor] = useState(1)
  
  const handleSpotUpdate = async (spotId: number, updates: Partial<ParkingSpot>) => {
    try {
      await updateSpot(spotId, updates)
      toast.success('Spot updated successfully')
    } catch (error) {
      toast.error('Failed to update spot')
    }
  }

  return (
    <div className="garage-floor-view">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">Floor {selectedFloor}</h2>
        <Select value={selectedFloor.toString()} onValueChange={(v) => setSelectedFloor(Number(v))}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">Floor 1</SelectItem>
            <SelectItem value="2">Floor 2</SelectItem>
            <SelectItem value="3">Floor 3</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <ParkingGrid 
        floorId={selectedFloor}
        onSpotUpdate={handleSpotUpdate}
        editable={true}
        showFilters={true}
      />
    </div>
  )
}
```

## ✅ Success Criteria

- ✅ Visual grid showing all parking spots
- ✅ Real-time status updates via WebSocket
- ✅ Interactive spot selection and editing
- ✅ Proper color coding for different statuses
- ✅ Responsive design for all screen sizes
- ✅ Accessibility features (keyboard nav, screen readers)
- ✅ Filter and search functionality
- ✅ Performance optimization for large grids
- ✅ Integration with shadcn/ui components
- ✅ TypeScript type safety throughout

This component should provide a professional, efficient interface for visualizing and managing parking spots with real-time updates and intuitive user interactions.