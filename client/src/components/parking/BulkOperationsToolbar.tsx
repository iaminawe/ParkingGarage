import React from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu'
import { 
  CheckCircle2, 
  XCircle, 
  Settings, 
  Trash2, 
  Copy, 
  ChevronDown,
  X
} from 'lucide-react'

interface BulkOperationsToolbarProps {
  selectedCount: number
  onBulkOperation: (operation: string, spotIds: string[]) => void
  onClearSelection: () => void
  className?: string
}

export const BulkOperationsToolbar: React.FC<BulkOperationsToolbarProps> = ({
  selectedCount,
  onBulkOperation,
  onClearSelection,
  className = ''
}) => {
  const handleOperation = (operation: string) => {
    onBulkOperation(operation, []) // In real implementation, would pass actual spot IDs
  }

  return (
    <div className={`flex items-center gap-2 p-2 bg-primary/5 border border-primary/20 rounded-lg ${className}`}>
      <Badge variant="secondary" className="font-semibold">
        {selectedCount} selected
      </Badge>

      <Separator orientation="vertical" className="h-4" />

      {/* Status Operations */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="h-8">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Status
            <ChevronDown className="h-3 w-3 ml-1" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem onClick={() => handleOperation('mark-available')}>
            <CheckCircle2 className="h-4 w-4 mr-2 text-green-600" />
            Mark as Available
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleOperation('mark-maintenance')}>
            <Settings className="h-4 w-4 mr-2 text-orange-600" />
            Set to Maintenance
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleOperation('reserve')}>
            <XCircle className="h-4 w-4 mr-2 text-yellow-600" />
            Reserve Spots
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Utility Operations */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="h-8">
            <Copy className="h-3 w-3 mr-1" />
            Actions
            <ChevronDown className="h-3 w-3 ml-1" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem onClick={() => handleOperation('copy-ids')}>
            <Copy className="h-4 w-4 mr-2" />
            Copy Spot IDs
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleOperation('export-selected')}>
            <Copy className="h-4 w-4 mr-2" />
            Export Selected
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem 
            onClick={() => handleOperation('delete')}
            className="text-destructive"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete Selected
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Separator orientation="vertical" className="h-4" />

      {/* Clear Selection */}
      <Button
        variant="ghost"
        size="sm"
        onClick={onClearSelection}
        className="h-8 px-2 text-muted-foreground hover:text-foreground"
      >
        <X className="h-3 w-3" />
      </Button>
    </div>
  )
}

export default BulkOperationsToolbar