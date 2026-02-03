import { useState, useMemo } from 'react'
import { Label } from '@/components/ui/label'
import { useDataStore } from '@/stores/dataStore'
import { useUserStore } from '@/stores/userStore'
import { PropertyDetail } from '@/components/PropertyDetail/PropertyDetail'
import { filterBookingsForCustomer } from '@/utils/filtering'
import { ROITrendGraph } from '@/components/ROITrendGraph/ROITrendGraph'

export function Dashboard() {
  const apartments = useDataStore(state => state.apartments)
  const groups = useDataStore(state => state.groups)
  const users = useDataStore(state => state.users)
  const userGroups = useDataStore(state => state.user_groups || [])
  const selectedGroupOrEmail = useDataStore(state => state.groupOrEmailFilter)
  const setSelectedGroupOrEmail = useDataStore(state => state.setGroupOrEmailFilter)
  const [selectedProperty, setSelectedProperty] = useState<string | null>(null)
  const [today] = useState(() => new Date().toISOString())
  const { currentUser } = useUserStore()
  const isCustomer = currentUser?.role === 'customer'

  // Get customer's group_id
  const customerGroupId = useMemo(() => {
    if (!isCustomer || !currentUser?.id) return null
    const userGroup = userGroups.find((ug: any) => ug.user_id === currentUser.id)
    return userGroup?.group_id || null
  }, [isCustomer, currentUser?.id, userGroups])

  // Get customer's group name (for filtering, but don't show to customer)
  const customerGroupName = useMemo(() => {
    if (!customerGroupId) return null
    const group = groups.find((g: any) => g.id === customerGroupId)
    return group?.name || null
  }, [customerGroupId, groups])

  // Calculate apartments with status
  const propertiesWithStatus = useMemo(() => {
    let filteredApartments = [...apartments]
    
    // For customers: filter by their email (direct assignment) OR their group name
    // IMPORTANT: This must match CustomerPropertiesView filtering logic exactly
    if (isCustomer && currentUser?.email) {
      filteredApartments = filteredApartments.filter(apt => {
        if (!apt.groups || apt.groups.length === 0) return false
        // Check if property is assigned directly to customer's email
        if (apt.groups.includes(currentUser.email)) return true
        // Check if property is assigned to customer's group (if they have one)
        if (customerGroupName && apt.groups.includes(customerGroupName)) return true
        return false
      })
    }
    // Combined Group/Email filter (admin/normal users only)
    else if (!isCustomer && selectedGroupOrEmail !== 'all') {
      // Check if it's a group name or customer email
      const isGroup = groups.some((g: any) => g.name === selectedGroupOrEmail)
      
      if (isGroup) {
        // Filter by group name
        filteredApartments = filteredApartments.filter(apt => apt.groups && apt.groups.includes(selectedGroupOrEmail))
      } else {
        // Filter by customer email - show properties assigned to this customer
        const filterEmail = selectedGroupOrEmail
        const filterUser = users.find((u: any) => u.email === filterEmail && u.role === 'customer')
        
        if (filterUser) {
          // Find the user's group if they have one
          let filterUserGroupName: string | null = null
          const filterUserGroup = userGroups.find((ug: any) => ug.user_id === filterUser.id)
          if (filterUserGroup) {
            const filterUserGroupObj = groups.find((g: any) => g.id === filterUserGroup.group_id)
            filterUserGroupName = filterUserGroupObj?.name || null
          }
          
          filteredApartments = filteredApartments.filter(apt => {
            if (!apt.groups || apt.groups.length === 0) return false
            // Check if property is assigned directly to the customer's email
            if (apt.groups.includes(filterEmail)) return true
            // Check if property is assigned to the customer's group (if they have one)
            if (filterUserGroupName && apt.groups.includes(filterUserGroupName)) return true
            return false
          })
        } else {
          // Email not found, show nothing
          filteredApartments = []
        }
      }
    }
    
    const todayDate = new Date(today)
    
    return filteredApartments.map(apartment => {
      // For customers, filter bookings to remove personal info
      let apartmentBookings = apartment.bookings || []
      if (isCustomer) {
        apartmentBookings = filterBookingsForCustomer(apartmentBookings)
      }
      
      // Check if currently occupied
      const isOccupied = apartmentBookings.some((b: any) => {
        const start = new Date(b.start_date)
        const end = new Date(b.end_date)
        return start <= todayDate && end >= todayDate
      })
      
      // Find next upcoming booking
      const nextBooking = apartmentBookings
        .filter((b: any) => {
          const start = new Date(b.start_date)
          return start > todayDate
        })
        .sort((a: any, b: any) => {
          return new Date(a.start_date).getTime() - new Date(b.start_date).getTime()
        })[0]

      return {
        ...apartment,
        status: isOccupied ? 'occupied' : 'available' as 'occupied' | 'available',
        next_booking: nextBooking ? {
          start_date: nextBooking.start_date.endsWith('Z') ? nextBooking.start_date : new Date(nextBooking.start_date).toISOString(),
          end_date: nextBooking.end_date.endsWith('Z') ? nextBooking.end_date : new Date(nextBooking.end_date).toISOString()
        } : null
      }
    })
  }, [apartments, groups, users, userGroups, selectedGroupOrEmail, today, isCustomer, customerGroupName, currentUser?.email])

  // Calculate stats
  const stats = useMemo(() => {
    const totalProperties = propertiesWithStatus.length
    const occupiedProperties = propertiesWithStatus.filter(p => p.status === 'occupied').length
    const availableProperties = totalProperties - occupiedProperties
    const totalBookings = propertiesWithStatus.reduce((sum, p) => {
      const bookings = p.bookings || []
      return sum + (isCustomer ? filterBookingsForCustomer(bookings).length : bookings.length)
    }, 0)

    return {
      totalProperties,
      occupiedProperties,
      availableProperties,
      totalBookings
    }
  }, [propertiesWithStatus, isCustomer])

  const getGroupBookingStatus = () => {
    if (isCustomer) {
      return null
    }

    if (propertiesWithStatus.length === 0) {
      return { text: 'No properties found', color: 'bg-gray-500', textColor: 'text-white' }
    }

    const allBooked = propertiesWithStatus.every(p => p.status === 'occupied')
    const someBooked = propertiesWithStatus.some(p => p.status === 'occupied')
    
    if (allBooked) {
      return { text: 'All properties booked', color: 'bg-red-500', textColor: 'text-white' }
    } else if (someBooked) {
      return { text: 'Some properties booked', color: 'bg-yellow-500', textColor: 'text-white' }
    } else {
      return { text: 'No properties booked', color: 'bg-green-500', textColor: 'text-white' }
    }
  }

  const groupStatus = getGroupBookingStatus()

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
    <div className="space-y-6 sm:space-y-8 lg:space-y-12">
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

      {/* Group Booking Status - Admin/Normal only */}
      {!isCustomer && groupStatus && (
        <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg overflow-hidden border-2 border-[#D4AF37]/20">
          <div className="px-4 sm:px-6 py-4 sm:py-6">
            <div className={`${groupStatus.color} ${groupStatus.textColor} px-4 py-3 text-center font-light text-base sm:text-lg rounded-lg`}>
              {groupStatus.text}
            </div>
          </div>
        </div>
      )}

      {/* Dashboard Landing Page - Stats and Navigation */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
        <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg overflow-hidden border-2 border-[#D4AF37]/20 hover:shadow-xl transition-all duration-300">
          <div className="p-6 sm:p-8">
            <div className="text-3xl sm:text-4xl lg:text-5xl font-light text-[#2C3E1F] mb-2 tracking-wide">{stats.totalProperties}</div>
            <div className="text-sm sm:text-base text-[#6B7C4A] font-light">Total Properties</div>
          </div>
        </div>
        <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg overflow-hidden border-2 border-[#D4AF37]/20 hover:shadow-xl transition-all duration-300">
          <div className="p-6 sm:p-8">
            <div className="text-3xl sm:text-4xl lg:text-5xl font-light text-[#4A5D23] mb-2 tracking-wide">{stats.availableProperties}</div>
            <div className="text-sm sm:text-base text-[#6B7C4A] font-light">Available today</div>
          </div>
        </div>
        <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg overflow-hidden border-2 border-[#D4AF37]/20 hover:shadow-xl transition-all duration-300">
          <div className="p-6 sm:p-8">
            <div className="text-3xl sm:text-4xl lg:text-5xl font-light text-[#8B4513] mb-2 tracking-wide">{stats.occupiedProperties}</div>
            <div className="text-sm sm:text-base text-[#6B7C4A] font-light">Occupied</div>
          </div>
        </div>
        <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg overflow-hidden border-2 border-[#D4AF37]/20 hover:shadow-xl transition-all duration-300">
          <div className="p-6 sm:p-8">
            <div className="text-3xl sm:text-4xl lg:text-5xl font-light text-[#2C3E1F] mb-2 tracking-wide">{stats.totalBookings}</div>
            <div className="text-sm sm:text-base text-[#6B7C4A] font-light">Total Bookings</div>
          </div>
        </div>
      </div>

      {/* Navigation Buttons */}
      <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg overflow-hidden border-2 border-[#D4AF37]/20">
        <div className="px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-12">
          <h2 className="text-xl sm:text-2xl lg:text-3xl font-light text-[#2C3E1F] mb-6 sm:mb-8 tracking-wide gold-text-gradient">Quick Navigation</h2>
          <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 justify-center">
            <button
              onClick={() => {
                const event = new CustomEvent('navigate', { detail: 'properties' })
                window.dispatchEvent(event)
              }}
              className="w-full sm:w-auto sm:min-w-[200px] h-24 sm:h-28 flex flex-col items-center justify-center bg-gradient-to-br from-[#D4AF37]/10 via-[#F4D03F]/10 to-[#D4AF37]/10 border-2 border-[#D4AF37]/30 rounded-xl sm:rounded-2xl hover:border-[#D4AF37] hover:shadow-xl transition-all duration-300 group"
            >
              <span className="text-3xl sm:text-4xl mb-2 group-hover:scale-110 transition-transform duration-300">🏠</span>
              <span className="text-base sm:text-lg font-light text-[#2C3E1F] group-hover:text-[#D4AF37] transition-colors duration-300">View Properties</span>
            </button>
            {isCustomer && (
              <button
                onClick={() => {
                  const event = new CustomEvent('navigate', { detail: 'calendar' })
                  window.dispatchEvent(event)
                }}
                className="w-full sm:w-auto sm:min-w-[200px] h-24 sm:h-28 flex flex-col items-center justify-center bg-gradient-to-br from-[#D4AF37]/10 via-[#F4D03F]/10 to-[#D4AF37]/10 border-2 border-[#D4AF37]/30 rounded-xl sm:rounded-2xl hover:border-[#D4AF37] hover:shadow-xl transition-all duration-300 group"
              >
                <span className="text-3xl sm:text-4xl mb-2 group-hover:scale-110 transition-transform duration-300">📅</span>
                <span className="text-base sm:text-lg font-light text-[#2C3E1F] group-hover:text-[#D4AF37] transition-colors duration-300">View Calendar</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ROI Section - For customers */}
      {isCustomer && propertiesWithStatus.length > 0 && (() => {
        // Get all bookings for all client properties
        const allClientBookings = propertiesWithStatus.flatMap((apt: any) => 
          (apt.bookings || []).map((b: any) => ({
            ...b,
            property_id: apt.id
          }))
        )
        return (
          <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg overflow-hidden border-2 border-[#D4AF37]/20">
            <div className="px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-12">
              <h2 className="text-xl sm:text-2xl lg:text-3xl font-light text-[#2C3E1F] mb-4 sm:mb-6 lg:mb-8 tracking-wide gold-text-gradient">
                Return on Investment (ROI)
              </h2>
              <p className="text-sm text-[#6B7C4A] font-light mb-6">
                Cumulative profit trend based on booking occupancy across all your properties
              </p>
              <div className="bg-gradient-to-b from-white to-[#FAFAFA] p-4 sm:p-6 lg:p-8 rounded-lg sm:rounded-xl lg:rounded-2xl border-2 border-[#D4AF37]/20">
                <ROITrendGraph 
                  properties={propertiesWithStatus}
                  allBookings={allClientBookings}
                />
              </div>
            </div>
          </div>
        )
      })()}

      {/* Property Detail Modal */}
      {selectedProperty && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl sm:rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border-2 border-[#D4AF37]/20">
            <PropertyDetail
              propertyId={selectedProperty}
              onClose={() => setSelectedProperty(null)}
            />
          </div>
        </div>
      )}

      {/* Custom CSS for gold text gradient */}
      <style>{`
        .gold-text-gradient {
          background: linear-gradient(135deg, #2C3E1F 0%, #4A5D23 40%, #D4AF37 60%, #F4D03F 80%, #D4AF37 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
      `}</style>
    </div>
  )
}
