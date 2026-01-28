import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Modal } from '@/components/ui/modal'
import { useDataStore } from '@/stores/dataStore'
import { useUserStore } from '@/stores/userStore'
import { logChange } from '@/utils/logging'

interface User {
  id: string
  email: string
  role: 'admin' | 'normal' | 'customer'
  password?: string
}

export function UserManagement() {
  const users = useDataStore(state => state.users) as User[]
  const groups = useDataStore(state => state.groups)
  const apartments = useDataStore(state => state.apartments)
  const userGroups = useDataStore(state => state.user_groups || [])
  const updateData = useDataStore(state => state.updateData)
  const [showUserModal, setShowUserModal] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [newUserEmail, setNewUserEmail] = useState('')
  const [newUserPassword, setNewUserPassword] = useState('')
  const [newUserRole, setNewUserRole] = useState<'admin' | 'normal' | 'customer'>('normal')
  const [selectedGroupId, setSelectedGroupId] = useState<string>('')
  const [selectedPropertyIds, setSelectedPropertyIds] = useState<Set<string>>(new Set())

  const { currentUser } = useUserStore()

  const handleCreateUser = async () => {
    if (!newUserEmail || !newUserPassword) {
      alert('Please fill in all fields')
      return
    }

    // Group assignment is optional for customers (they can be assigned directly to properties)

    try {
      const newUser: User = {
        id: crypto.randomUUID(),
        email: newUserEmail,
        password: newUserPassword,
        role: newUserRole
      }

      await updateData((data) => {
        const updatedUsers = [...data.users, newUser]
        const updatedUserGroups = [...(data.user_groups || [])]
        
        // If customer, add to user_groups
        if (newUserRole === 'customer' && selectedGroupId) {
          updatedUserGroups.push({
            id: crypto.randomUUID(),
            user_id: newUser.id,
            group_id: selectedGroupId
          })
        }

        return {
          ...data,
          users: updatedUsers,
          user_groups: updatedUserGroups
        }
      })

      if (currentUser) {
        await logChange({
          user_id: currentUser.id,
          action: 'Created user',
          entity_type: 'user',
          new_value: newUserEmail
        })
      }

      setShowUserModal(false)
      setNewUserEmail('')
      setNewUserPassword('')
      setNewUserRole('normal')
      setSelectedGroupId('')
    } catch (error) {
      console.error('Failed to create user:', error)
      alert('Failed to create user')
    }
  }

  const handleEditUser = (user: User) => {
    setEditingUser(user)
    setNewUserEmail(user.email)
    setNewUserRole(user.role)
    setNewUserPassword('')
    // Load user's group if customer
    if (user.role === 'customer') {
      const userGroup = userGroups.find((ug: any) => ug.user_id === user.id)
      setSelectedGroupId(userGroup?.group_id || '')
      
      // Load currently assigned properties (direct email assignment OR via group)
      const userGroupObj = userGroup ? groups.find((g: any) => g.id === userGroup.group_id) : null
      const userGroupName = userGroupObj?.name || null
      
      const assignedProperties = apartments.filter((apt: any) => {
        if (!apt.groups || apt.groups.length === 0) return false
        // Check direct email assignment
        if (apt.groups.includes(user.email)) return true
        // Check group assignment
        if (userGroupName && apt.groups.includes(userGroupName)) return true
        return false
      })
      setSelectedPropertyIds(new Set(assignedProperties.map((apt: any) => apt.id)))
    } else {
      setSelectedGroupId('')
      setSelectedPropertyIds(new Set())
    }
    setShowUserModal(true)
  }

  const handleUpdateUser = async () => {
    if (!editingUser || !newUserEmail) {
      alert('Please fill in all fields')
      return
    }

    // Group assignment is optional for customers (they can be assigned directly to properties)

    try {
      const oldUser = editingUser
      
      await updateData((data) => {
        const updatedUsers = data.users.map(u => 
          u.id === editingUser.id
            ? {
                ...u,
                email: newUserEmail,
                role: newUserRole,
                ...(newUserPassword ? { password: newUserPassword } : {})
              }
            : u
        )

        // Update user_groups for customer users
        let updatedUserGroups = [...(data.user_groups || [])]
        
        // Remove existing user_groups for this user
        updatedUserGroups = updatedUserGroups.filter((ug: any) => ug.user_id !== editingUser.id)
        
        // If customer, add new user_group
        if (newUserRole === 'customer' && selectedGroupId) {
          updatedUserGroups.push({
            id: crypto.randomUUID(),
            user_id: editingUser.id,
            group_id: selectedGroupId
          })
        }
        
        // Update property assignments for customer users
        let updatedApartments = data.apartments
        if (newUserRole === 'customer' && editingUser) {
          const customerEmail = newUserEmail
          const oldCustomerEmail = editingUser.email
          const customerUserGroup = selectedGroupId 
            ? groups.find((g: any) => g.id === selectedGroupId)
            : null
          const customerGroupName = customerUserGroup?.name || null
          
          // Get old group name if user had one
          const oldUserGroup = userGroups.find((ug: any) => ug.user_id === editingUser.id)
          const oldUserGroupObj = oldUserGroup ? groups.find((g: any) => g.id === oldUserGroup.group_id) : null
          const oldGroupName = oldUserGroupObj?.name || null
          
          updatedApartments = data.apartments.map(apt => {
            const isSelected = selectedPropertyIds.has(apt.id)
            const currentlyHasOldEmail = apt.groups && apt.groups.includes(oldCustomerEmail)
            const currentlyHasNewEmail = apt.groups && apt.groups.includes(customerEmail)
            const currentlyHasOldGroup = oldGroupName && apt.groups && apt.groups.includes(oldGroupName)
            const currentlyHasNewGroup = customerGroupName && apt.groups && apt.groups.includes(customerGroupName)
            
            let updatedGroups = [...(apt.groups || [])]
            
            if (isSelected) {
              // Property should be assigned
              // Remove old email if email changed
              if (oldCustomerEmail !== customerEmail && currentlyHasOldEmail) {
                updatedGroups = updatedGroups.filter((g: string) => g !== oldCustomerEmail)
              }
              // Add new email if not present
              if (!currentlyHasNewEmail) {
                updatedGroups.push(customerEmail)
              }
              // Remove old group if group changed
              if (oldGroupName && oldGroupName !== customerGroupName && currentlyHasOldGroup) {
                updatedGroups = updatedGroups.filter((g: string) => g !== oldGroupName)
              }
              // Add new group if user has one and it's not present
              if (customerGroupName && !currentlyHasNewGroup) {
                updatedGroups.push(customerGroupName)
              }
            } else {
              // Property should not be assigned - remove both old and new email
              updatedGroups = updatedGroups.filter((g: string) => 
                g !== oldCustomerEmail && g !== customerEmail
              )
              // Remove old group if present
              if (oldGroupName && currentlyHasOldGroup) {
                updatedGroups = updatedGroups.filter((g: string) => g !== oldGroupName)
              }
            }
            
            return {
              ...apt,
              groups: updatedGroups
            }
          })
        }

        return {
          ...data,
          users: updatedUsers,
          user_groups: updatedUserGroups,
          apartments: updatedApartments
        }
      })

      if (currentUser) {
        await logChange({
          user_id: currentUser.id,
          action: 'Updated user',
          entity_type: 'user',
          entity_id: editingUser.id,
          old_value: oldUser.email,
          new_value: newUserEmail
        })
      }

      setShowUserModal(false)
      setEditingUser(null)
      setNewUserEmail('')
      setNewUserPassword('')
      setNewUserRole('normal')
      setSelectedGroupId('')
    } catch (error) {
      console.error('Failed to update user:', error)
      alert('Failed to update user')
    }
  }

  const handleSaveUser = () => {
    if (editingUser) {
      handleUpdateUser()
    } else {
      handleCreateUser()
    }
  }

  const handleDeleteUser = async (userId: string, userEmail: string) => {
    if (!confirm(`Delete user ${userEmail}?`)) return

    try {
      await updateData((data) => ({
        ...data,
        users: data.users.filter(u => u.id !== userId),
        // Remove bookings for this user from apartments
        apartments: data.apartments.map(apt => ({
          ...apt,
          bookings: apt.bookings.filter((b: any) => b.user_id !== userId)
        }))
      }))
      
      if (currentUser) {
        await logChange({
          user_id: currentUser.id,
          action: 'Deleted user',
          entity_type: 'user',
          old_value: userEmail
        })
      }
    } catch (error) {
      console.error('Failed to delete user:', error)
      alert('Failed to delete user')
    }
  }

  const resetForm = () => {
    setEditingUser(null)
    setNewUserEmail('')
    setNewUserPassword('')
    setNewUserRole('normal')
    setSelectedGroupId('')
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
          setShowUserModal(true)
        }}>+ New User</Button>
      </div>

      <Modal
        isOpen={showUserModal}
        onClose={() => {
          setShowUserModal(false)
          resetForm()
        }}
        title={editingUser ? 'Edit User' : 'New User'}
        size={newUserRole === 'customer' && editingUser ? 'lg' : 'md'}
      >
        <div className="space-y-4">
          <div>
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              value={newUserEmail}
              onChange={(e) => setNewUserEmail(e.target.value)}
              placeholder="user@example.com"
              required
            />
          </div>
          <div>
            <Label htmlFor="password">Password {editingUser ? '(leave blank to keep current)' : '*'}</Label>
            <Input
              id="password"
              type="password"
              value={newUserPassword}
              onChange={(e) => setNewUserPassword(e.target.value)}
              placeholder="Enter password"
              required={!editingUser}
            />
          </div>
          <div>
            <Label htmlFor="role">Role *</Label>
            <select
              id="role"
              value={newUserRole}
              onChange={(e) => {
                setNewUserRole(e.target.value as 'admin' | 'normal' | 'customer')
                if (e.target.value !== 'customer') {
                  setSelectedGroupId('')
                }
              }}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="normal">Normal</option>
              <option value="admin">Admin</option>
              <option value="customer">Customer</option>
            </select>
          </div>
          {newUserRole === 'customer' && (
            <div>
              <Label htmlFor="group">Group (Optional)</Label>
              <select
                id="group"
                value={selectedGroupId}
                onChange={(e) => setSelectedGroupId(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">No group (assign properties directly)</option>
                {groups.map((group: any) => (
                  <option key={group.id} value={group.id}>
                    {group.name}
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground mt-1">
                Customer users can be assigned to a group OR have properties assigned directly to their email
              </p>
            </div>
          )}
          
          {editingUser && newUserRole === 'customer' && (
            <div>
              <Label>Assigned Properties</Label>
              <p className="text-xs text-muted-foreground mb-2">
                Select properties to assign to this customer (direct email assignment)
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
              setShowUserModal(false)
              resetForm()
            }}>Cancel</Button>
            <Button onClick={handleSaveUser}>{editingUser ? 'Update' : 'Create'}</Button>
          </div>
        </div>
      </Modal>

      <div className="space-y-2">
        {users.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No users found
            </CardContent>
          </Card>
        ) : (
          users.map((user) => (
            <Card key={user.id}>
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold">{user.email}</p>
                    {user.role === 'admin' && (
                      <span className="px-2 py-1 text-xs font-semibold rounded bg-red-500 text-white">
                        Admin
                      </span>
                    )}
                    {user.role === 'normal' && (
                      <span className="px-2 py-1 text-xs font-semibold rounded bg-blue-500 text-white">
                        Normal
                      </span>
                    )}
                    {user.role === 'customer' && (
                      <span className="px-2 py-1 text-xs font-semibold rounded bg-green-500 text-white">
                        Customer
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => handleEditUser(user)}>Edit</Button>
                    <Button variant="destructive" onClick={() => handleDeleteUser(user.id, user.email)}>Delete</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
