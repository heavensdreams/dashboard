import { useState, useEffect, useMemo } from 'react'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, parseISO } from 'date-fns'
import { useDataStore } from '@/stores/dataStore'
import { useUserStore } from '@/stores/userStore'
import { filterBookingsForCustomer } from '@/utils/filtering'
import { getPhotoUrl, handlePhotoError } from '@/utils/photoHelpers'
import { ROITrendGraph } from '@/components/ROITrendGraph/ROITrendGraph'

interface Property {
  id: string
  name: string
  address: string
  extra_info: string
  photos: string[]
  bookings: Array<{
    start_date: string
    end_date: string
  }>
  availability: Record<string, 'booked' | 'available'>
}

export function CustomerPropertiesView() {
  const apartments = useDataStore(state => state.apartments)
  const groups = useDataStore(state => state.groups)
  const userGroups = useDataStore(state => state.user_groups || [])
  const { currentUser } = useUserStore()
  
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<{ propertyId: string; index: number } | null>(null)
  const [currentMonth, setCurrentMonth] = useState<Record<string, Date>>({})
  const [visibleProperties, setVisibleProperties] = useState<Set<string>>(new Set())
  const [expandedPropertyId, setExpandedPropertyId] = useState<string | null>(null)

  // Get customer's group name
  const customerGroupName = useMemo(() => {
    if (!currentUser?.id) return null
    const userGroup = userGroups.find((ug: any) => ug.user_id === currentUser.id)
    if (!userGroup) return null
    const group = groups.find((g: any) => g.id === userGroup.group_id)
    return group?.name || null
  }, [currentUser?.id, userGroups, groups])

  // Filter apartments by customer email (direct assignment) OR customer group name
  // IMPORTANT: This must match Dashboard filtering logic exactly
  const properties = useMemo(() => {
    if (!currentUser?.email) {
      return []
    }
    
    let filtered = apartments.filter(apt => {
      if (!apt.groups || apt.groups.length === 0) return false
      // Check if property is assigned directly to customer's email
      if (apt.groups.includes(currentUser.email)) return true
      // Check if property is assigned to customer's group (if they have one)
      if (customerGroupName && apt.groups.includes(customerGroupName)) return true
      return false
    })
    
    return filtered.map((apartment: any) => {
      // Filter bookings for customer (remove personal info)
      let apartmentBookings = apartment.bookings || []
      apartmentBookings = filterBookingsForCustomer(apartmentBookings)
      
      // Build availability map
      const availability: Record<string, 'booked' | 'available'> = {}
      apartmentBookings.forEach((booking: any) => {
        const start = new Date(booking.start_date)
        const end = new Date(booking.end_date)
        const days = eachDayOfInterval({ start, end })
        days.forEach(day => {
          availability[day.toISOString().split('T')[0]] = 'booked'
        })
      })
      
      return {
        id: apartment.id,
        name: apartment.name,
        address: apartment.address,
        extra_info: apartment.extra_info || '',
        photos: apartment.photos || [],
        bookings: apartmentBookings.map((b: any) => ({
          start_date: b.start_date,
          end_date: b.end_date
        })),
        availability
      } as Property
    })
  }, [apartments, customerGroupName, currentUser?.email])

  const isMultipleProperties = properties.length > 1
  const shouldShowCollapsed = isMultipleProperties

  useEffect(() => {
    // Fade-in animation for properties on initial load
    properties.forEach((prop, index) => {
      setTimeout(() => {
        setVisibleProperties(prev => new Set([...prev, prop.id]))
      }, index * 200)
    })
    // Initialize current month for each property
    const months: Record<string, Date> = {}
    properties.forEach(prop => {
      months[prop.id] = new Date()
    })
    setCurrentMonth(months)
    // If single property, expand it by default
    if (properties.length === 1) {
      setExpandedPropertyId(properties[0].id)
    }
  }, [properties])


  const getDateStatus = (date: Date, property: Property): 'booked' | 'available' => {
    const dateStr = date.toISOString().split('T')[0]
    return property.availability[dateStr] || 'available'
  }

  const formatBookingDate = (dateStr: string) => {
    try {
      return format(parseISO(dateStr), 'MMM d, yyyy')
    } catch {
      return dateStr
    }
  }

  const handlePropertyClick = (propertyId: string) => {
    if (expandedPropertyId === propertyId) {
      setExpandedPropertyId(null)
    } else {
      setExpandedPropertyId(propertyId)
    }
  }

  const getNextBooking = (property: Property) => {
    const now = new Date()
    const upcoming = property.bookings
      .filter(b => new Date(b.end_date) >= now)
      .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime())
    return upcoming[0] || null
  }

  if (properties.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#FAFAFA] via-[#FFF8E7] to-white flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <h1 className="text-2xl sm:text-3xl font-light text-[#2C3E1F] mb-2 sm:mb-3 tracking-wide">No Properties Found</h1>
          <p className="text-[#6B7C4A] font-light text-base sm:text-lg">No properties are available in your assigned group.</p>
        </div>
      </div>
    )
  }

  const renderPropertyCard = (property: Property, isExpanded: boolean) => {
    const nextBooking = getNextBooking(property)
    const isCollapsed = shouldShowCollapsed && !isExpanded

    if (isCollapsed) {
      // Collapsed card view
      return (
        <div
          key={property.id}
          className={`bg-white mb-4 sm:mb-6 rounded-xl sm:rounded-2xl shadow-lg overflow-hidden border-2 border-[#D4AF37]/20 transition-all duration-300 hover:shadow-xl cursor-pointer ${
            visibleProperties.has(property.id) ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
          onClick={() => handlePropertyClick(property.id)}
        >
          <div className="flex flex-col sm:flex-row">
            {/* Photo */}
            {property.photos.length > 0 && (
              <div className="w-full sm:w-64 lg:w-80 h-48 sm:h-auto sm:min-h-[200px] flex-shrink-0">
                <img
                  src={getPhotoUrl(property.photos[0])}
                  onError={(e) => handlePhotoError(e, property.photos[0])}
                  alt={property.name}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            {/* Info */}
            <div className="flex-1 p-4 sm:p-6 flex flex-col justify-between">
              <div>
                <h2 className="text-xl sm:text-2xl lg:text-3xl font-light text-[#2C3E1F] mb-2 tracking-wide">{property.name}</h2>
                <div className="flex items-start gap-2 mb-3">
                  <svg className="w-4 h-4 text-[#D4AF37] flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <p className="text-sm sm:text-base text-[#6B7C4A] font-light">{property.address}</p>
                </div>
              </div>
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-[#D4AF37]/20">
                {nextBooking ? (
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-gradient-to-br from-[#D4AF37] to-[#F4D03F]"></div>
                    <span className="text-sm text-[#4A5D23] font-light">
                      Next: {formatBookingDate(nextBooking.start_date)} - {formatBookingDate(nextBooking.end_date)}
                    </span>
                  </div>
                ) : (
                  <span className="text-sm text-[#6B7C4A] font-light">Available</span>
                )}
                <div className="flex items-center gap-2 text-[#D4AF37]">
                  <span className="text-sm font-light">Click to expand</span>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>
      )
    }

    // Expanded view - reuse the full expanded card from PublicPropertyView
    return (
      <div
        key={property.id}
        className={`bg-white mb-8 sm:mb-12 lg:mb-20 rounded-xl sm:rounded-2xl lg:rounded-3xl shadow-2xl overflow-hidden border-2 border-[#D4AF37]/20 transition-all duration-700 hover:shadow-[0_20px_60px_rgba(212,175,55,0.3)] ${
          visibleProperties.has(property.id) ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
        }`}
      >
        {/* Property Header with Gold Accent */}
        <div className="bg-gradient-to-r from-[#4A5D23]/10 via-[#D4AF37]/10 to-[#8B7355]/10 px-3 sm:px-4 lg:px-12 py-6 sm:py-8 lg:py-14 border-b-2 border-[#D4AF37]/30 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 sm:w-32 sm:h-32 lg:w-64 lg:h-64 bg-gradient-to-br from-[#D4AF37]/10 to-transparent rounded-full blur-3xl"></div>
          <div className="relative z-10">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 lg:gap-8">
                  <div>
                    <h2 className="text-xl sm:text-3xl lg:text-5xl xl:text-6xl font-light text-[#2C3E1F] mb-3 sm:mb-4 lg:mb-6 tracking-wide gold-text-gradient leading-tight">{property.name}</h2>
                    <div className="flex items-start gap-2 sm:gap-3">
                      <svg className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-[#D4AF37] flex-shrink-0 drop-shadow-lg mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <p className="text-xs sm:text-base lg:text-lg text-[#6B7C4A] font-light leading-relaxed">{property.address}</p>
                    </div>
                  </div>
                  {property.extra_info && (
                    <div className="flex items-start pt-2 sm:pt-0">
                      <p className="text-xs sm:text-sm lg:text-base xl:text-lg text-[#4A5D23] leading-relaxed sm:leading-loose whitespace-pre-wrap font-light">{property.extra_info}</p>
                    </div>
                  )}
                </div>
              </div>
              {shouldShowCollapsed && (
                <button
                  onClick={() => handlePropertyClick(property.id)}
                  className="ml-4 p-2 hover:bg-[#D4AF37]/10 rounded-full transition-colors touch-manipulation"
                  aria-label="Collapse"
                >
                  <svg className="w-6 h-6 text-[#D4AF37]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Photo Gallery */}
        {property.photos.length > 0 && (
          <div className="px-3 sm:px-4 lg:px-12 py-6 sm:py-8 lg:py-12 bg-gradient-to-b from-white to-[#FAFAFA]">
            <h3 className="text-xl sm:text-2xl lg:text-3xl font-light text-[#2C3E1F] mb-4 sm:mb-6 lg:mb-10 tracking-wide gold-text-gradient">Gallery</h3>
            <div className="flex gap-3 sm:gap-4 lg:gap-6 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-[#D4AF37] scrollbar-track-gray-200" style={{ scrollbarWidth: 'thin', scrollbarColor: '#D4AF37 #f3f4f6' }}>
              {property.photos.map((photo, index) => (
                <div
                  key={index}
                  className="relative flex-shrink-0 w-64 sm:w-80 lg:w-96 aspect-[4/3] overflow-hidden cursor-pointer group rounded-lg sm:rounded-xl shadow-lg hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2 hover:scale-[1.02] border-2 border-transparent hover:border-[#D4AF37]/50 active:scale-95"
                  onClick={() => setSelectedPhotoIndex({ propertyId: property.id, index })}
                >
                  <img
                    src={getPhotoUrl(photo)}
                    alt={`${property.name} - Photo ${index + 1}`}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    onError={(e) => handlePhotoError(e, photo)}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <div className="bg-gradient-to-br from-[#D4AF37] to-[#F4D03F] rounded-full p-3 sm:p-4 lg:p-5 transform scale-75 group-hover:scale-100 transition-transform duration-300 shadow-2xl">
                      <svg className="w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                      </svg>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Bookings List */}
        {property.bookings.length > 0 && (
          <div className="px-3 sm:px-4 lg:px-12 py-6 sm:py-8 lg:py-12 border-t-2 border-[#D4AF37]/20 bg-white">
            <h3 className="text-xl sm:text-2xl lg:text-3xl font-light text-[#2C3E1F] mb-4 sm:mb-6 lg:mb-10 tracking-wide gold-text-gradient">Booking Schedule</h3>
            <div className="space-y-2 sm:space-y-3 lg:space-y-4">
              {property.bookings.map((booking, index) => {
                const startDate = parseISO(booking.start_date)
                const endDate = parseISO(booking.end_date)
                const isPast = endDate < new Date()
                const isCurrent = startDate <= new Date() && endDate >= new Date()
                
                return (
                  <div
                    key={index}
                    className={`p-3 sm:p-4 lg:p-6 rounded-lg sm:rounded-xl border-2 transition-all duration-300 hover:shadow-xl transform hover:-translate-y-1 ${
                      isPast
                        ? 'bg-gradient-to-r from-[#F5F5F5] to-[#F0F0F0] border-[#E0E0E0] opacity-60'
                        : isCurrent
                        ? 'bg-gradient-to-r from-[#FFF8E7] via-[#FFF4D6] to-[#FFF8E7] border-[#D4AF37] shadow-lg ring-2 ring-[#D4AF37]/30'
                        : 'bg-gradient-to-r from-[#E8F0E0] via-[#F0F8E8] to-[#E8F0E0] border-[#D4E0C8]'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3 lg:gap-4">
                      <div className="flex items-center gap-2 sm:gap-3 lg:gap-4">
                        <div className={`w-3 h-3 sm:w-4 sm:h-4 rounded-full shadow-lg flex-shrink-0 ${
                          isPast ? 'bg-gray-400' : isCurrent ? 'bg-gradient-to-br from-[#D4AF37] to-[#F4D03F]' : 'bg-[#4A5D23]'
                        }`}></div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm sm:text-base lg:text-lg font-light text-[#2C3E1F] break-words">
                            {formatBookingDate(booking.start_date)} - {formatBookingDate(booking.end_date)}
                          </p>
                          <p className={`text-xs sm:text-sm font-light ${
                            isPast ? 'text-gray-500' : isCurrent ? 'text-[#D4AF37] font-medium' : 'text-[#6B7C4A]'
                          }`}>
                            {isPast ? 'Past booking' : isCurrent ? 'Currently booked' : 'Upcoming booking'}
                          </p>
                        </div>
                      </div>
                      <div className={`px-3 py-1.5 sm:px-4 sm:py-2 lg:px-5 lg:py-2 rounded-full text-xs sm:text-sm font-medium shadow-md flex-shrink-0 ${
                        isPast
                          ? 'bg-gray-200 text-gray-600'
                          : isCurrent
                          ? 'bg-gradient-to-r from-[#D4AF37] to-[#F4D03F] text-white'
                          : 'bg-[#4A5D23] text-white'
                      }`}>
                        {isPast ? 'Completed' : isCurrent ? 'Active' : 'Scheduled'}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Availability Calendar */}
        <div className="px-3 sm:px-4 lg:px-12 py-6 sm:py-8 lg:py-12 border-t-2 border-[#D4AF37]/20 bg-gradient-to-b from-[#FAFAFA] to-white" id="availability">
          <h3 className="text-xl sm:text-2xl lg:text-3xl font-light text-[#2C3E1F] mb-4 sm:mb-6 lg:mb-10 tracking-wide gold-text-gradient">Availability Calendar</h3>
          <div className="bg-white p-3 sm:p-4 lg:p-8 rounded-lg sm:rounded-xl lg:rounded-2xl shadow-xl border-2 border-[#D4AF37]/20 overflow-x-auto">
            <div className="flex items-center justify-between mb-4 sm:mb-6 lg:mb-8 min-w-[280px]">
              <button
                onClick={() => {
                  const newMonth = new Date(currentMonth[property.id] || new Date())
                  newMonth.setMonth(newMonth.getMonth() - 1)
                  setCurrentMonth({ ...currentMonth, [property.id]: newMonth })
                }}
                className="p-2 sm:p-3 hover:bg-gradient-to-br hover:from-[#D4AF37]/10 hover:to-[#F4D03F]/10 rounded-full transition-all duration-200 hover:scale-110 hover:shadow-lg active:scale-95 touch-manipulation min-w-[44px] min-h-[44px] flex items-center justify-center"
                aria-label="Previous month"
              >
                <svg className="w-5 h-5 sm:w-6 sm:h-6 text-[#D4AF37]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <h4 className="text-base sm:text-lg lg:text-xl xl:text-2xl font-light text-[#2C3E1F] tracking-wide gold-text-gradient px-2">
                {format(currentMonth[property.id] || new Date(), 'MMMM yyyy')}
              </h4>
              <button
                onClick={() => {
                  const newMonth = new Date(currentMonth[property.id] || new Date())
                  newMonth.setMonth(newMonth.getMonth() + 1)
                  setCurrentMonth({ ...currentMonth, [property.id]: newMonth })
                }}
                className="p-2 sm:p-3 hover:bg-gradient-to-br hover:from-[#D4AF37]/10 hover:to-[#F4D03F]/10 rounded-full transition-all duration-200 hover:scale-110 hover:shadow-lg active:scale-95 touch-manipulation min-w-[44px] min-h-[44px] flex items-center justify-center"
                aria-label="Next month"
              >
                <svg className="w-5 h-5 sm:w-6 sm:h-6 text-[#D4AF37]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-1 sm:gap-1.5 lg:gap-2 mb-2 sm:mb-3 min-w-[280px]">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="text-center text-xs sm:text-sm font-light text-[#6B7C4A] py-1.5 sm:py-2 lg:py-3">
                  <span className="hidden sm:inline">{day}</span>
                  <span className="sm:hidden">{day.substring(0, 1)}</span>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1 sm:gap-1.5 lg:gap-2 min-w-[280px]">
              {(() => {
                const month = currentMonth[property.id] || new Date()
                const monthStart = startOfMonth(month)
                const monthEnd = endOfMonth(month)
                const days = eachDayOfInterval({ start: monthStart, end: monthEnd })
                const firstDayOfWeek = monthStart.getDay()
                const emptyDays = Array(firstDayOfWeek).fill(null)

                return [
                  ...emptyDays.map((_, i) => <div key={`empty-${i}`} className="aspect-square"></div>),
                  ...days.map(day => {
                    const status = getDateStatus(day, property)
                    const isToday = isSameDay(day, new Date())
                    const isBooked = status === 'booked'

                    return (
                      <div
                        key={day.toISOString()}
                        className={`
                          aspect-square flex items-center justify-center text-xs sm:text-sm font-light rounded sm:rounded-md lg:rounded-lg
                          transition-all duration-200 hover:scale-110 cursor-pointer touch-manipulation min-h-[36px] sm:min-h-[40px]
                          ${isBooked 
                            ? 'bg-gradient-to-br from-[#D4AF37] via-[#F4D03F] to-[#D4AF37] text-white shadow-lg hover:shadow-xl' 
                            : 'bg-[#E8F0E0] text-[#4A5D23] border-2 border-[#D4E0C8] hover:border-[#D4AF37] hover:bg-[#F0F8E8]'
                          }
                          ${isToday ? 'ring-2 sm:ring-3 lg:ring-4 ring-[#D4AF37] ring-offset-1 sm:ring-offset-2 shadow-xl scale-105 sm:scale-110' : ''}
                        `}
                        title={isBooked ? 'Booked' : 'Available'}
                      >
                        {format(day, 'd')}
                      </div>
                    )
                  })
                ]
              })()}
            </div>

            {/* Legend */}
            <div className="flex items-center justify-center gap-3 sm:gap-4 lg:gap-8 mt-4 sm:mt-6 lg:mt-8 pt-4 sm:pt-6 lg:pt-8 border-t-2 border-[#D4AF37]/20">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5 bg-[#E8F0E0] border-2 border-[#D4E0C8] rounded"></div>
                <span className="text-xs sm:text-sm text-[#4A5D23] font-light">Available</span>
              </div>
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5 bg-gradient-to-br from-[#D4AF37] to-[#F4D03F] rounded shadow-md"></div>
                <span className="text-xs sm:text-sm text-[#4A5D23] font-light">Booked</span>
              </div>
            </div>
          </div>
        </div>

      </div>
    )
  }

  const scrollToROI = () => {
    const element = document.getElementById('roi-section')
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#FAFAFA] via-[#FFF8E7] to-white">
      {/* Navigation Bar */}
      {properties.length > 0 && (
        <div className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b-2 border-[#D4AF37]/20 shadow-sm">
          <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-3 sm:py-4">
            <nav className="flex items-center justify-center gap-4 sm:gap-6 lg:gap-8">
              <a
                href="#properties"
                onClick={(e) => {
                  e.preventDefault()
                  window.scrollTo({ top: 0, behavior: 'smooth' })
                }}
                className="text-sm sm:text-base text-[#6B7C4A] font-light hover:text-[#D4AF37] transition-colors duration-300 relative group"
              >
                Properties
                <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-[#D4AF37] to-[#F4D03F] group-hover:w-full transition-all duration-300"></span>
              </a>
              <a
                href="#roi"
                onClick={(e) => {
                  e.preventDefault()
                  scrollToROI()
                }}
                className="text-sm sm:text-base text-[#6B7C4A] font-light hover:text-[#D4AF37] transition-colors duration-300 relative group"
              >
                ROI
                <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-[#D4AF37] to-[#F4D03F] group-hover:w-full transition-all duration-300"></span>
              </a>
            </nav>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-6 sm:py-8 lg:py-16">
        {properties.map((property) => renderPropertyCard(property, expandedPropertyId === property.id))}
        
        {/* ROI Section - Once per customer, showing trend for all their properties */}
        {properties.length > 0 && (
          <div id="roi-section" className="px-3 sm:px-4 lg:px-12 py-6 sm:py-8 lg:py-12 border-t-2 border-[#D4AF37]/20 bg-gradient-to-b from-white to-[#FAFAFA] mt-8 sm:mt-12 lg:mt-20">
            <h3 className="text-xl sm:text-2xl lg:text-3xl font-light text-[#2C3E1F] mb-4 sm:mb-6 lg:mb-8 tracking-wide gold-text-gradient">Return on Investment (ROI)</h3>
            <div className="bg-white p-4 sm:p-6 lg:p-8 rounded-lg sm:rounded-xl lg:rounded-2xl shadow-lg border-2 border-[#D4AF37]/20">
              {/* ROI Trend Graph - Calculated for all client properties */}
              {(() => {
                // Get all bookings for all client properties (from original apartments data)
                const clientApartmentIds = properties.map(p => p.id)
                const clientApartments = apartments.filter((a: any) => 
                  clientApartmentIds.includes(a.id)
                )
                const allClientBookings = clientApartments.flatMap((apt: any) => 
                  (apt.bookings || []).map((b: any) => ({
                    ...b,
                    property_id: apt.id
                  }))
                )
                return (
                  <div className="w-full">
                    <ROITrendGraph 
                      properties={clientApartments}
                      allBookings={allClientBookings}
                    />
                  </div>
                )
              })()}
            </div>
          </div>
        )}
      </main>

      {/* Photo Lightbox Modal */}
      {selectedPhotoIndex && (
        <div
          className="fixed inset-0 bg-black/95 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 animate-fade-in"
          onClick={() => setSelectedPhotoIndex(null)}
        >
          <button
            className="absolute top-3 right-3 sm:top-4 sm:right-4 lg:top-6 lg:right-6 text-white hover:text-[#D4AF37] transition-colors z-10 p-2 sm:p-3 hover:bg-white/10 rounded-full hover:scale-110 active:scale-95 touch-manipulation min-w-[44px] min-h-[44px] flex items-center justify-center"
            onClick={() => setSelectedPhotoIndex(null)}
            aria-label="Close"
          >
            <svg className="w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          {(() => {
            const property = properties.find(p => p.id === selectedPhotoIndex.propertyId)
            if (!property || !property.photos[selectedPhotoIndex.index]) return null
            return (
              <img
                src={getPhotoUrl(property.photos[selectedPhotoIndex.index])}
                onError={(e) => handlePhotoError(e, property.photos[selectedPhotoIndex.index])}
                alt={`${property.name} - Photo ${selectedPhotoIndex.index + 1}`}
                className="max-w-full max-h-full object-contain animate-scale-in"
                onClick={(e) => e.stopPropagation()}
              />
            )
          })()}
        </div>
      )}

      {/* Custom CSS for animations and gold effects */}
      <style>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes scale-in {
          from {
            opacity: 0;
            transform: scale(0.9);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        .animate-fade-in {
          animation: fade-in 0.6s ease-out;
        }
        .animate-scale-in {
          animation: scale-in 0.4s ease-out;
        }
        .gold-text-gradient {
          background: linear-gradient(135deg, #2C3E1F 0%, #4A5D23 40%, #D4AF37 60%, #F4D03F 80%, #D4AF37 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .touch-manipulation {
          touch-action: manipulation;
        }
        @media (max-width: 640px) {
          .gold-text-gradient {
            font-size: 1.5rem;
          }
        }
      `}</style>
    </div>
  )
}
