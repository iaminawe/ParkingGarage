import { Navigate } from 'react-router-dom'
import { useAuth } from '@/providers/AuthProvider'
import { LoginForm } from '@/components/auth/LoginForm'
import { Building2, Car, Shield, Clock } from 'lucide-react'

export default function LoginPage() {
  const { isAuthenticated, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      <div className="container mx-auto px-4 py-8 h-screen flex">
        {/* Left Panel - Branding */}
        <div className="hidden lg:flex lg:w-1/2 flex-col justify-center px-12">
          <div className="max-w-md">
            <div className="flex items-center mb-8">
              <Building2 className="h-12 w-12 text-primary mr-4" />
              <div>
                <h1 className="text-4xl font-bold text-primary">The Parking Garage</h1>
                <p className="text-xl text-muted-foreground mt-1">Management System</p>
              </div>
            </div>
            
            <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
              Smart parking management made simple. Control access, monitor occupancy, 
              and manage operations all from one powerful platform.
            </p>
            
            <div className="space-y-6">
              <div className="flex items-start space-x-3">
                <Car className="h-6 w-6 text-primary mt-1 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-foreground">Vehicle Management</h3>
                  <p className="text-sm text-muted-foreground">Track vehicles, assign spots, and manage access permissions</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <Shield className="h-6 w-6 text-primary mt-1 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-foreground">Secure Access</h3>
                  <p className="text-sm text-muted-foreground">Role-based permissions and secure authentication</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <Clock className="h-6 w-6 text-primary mt-1 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-foreground">24/7 Operations</h3>
                  <p className="text-sm text-muted-foreground">Real-time monitoring and automated management</p>
                </div>
              </div>
            </div>
            
            <div className="mt-12 grid grid-cols-3 gap-8 pt-8 border-t border-border">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">10k+</div>
                <div className="text-sm text-muted-foreground">Vehicles Managed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">500+</div>
                <div className="text-sm text-muted-foreground">Parking Spots</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">99.9%</div>
                <div className="text-sm text-muted-foreground">Uptime</div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Right Panel - Login Form */}
        <div className="w-full lg:w-1/2 flex items-center justify-center px-4 lg:px-12">
          <div className="w-full max-w-md">
            {/* Mobile Logo */}
            <div className="lg:hidden flex items-center justify-center mb-8">
              <Building2 className="h-8 w-8 text-primary mr-3" />
              <div>
                <h1 className="text-2xl font-bold text-primary">The Parking Garage</h1>
                <p className="text-sm text-muted-foreground">Management System</p>
              </div>
            </div>
            
            <LoginForm />
          </div>
        </div>
      </div>
    </div>
  )
}