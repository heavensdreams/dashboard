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
import { getPhotoUrl, handlePhotoError } from '@/utils/photoHelpers'

interface PropertyDetailProps {
  propertyId: string | null
  onClose: () => void
}

export function PropertyDetail({ propertyId, onClose }: PropertyDetailProps) {
  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const [extraInfo, setExtraInfo] = useState('')
  const { currentUser } = useUserStore()
  const apartments = useDataStore(state => state.apartments)
  const groups = useDataStore(state => state.groups)
  const users = useDataStore(state => state.users)
  const updateData = useDataStore(state => state.updateData)
  
  const [selectedGroups, setSelectedGroups] = useState<string[]>([])
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
        setLocalPhotos(apartment.photos || [])
        setSelectedGroups(apartment.groups || [])
      }
    } else {
      // Reset for new apartment
      setName('')
      setAddress('')
      setExtraInfo('')
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

  const handlePhotoUpload = (filename: string) => {
    setLocalPhotos([...localPhotos, filename])
  }

  const handleRemovePhoto = (photoId: string) => {
    setLocalPhotos(localPhotos.filter(p => p !== photoId))
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
            <div>
              <Label>Photos</Label>
              <div className="flex gap-2 overflow-x-auto pb-2 mt-2 scrollbar-thin scrollbar-thumb-[#D4AF37] scrollbar-track-gray-200" style={{ scrollbarWidth: 'thin', scrollbarColor: '#D4AF37 #f3f4f6' }}>
                {localPhotos.length > 0 ? (
                  localPhotos.map((md5) => (
                    <div key={md5} className="flex-shrink-0">
                      <img
                        src={getPhotoUrl(md5)}
                        alt="Apartment"
                        className="w-32 h-32 object-cover rounded"
                        onError={(e) => handlePhotoError(e, md5)}
                      />
                    </div>
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


            {canEdit && propertyId && (
              <div className="border-t pt-4">
                <Label>Guest Link (No Password Required)</Label>
                <p className="text-xs text-muted-foreground mb-2">
                  Share this link for read-only access to this property
                </p>
                <div className="flex items-center gap-2">
                  <div className="flex-1 px-3 py-2 bg-muted rounded-md text-sm font-mono text-muted-foreground break-all">
                    {`${window.location.origin}/view/${propertyId}`}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      const link = `${window.location.origin}/view/${propertyId}`
                      try {
                        await navigator.clipboard.writeText(link)
                        alert('Link copied to clipboard!')
                      } catch (err) {
                        console.error('Failed to copy link:', err)
                        alert('Failed to copy link')
                      }
                    }}
                    className="flex-shrink-0"
                  >
                    Copy
                  </Button>
                </div>
              </div>
            )}

            {canEdit && (
              <>
                {!isCustomer && (
                  <div>
                    <Label>Groups or Customer Emails</Label>
                    <p className="text-xs text-muted-foreground mb-2">
                      Assign to groups or directly to customer users by email
                    </p>
                    <div className="space-y-3">
                      {/* Groups */}
                      <div>
                        <Label className="text-sm font-medium mb-2 block">Groups:</Label>
                        <div className="flex flex-wrap gap-2">
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
                      {/* Customer Emails */}
                      <div>
                        <Label className="text-sm font-medium mb-2 block">Customer Emails:</Label>
                        <div className="flex flex-wrap gap-2">
                          {users
                            .filter((u: any) => u.role === 'customer')
                            .map((customer: any) => (
                              <label key={customer.id} className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={selectedGroups.includes(customer.email)}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setSelectedGroups([...selectedGroups, customer.email])
                                    } else {
                                      setSelectedGroups(selectedGroups.filter(email => email !== customer.email))
                                    }
                                  }}
                                />
                                <span>{customer.email}</span>
                              </label>
                            ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between mb-3">
                    <Label className="text-base font-medium">Photos</Label>
                    <label className="relative inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#D4AF37] to-[#F4D03F] text-[#2C3E1F] rounded-lg font-medium cursor-pointer hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5 active:translate-y-0">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                      </svg>
                      <span>Choose Files</span>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        onChange={async (e) => {
                          const files = e.target.files
                          if (!files || files.length === 0) return
                          
                          try {
                            for (const file of Array.from(files)) {
                              const formData = new FormData()
                              formData.append('photo', file)

                              const response = await fetch('/api/upload', {
                                method: 'POST',
                                body: formData,
                              })

                              if (!response.ok) {
                                throw new Error('Upload failed')
                              }

                              const data = await response.json()
                              handlePhotoUpload(data.filename || data.md5)
                            }
                          } catch (error) {
                            console.error('Upload error:', error)
                            alert('Failed to upload photo')
                          }
                          // Reset input so same file can be selected again
                          e.target.value = ''
                        }}
                      />
                    </label>
                  </div>
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                    {localPhotos.map((photoId) => (
                      <div key={photoId} className="relative aspect-square">
                        <img
                          src={getPhotoUrl(photoId)}
                          alt="Apartment"
                          className="w-full h-full object-cover rounded-lg border-2 border-gray-200"
                          onError={(e) => {
                            handlePhotoError(e, photoId)
                            // Mark as missing for deletion
                            const target = e.target as HTMLImageElement
                            if (target.getAttribute('data-photo-missing') === 'true') {
                              target.parentElement?.classList.add('opacity-50', 'border-red-500')
                            }
                          }}
                          onLoad={(e) => {
                            // Photo loaded successfully - remove any missing markers
                            const target = e.target as HTMLImageElement
                            target.removeAttribute('data-photo-missing')
                            target.parentElement?.classList.remove('opacity-50', 'border-red-500')
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => handleRemovePhoto(photoId)}
                          className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-7 h-7 flex items-center justify-center text-sm hover:bg-red-600 shadow-md transition-all"
                          title="Delete photo"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                  {localPhotos.length === 0 && (
                    <p className="text-sm text-muted-foreground mt-2">No photos. Upload photos to replace placeholders.</p>
                  )}
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
