# Vehicle Management Components

A comprehensive suite of React components for managing vehicles in the Parking Garage frontend application.

## Overview

The Vehicle Management module provides a complete interface for:

- **Vehicle Registration**: Add new vehicles with detailed information
- **Vehicle Listing**: View and search through all registered vehicles
- **Vehicle Details**: Comprehensive view of vehicle information and parking status
- **Parking History**: Complete history of parking sessions for each vehicle
- **Data Export**: Export vehicle and session data to CSV/Excel formats
- **Bulk Operations**: Delete multiple vehicles at once

## Components

### VehicleManagement
Main component that orchestrates the entire vehicle management interface.

```tsx
import { VehicleManagement } from '@/components/vehicles'

<VehicleManagement className="w-full" />
```

**Features:**
- Tabbed interface (List, Details, History)
- Real-time metrics dashboard
- Search and filtering
- Bulk actions
- Modal forms

### VehicleList
DataTable component for listing vehicles with advanced features.

```tsx
import { VehicleList } from '@/components/vehicles'

<VehicleList
  vehicles={vehicles}
  loading={loading}
  onVehicleSelect={handleSelect}
  onVehicleEdit={handleEdit}
  onVehicleDelete={handleDelete}
/>
```

**Features:**
- Sortable columns
- Pagination
- Bulk selection
- Action buttons
- Status indicators

### VehicleForm
Form component for adding/editing vehicles with validation.

```tsx
import { VehicleForm } from '@/components/vehicles'

<VehicleForm
  vehicle={editingVehicle}
  onSubmit={handleSubmit}
  onCancel={handleCancel}
/>
```

**Features:**
- React Hook Form with Zod validation
- Owner information section
- Vehicle status management
- Notes/requirements field

### VehicleDetails
Detailed view component showing comprehensive vehicle information.

```tsx
import { VehicleDetails } from '@/components/vehicles'

<VehicleDetails
  vehicle={selectedVehicle}
  onEdit={handleEdit}
  onViewHistory={handleViewHistory}
/>
```

**Features:**
- Complete vehicle overview
- Owner contact information
- Current parking session
- Recent sessions summary
- Statistics sidebar

### VehicleHistory
History component with parking sessions and analytics.

```tsx
import { VehicleHistory } from '@/components/vehicles'

<VehicleHistory
  vehicle={selectedVehicle}
  onBack={handleBack}
/>
```

**Features:**
- Session statistics
- Date range filtering
- Export functionality
- Detailed session table

## Data Types

### Vehicle
Extended vehicle interface with additional fields:

```typescript
interface Vehicle {
  id: string
  licensePlate: string
  type: VehicleType // 'car' | 'motorcycle' | 'truck' | 'van' | 'bus'
  make: string
  model: string
  color: string
  ownerId: string
  ownerName?: string
  ownerEmail?: string
  ownerPhone?: string
  notes?: string
  status: VehicleStatus // 'active' | 'inactive' | 'blocked'
  createdAt: string
  updatedAt: string
}
```

### VehicleWithParkingInfo
Vehicle with additional parking statistics:

```typescript
interface VehicleWithParkingInfo extends Vehicle {
  currentSession?: ParkingSession
  totalSessions: number
  totalSpent: number
  averageDuration: number
  lastParked?: string
}
```

## Custom Hooks

### useVehicleManagement
Main hook for vehicle operations:

```tsx
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
  refreshVehicles,
} = useVehicleManagement(filters)
```

## API Integration

All components integrate with the enhanced API service methods:

- `getVehicles()` - Get paginated vehicles
- `createVehicle()` - Add new vehicle
- `updateVehicle()` - Update existing vehicle
- `deleteVehicle()` - Delete single vehicle
- `bulkDeleteVehicles()` - Delete multiple vehicles
- `getVehicleMetrics()` - Get vehicle statistics
- `exportVehicles()` - Export vehicle data

## Utilities

### Formatting
- `formatDate()` - Format dates consistently
- `formatCurrency()` - Format monetary values
- `formatDuration()` - Format time durations
- `formatLicensePlate()` - Normalize license plates

### Export
- `exportToCsv()` - Export data to CSV
- `exportToJson()` - Export data to JSON
- `exportToExcel()` - Export data to Excel

## Features

### Search & Filtering
- License plate search
- Owner name search
- Vehicle type filtering
- Status filtering
- Date range filtering

### Bulk Operations
- Multi-select vehicles
- Bulk delete with confirmation
- Bulk export

### Data Export
- CSV format
- JSON format
- Excel format
- Customizable date ranges

### Real-time Updates
- Live parking status
- Current session tracking
- Real-time duration calculation

### Responsive Design
- Mobile-friendly interface
- Adaptive layouts
- Touch-friendly controls

## Dependencies

- React Hook Form + Zod for forms
- Radix UI for accessible components
- Lucide React for icons
- Tailwind CSS for styling
- date-fns for date handling

## Usage Example

```tsx
import React from 'react'
import { VehicleManagement } from '@/components/vehicles'

const VehiclesPage: React.FC = () => {
  return (
    <div className="container mx-auto py-6">
      <VehicleManagement />
    </div>
  )
}

export default VehiclesPage
```

## Error Handling

All components include comprehensive error handling:

- Form validation errors
- API request failures
- Network connectivity issues
- Data corruption scenarios

## Accessibility

Components follow accessibility best practices:

- Proper ARIA labels
- Keyboard navigation
- Screen reader support
- Focus management

## Performance

Optimized for performance:

- Memoized components
- Debounced search
- Lazy loading
- Efficient re-renders

## Testing

Components are designed to be easily testable:

- Clean separation of concerns
- Mockable API calls
- Testable utility functions
- Component isolation