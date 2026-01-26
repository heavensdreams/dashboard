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
  const userGroups = useDataStore(state => state.user_groups || [])
  const updateData = useDataStore(state => state.updateData)
  const [showUserModal, setShowUserModal] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [newUserEmail, setNewUserEmail] = useState('')
  const [newUserPassword, setNewUserPassword] = useState('')
  const [newUserRole, setNewUserRole] = useState<'admin' | 'normal' | 'customer'>('normal')
  const [selectedGroupId, setSelectedGroupId] = useState<string>('')

  const { currentUser } = useUserStore()

  const handleCreateUser = async () => {
    if (!newUserEmail || !newUserPassword) {
      alert('Please fill in all fields')
      return
    }

    // Validate customer must have a group
    if (newUserRole === 'customer' && !selectedGroupId) {
      alert('Customer users must be assigned to a group')
      return
    }

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
    } else {
      setSelectedGroupId('')
    }
    setShowUserModal(true)
  }

  const handleUpdateUser = async () => {
    if (!editingUser || !newUserEmail) {
      alert('Please fill in all fields')
      return
    }

    // Validate customer must have a group
    if (newUserRole === 'customer' && !selectedGroupId) {
      alert('Customer users must be assigned to a group')
      return
    }

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

        return {
          ...data,
          users: updatedUsers,
          user_groups: updatedUserGroups
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
        size="md"
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
              <Label htmlFor="group">Group * (Required for customers)</Label>
              <select
                id="group"
                value={selectedGroupId}
                onChange={(e) => setSelectedGroupId(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                required
              >
                <option value="">Select a group</option>
                {groups.map((group: any) => (
                  <option key={group.id} value={group.id}>
                    {group.name}
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground mt-1">
                Customer users can only access properties in their assigned group
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
