import { useState, useEffect, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Calendar } from '@/components/Calendar/Calendar'
import { BookingManagement } from '@/components/BookingManagement/BookingManagement'
import { BookingForm } from '@/components/BookingForm'
import { useUserStore } from '@/stores/userStore'
import { useDataStore } from '@/stores/dataStore'

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
  const isCustomer = currentUser?.role === 'customer'
  
  const apartments = useDataStore(state => state.apartments)
  const groups = useDataStore(state => state.groups)
  const users = useDataStore(state => state.users)
  const userGroups = useDataStore(state => state.user_groups || [])
  const selectedGroupOrEmail = useDataStore(state => state.groupOrEmailFilter)
  const setSelectedGroupOrEmail = useDataStore(state => state.setGroupOrEmailFilter)

  // Get all groups (from groups table)
  const allGroups = useMemo(() => {
    return groups.map((g: any) => g.name).sort()
  }, [groups])

  // Get customer emails that have properties assigned
  const customerEmailsWithProperties = useMemo(() => {
    if (isCustomer) return []
    const customerUsers = users.filter((u: any) => u.role === 'customer')
    return customerUsers
      .filter((customer: any) => {
        // Check if any property is assigned to this customer's email or their group
        return apartments.some((apt: any) => {
          if (!apt.groups || apt.groups.length === 0) return false
          // Direct email assignment
          if (apt.groups.includes(customer.email)) return true
          // Group assignment
          const customerUserGroup = userGroups.find((ug: any) => ug.user_id === customer.id)
          if (customerUserGroup) {
            const customerGroup = groups.find((g: any) => g.id === customerUserGroup.group_id)
            if (customerGroup && apt.groups.includes(customerGroup.name)) return true
          }
          return false
        })
      })
      .map((u: any) => u.email)
      .sort()
  }, [users, apartments, userGroups, groups, isCustomer])

  return (
    <div className="space-y-4">
      {/* Group/Email Filter - Hidden for customers */}
      {!isCustomer && (
        <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg overflow-hidden border-2 border-[#D4AF37]/20">
          <div className="px-4 sm:px-6 py-4 sm:py-6">
            <div className="flex items-center gap-4 flex-wrap">
              <Label className="font-light text-[#2C3E1F] text-base sm:text-lg">Filter:</Label>
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => setSelectedGroupOrEmail('all')}
                  className={`px-4 py-2 rounded-lg text-sm font-light transition-all duration-300 ${
                    selectedGroupOrEmail === 'all'
                      ? 'bg-gradient-to-r from-[#D4AF37] to-[#F4D03F] text-[#2C3E1F] shadow-md'
                      : 'bg-white border-2 border-[#D4AF37]/30 text-[#6B7C4A] hover:border-[#D4AF37] hover:text-[#D4AF37]'
                  }`}
                >
                  All
                </button>
                {allGroups.map((groupName) => (
                  <button
                    key={groupName}
                    onClick={() => setSelectedGroupOrEmail(groupName)}
                    className={`px-4 py-2 rounded-lg text-sm font-light transition-all duration-300 ${
                      selectedGroupOrEmail === groupName
                        ? 'bg-gradient-to-r from-[#D4AF37] to-[#F4D03F] text-[#2C3E1F] shadow-md'
                        : 'bg-white border-2 border-[#D4AF37]/30 text-[#6B7C4A] hover:border-[#D4AF37] hover:text-[#D4AF37]'
                    }`}
                  >
                    {groupName}
                  </button>
                ))}
                {customerEmailsWithProperties.map((email) => (
                  <button
                    key={email}
                    onClick={() => setSelectedGroupOrEmail(email)}
                    className={`px-4 py-2 rounded-lg text-sm font-light transition-all duration-300 ${
                      selectedGroupOrEmail === email
                        ? 'bg-gradient-to-r from-[#D4AF37] to-[#F4D03F] text-[#2C3E1F] shadow-md'
                        : 'bg-white border-2 border-[#D4AF37]/30 text-[#6B7C4A] hover:border-[#D4AF37] hover:text-[#D4AF37]'
                    }`}
                  >
                    {email}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
      
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


