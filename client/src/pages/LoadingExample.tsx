import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  FullPageLoader,
  Spinner,
  ButtonLoader,
  PageLoader,
  CardSkeleton,
  TableSkeleton,
  ListSkeleton,
  ChartSkeleton,
  DashboardSkeleton,
} from '@/components/ui/loading'
import { Separator } from '@/components/ui/separator'

export function LoadingExample() {
  const [showFullPageLoader, setShowFullPageLoader] = useState(false)
  const [buttonLoading, setButtonLoading] = useState(false)

  const handleButtonClick = () => {
    setButtonLoading(true)
    setTimeout(() => setButtonLoading(false), 3000)
  }

  const handleFullPageLoader = () => {
    setShowFullPageLoader(true)
    setTimeout(() => setShowFullPageLoader(false), 3000)
  }

  return (
    <>
      {showFullPageLoader && <FullPageLoader />}
      
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Loading Components</h1>
          <p className="text-muted-foreground">
            Examples of all available loading states and skeleton screens
          </p>
        </div>

        {/* Interactive Examples */}
        <Card>
          <CardHeader>
            <CardTitle>Interactive Examples</CardTitle>
            <CardDescription>Click to see loading states in action</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4">
              <Button onClick={handleFullPageLoader}>
                Show Full Page Loader
              </Button>
              <Button onClick={handleButtonClick} disabled={buttonLoading}>
                <ButtonLoader loading={buttonLoading}>
                  {buttonLoading ? 'Loading...' : 'Button with Loader'}
                </ButtonLoader>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Spinners */}
        <Card>
          <CardHeader>
            <CardTitle>Spinners</CardTitle>
            <CardDescription>Different spinner sizes</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-8">
              <div className="text-center space-y-2">
                <Spinner size="sm" />
                <p className="text-sm text-muted-foreground">Small</p>
              </div>
              <div className="text-center space-y-2">
                <Spinner size="md" />
                <p className="text-sm text-muted-foreground">Medium</p>
              </div>
              <div className="text-center space-y-2">
                <Spinner size="lg" />
                <p className="text-sm text-muted-foreground">Large</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Page Loader */}
        <Card>
          <CardHeader>
            <CardTitle>Page Loader</CardTitle>
            <CardDescription>For loading entire page sections</CardDescription>
          </CardHeader>
          <CardContent>
            <PageLoader 
              title="Loading Data" 
              description="Please wait while we fetch your information..."
            />
          </CardContent>
        </Card>

        <Separator />

        {/* Skeleton Examples */}
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Skeleton Screens</h2>
            <p className="text-muted-foreground">
              Placeholder content while data is loading
            </p>
          </div>

          {/* Card Skeletons */}
          <div>
            <h3 className="text-lg font-medium mb-4">Card Skeletons</h3>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <CardSkeleton />
              <CardSkeleton />
              <CardSkeleton />
            </div>
          </div>

          {/* Table Skeleton */}
          <div>
            <h3 className="text-lg font-medium mb-4">Table Skeleton</h3>
            <Card>
              <CardHeader>
                <CardTitle>Data Table</CardTitle>
              </CardHeader>
              <CardContent>
                <TableSkeleton rows={6} columns={5} />
              </CardContent>
            </Card>
          </div>

          {/* List Skeletons */}
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <h3 className="text-lg font-medium mb-4">List Skeleton (Simple)</h3>
              <Card>
                <CardHeader>
                  <CardTitle>Items List</CardTitle>
                </CardHeader>
                <CardContent>
                  <ListSkeleton items={5} />
                </CardContent>
              </Card>
            </div>
            
            <div>
              <h3 className="text-lg font-medium mb-4">List Skeleton (With Avatars)</h3>
              <Card>
                <CardHeader>
                  <CardTitle>Users List</CardTitle>
                </CardHeader>
                <CardContent>
                  <ListSkeleton items={5} showAvatar={true} />
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Chart Skeleton */}
          <div>
            <h3 className="text-lg font-medium mb-4">Chart Skeleton</h3>
            <Card>
              <CardHeader>
                <CardTitle>Analytics Chart</CardTitle>
              </CardHeader>
              <CardContent>
                <ChartSkeleton />
              </CardContent>
            </Card>
          </div>

          {/* Dashboard Skeleton */}
          <div>
            <h3 className="text-lg font-medium mb-4">Complete Dashboard Skeleton</h3>
            <Card>
              <CardHeader>
                <CardTitle>Dashboard Layout</CardTitle>
                <CardDescription>Full dashboard loading state</CardDescription>
              </CardHeader>
              <CardContent>
                <DashboardSkeleton />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </>
  )
}