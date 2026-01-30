import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { PhotoUpload } from '@/components/PhotoUpload'
import { Modal } from '@/components/ui/modal'
import { useDataStore } from '@/stores/dataStore'
import { useUserStore } from '@/stores/userStore'
import { logChange } from '@/utils/logging'
import { getPhotoUrl, handlePhotoError } from '@/utils/photoHelpers'

interface BookingFormProps {
  propertyId?: string
  startDate?: Date
  endDate?: Date
  onSave: () => void
  onCancel: () => void
}

export function BookingForm({ propertyId: initialPropertyId, startDate, endDate, onSave, onCancel }: BookingFormProps) {
  const apartments = useDataStore(state => state.apartments)
  const updateData = useDataStore(state => state.updateData)
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>(initialPropertyId || '')
  const [selectedStartDate, setSelectedStartDate] = useState(
    startDate ? startDate.toISOString().split('T')[0] : ''
  )
  const [selectedEndDate, setSelectedEndDate] = useState(
    endDate ? endDate.toISOString().split('T')[0] : ''
  )
  const [clientName, setClientName] = useState('')
  const [extraInfo, setExtraInfo] = useState('')
  const [photos, setPhotos] = useState<string[]>([])

  const handlePhotoUpload = (md5: string) => {
    setPhotos([...photos, md5])
  }

  const { currentUser } = useUserStore()

  const handleSubmit = async () => {
    if (!selectedPropertyId || !selectedStartDate || !selectedEndDate) {
      alert('Please fill in all required fields (Property, Start Date, End Date)')
      return
    }

    if (new Date(selectedEndDate) < new Date(selectedStartDate)) {
      alert('End date must be after start date')
      return
    }

    try {
      if (!currentUser) {
        alert('You must be logged in to create a booking')
        return
      }

      const startDateISO = new Date(selectedStartDate + 'T00:00:00Z').toISOString()
      const endDateISO = new Date(selectedEndDate + 'T00:00:00Z').toISOString()

      // Check availability
      const apartment = apartments.find((a: any) => a.id === selectedPropertyId)
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
        property_id: selectedPropertyId,
        start_date: startDateISO,
        end_date: endDateISO,
        client_name: clientName || undefined,
        extra_info: extraInfo,
        user_id: currentUser.id,
        created_at: new Date().toISOString()
      }

      // Add booking to apartment and update photos
      await updateData((data) => ({
        ...data,
        apartments: data.apartments.map(apt => 
          apt.id === selectedPropertyId
            ? {
                ...apt,
                bookings: [...(apt.bookings || []), newBooking],
                photos: [...(apt.photos || []), ...photos]
              }
            : apt
        )
      }))

      await logChange({
        user_id: currentUser.id,
        action: 'Created booking',
        entity_type: 'booking',
        entity_id: bookingId,
        new_value: `${selectedStartDate} to ${selectedEndDate}`
      })

      onSave()
    } catch (error: any) {
      console.error('Failed to create booking:', error)
      alert('Failed to create booking')
    }
  }

  return (
    <Modal
      isOpen={true}
      onClose={onCancel}
      title="New Booking"
      size="md"
    >
      <div className="space-y-4">
        <div>
          <Label htmlFor="property">Property *</Label>
          <select
            id="property"
            value={selectedPropertyId}
            onChange={(e) => setSelectedPropertyId(e.target.value)}
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
          <Label htmlFor="startDate">Start Date *</Label>
          <Input
            id="startDate"
            type="date"
            value={selectedStartDate}
            onChange={(e) => setSelectedStartDate(e.target.value)}
            required
          />
        </div>

        <div>
          <Label htmlFor="endDate">End Date *</Label>
          <Input
            id="endDate"
            type="date"
            value={selectedEndDate}
            onChange={(e) => setSelectedEndDate(e.target.value)}
            required
          />
        </div>

        <div>
          <Label htmlFor="clientName">Client Name</Label>
          <Input
            id="clientName"
            type="text"
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
            placeholder="Guest/client name (optional)"
          />
        </div>

        <div>
          <Label htmlFor="extraInfo">Extra Info</Label>
          <Textarea
            id="extraInfo"
            value={extraInfo}
            onChange={(e) => setExtraInfo(e.target.value)}
            placeholder="Guest information, payment status, etc."
            rows={4}
          />
        </div>

        <div>
          <Label>Photos</Label>
          <div className="flex gap-2 flex-wrap mt-2">
            {photos.map((md5) => (
              <img
                key={md5}
                src={getPhotoUrl(md5)}
                onError={(e) => handlePhotoError(e, md5)}
                alt="Booking"
                className="w-24 h-24 object-cover rounded"
              />
            ))}
            <PhotoUpload onUpload={handlePhotoUpload} multiple />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
          <Button onClick={handleSubmit}>Save</Button>
        </div>
      </div>
    </Modal>
  )
}
