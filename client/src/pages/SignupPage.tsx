import { Navigate } from 'react-router-dom'
import { useAuth } from '@/providers/AuthProvider'
import { SignupForm } from '@/components/auth/SignupForm'
import { Building2, UserPlus, Users, Zap } from 'lucide-react'

export default function SignupPage() {
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
              Join thousands of parking operators who trust our platform to manage 
              their facilities efficiently and securely.
            </p>
            
            <div className="space-y-6">
              <div className="flex items-start space-x-3">
                <UserPlus className="h-6 w-6 text-primary mt-1 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-foreground">Quick Setup</h3>
                  <p className="text-sm text-muted-foreground">Get started in minutes with our intuitive onboarding process</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <Users className="h-6 w-6 text-primary mt-1 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-foreground">Multi-User Support</h3>
                  <p className="text-sm text-muted-foreground">Invite your team with different role-based permissions</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <Zap className="h-6 w-6 text-primary mt-1 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-foreground">Instant Access</h3>
                  <p className="text-sm text-muted-foreground">Start managing your parking operations immediately</p>
                </div>
              </div>
            </div>
            
            <div className="mt-12 p-6 bg-primary/5 rounded-lg border border-primary/10">
              <h3 className="font-semibold text-foreground mb-2">Demo Mode Active</h3>
              <p className="text-sm text-muted-foreground">
                This is a demonstration system. All accounts are automatically approved 
                and you can start using the system immediately after registration.
              </p>
            </div>
          </div>
        </div>
        
        {/* Right Panel - Signup Form */}
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
            
            <SignupForm />
          </div>
        </div>
      </div>
    </div>
  )
}