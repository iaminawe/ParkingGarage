/**
 * Utility functions for formatting data in the vehicle management system
 */

/**
 * Format a date string to a human-readable format
 */
export const formatDate = (dateString: string | Date): string => {
  const date = new Date(dateString)
  
  if (isNaN(date.getTime())) {
    return 'Invalid Date'
  }

  // Format: "Jan 15, 2024 at 2:30 PM"
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  })
}

/**
 * Format a date to a short format (date only)
 */
export const formatDateShort = (dateString: string | Date): string => {
  const date = new Date(dateString)
  
  if (isNaN(date.getTime())) {
    return 'Invalid Date'
  }

  // Format: "Jan 15, 2024"
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

/**
 * Format a time duration in minutes to a human-readable format
 */
export const formatDuration = (minutes: number): string => {
  if (!minutes || minutes <= 0) {
    return '0 min'
  }

  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60

  if (hours === 0) {
    return `${mins} min`
  } else if (mins === 0) {
    return `${hours}h`
  } else {
    return `${hours}h ${mins}m`
  }
}

/**
 * Format a currency amount
 */
export const formatCurrency = (amount: number, currency: string = 'USD'): string => {
  if (typeof amount !== 'number' || isNaN(amount)) {
    return '$0.00'
  }

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount)
}

/**
 * Format a percentage value
 */
export const formatPercentage = (value: number, decimals: number = 1): string => {
  if (typeof value !== 'number' || isNaN(value)) {
    return '0%'
  }

  return `${value.toFixed(decimals)}%`
}

/**
 * Format a phone number
 */
export const formatPhoneNumber = (phoneNumber: string): string => {
  if (!phoneNumber) return ''
  
  // Remove all non-digit characters
  const cleaned = phoneNumber.replace(/\D/g, '')
  
  // Check if the number is valid
  if (cleaned.length === 10) {
    // Format as (XXX) XXX-XXXX
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`
  } else if (cleaned.length === 11 && cleaned.startsWith('1')) {
    // Format as +1 (XXX) XXX-XXXX
    return `+1 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`
  }
  
  return phoneNumber // Return as-is if not a recognized format
}

/**
 * Format a license plate for consistent display
 */
export const formatLicensePlate = (licensePlate: string): string => {
  if (!licensePlate) return ''
  
  return licensePlate.toUpperCase().trim()
}

/**
 * Format a relative time (e.g., "2 hours ago")
 */
export const formatRelativeTime = (dateString: string | Date): string => {
  const date = new Date(dateString)
  const now = new Date()
  const diffInMs = now.getTime() - date.getTime()
  
  if (isNaN(date.getTime())) {
    return 'Invalid Date'
  }

  const diffInMinutes = Math.floor(diffInMs / (1000 * 60))
  const diffInHours = Math.floor(diffInMinutes / 60)
  const diffInDays = Math.floor(diffInHours / 24)
  const diffInWeeks = Math.floor(diffInDays / 7)
  const diffInMonths = Math.floor(diffInDays / 30)

  if (diffInMinutes < 1) {
    return 'Just now'
  } else if (diffInMinutes < 60) {
    return `${diffInMinutes} minute${diffInMinutes === 1 ? '' : 's'} ago`
  } else if (diffInHours < 24) {
    return `${diffInHours} hour${diffInHours === 1 ? '' : 's'} ago`
  } else if (diffInDays < 7) {
    return `${diffInDays} day${diffInDays === 1 ? '' : 's'} ago`
  } else if (diffInWeeks < 4) {
    return `${diffInWeeks} week${diffInWeeks === 1 ? '' : 's'} ago`
  } else if (diffInMonths < 12) {
    return `${diffInMonths} month${diffInMonths === 1 ? '' : 's'} ago`
  } else {
    return formatDateShort(date)
  }
}

/**
 * Truncate text to a specified length
 */
export const truncateText = (text: string, maxLength: number): string => {
  if (!text || text.length <= maxLength) {
    return text
  }
  
  return text.slice(0, maxLength - 3) + '...'
}

/**
 * Format file size in bytes to human-readable format
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes'
  
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

/**
 * Format a number with thousand separators
 */
export const formatNumber = (num: number): string => {
  if (typeof num !== 'number' || isNaN(num)) {
    return '0'
  }
  
  return num.toLocaleString('en-US')
}

/**
 * Capitalize the first letter of a string
 */
export const capitalize = (str: string): string => {
  if (!str) return ''
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase()
}

/**
 * Convert camelCase or PascalCase to title case
 */
export const toTitleCase = (str: string): string => {
  if (!str) return ''
  
  // Insert space before uppercase letters and capitalize first letter
  return str
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, char => char.toUpperCase())
    .trim()
}