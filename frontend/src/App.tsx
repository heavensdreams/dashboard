import { useState, useEffect } from 'react'
import { useUserStore } from './stores/userStore'
import { useDataStore } from './stores/dataStore'
import { Dashboard } from './pages/Dashboard'
import { Properties } from './pages/Properties'
import { Bookings } from './pages/Bookings'
import { Users } from './pages/Users'
import { Groups } from './pages/Groups'
import { Logs } from './pages/Logs'
import { PublicPropertyView } from './pages/PublicPropertyView'
import { Button } from './components/ui/button'
import { Login } from './components/Login'

type Page = 'dashboard' | 'properties' | 'bookings' | 'users' | 'groups' | 'logs'

function App() {
  const { currentUser, setCurrentUser } = useUserStore()
  const { loadData, loading } = useDataStore()
  const [currentPage, setCurrentPage] = useState<Page>('dashboard')

  useEffect(() => {
    // Load all data on app start (even when not logged in)
    loadData()
  }, [loadData])

  // Check for public view route (/view/*)
  useEffect(() => {
    const pathMatch = window.location.pathname.match(/^\/view\/(.+)$/)
    if (pathMatch) {
      // Public view - don't initialize electric or show login
      return
    }
  }, [])

  // Check if public view route
  const pathMatch = window.location.pathname.match(/^\/view\/(.+)$/)
  if (pathMatch) {
    const ids = pathMatch[1].split(',').filter(id => id.trim())
    return <PublicPropertyView propertyIds={ids} />
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div>Loading...</div>
      </div>
    )
  }

  // Show login page if not logged in
  if (!currentUser) {
    return <Login />
  }

  const isAdmin = currentUser?.role === 'admin'

  return (
    <div className="min-h-screen bg-background">
      {/* Header with Menu */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold">Rental App</h1>
            <span className="text-muted-foreground">-</span>
            <Button
              variant={currentPage === 'dashboard' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setCurrentPage('dashboard')}
            >
              Dashboard
            </Button>
            <Button
              variant={currentPage === 'properties' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setCurrentPage('properties')}
            >
              Properties
            </Button>
            <Button
              variant={currentPage === 'bookings' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setCurrentPage('bookings')}
            >
              Bookings
            </Button>
            {isAdmin && (
              <>
                <Button
                  variant={currentPage === 'users' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setCurrentPage('users')}
                >
                  Users
                </Button>
                <Button
                  variant={currentPage === 'groups' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setCurrentPage('groups')}
                >
                  Groups
                </Button>
                <Button
                  variant={currentPage === 'logs' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setCurrentPage('logs')}
                >
                  Logs
                </Button>
              </>
            )}
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span>{currentUser?.email}</span>
              {currentUser?.role === 'admin' && (
                <span className="px-2 py-1 text-xs font-semibold rounded bg-red-500 text-white">
                  Admin
                </span>
              )}
            </div>
            <Button variant="outline" onClick={() => setCurrentUser(null)}>
              Logout
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {currentPage === 'dashboard' && <Dashboard />}
        {currentPage === 'properties' && <Properties />}
        {currentPage === 'bookings' && <Bookings />}
        {isAdmin && currentPage === 'users' && <Users />}
        {isAdmin && currentPage === 'groups' && <Groups />}
        {isAdmin && currentPage === 'logs' && <Logs />}
      </main>
    </div>
  )
}

export default App


