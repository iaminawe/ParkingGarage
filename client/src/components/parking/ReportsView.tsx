import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Spinner } from '@/components/ui/loading'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { 
  FileText, 
  Download, 
  Calendar as CalendarIcon, 
  BarChart3,
  DollarSign,
  Users,
  Clock,
  TrendingUp,
  FileSpreadsheet,
  Printer,
  Mail,
  Settings,
  Eye
} from 'lucide-react'
import { format } from 'date-fns'
import { cn } from '@/utils/cn'

interface ReportsViewProps {
  garageId: string
  sharedState: {
    selectedFloor: number
    searchQuery: string
    statusFilter: string
    typeFilter: string
    lastRefresh: Date
  }
  className?: string
}

interface ReportTemplate {
  id: string
  name: string
  description: string
  category: string
  icon: React.ComponentType<{ className?: string }>
  fields: string[]
  frequency: string
  lastGenerated?: string
}

interface ScheduledReport {
  id: string
  templateId: string
  name: string
  frequency: 'daily' | 'weekly' | 'monthly'
  nextRun: string
  recipients: string[]
  active: boolean
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  garageId,
  sharedState,
  className = ''
}) => {
  const [loading, setLoading] = useState(false)
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
    to: new Date()
  })
  const [selectedFormat, setSelectedFormat] = useState<'pdf' | 'csv' | 'excel'>('pdf')
  const [scheduledReports, setScheduledReports] = useState<ScheduledReport[]>([])

  const reportTemplates: ReportTemplate[] = [
    {
      id: 'occupancy-summary',
      name: 'Occupancy Summary Report',
      description: 'Detailed analysis of parking space utilization rates',
      category: 'Operational',
      icon: BarChart3,
      fields: ['Occupancy rates', 'Peak hours', 'Floor comparison', 'Trends'],
      frequency: 'Daily',
      lastGenerated: '2024-01-15T08:00:00Z'
    },
    {
      id: 'revenue-report',
      name: 'Revenue Analysis Report',
      description: 'Financial performance and revenue breakdown',
      category: 'Financial',
      icon: DollarSign,
      fields: ['Total revenue', 'Revenue by floor', 'Payment methods', 'Trends'],
      frequency: 'Daily',
      lastGenerated: '2024-01-15T06:00:00Z'
    },
    {
      id: 'customer-analytics',
      name: 'Customer Analytics Report',
      description: 'Customer behavior and usage patterns',
      category: 'Analytics',
      icon: Users,
      fields: ['User sessions', 'Average stay time', 'Return customers', 'Demographics'],
      frequency: 'Weekly',
      lastGenerated: '2024-01-14T09:00:00Z'
    },
    {
      id: 'maintenance-summary',
      name: 'Maintenance Summary Report',
      description: 'Maintenance activities and equipment status',
      category: 'Maintenance',
      icon: Settings,
      fields: ['Open tickets', 'Completed work', 'Equipment status', 'Cost analysis'],
      frequency: 'Weekly',
      lastGenerated: '2024-01-13T10:00:00Z'
    },
    {
      id: 'performance-dashboard',
      name: 'Performance Dashboard Report',
      description: 'Executive summary with key performance indicators',
      category: 'Executive',
      icon: TrendingUp,
      fields: ['KPIs', 'Trends', 'Benchmarks', 'Recommendations'],
      frequency: 'Monthly',
      lastGenerated: '2024-01-01T09:00:00Z'
    },
    {
      id: 'spot-utilization',
      name: 'Spot Utilization Report',
      description: 'Individual spot usage and efficiency metrics',
      category: 'Operational',
      icon: Clock,
      fields: ['Spot turnover', 'Idle time', 'High-performance spots', 'Underutilized areas'],
      frequency: 'Weekly'
    }
  ]

  useEffect(() => {
    // Load scheduled reports
    setScheduledReports([
      {
        id: 'sr-001',
        templateId: 'occupancy-summary',
        name: 'Daily Occupancy Report',
        frequency: 'daily',
        nextRun: '2024-01-16T08:00:00Z',
        recipients: ['manager@garage.com', 'operations@garage.com'],
        active: true
      },
      {
        id: 'sr-002',
        templateId: 'revenue-report',
        name: 'Weekly Revenue Summary',
        frequency: 'weekly',
        nextRun: '2024-01-22T09:00:00Z',
        recipients: ['finance@garage.com'],
        active: true
      }
    ])
  }, [garageId])

  const handleGenerateReport = async (templateId: string) => {
    setLoading(true)
    // Simulate report generation
    await new Promise(resolve => setTimeout(resolve, 2000))
    console.log(`Generating ${templateId} report from ${dateRange.from} to ${dateRange.to} in ${selectedFormat} format`)
    setLoading(false)
  }

  const handleScheduleReport = (templateId: string) => {
    console.log(`Scheduling report: ${templateId}`)
  }

  const handleDownload = (templateId: string, format: string) => {
    console.log(`Downloading ${templateId} in ${format} format`)
  }

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'PPP')
  }

  const getFrequencyBadge = (frequency: string) => {
    switch (frequency) {
      case 'Daily': return <Badge variant="success">Daily</Badge>
      case 'Weekly': return <Badge variant="warning">Weekly</Badge>
      case 'Monthly': return <Badge variant="secondary">Monthly</Badge>
      default: return <Badge variant="outline">{frequency}</Badge>
    }
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'Operational': return 'text-blue-600'
      case 'Financial': return 'text-green-600'
      case 'Analytics': return 'text-purple-600'
      case 'Maintenance': return 'text-orange-600'
      case 'Executive': return 'text-red-600'
      default: return 'text-gray-600'
    }
  }

  return (
    <div className={`space-y-6 ${className}`}>
      <Tabs defaultValue="generate" className="space-y-6">
        <TabsList>
          <TabsTrigger value="generate">Generate Reports</TabsTrigger>
          <TabsTrigger value="scheduled">Scheduled Reports</TabsTrigger>
          <TabsTrigger value="history">Report History</TabsTrigger>
        </TabsList>

        {/* Generate Reports Tab */}
        <TabsContent value="generate" className="space-y-6">
          {/* Report Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Report Configuration</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Date Range */}
                <div className="space-y-2">
                  <Label>Date Range</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          'w-full justify-start text-left font-normal',
                          !dateRange.from && 'text-muted-foreground'
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dateRange.from ? (
                          dateRange.to ? (
                            <>
                              {format(dateRange.from, 'LLL dd, y')} -{' '}
                              {format(dateRange.to, 'LLL dd, y')}
                            </>
                          ) : (
                            format(dateRange.from, 'LLL dd, y')
                          )
                        ) : (
                          'Pick a date range'
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        initialFocus
                        mode="range"
                        defaultMonth={dateRange.from}
                        selected={{ from: dateRange.from, to: dateRange.to }}
                        onSelect={(range) => setDateRange({ from: range?.from, to: range?.to })}
                        numberOfMonths={2}
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Export Format */}
                <div className="space-y-2">
                  <Label>Export Format</Label>
                  <Select value={selectedFormat} onValueChange={(value: any) => setSelectedFormat(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pdf">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          PDF Document
                        </div>
                      </SelectItem>
                      <SelectItem value="csv">
                        <div className="flex items-center gap-2">
                          <FileSpreadsheet className="h-4 w-4" />
                          CSV File
                        </div>
                      </SelectItem>
                      <SelectItem value="excel">
                        <div className="flex items-center gap-2">
                          <FileSpreadsheet className="h-4 w-4" />
                          Excel Workbook
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Quick Ranges */}
                <div className="space-y-2">
                  <Label>Quick Ranges</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDateRange({
                        from: new Date(),
                        to: new Date()
                      })}
                    >
                      Today
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDateRange({
                        from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
                        to: new Date()
                      })}
                    >
                      Last 7 days
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDateRange({
                        from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
                        to: new Date()
                      })}
                    >
                      Last 30 days
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDateRange({
                        from: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
                        to: new Date()
                      })}
                    >
                      Last 90 days
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Report Templates */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {reportTemplates.map((template) => {
              const Icon = template.icon
              return (
                <Card key={template.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg bg-muted ${getCategoryColor(template.category)}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="text-base">{template.name}</div>
                        <div className="text-sm text-muted-foreground font-normal">
                          {template.category}
                        </div>
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      {template.description}
                    </p>
                    
                    <div className="space-y-2">
                      <div className="text-sm font-medium">Includes:</div>
                      <div className="flex flex-wrap gap-1">
                        {template.fields.map((field) => (
                          <Badge key={field} variant="outline" className="text-xs">
                            {field}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2">
                      <div className="flex items-center gap-2">
                        {getFrequencyBadge(template.frequency)}
                        {template.lastGenerated && (
                          <span className="text-xs text-muted-foreground">
                            Last: {formatDate(template.lastGenerated)}
                          </span>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleScheduleReport(template.id)}
                        >
                          Schedule
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleGenerateReport(template.id)}
                          disabled={loading}
                        >
                          {loading ? (
                            <Spinner size="sm" className="mr-2" />
                          ) : (
                            <Download className="h-4 w-4 mr-2" />
                          )}
                          Generate
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </TabsContent>

        {/* Scheduled Reports Tab */}
        <TabsContent value="scheduled" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Scheduled Reports</CardTitle>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Schedule
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {scheduledReports.map((report) => (
                  <div key={report.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-1">
                      <div className="font-medium">{report.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {report.frequency.charAt(0).toUpperCase() + report.frequency.slice(1)} • 
                        Next run: {formatDate(report.nextRun)}
                      </div>
                      <div className="flex items-center gap-2">
                        <Mail className="h-3 w-3" />
                        <span className="text-xs text-muted-foreground">
                          {report.recipients.join(', ')}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={report.active ? 'success' : 'secondary'}>
                        {report.active ? 'Active' : 'Paused'}
                      </Badge>
                      <Button variant="outline" size="sm">
                        <Settings className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Report History Tab */}
        <TabsContent value="history" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Recent Reports</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  {
                    name: 'Occupancy Summary Report',
                    date: '2024-01-15T08:00:00Z',
                    format: 'PDF',
                    size: '2.4 MB',
                    status: 'completed'
                  },
                  {
                    name: 'Revenue Analysis Report',
                    date: '2024-01-15T06:00:00Z',
                    format: 'Excel',
                    size: '1.8 MB',
                    status: 'completed'
                  },
                  {
                    name: 'Customer Analytics Report',
                    date: '2024-01-14T09:00:00Z',
                    format: 'PDF',
                    size: '3.1 MB',
                    status: 'completed'
                  },
                  {
                    name: 'Performance Dashboard Report',
                    date: '2024-01-13T10:00:00Z',
                    format: 'PDF',
                    size: '5.2 MB',
                    status: 'completed'
                  }
                ].map((report, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded">
                    <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <div className="font-medium text-sm">{report.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {formatDate(report.date)} • {report.format} • {report.size}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="success">Completed</Badge>
                      <Button variant="outline" size="sm">
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>
                      <Button variant="outline" size="sm">
                        <Download className="h-4 w-4 mr-1" />
                        Download
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default ReportsView