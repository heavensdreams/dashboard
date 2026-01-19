import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { PhotoUpload } from '@/components/PhotoUpload'
import { Modal } from '@/components/ui/modal'
import { useDataStore } from '@/stores/dataStore'
import { useUserStore } from '@/stores/userStore'
import { logChange } from '@/utils/logging'
import { filterBookingsForCustomer } from '@/utils/filtering'
import { getAllBookings } from '@/utils/apartmentHelpers'

interface PropertyDetailProps {
  propertyId: string | null
  onClose: () => void
}

export function PropertyDetail({ propertyId, onClose }: PropertyDetailProps) {
  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const [extraInfo, setExtraInfo] = useState('')
  const [roiInfo, setRoiInfo] = useState('')

  const { currentUser } = useUserStore()
  const apartments = useDataStore(state => state.apartments)
  const groups = useDataStore(state => state.groups)
  const updateData = useDataStore(state => state.updateData)
  
  const [selectedGroups, setSelectedGroups] = useState<string[]>([])
  const [linkCopied, setLinkCopied] = useState(false)
  const [localPhotos, setLocalPhotos] = useState<string[]>([])

  const canEdit = currentUser?.role === 'admin' || currentUser?.role === 'normal'
  const isCustomer = currentUser?.role === 'customer'

  useEffect(() => {
    if (propertyId) {
      const apartment = apartments.find((a: any) => a.id === propertyId)
      if (apartment) {
        setName(apartment.name || '')
        setAddress(apartment.address || '')
        setExtraInfo(apartment.extra_info || '')
        setRoiInfo(apartment.roi_info || '')
        setLocalPhotos(apartment.photos || [])
        setSelectedGroups(apartment.groups || [])
      }
    } else {
      // Reset for new apartment
      setName('')
      setAddress('')
      setExtraInfo('')
      setRoiInfo('')
      setLocalPhotos([])
      setSelectedGroups([])
    }
  }, [propertyId, apartments])

  // Get bookings for this apartment
  const bookings = propertyId ? (() => {
    const apartment = apartments.find((a: any) => a.id === propertyId)
    if (!apartment) return []
    let filtered = apartment.bookings || []
    if (isCustomer) {
      filtered = filterBookingsForCustomer(filtered)
    }
    return filtered
  })() : []

  const handleSave = async () => {
    if (!name || !address) {
      alert('Please fill in name and address')
      return
    }

    try {
      if (propertyId) {
        // Update existing apartment
        await updateData((data) => ({
          ...data,
          apartments: data.apartments.map(a => 
            a.id === propertyId
              ? { 
                  ...a, 
                  name, 
                  address, 
                  extra_info: extraInfo, 
                  roi_info: roiInfo,
                  photos: localPhotos,
                  groups: selectedGroups
                }
              : a
          )
        }))

        if (currentUser) {
          await logChange({
            user_id: currentUser.id,
            action: 'Updated apartment',
            entity_type: 'apartment',
            entity_id: propertyId,
            new_value: name
          })
        }
      } else {
        // Create new apartment
        const newApartmentId = crypto.randomUUID()
        const newApartment = {
          id: newApartmentId,
          name,
          address,
          extra_info: extraInfo,
          roi_info: roiInfo,
          created_at: new Date().toISOString(),
          bookings: [],
          groups: selectedGroups,
          photos: localPhotos
        }

        await updateData((data) => ({
          ...data,
          apartments: [...data.apartments, newApartment]
        }))

        if (currentUser) {
          await logChange({
            user_id: currentUser.id,
            action: 'Created apartment',
            entity_type: 'apartment',
            entity_id: newApartmentId,
            new_value: name
          })
        }
      }

      onClose()
    } catch (error) {
      console.error('Failed to save apartment:', error)
      alert('Failed to save apartment')
    }
  }

  const handlePhotoUpload = (md5: string) => {
    setLocalPhotos([...localPhotos, md5])
  }

  const handleRemovePhoto = (md5: string) => {
    setLocalPhotos(localPhotos.filter(p => p !== md5))
  }

  const getPublicLink = () => {
    if (!propertyId) return ''
    const baseUrl = window.location.origin
    return `${baseUrl}/view/${propertyId}`
  }

  const handleCopyLink = async () => {
    const link = getPublicLink()
    if (!link) return
    
    try {
      await navigator.clipboard.writeText(link)
      setLinkCopied(true)
      setTimeout(() => setLinkCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy link:', err)
      setLinkCopied(true)
      setTimeout(() => setLinkCopied(false), 2000)
    }
  }

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={propertyId ? (canEdit ? 'Edit Apartment' : 'Apartment Details') : 'New Apartment'}
      size="lg"
    >
      <div className="space-y-4">
        {!canEdit && propertyId ? (
          // Read-only view for customers
          <>
            <div>
              <Label>Name</Label>
              <p className="text-lg font-semibold">{name}</p>
            </div>
            <div>
              <Label>Address</Label>
              <p className="text-muted-foreground">{address}</p>
            </div>
            {extraInfo && (
              <div>
                <Label>Extra Info</Label>
                <p className="text-muted-foreground whitespace-pre-wrap">{extraInfo}</p>
              </div>
            )}
            {roiInfo && (
              <div>
                <Label>ROI Information</Label>
                <p className="text-muted-foreground whitespace-pre-wrap">{roiInfo}</p>
              </div>
            )}
            <div>
              <Label>Photos</Label>
              <div className="flex gap-2 flex-wrap mt-2">
                {localPhotos.length > 0 ? (
                  localPhotos.map((md5) => (
                    <img
                      key={md5}
                      src={`/photos/${md5}.jpg`}
                      alt="Apartment"
                      className="w-32 h-32 object-cover rounded"
                    />
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No photos available</p>
                )}
              </div>
            </div>
            <div>
              <Label>Bookings</Label>
              <div className="mt-2 space-y-2">
                {bookings.length > 0 ? (
                  bookings.map((booking: any) => (
                    <div key={booking.id} className="border rounded p-2">
                      <p className="text-sm">
                        {new Date(booking.start_date).toLocaleDateString()} - {new Date(booking.end_date).toLocaleDateString()}
                      </p>
                      <p className="text-xs text-muted-foreground">Booked</p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No bookings</p>
                )}
              </div>
            </div>
            <div className="flex justify-end">
              <Button variant="outline" onClick={onClose}>Close</Button>
            </div>
          </>
        ) : (
          // Edit form
          <>
            <div>
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Apartment name"
                required
              />
            </div>

            {canEdit && propertyId && (
              <div className="border-t pt-4">
                <Label>Client Link</Label>
                <div className="flex items-center gap-2 mt-2">
                  <div className="flex-1 px-3 py-2 bg-muted rounded-md text-sm font-mono text-muted-foreground break-all">
                    {getPublicLink()}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleCopyLink}
                    className="flex-shrink-0"
                  >
                    {linkCopied ? 'Copied!' : 'Copy'}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Share this link with clients for read-only access
                </p>
              </div>
            )}

            <div>
              <Label htmlFor="address">Address *</Label>
              <Input
                id="address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Apartment address"
                required
              />
            </div>

            <div>
              <Label htmlFor="extraInfo">Extra Info</Label>
              <Textarea
                id="extraInfo"
                value={extraInfo}
                onChange={(e) => setExtraInfo(e.target.value)}
                placeholder="Additional information"
                rows={4}
              />
            </div>

            <div>
              <Label htmlFor="roiInfo">ROI Information</Label>
              <Textarea
                id="roiInfo"
                value={roiInfo}
                onChange={(e) => setRoiInfo(e.target.value)}
                placeholder="Return on Investment details"
                rows={8}
              />
            </div>

            {canEdit && (
              <>
                <div>
                  <Label>Groups</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {groups.map((group: any) => (
                      <label key={group.id} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedGroups.includes(group.name)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedGroups([...selectedGroups, group.name])
                            } else {
                              setSelectedGroups(selectedGroups.filter(name => name !== group.name))
                            }
                          }}
                        />
                        <span>{group.name}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <Label>Photos</Label>
                  <div className="flex gap-2 flex-wrap mt-2">
                    {localPhotos.map((md5) => (
                      <div key={md5} className="relative">
                        <img
                          src={`/photos/${md5}.jpg`}
                          alt="Apartment"
                          className="w-24 h-24 object-cover rounded"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemovePhoto(md5)}
                          className="absolute top-0 right-0 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                    <PhotoUpload onUpload={handlePhotoUpload} multiple />
                  </div>
                </div>
              </>
            )}

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="outline" onClick={onClose}>Cancel</Button>
              {canEdit && <Button onClick={handleSave}>Save</Button>}
            </div>
          </>
        )}
      </div>
    </Modal>
  )
}
