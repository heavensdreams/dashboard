import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/Calendar/Calendar'
import { BookingManagement } from '@/components/BookingManagement/BookingManagement'
import { BookingForm } from '@/components/BookingForm'
import { useUserStore } from '@/stores/userStore'

export function Bookings() {
  const [view, setView] = useState<'calendar' | 'list'>('calendar')

  // Listen for view change events from Dashboard
  useEffect(() => {
    const handleSetBookingView = (e: CustomEvent) => {
      const newView = e.detail as 'calendar' | 'list'
      if (newView === 'calendar' || newView === 'list') {
        setView(newView)
      }
    }

    window.addEventListener('setBookingView', handleSetBookingView as EventListener)
    return () => {
      window.removeEventListener('setBookingView', handleSetBookingView as EventListener)
    }
  }, [])
  const [showBookingForm, setShowBookingForm] = useState(false)
  const { currentUser } = useUserStore()
  const canEdit = currentUser?.role === 'admin' || currentUser?.role === 'normal'

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        {canEdit && (
          <Button onClick={() => setShowBookingForm(true)}>
            + New Booking
          </Button>
        )}
        {!canEdit && <div />}
        <div className="flex gap-2">
          <Button
            variant={view === 'calendar' ? 'default' : 'outline'}
            onClick={() => setView('calendar')}
          >
            Calendar View
          </Button>
          <Button
            variant={view === 'list' ? 'default' : 'outline'}
            onClick={() => setView('list')}
          >
            All Bookings
          </Button>
        </div>
      </div>
      
      {showBookingForm ? (
        <BookingForm
          onSave={() => {
            setShowBookingForm(false)
            // Refresh the view if needed
          }}
          onCancel={() => setShowBookingForm(false)}
        />
      ) : (
        view === 'calendar' ? <Calendar /> : <BookingManagement />
      )}
    </div>
  )
}


