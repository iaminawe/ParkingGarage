# Parking Grid Visualization Components

A comprehensive set of React components for visualizing and managing parking spots in real-time.

## Components

### ParkingGrid
The main component that displays a complete parking grid with all interactive features.

**Features:**
- Real-time WebSocket updates
- Floor selection tabs
- Grid and list view modes
- Search and filtering capabilities
- Responsive design for mobile and desktop
- Bay grouping visualization
- Live occupancy statistics

**Props:**
- `garageId?: string` - The garage ID to display spots for
- `className?: string` - Additional CSS classes
- `showControls?: boolean` - Show search and filter controls (default: true)
- `showLegend?: boolean` - Show the status legend panel (default: true)
- `defaultFloor?: number` - Default floor to display (default: 1)

### SpotTile
Individual parking spot visualization with color-coded status.

**Features:**
- Color-coded status indicators (Green/Red/Yellow/Gray)
- Ring indicators for spot types
- Feature badges for special amenities
- Hover tooltips with detailed information
- Click interaction for detailed view

**Props:**
- `spot: ParkingSpot` - The parking spot data
- `onClick?: (spot: ParkingSpot) => void` - Click handler
- `className?: string` - Additional CSS classes
- `size?: 'sm' | 'md' | 'lg'` - Tile size (default: 'md')

### SpotDetailsDialog
Modal dialog showing comprehensive spot information and management options.

**Features:**
- Complete spot information display
- Current vehicle details (if occupied)
- Real-time duration calculation
- Status update actions
- Feature and type information

**Props:**
- `spot: ParkingSpot | null` - The spot to display details for
- `open: boolean` - Whether the dialog is open
- `onOpenChange: (open: boolean) => void` - Dialog state change handler
- `onUpdateStatus?: (spotId: string, status: ParkingSpot['status']) => Promise<void>` - Status update handler
- `isUpdating?: boolean` - Whether a status update is in progress

### StatusLegend
Visual legend explaining all color codes and symbols used in the parking grid.

**Features:**
- Status color explanations
- Spot type ring indicators
- Special feature symbols
- Usage instructions
- Compact and full display modes

**Props:**
- `className?: string` - Additional CSS classes
- `compact?: boolean` - Use compact layout (default: false)
- `showTitle?: boolean` - Show the legend title (default: true)

## Color Coding System

### Status Colors
- **Green**: Available spots ready for parking
- **Red**: Occupied spots currently in use
- **Yellow**: Reserved spots held for specific users
- **Gray**: Maintenance spots temporarily unavailable

### Type Indicators (Rings)
- **No ring**: Standard parking spaces
- **Orange ring**: Compact vehicle spaces only
- **Purple ring**: Oversized spaces for large vehicles
- **Blue ring**: EV charging stations

### Feature Icons
- **⚡ Lightning**: EV charging capability
- **♿ Accessibility**: Handicap accessible spot
- **👥 Users**: Oversized/family spot
- **🔧 Wrench**: Under maintenance

## Real-time Features

### WebSocket Integration
The components automatically connect to WebSocket for real-time updates:
- Spot status changes
- Vehicle check-in/check-out events
- Maintenance status updates
- Reservation changes

### Live Statistics
- Total spots per floor
- Available/occupied/reserved counts
- Real-time occupancy percentage
- Duration calculations for occupied spots

## Responsive Design

### Desktop (lg+)
- Full grid layout with legend panel
- Complete search and filter controls
- Detailed tooltips and interactions

### Tablet (md)
- Collapsible legend panel
- Simplified control layout
- Touch-friendly interactions

### Mobile (sm)
- List view mode available
- Compact controls
- Optimized touch interactions
- Condensed information display

## Usage Examples

### Basic Usage
```tsx
import { ParkingGrid } from '@/components/parking'

function GarageView() {
  return (
    <ParkingGrid 
      garageId="garage-123"
      defaultFloor={1}
    />
  )
}
```

### Minimal Grid
```tsx
import { ParkingGrid } from '@/components/parking'

function SimpleGrid() {
  return (
    <ParkingGrid 
      garageId="garage-123"
      showControls={false}
      showLegend={false}
    />
  )
}
```

### Individual Components
```tsx
import { SpotTile, StatusLegend } from '@/components/parking'

function CustomView({ spots }) {
  return (
    <div className="grid grid-cols-10 gap-2">
      {spots.map(spot => (
        <SpotTile 
          key={spot.id} 
          spot={spot} 
          size="sm"
          onClick={handleSpotClick}
        />
      ))}
    </div>
  )
}
```

## API Integration

The components work with the following API structure:

```typescript
interface ParkingSpot {
  id: string
  floor: number
  bay: string
  spotNumber: number
  type: 'standard' | 'compact' | 'oversized' | 'ev'
  status: 'available' | 'occupied' | 'reserved' | 'maintenance'
  currentVehicle?: {
    licensePlate: string
    checkInTime: string
  }
  features?: string[]
  // ... other fields
}
```

The components automatically handle:
- Loading states
- Error handling
- Real-time updates via WebSocket
- Status changes via API calls

## Accessibility

All components include:
- ARIA labels and roles
- Keyboard navigation support
- Screen reader compatibility
- High contrast color schemes
- Focus management
- Semantic HTML structure

## Performance

The components are optimized for:
- Large datasets (1000+ parking spots)
- Real-time updates with minimal re-renders
- Responsive interactions
- Efficient memory usage
- Fast initial load times