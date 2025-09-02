# Bolt.new Frontend Generation Prompt for Parking Garage Management System

## 🏗️ Project Overview

Create a modern, responsive web application for a **Parking Garage Management System** that connects to an existing Node.js/Express API. This is a comprehensive system for managing parking spots, vehicles, users, and real-time garage operations.

## 🎯 Core Functionality Requirements

### 1. **User Authentication & Authorization**
- Login/signup forms with validation
- JWT token management (access + refresh tokens)
- Role-based UI (USER, OPERATOR, MANAGER, ADMIN)
- Profile management page
- Password change/reset functionality
- Session management (view/logout other devices)
- Multi-factor authentication support

### 2. **Dashboard & Analytics**
- Real-time garage occupancy overview
- Live statistics (available/occupied spots)
- Revenue analytics with charts
- Recent activity feed
- Capacity utilization metrics
- Peak hours analysis

### 3. **Vehicle Management**
- Vehicle registration/management interface
- License plate search with auto-suggestions
- Vehicle details (make, model, year, color)
- Owner information management
- Bulk operations (import/export/delete)
- Vehicle history and parking patterns

### 4. **Parking Spot Management**
- Interactive garage floor map/grid view
- Spot status visualization (available/occupied/reserved/maintenance)
- Spot type indicators (regular/compact/electric/handicapped)
- Real-time spot updates
- Advanced filtering and search
- Spot configuration and pricing

### 5. **Check-in/Check-out Operations**
- Quick check-in interface (license plate entry)
- Barcode/QR code scanning support
- Automated spot assignment
- Check-out with payment calculation
- Manual override capabilities for operators
- Receipt generation

### 6. **Payment & Billing**
- Payment processing interface
- Multiple payment methods (cash, card, digital)
- Pricing calculator with real-time rates
- Receipt/invoice generation
- Payment history and refunds
- Bulk billing operations

### 7. **Reporting & Analytics**
- Occupancy reports with date ranges
- Revenue reports and trends
- User activity logs
- Vehicle frequency analysis
- Peak time identification
- Exportable reports (PDF/Excel)

### 8. **Real-time Features**
- Live garage occupancy updates
- Instant spot status changes
- System notifications and alerts
- Emergency broadcast messaging
- Live activity monitoring

## 🔌 API Integration Details

### **Base API URL**
```
http://localhost:3000/api
```

### **Authentication**
- **Login**: `POST /api/auth/login`
- **Token Refresh**: `POST /api/auth/refresh`
- **Profile**: `GET /api/auth/profile`
- Uses JWT with Bearer tokens in Authorization header

### **Key Endpoints**
```typescript
// Authentication
POST   /api/auth/signup
POST   /api/auth/login
POST   /api/auth/refresh
GET    /api/auth/profile
PUT    /api/auth/profile

// Garage Management
GET    /api/garage              // Get configuration
POST   /api/garage/initialize   // Setup garage
GET    /api/garage/statistics   // Live stats
GET    /api/garage/capacity     // Capacity info

// Spots
GET    /api/spots               // List with filtering
GET    /api/spots/available     // Available spots only
GET    /api/spots/search        // Advanced search
PATCH  /api/spots/:id           // Update spot

// Vehicles
GET    /api/vehicles            // Paginated list
POST   /api/vehicles            // Create vehicle
GET    /api/vehicles/search     // Search vehicles
PUT    /api/vehicles/:id        // Update vehicle

// Operations
POST   /api/checkin             // Vehicle check-in
POST   /api/checkout            // Vehicle check-out
```

### **Data Models**

#### User
```typescript
{
  id: string
  email: string
  firstName: string
  lastName: string
  role: 'USER' | 'OPERATOR' | 'MANAGER' | 'ADMIN'
}
```

#### Vehicle
```typescript
{
  licensePlate: string
  vehicleType: 'CAR' | 'TRUCK' | 'MOTORCYCLE' | 'ELECTRIC'
  make?: string
  model?: string
  year?: number
  color?: string
  ownerName: string
  ownerEmail?: string
  ownerPhone?: string
  status: 'PARKED' | 'CHECKED_OUT'
  currentSpotId?: number
  checkInTime?: Date
}
```

#### ParkingSpot
```typescript
{
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
}
```

### **Real-time WebSocket Events**
```typescript
// Connect to Socket.IO
const socket = io('http://localhost:3000')

// Listen for events
socket.on('spot:updated', (spotData) => {})
socket.on('session:started', (sessionData) => {})
socket.on('session:ended', (sessionData) => {})
socket.on('garage:status', (statistics) => {})
```

### **API Response Format**
```typescript
{
  success: boolean
  data?: any
  message?: string
  errors?: string[]
  pagination?: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
}
```

## 🎨 UI/UX Requirements

