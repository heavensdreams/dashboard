import { useState, useEffect } from 'react'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, parseISO } from 'date-fns'
import { getPhotoUrl, handlePhotoError } from '@/utils/photoHelpers'

interface Property {
  id: string
  name: string
  address: string
  extra_info: string
  roi_info?: string | null
  roi_chart?: string | null
  photos: string[]
  bookings: Array<{
    start_date: string
    end_date: string
  }>
  availability: Record<string, 'booked' | 'available'>
}

interface PublicPropertyViewProps {
  propertyIds: string[]
}

export function PublicPropertyView({ propertyIds }: PublicPropertyViewProps) {
  const [properties, setProperties] = useState<Property[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<{ propertyId: string; index: number } | null>(null)
  const [currentMonth, setCurrentMonth] = useState<Record<string, Date>>({})
  const [visibleProperties, setVisibleProperties] = useState<Set<string>>(new Set())
  const [menuOpen, setMenuOpen] = useState(false)
  const [expandedPropertyId, setExpandedPropertyId] = useState<string | null>(null)

  const isMultipleProperties = properties.length > 1
  const shouldShowCollapsed = isMultipleProperties
  const isSingleProperty = properties.length === 1

  useEffect(() => {
    loadProperties()
  }, [propertyIds.join(',')])

  useEffect(() => {
    // Fade-in animation for properties on initial load only
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
    // If single property, always expand it and keep it expanded
    if (properties.length === 1) {
      setExpandedPropertyId(properties[0].id)
    }
  }, [properties])

  const loadProperties = async () => {
    try {
      setLoading(true)
      setError(null)
      const idsParam = propertyIds.join(',')
      const response = await fetch(`/api/public/properties/${idsParam}`)
      
      if (!response.ok) {
        throw new Error('Failed to load properties')
      }
      
      const data = await response.json()
      setProperties(data.properties || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load properties')
    } finally {
      setLoading(false)
    }
  }

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

  const scrollToROI = (propertyId: string) => {
    const element = document.getElementById(`roi-${propertyId}`)
    if (element) {
      // If property is collapsed, expand it first
      if (expandedPropertyId !== propertyId) {
        setExpandedPropertyId(propertyId)
        setTimeout(() => {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }, 300)
      } else {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#FAFAFA] via-[#FFF8E7] to-white flex items-center justify-center px-4">
        <div className="text-center">
          <div className="relative w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-4 sm:mb-6">
            <div className="absolute inset-0 border-3 sm:border-4 border-[#D4AF37]/20 rounded-full"></div>
            <div className="absolute inset-0 border-3 sm:border-4 border-[#D4AF37] border-t-transparent rounded-full animate-spin"></div>
          </div>
          <p className="text-[#4A5D23] font-light text-base sm:text-lg tracking-wide">Loading properties...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#FAFAFA] via-[#FFF8E7] to-white flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="text-5xl sm:text-6xl mb-3 sm:mb-4">⚠️</div>
          <h1 className="text-2xl sm:text-3xl font-light text-[#2C3E1F] mb-2 sm:mb-3 tracking-wide">Error</h1>
          <p className="text-[#6B7C4A] font-light text-base sm:text-lg">{error}</p>
        </div>
      </div>
    )
  }

  if (properties.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#FAFAFA] via-[#FFF8E7] to-white flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <h1 className="text-2xl sm:text-3xl font-light text-[#2C3E1F] mb-2 sm:mb-3 tracking-wide">No Properties Found</h1>
          <p className="text-[#6B7C4A] font-light text-base sm:text-lg">The requested properties could not be found.</p>
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
                  alt={property.name}
                  className="w-full h-full object-cover"
                    onError={(e) => handlePhotoError(e, property.photos[0])}
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

    // Expanded view
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
                  {/* Left: Name and Address */}
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
                  {/* Right: Description */}
                  {property.extra_info && (
                    <div className="flex items-start pt-2 sm:pt-0">
                      <p className="text-xs sm:text-sm lg:text-base xl:text-lg text-[#4A5D23] leading-relaxed sm:leading-loose whitespace-pre-wrap font-light">{property.extra_info}</p>
                    </div>
                  )}
                </div>
              </div>
              {/* Only show collapse button for multiple properties */}
              {shouldShowCollapsed && !isSingleProperty && (
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
              {property.photos.map((photo, index) => (
                <div
                  key={index}
                  className="relative aspect-[4/3] overflow-hidden cursor-pointer group rounded-lg sm:rounded-xl shadow-lg hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2 hover:scale-[1.02] border-2 border-transparent hover:border-[#D4AF37]/50 active:scale-95"
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
                  <div className="absolute top-2 right-2 sm:top-3 sm:right-3 bg-gradient-to-br from-[#D4AF37] to-[#F4D03F] text-white text-xs font-semibold px-2 py-1 sm:px-3 sm:py-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 shadow-lg">
                    View
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

        {/* ROI Section */}
        {(property.roi_info || property.roi_chart) && (
          <div className="px-3 sm:px-4 lg:px-12 py-6 sm:py-8 lg:py-12 border-t-2 border-[#D4AF37]/20 bg-gradient-to-b from-white to-[#FAFAFA]" id={`roi-${property.id}`}>
            <h3 className="text-xl sm:text-2xl lg:text-3xl font-light text-[#2C3E1F] mb-4 sm:mb-6 lg:mb-8 tracking-wide gold-text-gradient">Return on Investment (ROI)</h3>
            <div className="bg-white p-4 sm:p-6 lg:p-8 rounded-lg sm:rounded-xl lg:rounded-2xl shadow-lg border-2 border-[#D4AF37]/20 space-y-6">
              {property.roi_chart && (
                <div className="w-full">
                  <img
                    src={getPhotoUrl(property.roi_chart)}
                    alt="ROI Chart"
                    className="w-full h-auto rounded-lg shadow-md"
                    onError={(e) => handlePhotoError(e, property.roi_chart || '')}
                  />
                </div>
              )}
              {property.roi_info && (
                <div className="prose prose-sm sm:prose-base lg:prose-lg max-w-none">
                  <p className="text-sm sm:text-base lg:text-lg text-[#4A5D23] leading-relaxed sm:leading-loose whitespace-pre-wrap font-light">
                    {property.roi_info}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#FAFAFA] via-[#FFF8E7] to-white">
      {/* Header with Logo */}
      <header className="bg-white/95 backdrop-blur-md border-b-2 border-[#D4AF37]/30 sticky top-0 z-40 shadow-lg">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-3 sm:py-4 lg:py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-3 lg:gap-4">
              {/* Logo */}
              <div className="flex items-center gap-2 sm:gap-3">
                <img 
                  src="https://framerusercontent.com/images/SYXEfWLXQTVuo97yIbacWB2oOIw.png?width=581&height=440" 
                  alt="Heaven's Dreams Logo" 
                  className="h-8 sm:h-10 lg:h-14 w-auto object-contain"
                />
                <div className="hidden sm:block">
                  <h1 className="text-lg sm:text-xl lg:text-2xl font-light text-[#2C3E1F] tracking-wide">Heaven's Dreams</h1>
                  <p className="text-xs text-[#6B7C4A] font-light">Luxury Holiday Homes</p>
                </div>
              </div>
            </div>
            <div className="hidden lg:flex items-center gap-6 text-sm text-[#6B7C4A] font-light">
              {isSingleProperty ? (
                // For single property, show only ROI link if available
                (() => {
                  const propertyWithROI = properties.find(p => p.roi_info || p.roi_chart)
                  if (propertyWithROI) {
                    return (
                      <a 
                        href="#roi" 
                        onClick={(e) => {
                          e.preventDefault()
                          scrollToROI(propertyWithROI.id)
                        }}
                        className="hover:text-[#D4AF37] transition-colors duration-300 relative group"
                      >
                        ROI
                        <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-[#D4AF37] to-[#F4D03F] group-hover:w-full transition-all duration-300"></span>
                      </a>
                    )
                  }
                  return null
                })()
              ) : (
                // For multiple properties, show all navigation links
                <>
                  <a href="#properties" className="hover:text-[#D4AF37] transition-colors duration-300 relative group">
                    Properties
                    <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-[#D4AF37] to-[#F4D03F] group-hover:w-full transition-all duration-300"></span>
                  </a>
                  <a href="#availability" className="hover:text-[#D4AF37] transition-colors duration-300 relative group">
                    Availability
                    <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-[#D4AF37] to-[#F4D03F] group-hover:w-full transition-all duration-300"></span>
                  </a>
                  <a 
                    href="#roi" 
                    onClick={(e) => {
                      e.preventDefault()
                      const propertyWithROI = properties.find(p => p.roi_info || p.roi_chart)
                      if (propertyWithROI) {
                        scrollToROI(propertyWithROI.id)
                      }
                    }}
                    className="hover:text-[#D4AF37] transition-colors duration-300 relative group"
                  >
                    ROI
                    <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-[#D4AF37] to-[#F4D03F] group-hover:w-full transition-all duration-300"></span>
                  </a>
                  <a 
                    href="#contact" 
                    onClick={(e) => {
                      e.preventDefault()
                      document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' })
                    }}
                    className="hover:text-[#D4AF37] transition-colors duration-300 relative group"
                  >
                    Contact
                    <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-[#D4AF37] to-[#F4D03F] group-hover:w-full transition-all duration-300"></span>
                  </a>
                </>
              )}
            </div>
            {/* Menu Button - Only visible on mobile/tablet */}
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="lg:hidden p-2 text-[#6B7C4A] hover:text-[#D4AF37] transition-colors touch-manipulation"
              aria-label="Menu"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {menuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* Slide-out Menu - Only on mobile/tablet */}
      <div
        className={`fixed top-0 right-0 h-full w-64 sm:w-80 bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out lg:hidden ${
          menuOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="p-6 border-b-2 border-[#D4AF37]/30">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-light text-[#2C3E1F] tracking-wide">Menu</h2>
            <button
              onClick={() => setMenuOpen(false)}
              className="p-2 text-[#6B7C4A] hover:text-[#D4AF37] transition-colors"
              aria-label="Close menu"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
        <nav className="p-6 space-y-4">
          {isSingleProperty ? (
            // For single property, show only ROI link if available
            (() => {
              const propertyWithROI = properties.find(p => p.roi_info || p.roi_chart)
              if (propertyWithROI) {
                return (
                  <a
                    href="#roi"
                    onClick={() => {
                      setMenuOpen(false)
                      setTimeout(() => {
                        scrollToROI(propertyWithROI.id)
                      }, 100)
                    }}
                    className="block text-lg font-light text-[#2C3E1F] hover:text-[#D4AF37] transition-colors duration-300 py-2 border-b border-[#E8E8E8]"
                  >
                    ROI
                  </a>
                )
              }
              return null
            })()
          ) : (
            // For multiple properties, show all navigation links
            <>
              <a
                href="#properties"
                onClick={() => {
                  setMenuOpen(false)
                  setTimeout(() => {
                    document.getElementById('properties')?.scrollIntoView({ behavior: 'smooth' })
                  }, 100)
                }}
                className="block text-lg font-light text-[#2C3E1F] hover:text-[#D4AF37] transition-colors duration-300 py-2 border-b border-[#E8E8E8]"
              >
                Properties
              </a>
              <a
                href="#availability"
                onClick={() => {
                  setMenuOpen(false)
                  setTimeout(() => {
                    document.getElementById('availability')?.scrollIntoView({ behavior: 'smooth' })
                  }, 100)
                }}
                className="block text-lg font-light text-[#2C3E1F] hover:text-[#D4AF37] transition-colors duration-300 py-2 border-b border-[#E8E8E8]"
              >
                Availability
              </a>
              <a
                href="#roi"
                onClick={() => {
                  setMenuOpen(false)
                  setTimeout(() => {
                    const propertyWithROI = properties.find(p => p.roi_info || p.roi_chart)
                    if (propertyWithROI) {
                      scrollToROI(propertyWithROI.id)
                    }
                  }, 100)
                }}
                className="block text-lg font-light text-[#2C3E1F] hover:text-[#D4AF37] transition-colors duration-300 py-2 border-b border-[#E8E8E8]"
              >
                ROI
              </a>
              <a
                href="#contact"
                onClick={() => {
                  setMenuOpen(false)
                  setTimeout(() => {
                    document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' })
                  }, 100)
                }}
                className="block text-lg font-light text-[#2C3E1F] hover:text-[#D4AF37] transition-colors duration-300 py-2 border-b border-[#E8E8E8]"
              >
                Contact
              </a>
            </>
          )}
        </nav>
      </div>
      {/* Menu Overlay - Only on mobile/tablet */}
      {menuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setMenuOpen(false)}
        ></div>
      )}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-6 sm:py-8 lg:py-16" id="properties">
        {properties.map((property) => renderPropertyCard(property, expandedPropertyId === property.id))}
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
                alt={`${property.name} - Photo ${selectedPhotoIndex.index + 1}`}
                className="max-w-full max-h-full object-contain animate-scale-in"
                onClick={(e) => e.stopPropagation()}
                onError={(e) => handlePhotoError(e, property.photos[selectedPhotoIndex.index])}
              />
            )
          })()}
        </div>
      )}

      {/* Footer with Gold Background */}
      <footer id="contact" className="bg-gradient-to-br from-[#D4AF37] via-[#F4D03F] to-[#D4AF37] mt-8 sm:mt-12 lg:mt-16 xl:mt-20 border-t-4 border-[#B8941F] shadow-2xl">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-6 sm:py-8 lg:py-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 lg:gap-8 mb-4 sm:mb-6 lg:mb-8">
            <div>
              <h4 className="text-base sm:text-lg lg:text-xl font-light mb-2 sm:mb-3 lg:mb-4 tracking-wide text-[#2C3E1F]">Heaven's Dreams</h4>
              <p className="text-[#2C3E1F]/80 font-light text-xs sm:text-sm leading-relaxed">
                Luxury holiday homes in Dubai's most prestigious locations. Experience elegance and comfort.
              </p>
            </div>
            <div>
              <h4 className="text-base sm:text-lg lg:text-xl font-light mb-2 sm:mb-3 lg:mb-4 tracking-wide text-[#2C3E1F]">Contact</h4>
              <p className="text-[#2C3E1F]/80 font-light text-xs sm:text-sm leading-relaxed">
                Office: 1010 Bayswater Tower<br />
                Marasi Dr - Business Bay - Dubai
              </p>
              <p className="text-[#2C3E1F]/80 font-light text-xs sm:text-sm mt-2">
                <a href="mailto:info@heavensdream.com" className="hover:text-[#1A2414] transition-colors duration-300 font-medium break-all">
                  info@heavensdream.com
                </a>
              </p>
            </div>
            <div>
              <h4 className="text-base sm:text-lg lg:text-xl font-light mb-2 sm:mb-3 lg:mb-4 tracking-wide text-[#2C3E1F]">Follow Us</h4>
              <p className="text-[#2C3E1F]/80 font-light text-xs sm:text-sm">
                Instagram: <a href="https://instagram.com/_heavensdreams" target="_blank" rel="noopener noreferrer" className="hover:text-[#1A2414] transition-colors duration-300 font-medium">@_heavensdreams</a>
              </p>
            </div>
          </div>
          <div className="border-t border-[#B8941F]/50 pt-4 sm:pt-6 lg:pt-8">
            <p className="text-center text-[#2C3E1F]/70 text-xs sm:text-sm font-light px-2">
              © {new Date().getFullYear()} HEAVENS DREAMS HOLIDAY HOMES RENTAL L.L.C. All Rights Reserved.
            </p>
          </div>
        </div>
      </footer>

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
