import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useDataStore } from '@/stores/dataStore'

interface Log {
  id: string
  user_id: string
  action: string
  entity_type: string
  entity_id?: string
  old_value?: string
  new_value?: string
  timestamp: string
}

export function LogsView() {
  const logs = (useDataStore(state => state.logs) || []) as Log[]
  const [filteredLogs, setFilteredLogs] = useState<Log[]>([])
  const [entityFilter, setEntityFilter] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [dateFilter, setDateFilter] = useState<string>('')

  useEffect(() => {
    applyFilters()
  }, [logs, entityFilter, searchTerm, dateFilter])

  const applyFilters = () => {
    // Sort by timestamp descending (newest first)
    let filtered = [...logs].sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    )

    // Entity type filter
    if (entityFilter !== 'all') {
      filtered = filtered.filter(log => log.entity_type.toLowerCase() === entityFilter.toLowerCase())
    }

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(log =>
        log.action.toLowerCase().includes(term) ||
        (log.old_value && log.old_value.toLowerCase().includes(term)) ||
        (log.new_value && log.new_value.toLowerCase().includes(term))
      )
    }

    // Date filter
    if (dateFilter) {
      const filterDate = new Date(dateFilter).toISOString().split('T')[0]
      filtered = filtered.filter(log => {
        const logDate = new Date(log.timestamp).toISOString().split('T')[0]
        return logDate === filterDate
      })
    }

    setFilteredLogs(filtered)
  }

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp)
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Activity Logs</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex gap-4 flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <Input
                placeholder="Search logs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div>
              <select
                value={entityFilter}
                onChange={(e) => setEntityFilter(e.target.value)}
                className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="all">All Types</option>
                <option value="property">Property</option>
                <option value="user">User</option>
                <option value="group">Group</option>
                <option value="booking">Booking</option>
              </select>
            </div>
            <div>
              <Input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                placeholder="Filter by date"
                className="w-[180px]"
              />
            </div>
            {dateFilter && (
              <button
                onClick={() => setDateFilter('')}
                className="text-sm text-blue-600 hover:underline"
              >
                Clear date filter
              </button>
            )}
          </div>
          <div className="text-sm text-muted-foreground">
            Showing {filteredLogs.length} of {logs.length} log entries
          </div>
        </CardContent>
      </Card>

      {/* Logs List */}
      <div className="space-y-2">
        {filteredLogs.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              {logs.length === 0 ? 'No logs found' : 'No logs match your filters'}
            </CardContent>
          </Card>
        ) : (
          filteredLogs.map((log) => (
            <Card key={log.id}>
              <CardContent className="py-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium">{log.action}</span>
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        log.entity_type === 'property' ? 'bg-blue-100 text-blue-800' :
                        log.entity_type === 'user' ? 'bg-green-100 text-green-800' :
                        log.entity_type === 'group' ? 'bg-purple-100 text-purple-800' :
                        'bg-orange-100 text-orange-800'
                      }`}>
                        {log.entity_type}
                      </span>
                    </div>
                    {log.old_value && log.new_value && (
                      <p className="text-sm text-muted-foreground">
                        Changed from "{log.old_value}" to "{log.new_value}"
                      </p>
                    )}
                    {log.new_value && !log.old_value && (
                      <p className="text-sm text-muted-foreground">
                        Created: {log.new_value}
                      </p>
                    )}
                    {log.old_value && !log.new_value && (
                      <p className="text-sm text-muted-foreground">
                        Deleted: {log.old_value}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatTimestamp(log.timestamp)}
                    </p>
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
