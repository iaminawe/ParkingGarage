import { Building2, Car, Shield, Clock, Users } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

interface AuthLayoutProps {
  children: React.ReactNode
  title: string
  subtitle: string
}

export function AuthLayout({ children, title, subtitle }: AuthLayoutProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-2 gap-8 min-h-[calc(100vh-4rem)]">
          {/* Left Side - Branding */}
          <div className="hidden lg:flex flex-col justify-center space-y-8">
            {/* Logo and Title */}
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-primary/10 rounded-xl">
                  <Building2 className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
                    Parking Garage Management
                  </h1>
                  <p className="text-slate-600 dark:text-slate-400">
                    Professional parking solutions
                  </p>
                </div>
              </div>
            </div>

            {/* Features Grid */}
            <div className="grid grid-cols-2 gap-6">
              <div className="p-6 bg-white/50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
                <div className="flex items-center space-x-3 mb-3">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                    <Car className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                    Smart Parking
                  </h3>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Real-time spot availability and automated vehicle management
                </p>
              </div>

              <div className="p-6 bg-white/50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
                <div className="flex items-center space-x-3 mb-3">
                  <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                    <Shield className="h-5 w-5 text-green-600 dark:text-green-400" />
                  </div>
                  <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                    Secure Access
                  </h3>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Multi-level security with role-based access control
                </p>
              </div>

              <div className="p-6 bg-white/50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
                <div className="flex items-center space-x-3 mb-3">
                  <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                    <Clock className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                    24/7 Operations
                  </h3>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Round-the-clock monitoring and automated processes
                </p>
              </div>

              <div className="p-6 bg-white/50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
                <div className="flex items-center space-x-3 mb-3">
                  <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                    <Users className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                  </div>
                  <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                    Multi-User
                  </h3>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Support for administrators, operators, and customers
                </p>
              </div>
            </div>

            {/* Stats */}
            <div className="flex items-center justify-center space-x-8 py-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">10k+</div>
                <div className="text-sm text-slate-600 dark:text-slate-400">Vehicles Managed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">500+</div>
                <div className="text-sm text-slate-600 dark:text-slate-400">Parking Spots</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">99.9%</div>
                <div className="text-sm text-slate-600 dark:text-slate-400">Uptime</div>
              </div>
            </div>
          </div>

          {/* Right Side - Auth Form */}
          <div className="flex flex-col justify-center">
            <div className="w-full max-w-md mx-auto space-y-6">
              {/* Mobile Logo */}
              <div className="lg:hidden text-center space-y-2">
                <div className="flex justify-center">
                  <div className="p-3 bg-primary/10 rounded-xl">
                    <Building2 className="h-8 w-8 text-primary" />
                  </div>
                </div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  Parking Garage Management
                </h1>
              </div>

              {/* Form Card */}
              <Card className="border-0 shadow-xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
                <CardContent className="p-8">
                  <div className="space-y-6">
                    <div className="text-center space-y-2">
                      <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
                      <p className="text-muted-foreground">{subtitle}</p>
                    </div>
                    {children}
                  </div>
                </CardContent>
              </Card>

              {/* Footer */}
              <div className="text-center text-sm text-slate-600 dark:text-slate-400">
                <p>© 2024 Parking Garage Management System</p>
                <p className="mt-1">Professional parking solutions for modern businesses</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
