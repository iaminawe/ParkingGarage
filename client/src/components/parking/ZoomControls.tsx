import React from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ZoomIn, ZoomOut, RotateCcw } from 'lucide-react'

interface ZoomControlsProps {
  zoomLevel: number
  onZoomChange: (level: number) => void
  minZoom?: number
  maxZoom?: number
  className?: string
}

export const ZoomControls: React.FC<ZoomControlsProps> = ({
  zoomLevel,
  onZoomChange,
  minZoom = 25,
  maxZoom = 200,
  className = ''
}) => {
  const zoomIn = () => {
    const newLevel = Math.min(maxZoom, zoomLevel + 25)
    onZoomChange(newLevel)
  }

  const zoomOut = () => {
    const newLevel = Math.max(minZoom, zoomLevel - 25)
    onZoomChange(newLevel)
  }

  const resetZoom = () => {
    onZoomChange(100)
  }

  const presetZooms = [25, 50, 75, 100, 125, 150]

  return (
    <div className={`flex items-center gap-2 p-2 bg-background border rounded-lg shadow-sm ${className}`}>
      <Button
        variant="outline"
        size="sm"
        onClick={zoomOut}
        disabled={zoomLevel <= minZoom}
        className="h-8 w-8 p-0"
      >
        <ZoomOut className="h-4 w-4" />
      </Button>
      
      <div className="flex items-center gap-1">
        {presetZooms.map(preset => (
          <Button
            key={preset}
            variant={zoomLevel === preset ? "default" : "ghost"}
            size="sm"
            onClick={() => onZoomChange(preset)}
            className="h-8 px-2 text-xs"
          >
            {preset}%
          </Button>
        ))}
      </div>

      <Button
        variant="outline"
        size="sm"
        onClick={zoomIn}
        disabled={zoomLevel >= maxZoom}
        className="h-8 w-8 p-0"
      >
        <ZoomIn className="h-4 w-4" />
      </Button>

      <Separator orientation="vertical" className="h-6" />

      <Button
        variant="outline"
        size="sm"
        onClick={resetZoom}
        className="h-8 px-3"
      >
        <RotateCcw className="h-3 w-3 mr-1" />
        Reset
      </Button>

      <Badge variant="secondary" className="text-xs font-mono">
        {zoomLevel}%
      </Badge>
    </div>
  )
}

export default ZoomControls