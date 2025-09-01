import React, { type ErrorInfo, type ReactNode } from 'react'
import { AlertTriangle } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface Props {
  children: ReactNode
  fallback?: React.ComponentType<ErrorFallbackProps>
  onError?: (error: Error, errorInfo: ErrorInfo) => void
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
}

interface ErrorFallbackProps {
  error: Error | null
  resetError: () => void
  errorInfo: ErrorInfo | null
}

class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    }
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
    
    this.setState({
      error,
      errorInfo
    })

    // Call the optional onError prop
    if (this.props.onError) {
      this.props.onError(error, errorInfo)
    }
  }

  resetError = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    })
  }

  render() {
    if (this.state.hasError) {
      const FallbackComponent = this.props.fallback || DefaultErrorFallback
      
      return (
        <FallbackComponent
          error={this.state.error}
          resetError={this.resetError}
          errorInfo={this.state.errorInfo}
        />
      )
    }

    return this.props.children
  }
}

// Default error fallback component
function DefaultErrorFallback({ error, resetError }: ErrorFallbackProps) {
  const isDevelopment = import.meta.env.DEV

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
            <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
          </div>
          <CardTitle className="text-xl">Something went wrong</CardTitle>
          <CardDescription>
            An unexpected error occurred. We apologize for the inconvenience.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isDevelopment && error && (
            <div className="p-3 bg-muted rounded-md text-sm overflow-auto max-h-32">
              <p className="font-medium text-red-600 dark:text-red-400 mb-2">
                Error: {error.message}
              </p>
              {error.stack && (
                <pre className="text-xs text-muted-foreground whitespace-pre-wrap">
                  {error.stack}
                </pre>
              )}
            </div>
          )}
        </CardContent>
        <CardFooter className="flex flex-col space-y-2">
          <Button onClick={resetError} className="w-full">
            Try again
          </Button>
          <Button 
            variant="outline" 
            onClick={() => window.location.href = '/'} 
            className="w-full"
          >
            Go to homepage
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}

// Higher-order component wrapper
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: React.ComponentType<ErrorFallbackProps>
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary fallback={fallback}>
      <Component {...props} />
    </ErrorBoundary>
  )
  
  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`
  
  return WrappedComponent
}

// Hook for manual error reporting
export function useErrorHandler() {
  return (error: Error, errorInfo?: ErrorInfo) => {
    console.error('Manual error report:', error, errorInfo)
    // You could send this to an error reporting service
    throw error
  }
}

export default ErrorBoundary
export type { ErrorFallbackProps }