import React, { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/utils/cn'

interface OccupancyChartProps {
  occupiedSpots: number
  totalSpots: number
  percentage: number
  className?: string
}

const OccupancyChart: React.FC<OccupancyChartProps> = ({
  occupiedSpots,
  totalSpots,
  percentage,
  className
}) => {
  const [animatedPercentage, setAnimatedPercentage] = useState(0)
  const [isAnimating, setIsAnimating] = useState(false)

  useEffect(() => {
    setIsAnimating(true)
    const duration = 1500 // 1.5 seconds
    const steps = 60
    const stepValue = percentage / steps
    let currentStep = 0

    const timer = setInterval(() => {
      currentStep++
      if (currentStep >= steps) {
        setAnimatedPercentage(percentage)
        setIsAnimating(false)
        clearInterval(timer)
      } else {
        setAnimatedPercentage(() => {
          const newValue = stepValue * currentStep
          return Math.min(newValue, percentage)
        })
      }
    }, duration / steps)

    return () => clearInterval(timer)
  }, [percentage])

  const getColorByPercentage = (pct: number) => {
    if (pct >= 90) return 'red'
    if (pct >= 70) return 'yellow'
    return 'green'
  }

  const getColorClasses = (color: string) => {
    switch (color) {
      case 'red':
        return {
          stroke: 'stroke-red-500',
          fill: 'fill-red-500',
          bg: 'bg-red-50',
          text: 'text-red-700',
          border: 'border-red-200'
        }
      case 'yellow':
        return {
          stroke: 'stroke-yellow-500',
          fill: 'fill-yellow-500',
          bg: 'bg-yellow-50',
          text: 'text-yellow-700',
          border: 'border-yellow-200'
        }
      default:
        return {
          stroke: 'stroke-green-500',
          fill: 'fill-green-500',
          bg: 'bg-green-50',
          text: 'text-green-700',
          border: 'border-green-200'
        }
    }
  }

  const color = getColorByPercentage(percentage)
  const colorClasses = getColorClasses(color)
  
  // SVG circle properties
  const size = 160
  const strokeWidth = 12
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const strokeDasharray = circumference
  const strokeDashoffset = circumference - (animatedPercentage / 100) * circumference

  const getStatusText = () => {
    if (percentage >= 95) return 'Full'
    if (percentage >= 90) return 'Nearly Full'
    if (percentage >= 70) return 'Busy'
    if (percentage >= 30) return 'Moderate'
    return 'Available'
  }

  const getStatusIcon = () => {
    if (percentage >= 95) return '🔴'
    if (percentage >= 90) return '🟠'
    if (percentage >= 70) return '🟡'
    return '🟢'
  }

  return (
    <Card className={cn('relative overflow-hidden', colorClasses.border, className)}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Occupancy</span>
          <span className="text-sm font-normal flex items-center space-x-1">
            <span>{getStatusIcon()}</span>
            <span className={colorClasses.text}>{getStatusText()}</span>
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center justify-center pb-6">
        <div className="relative">
          {/* Background circle */}
          <svg 
            width={size} 
            height={size} 
            className="transform -rotate-90"
          >
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="transparent"
              stroke="currentColor"
              strokeWidth={strokeWidth}
              className="text-gray-200"
            />
            {/* Progress circle */}
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="transparent"
              strokeWidth={strokeWidth}
              strokeDasharray={strokeDasharray}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              className={cn(
                colorClasses.stroke,
                'transition-all duration-1000 ease-out'
              )}
              style={{
                filter: isAnimating ? 'drop-shadow(0 0 6px currentColor)' : 'none'
              }}
            />
          </svg>
          
          {/* Center content */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className={cn(
              'text-3xl font-bold transition-all duration-300',
              colorClasses.text,
              isAnimating && 'scale-110'
            )}>
              {Math.round(animatedPercentage)}%
            </div>
            <div className="text-xs text-muted-foreground text-center">
              {occupiedSpots} of {totalSpots}
            </div>
          </div>
        </div>
        
        {/* Legend */}
        <div className="flex items-center justify-center space-x-6 mt-6 w-full">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-gray-300" />
            <span className="text-xs text-muted-foreground">
              Available ({totalSpots - occupiedSpots})
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <div className={cn('w-3 h-3 rounded-full', colorClasses.fill)} />
            <span className="text-xs text-muted-foreground">
              Occupied ({occupiedSpots})
            </span>
          </div>
        </div>

        {/* Capacity indicator */}
        <div className="w-full mt-4">
          <div className="flex justify-between text-xs text-muted-foreground mb-1">
            <span>Capacity</span>
            <span>{totalSpots} spots</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className={cn(
                'h-2 rounded-full transition-all duration-1000 ease-out',
                colorClasses.fill
              )}
              style={{ 
                width: `${Math.min(animatedPercentage, 100)}%`,
                boxShadow: isAnimating ? '0 0 8px currentColor' : 'none'
              }}
            />
          </div>
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-2 gap-4 w-full mt-4 pt-4 border-t">
          <div className="text-center">
            <div className="text-lg font-semibold">{occupiedSpots}</div>
            <div className="text-xs text-muted-foreground">Occupied</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold">{totalSpots - occupiedSpots}</div>
            <div className="text-xs text-muted-foreground">Available</div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default OccupancyChart