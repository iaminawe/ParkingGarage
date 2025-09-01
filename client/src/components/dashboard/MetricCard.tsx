import React, { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/utils/cn'

interface MetricCardProps {
  title: string
  value: string | number
  subtitle?: string
  trend?: number // Percentage change, positive for increase, negative for decrease
  icon?: string
  color?: 'blue' | 'green' | 'emerald' | 'purple' | 'red' | 'yellow'
  className?: string
}

const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  subtitle,
  trend,
  icon,
  color = 'blue',
  className
}) => {
  const [displayValue, setDisplayValue] = useState<string | number>(0)
  const [isAnimating, setIsAnimating] = useState(false)

  // Animate number transitions
  useEffect(() => {
    if (typeof value === 'number' && typeof displayValue === 'number') {
      if (value !== displayValue) {
        setIsAnimating(true)
        const duration = 1000 // 1 second animation
        const steps = 60
        const stepValue = (value - displayValue) / steps
        let currentStep = 0

        const timer = setInterval(() => {
          currentStep++
          if (currentStep >= steps) {
            setDisplayValue(value)
            setIsAnimating(false)
            clearInterval(timer)
          } else {
            setDisplayValue(prev => {
              if (typeof prev === 'number') {
                return Math.round((prev + stepValue) * 100) / 100
              }
              return prev
            })
          }
        }, duration / steps)

        return () => clearInterval(timer)
      }
    } else {
      setDisplayValue(value)
    }
  }, [value, displayValue])

  const colorClasses = {
    blue: 'border-blue-200 bg-blue-50/50',
    green: 'border-green-200 bg-green-50/50',
    emerald: 'border-emerald-200 bg-emerald-50/50',
    purple: 'border-purple-200 bg-purple-50/50',
    red: 'border-red-200 bg-red-50/50',
    yellow: 'border-yellow-200 bg-yellow-50/50'
  }

  const iconColorClasses = {
    blue: 'text-blue-600',
    green: 'text-green-600',
    emerald: 'text-emerald-600',
    purple: 'text-purple-600',
    red: 'text-red-600',
    yellow: 'text-yellow-600'
  }

  const getTrendIcon = () => {
    if (trend === undefined || trend === 0) return null
    return trend > 0 ? '▲' : '▼'
  }

  const getTrendColor = () => {
    if (trend === undefined || trend === 0) return 'text-gray-500'
    return trend > 0 ? 'text-green-600' : 'text-red-600'
  }

  return (
    <Card className={cn(
      'transition-all duration-200 hover:shadow-md',
      colorClasses[color],
      isAnimating && 'ring-2 ring-blue-200',
      className
    )}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        {icon && (
          <div className={cn('text-xl', iconColorClasses[color])}>
            {icon}
          </div>
        )}
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline space-x-2">
          <div className={cn(
            'text-2xl font-bold transition-all duration-300',
            isAnimating && 'scale-105'
          )}>
            {typeof displayValue === 'number' && !Number.isInteger(displayValue) 
              ? displayValue.toFixed(2)
              : displayValue
            }
          </div>
          {trend !== undefined && trend !== 0 && (
            <div className={cn(
              'flex items-center text-xs font-medium',
              getTrendColor()
            )}>
              <span className="mr-1">{getTrendIcon()}</span>
              {Math.abs(trend).toFixed(1)}%
            </div>
          )}
        </div>
        {subtitle && (
          <p className="text-xs text-muted-foreground mt-1">
            {subtitle}
          </p>
        )}
      </CardContent>
    </Card>
  )
}

export default MetricCard