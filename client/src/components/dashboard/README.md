# Dashboard Components

A comprehensive dashboard system for the Parking Garage frontend application with real-time updates, interactive metrics, and responsive design.

## Components Overview

### 1. Dashboard.tsx
The main dashboard component that orchestrates all sub-components and handles data fetching.

**Features:**
- Real-time data updates every 30 seconds
- Error handling with retry functionality  
- Loading states with skeleton UI
- Comprehensive metrics display
- Garage status overview

**Usage:**
```tsx
import { Dashboard } from '@/components/dashboard'

function App() {
  return <Dashboard />
}
```

### 2. MetricCard.tsx
Displays individual metrics with animated number transitions and trend indicators.

**Props:**
- `title`: Metric title
- `value`: Current value (string or number)
- `subtitle?`: Optional subtitle
- `trend?`: Percentage change (positive/negative)
- `icon?`: Optional emoji icon
- `color?`: Theme color ('blue', 'green', 'emerald', 'purple', 'red', 'yellow')

**Usage:**
```tsx
<MetricCard
  title="Occupied Spots"
  value={42}
  subtitle="of 100 spots"
  trend={5.2}
  icon="🚗"
  color="blue"
/>
```

### 3. QuickActions.tsx
Provides quick action buttons for common operations.

**Features:**
- Quick check-in modal with vehicle registration
- Navigation to other sections
- Real-time garage availability

**Actions:**
- Quick Check-In
- View All Vehicles
- Generate Reports
- Manage Spots

### 4. RecentActivity.tsx
Shows the last 10 parking activities with enhanced details.

**Features:**
- Real-time activity updates
- Enhanced session details (vehicle info, spot info, garage info)
- Time-based formatting (e.g., "2m ago", "1h ago")
- Status-based color coding
- Scrollable activity feed

**Props:**
- `sessions`: Array of ParkingSession objects

### 5. OccupancyChart.tsx
Circular progress chart showing occupancy percentage.

**Features:**
- Animated circular progress
- Color-coded status (green/yellow/red)
- Capacity indicator
- Quick stats display

**Props:**
- `occupiedSpots`: Number of occupied spots
- `totalSpots`: Total available spots
- `percentage`: Occupancy percentage

## API Integration

The dashboard components integrate with the following API endpoints:

- `GET /api/garages` - Fetch all garages
- `GET /api/analytics/system` - System-wide analytics
- `GET /api/sessions` - Recent parking sessions
- `GET /api/vehicles/{id}` - Vehicle details
- `GET /api/spots/{id}` - Parking spot details
- `POST /api/sessions/start` - Start parking session
- `POST /api/vehicles` - Create new vehicle

## Real-time Updates

The dashboard automatically refreshes data every 30 seconds. For real-time WebSocket updates, integrate with the existing SocketProvider:

```tsx
import { useSocket } from '@/providers/SocketProvider'

// Listen for real-time updates
useSocket('garage:update', handleGarageUpdate)
useSocket('session:start', handleSessionStart)
useSocket('session:end', handleSessionEnd)
```

## Styling & Theming

Components use Tailwind CSS with the existing design system:
- Consistent color scheme
- Responsive grid layouts
- Smooth animations and transitions
- Accessibility considerations

## Error Handling

All components include proper error handling:
- Network request failures
- Missing data scenarios
- Loading states
- User feedback for actions

## Performance Considerations

- Optimized re-renders with proper dependency arrays
- Efficient data fetching with Promise.all
- Memoized expensive calculations
- Smooth animations with requestAnimationFrame

## Type Safety

All components are fully typed with TypeScript:
- Props interfaces
- API response types
- State management types
- Event handler types

## Testing

Components are designed to be easily testable:
- Separated business logic from UI
- Mockable API service calls
- Predictable state management
- Accessible DOM elements

## Browser Support

- Modern browsers (Chrome 90+, Firefox 88+, Safari 14+)
- Mobile responsive design
- Touch-friendly interactions
- Keyboard navigation support