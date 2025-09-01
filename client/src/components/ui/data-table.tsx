import React, { useState, useMemo } from 'react'
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { cn } from '@/utils/cn'

export interface Column<T> {
  key: keyof T | string
  header: string
  accessor?: (item: T) => any
  sortable?: boolean
  width?: string | number
  className?: string
  render?: (value: any, item: T, index: number) => React.ReactNode
}

export interface DataTableProps<T> {
  data: T[]
  columns: Column<T>[]
  loading?: boolean
  pagination?: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  onSort?: (column: string, order: 'asc' | 'desc') => void
  onPageChange?: (page: number) => void
  onPageSizeChange?: (pageSize: number) => void
  selectable?: boolean
  selectedItems?: any[]
  onSelectionChange?: (selectedItems: any[]) => void
  getItemId?: (item: T) => string
  className?: string
  emptyMessage?: string
  rowClassName?: string | ((item: T, index: number) => string)
  onRowClick?: (item: T, index: number) => void
}

export function DataTable<T>({
  data,
  columns,
  loading = false,
  pagination,
  sortBy,
  sortOrder,
  onSort,
  onPageChange,
  onPageSizeChange,
  selectable = false,
  selectedItems = [],
  onSelectionChange,
  getItemId = (item: any) => item.id,
  className,
  emptyMessage = 'No data available',
  rowClassName,
  onRowClick,
}: DataTableProps<T>) {
  const [localSortBy, setLocalSortBy] = useState<string | undefined>(sortBy)
  const [localSortOrder, setLocalSortOrder] = useState<'asc' | 'desc'>('asc')

  // Handle sorting
  const handleSort = (columnKey: string) => {
    const newOrder = localSortBy === columnKey && localSortOrder === 'asc' ? 'desc' : 'asc'
    setLocalSortBy(columnKey)
    setLocalSortOrder(newOrder)
    onSort?.(columnKey, newOrder)
  }

  // Handle selection
  const isSelected = (item: T) => {
    const itemId = getItemId(item)
    return selectedItems.some(selectedId => selectedId === itemId)
  }

  const isAllSelected = useMemo(() => {
    if (data.length === 0) return false
    return data.every(item => isSelected(item))
  }, [data, selectedItems])

  const isPartiallySelected = useMemo(() => {
    return selectedItems.length > 0 && !isAllSelected
  }, [selectedItems, isAllSelected])

  const handleSelectAll = () => {
    if (isAllSelected) {
      onSelectionChange?.(selectedItems.filter(id => 
        !data.some(item => getItemId(item) === id)
      ))
    } else {
      const allIds = data.map(getItemId)
      const newSelection = [...new Set([...selectedItems, ...allIds])]
      onSelectionChange?.(newSelection)
    }
  }

  const handleSelectItem = (item: T) => {
    const itemId = getItemId(item)
    if (isSelected(item)) {
      onSelectionChange?.(selectedItems.filter(id => id !== itemId))
    } else {
      onSelectionChange?.([...selectedItems, itemId])
    }
  }

  // Get cell value
  const getCellValue = (item: T, column: Column<T>) => {
    if (column.accessor) {
      return column.accessor(item)
    }
    return (item as any)[column.key]
  }

  // Render sort icon
  const renderSortIcon = (column: Column<T>) => {
    if (!column.sortable) return null
    
    const columnKey = column.key as string
    if (localSortBy === columnKey) {
      return localSortOrder === 'asc' ? 
        <ArrowUp className="h-4 w-4 ml-1" /> : 
        <ArrowDown className="h-4 w-4 ml-1" />
    }
    return <ArrowUpDown className="h-4 w-4 ml-1 opacity-50" />
  }

  return (
    <div className={cn("w-full", className)}>
      {/* Table */}
      <div className="rounded-md border">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                {selectable && (
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                    <Checkbox
                      checked={isAllSelected}
                      indeterminate={isPartiallySelected}
                      onChange={handleSelectAll}
                      aria-label="Select all"
                    />
                  </th>
                )}
                {columns.map((column, index) => (
                  <th
                    key={index}
                    className={cn(
                      "h-12 px-4 text-left align-middle font-medium text-muted-foreground",
                      column.sortable && "cursor-pointer hover:bg-muted/80",
                      column.className
                    )}
                    style={{ width: column.width }}
                    onClick={() => column.sortable && handleSort(column.key as string)}
                  >
                    <div className="flex items-center">
                      {column.header}
                      {renderSortIcon(column)}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td 
                    colSpan={columns.length + (selectable ? 1 : 0)} 
                    className="h-24 px-4 text-center"
                  >
                    <div className="flex items-center justify-center">
                      <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-r-transparent" />
                      <span className="ml-2">Loading...</span>
                    </div>
                  </td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td 
                    colSpan={columns.length + (selectable ? 1 : 0)} 
                    className="h-24 px-4 text-center text-muted-foreground"
                  >
                    {emptyMessage}
                  </td>
                </tr>
              ) : (
                data.map((item, rowIndex) => {
                  const selected = isSelected(item)
                  const className = typeof rowClassName === 'function' 
                    ? rowClassName(item, rowIndex) 
                    : rowClassName

                  return (
                    <tr
                      key={getItemId(item)}
                      className={cn(
                        "border-b transition-colors hover:bg-muted/50",
                        selected && "bg-muted",
                        onRowClick && "cursor-pointer",
                        className
                      )}
                      onClick={() => onRowClick?.(item, rowIndex)}
                    >
                      {selectable && (
                        <td className="px-4 py-3">
                          <Checkbox
                            checked={selected}
                            onChange={() => handleSelectItem(item)}
                            aria-label={`Select row ${rowIndex + 1}`}
                            onClick={(e) => e.stopPropagation()}
                          />
                        </td>
                      )}
                      {columns.map((column, colIndex) => {
                        const value = getCellValue(item, column)
                        return (
                          <td
                            key={colIndex}
                            className={cn(
                              "px-4 py-3 align-middle",
                              column.className
                            )}
                            style={{ width: column.width }}
                          >
                            {column.render ? column.render(value, item, rowIndex) : value}
                          </td>
                        )
                      })}
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {pagination && (
        <div className="flex items-center justify-between px-2 py-4">
          <div className="flex items-center space-x-2">
            <p className="text-sm font-medium">Rows per page</p>
            <Select
              value={pagination.limit.toString()}
              onValueChange={(value) => onPageSizeChange?.(parseInt(value))}
            >
              <SelectTrigger className="h-8 w-[70px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent side="top">
                {[10, 20, 30, 40, 50].map((pageSize) => (
                  <SelectItem key={pageSize} value={pageSize.toString()}>
                    {pageSize}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center space-x-6 lg:space-x-8">
            <div className="flex w-[100px] items-center justify-center text-sm font-medium">
              Page {pagination.page} of {pagination.totalPages}
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                className="hidden h-8 w-8 p-0 lg:flex"
                onClick={() => onPageChange?.(1)}
                disabled={pagination.page <= 1}
              >
                <ChevronsLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                className="h-8 w-8 p-0"
                onClick={() => onPageChange?.(pagination.page - 1)}
                disabled={pagination.page <= 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                className="h-8 w-8 p-0"
                onClick={() => onPageChange?.(pagination.page + 1)}
                disabled={pagination.page >= pagination.totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                className="hidden h-8 w-8 p-0 lg:flex"
                onClick={() => onPageChange?.(pagination.totalPages)}
                disabled={pagination.page >= pagination.totalPages}
              >
                <ChevronsRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default DataTable