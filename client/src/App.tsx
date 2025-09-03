import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { QueryProvider, SocketProvider, AuthProvider } from '@/providers'
import { Layout } from '@/components/layout/Layout'
import { ProtectedRoute } from '@/components/auth'
import ErrorBoundary from '@/components/ErrorBoundary'
import { HomePage } from '@/pages/HomePage'
import LoginPage from '@/pages/LoginPage'
import SignupPage from '@/pages/SignupPage'
import EnhancedDashboard from '@/components/dashboard/EnhancedDashboard'
import { VehicleManagement } from '@/components/vehicles/VehicleManagement'
import CheckInCheckOut from '@/components/vehicles/CheckInCheckOut'
import { SpotManagement } from '@/components/spots/SpotManagement'
import FloorManagement from '@/components/floors/FloorManagement'
import { GarageConfiguration } from '@/components/garage/GarageConfiguration'
import { SessionManagement } from '@/components/sessions/SessionManagement'
import AnalyticsPage from '@/components/analytics/AnalyticsPage'

function App() {
  return (
    <AuthProvider>
      <QueryProvider>
        <SocketProvider>
          <Router>
            <Routes>
              {/* Authentication Routes */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/signup" element={<SignupPage />} />
              
              {/* Protected Application Routes */}
              <Route
                path="/"
                element={
                  <ProtectedRoute requiredRole={undefined}>
                    <Layout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<HomePage />} />
                <Route path="dashboard" element={<EnhancedDashboard />} />
                <Route path="checkin-checkout" element={
                  <ProtectedRoute requiredRole="operator">
                    <CheckInCheckOut />
                  </ProtectedRoute>
                } />
                <Route 
                  path="garages" 
                  element={
                    <ProtectedRoute requiredRole="operator">
                      <GarageConfiguration />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="vehicles" 
                  element={
                    <ProtectedRoute requiredRole="operator">
                      <VehicleManagement />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="spots" 
                  element={
                    <ProtectedRoute requiredRole="operator">
                      <SpotManagement />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="floors" 
                  element={
                    <ProtectedRoute requiredRole="operator">
                      <FloorManagement />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="sessions" 
                  element={
                    <ProtectedRoute requiredRole="operator">
                      <SessionManagement />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="analytics" 
                  element={
                    <ProtectedRoute requiredRole="operator">
                      <ErrorBoundary>
                        <AnalyticsPage />
                      </ErrorBoundary>
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="users" 
                  element={
                    <ProtectedRoute requiredRole="admin">
                      <div>Users Page (Coming Soon)</div>
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="settings" 
                  element={
                    <ProtectedRoute requiredRole="operator">
                      <div>Settings Page (Coming Soon)</div>
                    </ProtectedRoute>
                  } 
                />
              </Route>
              
              {/* Fallback Routes */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Router>
        </SocketProvider>
      </QueryProvider>
    </AuthProvider>
  )
}

export default App
