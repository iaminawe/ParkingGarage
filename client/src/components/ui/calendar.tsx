import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/utils/cn'

interface CalendarProps {
  mode?: 'single' | 'multiple' | 'range'
  selected?: Date | Date[]
  onSelect?: (date: Date | Date[] | undefined) => void
  className?: string
  disabled?: (date: Date) => boolean
  minDate?: Date
  maxDate?: Date
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

export const Calendar: React.FC<CalendarProps> = ({
  mode = 'single',
  selected,
  onSelect,
  className,
  disabled,
  minDate,
  maxDate
}) => {
  const [currentDate, setCurrentDate] = useState(new Date())

  const currentYear = currentDate.getFullYear()
  const currentMonth = currentDate.getMonth()

  // Get first day of the month
  const firstDay = new Date(currentYear, currentMonth, 1)
  const startDate = new Date(firstDay)
  startDate.setDate(startDate.getDate() - firstDay.getDay())

  // Generate calendar days
  const calendarDays = []
  const current = new Date(startDate)
  
  for (let i = 0; i < 42; i++) {
    calendarDays.push(new Date(current))
    current.setDate(current.getDate() + 1)
  }

  const isSelected = (date: Date) => {
    if (!selected) return false
    
    if (mode === 'single') {
      return selected instanceof Date && 
        date.toDateString() === selected.toDateString()
    }
    
    if (mode === 'multiple' && Array.isArray(selected)) {
      return selected.some(s => s.toDateString() === date.toDateString())
    }
    
    return false
  }

  const isDisabled = (date: Date) => {
    if (disabled && disabled(date)) return true
    if (minDate && date < minDate) return true
    if (maxDate && date > maxDate) return true
    return false
  }

  const isToday = (date: Date) => {
    const today = new Date()
    return date.toDateString() === today.toDateString()
  }

  const isCurrentMonth = (date: Date) => {
    return date.getMonth() === currentMonth
  }

  const handleDateClick = (date: Date) => {
    if (isDisabled(date) || !onSelect) return

    if (mode === 'single') {
      onSelect(date)
    } else if (mode === 'multiple') {
      const currentSelected = (selected as Date[]) || []
      const isCurrentlySelected = currentSelected.some(s => 
        s.toDateString() === date.toDateString()
      )
      
      if (isCurrentlySelected) {
        onSelect(currentSelected.filter(s => s.toDateString() !== date.toDateString()))
      } else {
        onSelect([...currentSelected, date])
      }
    }
  }

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate)
    if (direction === 'prev') {
      newDate.setMonth(currentMonth - 1)
    } else {
      newDate.setMonth(currentMonth + 1)
    }
    setCurrentDate(newDate)
  }

  return (
    <div className={cn("p-3", className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigateMonth('prev')}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        
        <h2 className="font-semibold">
          {MONTHS[currentMonth]} {currentYear}
        </h2>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigateMonth('next')}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Days header */}
      <div className="grid grid-cols-7 mb-2">
        {DAYS.map(day => (
          <div key={day} className="p-2 text-center text-sm font-medium text-muted-foreground">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar days */}
      <div className="grid grid-cols-7 gap-1">
        {calendarDays.map((date, index) => (
          <button
            key={index}
            onClick={() => handleDateClick(date)}
            disabled={isDisabled(date)}
            className={cn(
              "p-2 text-sm rounded-md hover:bg-muted transition-colors",
              "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
              isSelected(date) && "bg-primary text-primary-foreground hover:bg-primary/90",
              isToday(date) && !isSelected(date) && "bg-muted font-semibold",
              !isCurrentMonth(date) && "text-muted-foreground/50",
              isDisabled(date) && "opacity-50 cursor-not-allowed hover:bg-transparent"
            )}
          >
            {date.getDate()}
          </button>
        ))}
      </div>
    </div>
  )
}

export default Calendar