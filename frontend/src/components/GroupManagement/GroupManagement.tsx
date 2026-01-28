import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Modal } from '@/components/ui/modal'
import { useDataStore } from '@/stores/dataStore'
import { useUserStore } from '@/stores/userStore'
import { logChange } from '@/utils/logging'

interface Group {
  id: string
  name: string
}

export function GroupManagement() {
  const groups = useDataStore(state => state.groups) as Group[]
  const users = useDataStore(state => state.users)
  const apartments = useDataStore(state => state.apartments)
  const updateData = useDataStore(state => state.updateData)
  const [showGroupModal, setShowGroupModal] = useState(false)
  const [editingGroup, setEditingGroup] = useState<Group | null>(null)
  const [editingCustomerEmail, setEditingCustomerEmail] = useState<string | null>(null)
  const [newGroupName, setNewGroupName] = useState('')
  const [selectedPropertyIds, setSelectedPropertyIds] = useState<Set<string>>(new Set())

  const { currentUser } = useUserStore()

  const getGroupApartments = (groupName: string) => {
    return apartments.filter((apt: any) => apt.groups && apt.groups.includes(groupName))
  }

  // Get customer users who have properties assigned directly to them (by email)
  const getCustomerUsersWithProperties = () => {
    const customerUsers = users.filter((u: any) => u.role === 'customer')
    return customerUsers.filter((customer: any) => {
      return apartments.some((apt: any) => 
        apt.groups && apt.groups.includes(customer.email)
      )
    })
  }


  const handleCreateGroup = async () => {
    if (!newGroupName) {
      alert('Please enter a group name')
      return
    }

    try {
      const newGroup: Group = {
        id: crypto.randomUUID(),
        name: newGroupName
      }

      await updateData((data) => ({
        ...data,
        groups: [...data.groups, newGroup]
      }))

      if (currentUser) {
        await logChange({
          user_id: currentUser.id,
          action: 'Created group',
          entity_type: 'group',
          new_value: newGroupName
        })
      }

      setShowGroupModal(false)
      setNewGroupName('')
    } catch (error) {
      console.error('Failed to create group:', error)
      alert('Failed to create group')
    }
  }

  const handleEditGroup = (group: Group) => {
    setEditingGroup(group)
    setEditingCustomerEmail(null)
    setNewGroupName(group.name)
    // Load currently assigned properties
    const assignedProperties = apartments.filter((apt: any) => 
      apt.groups && apt.groups.includes(group.name)
    )
    setSelectedPropertyIds(new Set(assignedProperties.map((apt: any) => apt.id)))
    setShowGroupModal(true)
  }
  
  const handleEditCustomerEmail = (customerEmail: string) => {
    setEditingGroup(null)
    setEditingCustomerEmail(customerEmail)
    setNewGroupName(customerEmail) // Use email as display name
    // Load currently assigned properties (direct email assignment)
    const assignedProperties = apartments.filter((apt: any) => 
      apt.groups && apt.groups.includes(customerEmail)
    )
    setSelectedPropertyIds(new Set(assignedProperties.map((apt: any) => apt.id)))
    setShowGroupModal(true)
  }

  const handleUpdateGroup = async () => {
    if (!editingGroup && !editingCustomerEmail) {
      alert('Please select a group or customer to edit')
      return
    }
    
    if (editingGroup && !newGroupName) {
      alert('Please enter a group name')
      return
    }

    try {
      if (editingGroup) {
        // Editing a regular group
        const oldGroup = editingGroup
        const oldName = oldGroup.name
        const newName = newGroupName
        
        // Update group name in groups array and update property assignments
        await updateData((data) => {
          const updatedApartments = data.apartments.map(apt => {
            const isSelected = selectedPropertyIds.has(apt.id)
            const currentlyHasGroup = apt.groups && apt.groups.includes(oldName)
            
            let updatedGroups = [...(apt.groups || [])]
            
            // If property is selected but doesn't have the group, add it
            if (isSelected && !currentlyHasGroup) {
              updatedGroups.push(newName)
            }
            // If property is not selected but has the group, remove it
            else if (!isSelected && currentlyHasGroup) {
              updatedGroups = updatedGroups.filter((g: string) => g !== oldName)
            }
            // If property is selected and has the old name, update to new name
            else if (isSelected && currentlyHasGroup) {
              updatedGroups = updatedGroups.map((g: string) => g === oldName ? newName : g)
            }
            
            return {
              ...apt,
              groups: updatedGroups
            }
          })
          
          return {
            ...data,
            groups: data.groups.map(g => 
              g.id === oldGroup.id ? { ...g, name: newName } : g
            ),
            apartments: updatedApartments
          }
        })
      } else if (editingCustomerEmail) {
        // Editing a customer email assignment
        await updateData((data) => {
          const updatedApartments = data.apartments.map(apt => {
            const isSelected = selectedPropertyIds.has(apt.id)
            const currentlyHasEmail = apt.groups && apt.groups.includes(editingCustomerEmail)
            
            let updatedGroups = [...(apt.groups || [])]
            
            // If property is selected but doesn't have the email, add it
            if (isSelected && !currentlyHasEmail) {
              updatedGroups.push(editingCustomerEmail)
            }
            // If property is not selected but has the email, remove it
            else if (!isSelected && currentlyHasEmail) {
              updatedGroups = updatedGroups.filter((g: string) => g !== editingCustomerEmail)
            }
            
            return {
              ...apt,
              groups: updatedGroups
            }
          })
          
          return {
            ...data,
            apartments: updatedApartments
          }
        })
        
        if (currentUser) {
          await logChange({
            user_id: currentUser.id,
            action: 'Updated customer property assignments',
            entity_type: 'user',
            new_value: editingCustomerEmail
          })
        }
      }
      
      if (editingCustomerEmail && !editingGroup) {
        // Editing a customer email assignment
        await updateData((data) => {
          const updatedApartments = data.apartments.map(apt => {
            const isSelected = selectedPropertyIds.has(apt.id)
            const currentlyHasEmail = apt.groups && apt.groups.includes(editingCustomerEmail)
            
            let updatedGroups = [...(apt.groups || [])]
            
            // If property is selected but doesn't have the email, add it
            if (isSelected && !currentlyHasEmail) {
              updatedGroups.push(editingCustomerEmail)
            }
            // If property is not selected but has the email, remove it
            else if (!isSelected && currentlyHasEmail) {
              updatedGroups = updatedGroups.filter((g: string) => g !== editingCustomerEmail)
            }
            
            return {
              ...apt,
              groups: updatedGroups
            }
          })
          
          return {
            ...data,
            apartments: updatedApartments
          }
        })
        
        if (currentUser) {
          await logChange({
            user_id: currentUser.id,
            action: 'Updated customer property assignments',
            entity_type: 'user',
            new_value: editingCustomerEmail
          })
        }
      }

      setShowGroupModal(false)
      setEditingGroup(null)
      setEditingCustomerEmail(null)
      setNewGroupName('')
      setSelectedPropertyIds(new Set())
    } catch (error) {
      console.error('Failed to update:', error)
      alert('Failed to update')
    }
  }

  const handleSaveGroup = () => {
    if (editingGroup) {
      handleUpdateGroup()
    } else {
      handleCreateGroup()
    }
  }

  const handleDeleteGroup = async (groupId: string, groupName: string) => {
    if (!confirm(`Delete group ${groupName}? This will remove the group from all apartments.`)) return

    try {
      await updateData((data) => ({
        ...data,
        groups: data.groups.filter(g => g.id !== groupId),
        // Remove group from all apartments
        apartments: data.apartments.map(apt => ({
          ...apt,
          groups: apt.groups.filter((g: string) => g !== groupName)
        }))
      }))

      if (currentUser) {
        await logChange({
          user_id: currentUser.id,
          action: 'Deleted group',
          entity_type: 'group',
          old_value: groupName
        })
      }
    } catch (error) {
      console.error('Failed to delete group:', error)
      alert('Failed to delete group')
    }
  }

  const resetForm = () => {
    setEditingGroup(null)
    setEditingCustomerEmail(null)
    setNewGroupName('')
    setSelectedPropertyIds(new Set())
  }
  
  const handlePropertyToggle = (propertyId: string) => {
    const newSelected = new Set(selectedPropertyIds)
    if (newSelected.has(propertyId)) {
      newSelected.delete(propertyId)
    } else {
      newSelected.add(propertyId)
    }
    setSelectedPropertyIds(newSelected)
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => {
          resetForm()
          setShowGroupModal(true)
        }}>+ New Group</Button>
      </div>

      <Modal
        isOpen={showGroupModal}
        onClose={() => {
          setShowGroupModal(false)
          resetForm()
        }}
        title={editingCustomerEmail ? `Edit Customer: ${editingCustomerEmail}` : (editingGroup ? 'Edit Group' : 'New Group')}
        size="lg"
      >
        <div className="space-y-4">
          {editingGroup && (
            <div>
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                placeholder="Group name"
                required
              />
            </div>
          )}
          
          {editingCustomerEmail && (
            <div>
              <Label>Customer Email</Label>
              <p className="text-sm text-muted-foreground py-2">{editingCustomerEmail}</p>
              <p className="text-xs text-muted-foreground">
                Select properties to assign directly to this customer's email
              </p>
            </div>
          )}
          
          {(editingGroup || editingCustomerEmail) && (
            <div>
              <Label>Assigned Properties</Label>
              <p className="text-xs text-muted-foreground mb-2">
                Select properties to assign to this group
              </p>
              <div className="border rounded-md p-4 max-h-96 overflow-y-auto">
                {apartments.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No properties found</p>
                ) : (
                  <div className="space-y-2">
                    {apartments.map((apt: any) => (
                      <label key={apt.id} className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 p-2 rounded">
                        <input
                          type="checkbox"
                          checked={selectedPropertyIds.has(apt.id)}
                          onChange={() => handlePropertyToggle(apt.id)}
                          className="cursor-pointer"
                        />
                        <div className="flex-1">
                          <span className="text-sm font-medium">{apt.name}</span>
                          {apt.address && (
                            <p className="text-xs text-muted-foreground">{apt.address}</p>
                          )}
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {selectedPropertyIds.size} of {apartments.length} properties selected
              </p>
            </div>
          )}
          
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => {
              setShowGroupModal(false)
              resetForm()
            }}>Cancel</Button>
            <Button onClick={handleSaveGroup}>
              {editingGroup || editingCustomerEmail ? 'Update' : 'Create'}
            </Button>
          </div>
        </div>
      </Modal>

      <div className="space-y-2">
        {/* Normal Groups */}
        {groups.length === 0 && getCustomerUsersWithProperties().length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No groups or customer assignments found
            </CardContent>
          </Card>
        ) : (
          <>
            {groups.map((group) => {
              const groupApts = getGroupApartments(group.name)
              const apartmentCount = groupApts.length
              
              return (
                <Card key={group.id}>
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold">{group.name}</p>
                          <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">
                            {apartmentCount} {apartmentCount === 1 ? 'apartment' : 'apartments'}
                          </span>
                        </div>
                        {apartmentCount > 0 && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {apartmentCount <= 10 ? (
                              groupApts.map((a: any) => a.name).join(', ')
                            ) : (
                              <>
                                {groupApts.slice(0, 10).map((a: any) => a.name).join(', ')}, ... (Total: {apartmentCount})
                              </>
                            )}
                          </p>
                        )}
                        {apartmentCount === 0 && (
                          <p className="text-sm text-muted-foreground mt-1">
                            No apartments assigned
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" onClick={() => handleEditGroup(group)}>Edit</Button>
                        <Button variant="destructive" onClick={() => handleDeleteGroup(group.id, group.name)}>Delete</Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
            
            {/* Customer Users with Direct Property Assignments */}
            {getCustomerUsersWithProperties().map((customer: any) => {
              const customerApts = apartments.filter((apt: any) => 
                apt.groups && apt.groups.includes(customer.email)
              )
              const apartmentCount = customerApts.length
              
              return (
                <Card key={`customer-${customer.id}`}>
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold">{customer.email}</p>
                          <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                            Customer
                          </span>
                          <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">
                            {apartmentCount} {apartmentCount === 1 ? 'apartment' : 'apartments'}
                          </span>
                        </div>
                        {apartmentCount > 0 && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {apartmentCount <= 10 ? (
                              customerApts.map((a: any) => a.name).join(', ')
                            ) : (
                              <>
                                {customerApts.slice(0, 10).map((a: any) => a.name).join(', ')}, ... (Total: {apartmentCount})
                              </>
                            )}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" onClick={() => handleEditCustomerEmail(customer.email)}>Edit</Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </>
        )}
      </div>
    </div>
  )
}
