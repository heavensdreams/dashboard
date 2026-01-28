import { useState, useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Modal } from '@/components/ui/modal'
import { useDataStore } from '@/stores/dataStore'
import { useUserStore } from '@/stores/userStore'
import { logChange } from '@/utils/logging'
import { filterBookingsForCustomer } from '@/utils/filtering'
import { getAllBookings, type Booking } from '@/utils/apartmentHelpers'

export function BookingManagement() {
  const apartments = useDataStore(state => state.apartments)
  const groups = useDataStore(state => state.groups)
  const userGroups = useDataStore(state => state.user_groups || [])
  const users = useDataStore(state => state.users)
  const updateData = useDataStore(state => state.updateData)
  
  const { currentUser } = useUserStore()
  const canEdit = currentUser?.role === 'admin' || currentUser?.role === 'normal'
  const isCustomer = currentUser?.role === 'customer'

  // Get customer's group name
  const customerGroupName = useMemo(() => {
    if (!isCustomer || !currentUser?.id) return null
    const userGroup = userGroups.find((ug: any) => ug.user_id === currentUser.id)
    if (!userGroup) return null
    const group = groups.find((g: any) => g.id === userGroup.group_id)
    return group?.name || null
  }, [isCustomer, currentUser?.id, userGroups, groups])

  const groupOrEmailFilter = useDataStore(state => state.groupOrEmailFilter)

  // Filter apartments by customer email (direct assignment) OR customer group name
  // OR by shared filter for admin/normal users
  const filteredApartments = useMemo(() => {
    let filtered = [...apartments]
    
    // For customers: filter by their email (direct assignment) OR their group name
    if (isCustomer && currentUser?.email) {
      filtered = filtered.filter(apt => {
        if (!apt.groups || apt.groups.length === 0) return false
        // Check if property is assigned directly to customer's email
        if (apt.groups.includes(currentUser.email)) return true
        // Check if property is assigned to customer's group (if they have one)
        if (customerGroupName && apt.groups.includes(customerGroupName)) return true
        return false
      })
    }
    // Combined Group/Email filter (admin/normal users only)
    else if (!isCustomer && groupOrEmailFilter !== 'all') {
      // Check if it's a group name or customer email
      const isGroup = groups.some((g: any) => g.name === groupOrEmailFilter)
      
      if (isGroup) {
        // Filter by group name
        filtered = filtered.filter(apt => apt.groups && apt.groups.includes(groupOrEmailFilter))
      } else {
        // Filter by customer email - show properties assigned to this customer
        const filterEmail = groupOrEmailFilter
        const filterUser = users.find((u: any) => u.email === filterEmail && u.role === 'customer')
        
        if (filterUser) {
          // Find the user's group if they have one
          let filterUserGroupName: string | null = null
          const filterUserGroup = userGroups.find((ug: any) => ug.user_id === filterUser.id)
          if (filterUserGroup) {
            const filterUserGroupObj = groups.find((g: any) => g.id === filterUserGroup.group_id)
            filterUserGroupName = filterUserGroupObj?.name || null
          }
          
          filtered = filtered.filter(apt => {
            if (!apt.groups || apt.groups.length === 0) return false
            // Check if property is assigned directly to the customer's email
            if (apt.groups.includes(filterEmail)) return true
            // Check if property is assigned to the customer's group (if they have one)
            if (filterUserGroupName && apt.groups.includes(filterUserGroupName)) return true
            return false
          })
        } else {
          // Email not found, show nothing
          filtered = []
        }
      }
    }
    
    return filtered
  }, [apartments, isCustomer, currentUser?.email, customerGroupName, groupOrEmailFilter, groups, users, userGroups])

  // Extract all bookings from filtered apartments
  const allBookings = useMemo(() => getAllBookings(filteredApartments), [filteredApartments])

  // Filter bookings for customers and enrich with property/user names
  const bookings = useMemo(() => {
    let filtered: Booking[] = [...allBookings]
    
    if (isCustomer) {
      filtered = filterBookingsForCustomer(filtered) as Booking[]
    }
    
    // Enrich with property names and user emails
    return filtered.map(booking => ({
      ...booking,
      property_name: filteredApartments.find((a: any) => 
        a.bookings && a.bookings.some((b: any) => b.id === booking.id)
      )?.name || 'Unknown Property',
      user_email: users.find((u: any) => u.id === booking.user_id)?.email
    })).sort((a, b) => {
      const dateA = new Date(a.start_date).getTime()
      const dateB = new Date(b.start_date).getTime()
      return dateB - dateA // Newest first
    })
  }, [allBookings, filteredApartments, users, isCustomer])

  const [editingBooking, setEditingBooking] = useState<Booking | null>(null)
  const [editStartDate, setEditStartDate] = useState('')
  const [editEndDate, setEditEndDate] = useState('')
  const [editExtraInfo, setEditExtraInfo] = useState('')
  const [editPropertyId, setEditPropertyId] = useState('')

  const handleEditBooking = (booking: Booking) => {
    setEditingBooking(booking)
    setEditPropertyId(booking.property_id)
    const startDate = booking.start_date.endsWith('Z') 
      ? booking.start_date.split('T')[0]
      : new Date(booking.start_date).toISOString().split('T')[0]
    const endDate = booking.end_date.endsWith('Z')
      ? booking.end_date.split('T')[0]
      : new Date(booking.end_date).toISOString().split('T')[0]
    
    setEditStartDate(startDate)
    setEditEndDate(endDate)
    setEditExtraInfo(booking.extra_info || '')
  }

  const handleUpdateBooking = async () => {
    if (!editingBooking || !editStartDate || !editEndDate || !editPropertyId) {
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

      const oldBooking = allBookings.find((b: any) => b.id === editingBooking.id)
      const oldValue = oldBooking ? `${oldBooking.start_date.split('T')[0]} to ${oldBooking.end_date.split('T')[0]}${oldBooking.extra_info ? ` (${oldBooking.extra_info})` : ''}` : ''
      const newValue = `${editStartDate} to ${editEndDate}${editExtraInfo ? ` (${editExtraInfo})` : ''}`

      // Update booking in apartment
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
                    ? { ...b, start_date: startDateISO, end_date: endDateISO, extra_info: editExtraInfo }
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

      setEditingBooking(null)
      setEditStartDate('')
      setEditEndDate('')
      setEditExtraInfo('')
      setEditPropertyId('')
    } catch (error: any) {
      console.error('Failed to update booking:', error)
      alert('Failed to update booking')
    }
  }

  const handleDeleteBooking = async (bookingId: string, bookingInfo: string) => {
    if (!confirm(`Delete booking ${bookingInfo}?`)) return

    try {
      await updateData((data) => ({
        ...data,
        apartments: data.apartments.map(apt => ({
          ...apt,
          bookings: apt.bookings.filter((b: any) => b.id !== bookingId)
        }))
      }))

      if (currentUser) {
        await logChange({
          user_id: currentUser.id,
          action: 'Deleted booking',
          entity_type: 'booking',
          entity_id: bookingId,
          old_value: bookingInfo
        })
      }
    } catch (error) {
      console.error('Failed to delete booking:', error)
      alert('Failed to delete booking')
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const getPropertyName = (booking: Booking) => {
    const apartment = apartments.find((a: any) => 
      a.bookings && a.bookings.some((b: any) => b.id === booking.id)
    )
    return apartment?.name || 'Unknown Property'
  }

  const getUserEmail = (booking: Booking) => {
    const user = users.find((u: any) => u.id === booking.user_id)
    return user?.email
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">All Bookings</h2>
      </div>

      {editingBooking && (
        <Modal
          isOpen={true}
          onClose={() => {
            setEditingBooking(null)
            setEditStartDate('')
            setEditEndDate('')
            setEditExtraInfo('')
            setEditPropertyId('')
          }}
          title="Edit Booking"
          size="md"
        >
          <div className="space-y-4">
            <div>
              <Label htmlFor="editProperty">Property *</Label>
              <select
                id="editProperty"
                value={editPropertyId}
                onChange={(e) => setEditPropertyId(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                required
              >
                <option value="">Select a property...</option>
                {apartments.map((apt: any) => (
                  <option key={apt.id} value={apt.id}>
                    {apt.name} - {apt.address}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="editStartDate">Start Date *</Label>
              <Input
                id="editStartDate"
                type="date"
                value={editStartDate}
                onChange={(e) => setEditStartDate(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="editEndDate">End Date *</Label>
              <Input
                id="editEndDate"
                type="date"
                value={editEndDate}
                onChange={(e) => setEditEndDate(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="editExtraInfo">Extra Info</Label>
              <Textarea
                id="editExtraInfo"
                value={editExtraInfo}
                onChange={(e) => setEditExtraInfo(e.target.value)}
                placeholder="Guest information, payment status, notes, etc."
                rows={4}
              />
            </div>
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="outline" onClick={() => {
                setEditingBooking(null)
                setEditStartDate('')
                setEditEndDate('')
                setEditExtraInfo('')
                setEditPropertyId('')
              }}>Cancel</Button>
              <Button onClick={handleUpdateBooking}>Update Booking</Button>
            </div>
          </div>
        </Modal>
      )}

      <div className="space-y-2">
        {bookings.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No bookings found
            </CardContent>
          </Card>
        ) : (
          bookings.map((booking) => {
            const propertyName = getPropertyName(booking)
            const userEmail = getUserEmail(booking)
            return (
              <Card key={booking.id}>
                <CardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="font-semibold">{propertyName}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatDate(booking.start_date)} - {formatDate(booking.end_date)}
                      </p>
                      {!isCustomer && userEmail && (
                        <p className="text-xs text-muted-foreground">Guest: {userEmail}</p>
                      )}
                      {!isCustomer && booking.extra_info && (
                        <p className="text-sm mt-1">{booking.extra_info}</p>
                      )}
                      {isCustomer && (
                        <p className="text-xs text-muted-foreground mt-1">Booked</p>
                      )}
                    </div>
                    {canEdit && (
                      <div className="flex gap-2">
                        <Button variant="outline" onClick={() => handleEditBooking(booking)}>
                          Edit
                        </Button>
                        <Button 
                          variant="destructive" 
                          onClick={() => handleDeleteBooking(booking.id, `${propertyName} (${formatDate(booking.start_date)} - ${formatDate(booking.end_date)})`)}
                        >
                          Delete
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })
        )}
      </div>
    </div>
  )
}
