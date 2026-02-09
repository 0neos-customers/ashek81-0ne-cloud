'use client'

import { useState, useEffect } from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Button,
  Input,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@0ne/ui'
import { Search, Shield, Users, RefreshCw, Loader2 } from 'lucide-react'
import { AppShell } from '@/components/shell'
import { APPS, type AppId } from '@/lib/apps'

interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  imageUrl?: string
  permissions: {
    apps: Record<AppId, boolean>
    isAdmin: boolean
  }
}

export default function AdminPermissionsPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [saving, setSaving] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const fetchUsers = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/admin/permissions')
      if (!response.ok) {
        throw new Error('Failed to fetch users')
      }
      const data = await response.json()
      setUsers(data.users || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load users')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  const filteredUsers = users.filter(
    (user) =>
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      `${user.firstName} ${user.lastName}`
        .toLowerCase()
        .includes(searchQuery.toLowerCase())
  )

  const toggleAppPermission = async (userId: string, appId: AppId) => {
    const user = users.find((u) => u.id === userId)
    if (!user) return

    setSaving(userId)
    const currentValue = user.permissions.apps[appId]

    // Optimistic update
    setUsers((prev) =>
      prev.map((u) => {
        if (u.id === userId) {
          return {
            ...u,
            permissions: {
              ...u.permissions,
              apps: {
                ...u.permissions.apps,
                [appId]: !currentValue,
              },
            },
          }
        }
        return u
      })
    )

    try {
      const response = await fetch('/api/admin/permissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetUserId: userId,
          appId,
          enabled: !currentValue,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to update permissions')
      }
    } catch {
      // Revert on error
      setUsers((prev) =>
        prev.map((u) => {
          if (u.id === userId) {
            return {
              ...u,
              permissions: {
                ...u.permissions,
                apps: {
                  ...u.permissions.apps,
                  [appId]: currentValue,
                },
              },
            }
          }
          return u
        })
      )
    } finally {
      setSaving(null)
    }
  }

  const toggleAdminStatus = async (userId: string) => {
    const user = users.find((u) => u.id === userId)
    if (!user) return

    setSaving(userId)
    const currentValue = user.permissions.isAdmin

    // Optimistic update
    setUsers((prev) =>
      prev.map((u) => {
        if (u.id === userId) {
          return {
            ...u,
            permissions: {
              ...u.permissions,
              isAdmin: !currentValue,
            },
          }
        }
        return u
      })
    )

    try {
      const response = await fetch('/api/admin/permissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetUserId: userId,
          isAdmin: !currentValue,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to update admin status')
      }
    } catch {
      // Revert on error
      setUsers((prev) =>
        prev.map((u) => {
          if (u.id === userId) {
            return {
              ...u,
              permissions: {
                ...u.permissions,
                isAdmin: currentValue,
              },
            }
          }
          return u
        })
      )
    } finally {
      setSaving(null)
    }
  }

  return (
    <AppShell title="0ne">
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">User Permissions</h1>
          <p className="text-muted-foreground">
            Manage which apps each user can access
          </p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Users
                </CardTitle>
                <CardDescription>
                  Toggle app access for each user
                </CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={fetchUsers} disabled={loading}>
                <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search users..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {error && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
                {error}
              </div>
            )}

            {loading ? (
              <div className="flex h-32 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[250px]">User</TableHead>
                      {APPS.map((app) => (
                        <TableHead key={app.id} className="text-center">
                          {app.name}
                        </TableHead>
                      ))}
                      <TableHead className="text-center">Admin</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-sm font-medium">
                              {user.firstName?.[0] || '?'}
                              {user.lastName?.[0] || ''}
                            </div>
                            <div>
                              <div className="font-medium">
                                {user.firstName} {user.lastName}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {user.email}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        {APPS.map((app) => (
                          <TableCell key={app.id} className="text-center">
                            <ToggleSwitch
                              enabled={user.permissions?.apps?.[app.id] || false}
                              onChange={() => toggleAppPermission(user.id, app.id)}
                              loading={saving === user.id}
                            />
                          </TableCell>
                        ))}
                        <TableCell className="text-center">
                          <ToggleSwitch
                            enabled={user.permissions?.isAdmin || false}
                            onChange={() => toggleAdminStatus(user.id)}
                            loading={saving === user.id}
                            variant="admin"
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                    {filteredUsers.length === 0 && !loading && (
                      <TableRow>
                        <TableCell
                          colSpan={APPS.length + 2}
                          className="h-24 text-center text-muted-foreground"
                        >
                          No users found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Permission Legend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <h4 className="font-medium">App Access</h4>
                <p className="text-sm text-muted-foreground">
                  Users can only see and access apps they have enabled. The home
                  dashboard will only show tiles for enabled apps.
                </p>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium">Admin Access</h4>
                <p className="text-sm text-muted-foreground">
                  Admins can access all apps regardless of individual toggles,
                  manage user permissions, and access system settings.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  )
}

function ToggleSwitch({
  enabled,
  onChange,
  loading,
  variant = 'default',
}: {
  enabled: boolean
  onChange: () => void
  loading?: boolean
  variant?: 'default' | 'admin'
}) {
  const baseClasses =
    'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2'

  const enabledColor =
    variant === 'admin'
      ? 'bg-amber-500 focus:ring-amber-500'
      : 'bg-lime-500 focus:ring-lime-500'

  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      onClick={onChange}
      disabled={loading}
      className={`${baseClasses} ${enabled ? enabledColor : 'bg-gray-200'} ${loading ? 'opacity-50' : ''}`}
    >
      <span
        aria-hidden="true"
        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${enabled ? 'translate-x-5' : 'translate-x-0'}`}
      />
    </button>
  )
}
