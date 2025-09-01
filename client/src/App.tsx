import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { QueryProvider, SocketProvider } from '@/providers'
import { Layout } from '@/components/layout/Layout'
import { HomePage } from '@/pages/HomePage'
import { Dashboard } from '@/components/dashboard/Dashboard'
import { VehicleManagement } from '@/components/vehicles/VehicleManagement'
import { SpotManagement } from '@/components/spots/SpotManagement'
import { GarageConfiguration } from '@/components/garage/GarageConfiguration'
import { AnalyticsPage } from '@/components/analytics/AnalyticsPage'

function App() {
  return (
    <QueryProvider>
      <SocketProvider>
        <Router>
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route index element={<HomePage />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="garages" element={<GarageConfiguration />} />
              <Route path="vehicles" element={<VehicleManagement />} />
              <Route path="spots" element={<SpotManagement />} />
              <Route path="sessions" element={<div>Sessions Page (Coming Soon)</div>} />
              <Route path="analytics" element={<AnalyticsPage />} />
              <Route path="users" element={<div>Users Page (Coming Soon)</div>} />
              <Route path="settings" element={<div>Settings Page (Coming Soon)</div>} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </Router>
      </SocketProvider>
    </QueryProvider>
  )
}

export default App
