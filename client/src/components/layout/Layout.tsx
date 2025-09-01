import { Outlet } from 'react-router-dom'
import { Header } from './Header'
import { Sidebar } from './Sidebar'

export function Layout() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="flex">
        <aside className="fixed left-0 top-14 z-30 h-[calc(100vh-3.5rem)] w-64 shrink-0 border-r bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <Sidebar />
        </aside>
        <main className="flex-1 pl-64">
          <div className="container mx-auto py-6 px-4">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}