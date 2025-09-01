import { Heart, ExternalLink } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Separator } from '@/components/ui/separator'

export function Footer() {
  const currentYear = new Date().getFullYear()
  const version = '1.0.0' // This could come from package.json

  const quickLinks = [
    { title: 'Dashboard', href: '/' },
    { title: 'Garages', href: '/garages' },
    { title: 'Analytics', href: '/analytics' },
    { title: 'Settings', href: '/settings' },
  ]

  const supportLinks = [
    { title: 'Documentation', href: '/docs', external: true },
    { title: 'API Reference', href: '/api-docs', external: true },
    { title: 'Support', href: '/support' },
    { title: 'Contact', href: '/contact' },
  ]

  return (
    <footer className="bg-background border-t">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Company Info */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold">Parking Garage Management</h3>
            <p className="text-sm text-muted-foreground">
              Efficient parking management solution for modern facilities.
            </p>
            <div className="flex items-center space-x-1 text-sm text-muted-foreground">
              <span>Made with</span>
              <Heart className="h-4 w-4 text-red-500 fill-current" />
              <span>for better parking</span>
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-3">
            <h4 className="font-medium">Quick Links</h4>
            <ul className="space-y-2">
              {quickLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    to={link.href}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Support */}
          <div className="space-y-3">
            <h4 className="font-medium">Support</h4>
            <ul className="space-y-2">
              {supportLinks.map((link) => (
                <li key={link.href}>
                  {link.external ? (
                    <a
                      href={link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors inline-flex items-center"
                    >
                      {link.title}
                      <ExternalLink className="ml-1 h-3 w-3" />
                    </a>
                  ) : (
                    <Link
                      to={link.href}
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {link.title}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {/* System Info */}
          <div className="space-y-3">
            <h4 className="font-medium">System</h4>
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">
                Version: <span className="font-mono">{version}</span>
              </div>
              <div className="text-sm text-muted-foreground">
                Environment:{' '}
                <span className="font-mono capitalize">
                  {import.meta.env.MODE}
                </span>
              </div>
              <div className="text-sm text-muted-foreground">
                Build:{' '}
                <span className="font-mono">
                  {import.meta.env.VITE_BUILD_TIME || 'Development'}
                </span>
              </div>
            </div>
          </div>
        </div>

        <Separator className="my-6" />

        {/* Bottom section */}
        <div className="flex flex-col sm:flex-row justify-between items-center space-y-2 sm:space-y-0">
          <div className="text-sm text-muted-foreground">
            © {currentYear} Parking Garage Management System. All rights reserved.
          </div>
          <div className="flex items-center space-x-4 text-sm text-muted-foreground">
            <Link to="/privacy" className="hover:text-foreground transition-colors">
              Privacy Policy
            </Link>
            <Link to="/terms" className="hover:text-foreground transition-colors">
              Terms of Service
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}