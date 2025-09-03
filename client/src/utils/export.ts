/**
 * Utility functions for exporting data to various formats
 */

/**
 * Convert array of objects to CSV format and trigger download
 */
export const exportToCsv = (data: Record<string, unknown>[], filename: string): void => {
  if (!data || data.length === 0) {
    console.warn('No data to export')
    return
  }

  try {
    // Get headers from the first object
    const headers = Object.keys(data[0])
    
    // Create CSV content
    const csvContent = [
      // Header row
      headers.map(escapeCSVValue).join(','),
      // Data rows
      ...data.map(row => 
        headers.map(header => escapeCSVValue(row[header] ?? '')).join(',')
      )
    ].join('\n')

    // Create and trigger download
    downloadFile(csvContent, filename, 'text/csv;charset=utf-8;')
  } catch (error) {
    console.error('Error exporting to CSV:', error)
    throw new Error('Failed to export data to CSV')
  }
}

/**
 * Convert array of objects to JSON format and trigger download
 */
export const exportToJson = (data: unknown, filename: string): void => {
  try {
    const jsonContent = JSON.stringify(data, null, 2)
    downloadFile(jsonContent, filename, 'application/json;charset=utf-8;')
  } catch (error) {
    console.error('Error exporting to JSON:', error)
    throw new Error('Failed to export data to JSON')
  }
}

/**
 * Export table data to Excel format (CSV with .xlsx extension)
 */
export const exportToExcel = (data: Record<string, unknown>[], filename: string): void => {
  // For now, we'll export as CSV with .xlsx extension
  // In a real application, you might want to use a library like xlsx or exceljs
  const xlsxFilename = filename.replace(/\.[^/.]+$/, '') + '.xlsx'
  exportToCsv(data, xlsxFilename)
}

/**
 * Helper function to escape CSV values
 */
const escapeCSVValue = (value: unknown): string => {
  if (value === null || value === undefined) {
    return ''
  }

  const stringValue = String(value)
  
  // If the value contains comma, newline, or quotes, wrap in quotes and escape internal quotes
  if (stringValue.includes(',') || stringValue.includes('\n') || stringValue.includes('\r') || stringValue.includes('"')) {
    return `"${stringValue.replace(/"/g, '""')}"`
  }
  
  return stringValue
}

/**
 * Generic function to trigger file download
 */
const downloadFile = (content: string, filename: string, mimeType: string): void => {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.style.display = 'none'
  
  document.body.appendChild(link)
  link.click()
  
  // Cleanup
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * Export vehicle data with formatted fields
 */
export interface VehicleExportData extends Record<string, unknown> {
  licensePlate: string
  type: string
  make: string
  model: string
  color: string
  ownerName?: string
  ownerEmail?: string
  ownerPhone?: string
  status: string
  totalSessions: number
  totalSpent: number
  averageDuration: number
  lastParked?: string
  createdAt: string
}

export const exportVehicleData = (
  vehicles: VehicleExportData[], 
  format: 'csv' | 'json' | 'excel' = 'csv',
  customFilename?: string
): void => {
  const timestamp = new Date().toISOString().split('T')[0]
  const defaultFilename = `vehicles_export_${timestamp}`
  const filename = customFilename || defaultFilename

  switch (format) {
    case 'json':
      exportToJson(vehicles, `${filename}.json`)
      break
    case 'excel':
      exportToExcel(vehicles, `${filename}.xlsx`)
      break
    case 'csv':
    default:
      exportToCsv(vehicles, `${filename}.csv`)
      break
  }
}

/**
 * Export parking session data
 */
export interface SessionExportData extends Record<string, unknown> {
  vehicleLicensePlate: string
  entryTime: string
  exitTime?: string
  duration?: string
  location: string
  cost: string
  status: string
  paymentStatus: string
}

export const exportSessionData = (
  sessions: SessionExportData[],
  format: 'csv' | 'json' | 'excel' = 'csv',
  customFilename?: string
): void => {
  const timestamp = new Date().toISOString().split('T')[0]
  const defaultFilename = `parking_sessions_${timestamp}`
  const filename = customFilename || defaultFilename

  switch (format) {
    case 'json':
      exportToJson(sessions, `${filename}.json`)
      break
    case 'excel':
      exportToExcel(sessions, `${filename}.xlsx`)
      break
    case 'csv':
    default:
      exportToCsv(sessions, `${filename}.csv`)
      break
  }
}

/**
 * Export financial report data
 */
export interface FinancialExportData extends Record<string, unknown> {
  date: string
  totalSessions: number
  totalRevenue: number
  averageSessionValue: number
  occupancyRate: number
  peakHour: string
}

export const exportFinancialData = (
  data: FinancialExportData[],
  format: 'csv' | 'json' | 'excel' = 'csv',
  customFilename?: string
): void => {
  const timestamp = new Date().toISOString().split('T')[0]
  const defaultFilename = `financial_report_${timestamp}`
  const filename = customFilename || defaultFilename

  switch (format) {
    case 'json':
      exportToJson(data, `${filename}.json`)
      break
    case 'excel':
      exportToExcel(data, `${filename}.xlsx`)
      break
    case 'csv':
    default:
      exportToCsv(data, `${filename}.csv`)
      break
  }
}

/**
 * Check if the browser supports file download
 */
export const isDownloadSupported = (): boolean => {
  return typeof document !== 'undefined' && 'createElement' in document
}

/**
 * Get file extension based on export format
 */
export const getFileExtension = (format: 'csv' | 'json' | 'excel'): string => {
  switch (format) {
    case 'json':
      return '.json'
    case 'excel':
      return '.xlsx'
    case 'csv':
    default:
      return '.csv'
  }
}