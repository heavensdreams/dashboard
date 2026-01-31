import { useState, useMemo } from 'react'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { useDataStore } from '@/stores/dataStore'
import { useUserStore } from '@/stores/userStore'
import { logChange } from '@/utils/logging'
import { format } from 'date-fns'

interface EnrichedBooking {
  id: string
  property_id: string
  user_id: string
  start_date: string
  end_date: string
  client_name?: string
  extra_info?: string
  property_name?: string
  user_email?: string
}

interface DateBookingModalProps {
  isOpen: boolean
  onClose: () => void
  date: Date
  bookings: EnrichedBooking[]
  apartments: any[]
  allApartments?: any[]
  hasActiveFilter?: boolean
}

export function DateBookingModal({ isOpen, onClose, date, bookings, apartments, allApartments, hasActiveFilter }: DateBookingModalProps) {
  const updateData = useDataStore(state => state.updateData)
  const { currentUser } = useUserStore()
  
  const [editingBooking, setEditingBooking] = useState<EnrichedBooking | null>(null)
  const [editStartDate, setEditStartDate] = useState('')
  const [editEndDate, setEditEndDate] = useState('')
  const [editClientName, setEditClientName] = useState('')
  const [editExtraInfo, setEditExtraInfo] = useState('')
  const [editPropertyId, setEditPropertyId] = useState('')
  
  const [showNewBooking, setShowNewBooking] = useState(false)
  const [newPropertyId, setNewPropertyId] = useState('')
  const [newStartDate, setNewStartDate] = useState(format(date, 'yyyy-MM-dd'))
  const [newEndDate, setNewEndDate] = useState(format(date, 'yyyy-MM-dd'))
  const [newClientName, setNewClientName] = useState('')
  const [newExtraInfo, setNewExtraInfo] = useState('')

  // Get properties that are booked on the selected date (for initial check)
  const bookedPropertyIdsOnDate = useMemo(() => {
    return new Set(bookings.map(b => b.property_id))
  }, [bookings])

  // Get available properties for NEW booking (exclude properties booked on the date range being created)
  const availableApartmentsForNew = useMemo(() => {
    if (!newStartDate || !newEndDate) {
      // If dates not set yet, show all filtered apartments
      return apartments.filter(apt => !bookedPropertyIdsOnDate.has(apt.id))
    }
    
    const newStart = new Date(newStartDate + 'T00:00:00Z')
    const newEnd = new Date(newEndDate + 'T00:00:00Z')
    
    return apartments.filter(apt => {
      // Check if property has any conflicting bookings during the new date range
      const hasConflict = (apt.bookings || []).some((booking: any) => {
        const existingStart = booking.start_date.endsWith('Z') 
          ? new Date(booking.start_date) 
          : new Date(booking.start_date + 'Z')
        const existingEnd = booking.end_date.endsWith('Z') 
          ? new Date(booking.end_date) 
          : new Date(booking.end_date + 'Z')
        
        return (newStart <= existingEnd && newEnd >= existingStart)
      })
      
      return !hasConflict
    })
  }, [apartments, newStartDate, newEndDate, bookedPropertyIdsOnDate])

  // Get available properties for EDIT booking (exclude properties booked during the edited date range, except the current booking)
  const availableApartmentsForEdit = useMemo(() => {
    if (!editStartDate || !editEndDate || !editingBooking) {
      // If dates not set yet or not editing, show all filtered apartments
      return apartments
    }
    
    const editStart = new Date(editStartDate + 'T00:00:00Z')
    const editEnd = new Date(editEndDate + 'T00:00:00Z')
    
    return apartments.filter(apt => {
      // Check if property has any conflicting bookings during the edited date range
      // (excluding the booking being edited)
      const hasConflict = (apt.bookings || []).some((booking: any) => {
        if (booking.id === editingBooking.id) return false // Skip the booking being edited
        
        const existingStart = booking.start_date.endsWith('Z') 
          ? new Date(booking.start_date) 
          : new Date(booking.start_date + 'Z')
        const existingEnd = booking.end_date.endsWith('Z') 
          ? new Date(booking.end_date) 
          : new Date(booking.end_date + 'Z')
        
        return (editStart <= existingEnd && editEnd >= existingStart)
      })
      
      return !hasConflict
    })
  }, [apartments, editStartDate, editEndDate, editingBooking])

  const handleEditBooking = (booking: EnrichedBooking) => {
    setEditingBooking(booking)
    setEditPropertyId(booking.property_id)
    setEditStartDate(booking.start_date.split('T')[0])
    setEditEndDate(booking.end_date.split('T')[0])
    setEditClientName(booking.client_name || '')
    setEditExtraInfo(booking.extra_info || '')
    setShowNewBooking(false)
  }

  const handleCancelEdit = () => {
    setEditingBooking(null)
    setEditStartDate('')
    setEditEndDate('')
    setEditClientName('')
    setEditExtraInfo('')
    setEditPropertyId('')
  }

  const handleUpdateBooking = async () => {
    if (!editingBooking || !editPropertyId || !editStartDate || !editEndDate) {
      alert('Please fill in all required fields')
      return
    }

    if (new Date(editEndDate) < new Date(editStartDate)) {
      alert('End date must be after start date')
      return
    }

    try {
      const startDateISO = new Date(editStartDate + 'T00:00:00Z').toISOString()
      const endDateISO = new Date(editEndDate + 'T00:00:00Z').toISOString()

      // Check for conflicts (excluding the current booking being edited)
      const apartment = apartments.find((a: any) => a.id === editPropertyId)
      if (apartment) {
        const hasConflict = (apartment.bookings || []).some((booking: any) => {
          if (booking.id === editingBooking.id) return false // Skip the booking being edited
          const existingStart = booking.start_date.endsWith('Z') 
            ? new Date(booking.start_date) 
            : new Date(booking.start_date + 'Z')
          const existingEnd = booking.end_date.endsWith('Z') 
            ? new Date(booking.end_date) 
            : new Date(booking.end_date + 'Z')
          const newStart = new Date(startDateISO)
          const newEnd = new Date(endDateISO)
          
          return (newStart <= existingEnd && newEnd >= existingStart)
        })

        if (hasConflict) {
          alert('Property is not available during the selected dates. Please choose different dates.')
          return
        }
      }

      const oldBooking = apartments.find((a: any) => 
        a.bookings?.some((b: any) => b.id === editingBooking.id)
      )?.bookings?.find((b: any) => b.id === editingBooking.id)

      const oldValue = oldBooking ? `${oldBooking.start_date.split('T')[0]} to ${oldBooking.end_date.split('T')[0]}${oldBooking.client_name ? ` (${oldBooking.client_name})` : oldBooking.extra_info ? ` (${oldBooking.extra_info})` : ''}` : ''
      const newValue = `${editStartDate} to ${editEndDate}${editClientName ? ` (${editClientName})` : editExtraInfo ? ` (${editExtraInfo})` : ''}`

      // Update booking
      await updateData((data) => ({
        ...data,
        apartments: data.apartments.map(apt => {
          // Remove booking from old apartment if property changed
          if (apt.id === editingBooking.property_id && apt.id !== editPropertyId) {
            return {
              ...apt,
              bookings: apt.bookings.filter((b: any) => b.id !== editingBooking.id)
            }
          }
          // Update booking in current apartment
          if (apt.id === editPropertyId) {
            const hasBooking = apt.bookings.some((b: any) => b.id === editingBooking.id)
            if (hasBooking) {
              return {
                ...apt,
                bookings: apt.bookings.map((b: any) => 
                  b.id === editingBooking.id
                    ? { ...b, start_date: startDateISO, end_date: endDateISO, client_name: editClientName || undefined, extra_info: editExtraInfo }
                    : b
                )
              }
            } else {
              // Add booking to new apartment
              return {
                ...apt,
                bookings: [...apt.bookings, {
                  ...editingBooking,
                  property_id: editPropertyId,
                  start_date: startDateISO,
                  end_date: endDateISO,
                  client_name: editClientName || undefined,
                  extra_info: editExtraInfo
                }]
              }
            }
          }
          return apt
        })
      }))

      if (currentUser) {
        await logChange({
          user_id: currentUser.id,
          action: 'Updated booking',
          entity_type: 'booking',
          entity_id: editingBooking.id,
          old_value: oldValue,
          new_value: newValue
        })
      }

      handleCancelEdit()
      onClose()
    } catch (error: any) {
      console.error('Failed to update booking:', error)
      alert('Failed to update booking')
    }
  }

  const handleDeleteBooking = async (booking: EnrichedBooking) => {
    const bookingInfo = `${booking.property_name || 'Unknown'} - ${format(new Date(booking.start_date), 'MMM d')} to ${format(new Date(booking.end_date), 'MMM d, yyyy')}`
    if (!confirm(`Delete booking: ${bookingInfo}?`)) return

    try {
      await updateData((data) => ({
        ...data,
        apartments: data.apartments.map(apt => ({
          ...apt,
          bookings: apt.bookings.filter((b: any) => b.id !== booking.id)
        }))
      }))

      if (currentUser) {
        await logChange({
          user_id: currentUser.id,
          action: 'Deleted booking',
          entity_type: 'booking',
          entity_id: booking.id,
          old_value: bookingInfo
        })
      }

      onClose()
    } catch (error) {
      console.error('Failed to delete booking:', error)
      alert('Failed to delete booking')
    }
  }

  const handleCreateBooking = async () => {
    if (!newPropertyId || !newStartDate || !newEndDate) {
      alert('Please fill in all required fields (Property, Start Date, End Date)')
      return
    }

    if (new Date(newEndDate) < new Date(newStartDate)) {
      alert('End date must be after start date')
      return
    }

    try {
      if (!currentUser) {
        alert('You must be logged in to create a booking')
        return
      }

      const startDateISO = new Date(newStartDate + 'T00:00:00Z').toISOString()
      const endDateISO = new Date(newEndDate + 'T00:00:00Z').toISOString()

      // Check availability
      const apartment = apartments.find((a: any) => a.id === newPropertyId)
      if (!apartment) {
        alert('Property not found')
        return
      }

      const hasConflict = (apartment.bookings || []).some((booking: any) => {
        const existingStart = booking.start_date.endsWith('Z') 
          ? new Date(booking.start_date) 
          : new Date(booking.start_date + 'Z')
        const existingEnd = booking.end_date.endsWith('Z') 
          ? new Date(booking.end_date) 
          : new Date(booking.end_date + 'Z')
        const newStart = new Date(startDateISO)
        const newEnd = new Date(endDateISO)
        
        return (newStart <= existingEnd && newEnd >= existingStart)
      })

      if (hasConflict) {
        alert('Property is not available during the selected dates. Please choose different dates.')
        return
      }

      const bookingId = crypto.randomUUID()
      const newBooking = {
        id: bookingId,
        property_id: newPropertyId,
        start_date: startDateISO,
        end_date: endDateISO,
        client_name: newClientName || undefined,
        extra_info: newExtraInfo,
        user_id: currentUser.id,
        created_at: new Date().toISOString()
      }

      await updateData((data) => ({
        ...data,
        apartments: data.apartments.map(apt =>
          apt.id === newPropertyId
            ? { ...apt, bookings: [...(apt.bookings || []), newBooking] }
            : apt
        )
      }))

      if (currentUser) {
        const propertyName = apartment.name || 'Unknown Property'
        await logChange({
          user_id: currentUser.id,
          action: 'Created booking',
          entity_type: 'booking',
          entity_id: bookingId,
          new_value: `${newStartDate} to ${newEndDate}${newClientName ? ` (${newClientName})` : ''} - ${propertyName}`
        })
      }

      setShowNewBooking(false)
      setNewPropertyId('')
      setNewStartDate(format(date, 'yyyy-MM-dd'))
      setNewEndDate(format(date, 'yyyy-MM-dd'))
      setNewClientName('')
      setNewExtraInfo('')
      onClose()
    } catch (error: any) {
      console.error('Failed to create booking:', error)
      alert('Failed to create booking')
    }
  }

  if (!isOpen) return null

  const totalApartments = (allApartments || apartments).length
  const filteredApartmentsCount = apartments.length
  const filterInfo = hasActiveFilter && totalApartments !== filteredApartmentsCount
    ? ` (Filtered ${filteredApartmentsCount} props out of total ${totalApartments})`
    : ''

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Bookings for ${format(date, 'MMMM d, yyyy')}${filterInfo}`}
      size="lg"
    >
      <div className="space-y-6">
        {/* Existing Bookings List */}
        {bookings.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold mb-3 text-[#2C3E1F]">Existing Bookings</h3>
            <div className="space-y-3">
              {bookings.map(booking => {
                if (editingBooking?.id === booking.id) {
                  // Edit Form
                  return (
                    <div key={booking.id} className="border-2 border-[#D4AF37] rounded-lg p-4 bg-[#FFF8E7]">
                      <h4 className="font-semibold mb-3 text-[#2C3E1F]">Edit Booking</h4>
                      <div className="space-y-3">
                        <div>
                          <Label htmlFor="edit-property">Property *</Label>
                          <select
                            id="edit-property"
                            value={editPropertyId}
                            onChange={(e) => setEditPropertyId(e.target.value)}
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                          >
                            <option value="">Select Property</option>
                            {availableApartmentsForEdit.map(apt => (
                              <option key={apt.id} value={apt.id}>{apt.name}</option>
                            ))}
                          </select>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label htmlFor="edit-start-date">Start Date *</Label>
                            <Input
                              id="edit-start-date"
                              type="date"
                              value={editStartDate}
                              onChange={(e) => setEditStartDate(e.target.value)}
                            />
                          </div>
                          <div>
                            <Label htmlFor="edit-end-date">End Date *</Label>
                            <Input
                              id="edit-end-date"
                              type="date"
                              value={editEndDate}
                              onChange={(e) => setEditEndDate(e.target.value)}
                            />
                          </div>
                        </div>
                        <div>
                          <Label htmlFor="edit-client-name">Client Name</Label>
                          <Input
                            id="edit-client-name"
                            value={editClientName}
                            onChange={(e) => setEditClientName(e.target.value)}
                            placeholder="Optional"
                          />
                        </div>
                        <div>
                          <Label htmlFor="edit-extra-info">Extra Info</Label>
                          <Textarea
                            id="edit-extra-info"
                            value={editExtraInfo}
                            onChange={(e) => setEditExtraInfo(e.target.value)}
                            placeholder="Optional"
                          />
                        </div>
                        <div className="flex gap-2">
                          <Button onClick={handleUpdateBooking} className="bg-[#D4AF37] hover:bg-[#F4D03F] text-[#2C3E1F]">
                            Save
                          </Button>
                          <Button onClick={handleCancelEdit} variant="outline">
                            Cancel
                          </Button>
                        </div>
                      </div>
                    </div>
                  )
                }
                
                // Display Booking
                return (
                  <div key={booking.id} className="border border-gray-200 rounded-lg p-4 bg-white">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="font-semibold text-[#2C3E1F] mb-1">{booking.property_name || 'Unknown Property'}</div>
                        <div className="text-sm text-[#6B7C4A] mb-1">
                          {format(new Date(booking.start_date), 'MMM d')} - {format(new Date(booking.end_date), 'MMM d, yyyy')}
                        </div>
                        {booking.client_name && (
                          <div className="text-sm text-[#6B7C4A] mb-1">
                            <span className="font-medium">Client:</span> {booking.client_name}
                          </div>
                        )}
                        {!booking.client_name && booking.user_email && (
                          <div className="text-sm text-[#6B7C4A] mb-1">
                            <span className="font-medium">Guest:</span> {booking.user_email}
                          </div>
                        )}
                        {booking.extra_info && (
                          <div className="text-sm text-[#6B7C4A] mt-1">
                            <span className="font-medium">Details:</span> {booking.extra_info}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2 ml-4">
                        <Button
                          onClick={() => handleEditBooking(booking)}
                          size="sm"
                          variant="outline"
                          className="text-xs"
                        >
                          Edit
                        </Button>
                        <Button
                          onClick={() => handleDeleteBooking(booking)}
                          size="sm"
                          variant="outline"
                          className="text-xs text-red-600 hover:text-red-700"
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* New Booking Form */}
        {showNewBooking ? (
          <div className="border-2 border-[#D4AF37] rounded-lg p-4 bg-[#FFF8E7]">
            <h3 className="text-lg font-semibold mb-3 text-[#2C3E1F]">Create New Booking</h3>
            <div className="space-y-3">
              <div>
                <Label htmlFor="new-property">Property *</Label>
                <select
                  id="new-property"
                  value={newPropertyId}
                  onChange={(e) => setNewPropertyId(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">Select Property</option>
                  {availableApartmentsForNew.map(apt => (
                    <option key={apt.id} value={apt.id}>{apt.name}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="new-start-date">Start Date *</Label>
                  <Input
                    id="new-start-date"
                    type="date"
                    value={newStartDate}
                    onChange={(e) => setNewStartDate(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="new-end-date">End Date *</Label>
                  <Input
                    id="new-end-date"
                    type="date"
                    value={newEndDate}
                    onChange={(e) => setNewEndDate(e.target.value)}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="new-client-name">Client Name</Label>
                <Input
                  id="new-client-name"
                  value={newClientName}
                  onChange={(e) => setNewClientName(e.target.value)}
                  placeholder="Optional"
                />
              </div>
              <div>
                <Label htmlFor="new-extra-info">Extra Info</Label>
                <Textarea
                  id="new-extra-info"
                  value={newExtraInfo}
                  onChange={(e) => setNewExtraInfo(e.target.value)}
                  placeholder="Optional"
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleCreateBooking} className="bg-[#D4AF37] hover:bg-[#F4D03F] text-[#2C3E1F]">
                  Create Booking
                </Button>
                <Button onClick={() => {
                  setShowNewBooking(false)
                  setNewPropertyId('')
                  setNewStartDate(format(date, 'yyyy-MM-dd'))
                  setNewEndDate(format(date, 'yyyy-MM-dd'))
                  setNewClientName('')
                  setNewExtraInfo('')
                }} variant="outline">
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        ) : (
          // Show "New Booking" button if there are available properties (not all booked on date range)
          availableApartmentsForNew.length > 0 && (
            <div>
              <Button
                onClick={() => {
                  setShowNewBooking(true)
                  setEditingBooking(null)
                  // Reset dates to the clicked date
                  setNewStartDate(format(date, 'yyyy-MM-dd'))
                  setNewEndDate(format(date, 'yyyy-MM-dd'))
                }}
                className="bg-[#D4AF37] hover:bg-[#F4D03F] text-[#2C3E1F] w-full"
              >
                + New Booking
              </Button>
            </div>
          )
        )}

        {bookings.length === 0 && !showNewBooking && (
          <div className="text-center text-[#6B7C4A] py-4">
            No bookings for this date
            {availableApartmentsForNew.length > 0 && (
              <div className="mt-2">
                <Button
                  onClick={() => {
                    setShowNewBooking(true)
                    setNewStartDate(format(date, 'yyyy-MM-dd'))
                    setNewEndDate(format(date, 'yyyy-MM-dd'))
                  }}
                  className="bg-[#D4AF37] hover:bg-[#F4D03F] text-[#2C3E1F]"
                >
                  + Create First Booking
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  )
}
