import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { QueryProvider, SocketProvider } from '@/providers'
import { Layout } from '@/components/layout/Layout'
import { HomePage } from '@/pages/HomePage'

function App() {
  return (
    <QueryProvider>
      <SocketProvider>
        <Router>
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route index element={<HomePage />} />
              <Route path="dashboard" element={<Navigate to="/" replace />} />
              <Route path="garages" element={<div>Garages Page (Coming Soon)</div>} />
              <Route path="vehicles" element={<div>Vehicles Page (Coming Soon)</div>} />
              <Route path="sessions" element={<div>Sessions Page (Coming Soon)</div>} />
              <Route path="analytics" element={<div>Analytics Page (Coming Soon)</div>} />
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