### **Design System**
- Modern, clean interface with professional appearance
- Mobile-first responsive design
- Dark/light mode toggle
- Consistent color scheme (suggest: blue/teal primary, gray neutrals)
- Accessibility compliant (WCAG 2.1 AA)

### **Key UI Components Needed**
- Navigation sidebar with role-based menu items
- Data tables with sorting, filtering, and pagination
- Interactive garage floor map/grid
- Real-time status indicators and badges
- Modal dialogs for forms and confirmations
- Toast notifications for feedback
- Charts and graphs for analytics
- Search bars with auto-complete
- Form validation with inline errors

### **Responsive Breakpoints**
- Mobile: 320px - 768px
- Tablet: 768px - 1024px
- Desktop: 1024px+

### **Performance Requirements**
- Fast initial load (< 3s)
- Smooth real-time updates
- Efficient data loading with pagination
- Optimistic UI updates
- Proper loading states

## 🛠️ Technical Specifications

### **Required Technologies**
- **Framework**: React 18+ with TypeScript
- **Routing**: React Router v6
- **State Management**: Context API + useReducer or Zustand
- **HTTP Client**: Axios or Fetch API
- **WebSocket**: Socket.IO client
- **UI Library**: Choose from Material-UI, Chakra UI, or Tailwind CSS
- **Forms**: React Hook Form with Zod validation
- **Charts**: Chart.js, Recharts, or similar
- **Date Handling**: date-fns or dayjs

### **Architecture Patterns**
- Component-based architecture
- Custom hooks for API calls
- Context for global state (auth, theme)
- Service layer for API interactions
- Proper error boundaries
- Loading and error states

### **Key Features to Implement**

#### Authentication Flow
```typescript
// Login component with form validation
// JWT token storage in localStorage/sessionStorage
// Automatic token refresh
// Route protection based on user roles
// Logout functionality
```

#### Real-time Dashboard
```typescript
// Connect to Socket.IO on mount
// Live garage statistics display
// Real-time spot status updates
// Activity feed with latest events
// Quick action buttons (emergency, announcements)
```

#### Garage Floor Visualization
```typescript
// Grid/map view of parking spots
// Color-coded spot statuses
// Interactive spot selection
// Zoom and pan capabilities
// Floor/level switching
```

#### Data Tables
```typescript
// Sortable columns
// Advanced filtering
// Bulk selection and operations
// Export functionality
// Pagination with page size options
```

### **Error Handling**
- Global error boundary
- Network error handling
- Token expiration handling
- User-friendly error messages
- Retry mechanisms for failed requests

### **Security Considerations**
- XSS protection (sanitize user inputs)
- CSRF token handling if required
- Secure token storage
- Input validation on frontend
- Rate limiting awareness

## 📱 Specific Page Requirements

### **Login/Signup Pages**
- Clean, professional login form
- Remember me functionality
- Password strength indicator
- Error handling with validation messages
- Forgot password link

### **Dashboard**
- Overview cards (total spots, occupied, revenue today)
- Real-time occupancy chart
- Recent activity list
- Quick actions panel
- Weather widget (optional)

### **Garage Management**
- Floor/level selector
- Spot grid with status colors
- Search and filter tools
- Bulk operations toolbar
- Real-time updates

### **Vehicle Management**
- Search bar with auto-complete
- Vehicle list table with pagination
- Add/edit vehicle modal
- Owner information management
- Vehicle history view

### **Check-in/Check-out**
- License plate input with suggestions
- Available spot selection
- Confirmation dialog with details
- Receipt display/print option
- Manual override options

### **Reports**
- Date range selector
- Chart type selector
- Export options (PDF, Excel)
- Filtering and grouping options
- Print-friendly layouts

### **User Management** (Admin only)
- User list with roles
- Add/edit user modal
- Permission management
- Activity monitoring
- Bulk user operations

## 🚀 Getting Started Instructions

1. **Initialize the project** with your preferred React setup
2. **Install dependencies** for HTTP client, routing, UI library
3. **Set up authentication** context and JWT handling
4. **Create base layout** with navigation and routing
5. **Implement login/signup** flow first
6. **Build dashboard** with real-time WebSocket connection
7. **Add vehicle and spot management** features
8. **Integrate payment** and billing functionality
9. **Add reporting** and analytics features
10. **Test and optimize** performance

## 🎯 Success Criteria

- ✅ Complete user authentication flow
- ✅ Real-time garage monitoring dashboard
- ✅ Interactive spot management interface
- ✅ Vehicle check-in/check-out workflow
- ✅ Payment processing integration
- ✅ Responsive design across all devices
- ✅ Role-based access control
- ✅ Error handling and user feedback
- ✅ Performance optimization
- ✅ Accessibility compliance

## 📞 API Testing

Test your API integration with:
```bash
# Test login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# Test protected endpoint
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  http://localhost:3000/api/garage/statistics
```

This comprehensive system should provide a professional, efficient, and user-friendly interface for managing parking garage operations with real-time updates and robust functionality.