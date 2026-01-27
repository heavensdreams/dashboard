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
  const apartments = useDataStore(state => state.apartments)
  const updateData = useDataStore(state => state.updateData)
  const [showGroupModal, setShowGroupModal] = useState(false)
  const [editingGroup, setEditingGroup] = useState<Group | null>(null)
  const [newGroupName, setNewGroupName] = useState('')

  const { currentUser } = useUserStore()

  const getGroupApartments = (groupName: string) => {
    return apartments.filter((apt: any) => apt.groups && apt.groups.includes(groupName))
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
    setNewGroupName(group.name)
    setShowGroupModal(true)
  }

  const handleUpdateGroup = async () => {
    if (!editingGroup || !newGroupName) {
      alert('Please enter a group name')
      return
    }

    try {
      const oldGroup = editingGroup
      const oldName = oldGroup.name
      
      // Update group name in groups array
      await updateData((data) => ({
        ...data,
        groups: data.groups.map(g => 
          g.id === editingGroup.id ? { ...g, name: newGroupName } : g
        ),
        // Update group name in all apartments that reference it
        apartments: data.apartments.map(apt => ({
          ...apt,
          groups: apt.groups.map((g: string) => g === oldName ? newGroupName : g)
        }))
      }))

      if (currentUser) {
        await logChange({
          user_id: currentUser.id,
          action: 'Updated group',
          entity_type: 'group',
          entity_id: editingGroup.id,
          old_value: oldName,
          new_value: newGroupName
        })
      }

      setShowGroupModal(false)
      setEditingGroup(null)
      setNewGroupName('')
    } catch (error) {
      console.error('Failed to update group:', error)
      alert('Failed to update group')
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
    setNewGroupName('')
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
        title={editingGroup ? 'Edit Group' : 'New Group'}
        size="md"
      >
        <div className="space-y-4">
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
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => {
              setShowGroupModal(false)
              resetForm()
            }}>Cancel</Button>
            <Button onClick={handleSaveGroup}>{editingGroup ? 'Update' : 'Create'}</Button>
          </div>
        </div>
      </Modal>

      <div className="space-y-2">
        {groups.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No groups found
            </CardContent>
          </Card>
        ) : (
          groups.map((group) => {
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
          })
        )}
      </div>
    </div>
  )
}
