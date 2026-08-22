'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getAllUsers, getAllUsersSync, updateUserRole } from '@/lib/api/users'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { toast } from 'sonner'
import { Shield, UserCog, FilterX, RefreshCw } from 'lucide-react'
import { getRoleLabel, ROLES } from '@/lib/roles'

export default function AdminUsersPage() {
  const [users, setUsers] = useState(() => getAllUsersSync())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [roleFilter, setRoleFilter] = useState('all')
  const [roleChangeTarget, setRoleChangeTarget] = useState(null)

  const fetchUsers = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getAllUsers()
      setUsers(data || [])
    } catch (err) {
      console.error('Failed to fetch users:', err)
      setError('Failed to load user accounts. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [])


  const handleConfirmRoleChange = async () => {
    if (!roleChangeTarget) return
    const { user, newRole } = roleChangeTarget
    try {
      await updateUserRole(user.id, newRole)
      toast.success(`Updated ${user.name}'s role to ${getRoleLabel(newRole)}`)
      setRoleChangeTarget(null)
      fetchUsers()
    } catch (err) {
      console.error('Failed to update role:', err)
      toast.error(`Failed to update ${user.name}'s role`)
    }
  }

  const getRoleBadge = (role) => {
    switch (role?.toLowerCase()) {
      case 'admin':
        return <Badge variant="outline" className="bg-saffron/10 text-saffron border-saffron/30 font-inter text-xs font-semibold">Admin</Badge>
      case 'editor':
        return <Badge variant="outline" className="bg-indigo-100 text-indigo-800 border-indigo-200 font-inter text-xs font-semibold">Editor Employee</Badge>
      case 'read_only':
      case 'employee':
        return <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-200 font-inter text-xs font-semibold">Viewer Employee</Badge>
      case 'customer':
      default:
        return <Badge variant="outline" className="bg-stone-100 text-stone-700 border-stone-200 font-inter text-xs">Customer</Badge>
    }
  }

  const filteredUsers = users.filter((u) => {
    if (roleFilter === 'all') return true
    if (roleFilter === 'read_only' && u.role === 'employee') return true
    return u.role?.toLowerCase() === roleFilter.toLowerCase()
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight font-display text-stone-900">User Management</h2>
          <p className="text-sm text-stone-500 font-inter">View registered accounts and assign system access permissions</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-[190px] bg-white border-stone-200 font-inter text-sm">
              <SelectValue placeholder="Filter by role" />
            </SelectTrigger>
            <SelectContent className="bg-white">
              <SelectItem value="all">All Roles</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="editor">Editor Employee</SelectItem>
              <SelectItem value="read_only">Viewer Employee</SelectItem>
              <SelectItem value="customer">Customer</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {error ? (
        <div className="text-center py-12 bg-white rounded-lg border border-stone-200 p-6 space-y-4">
          <p className="text-stone-600 font-inter">{error}</p>
          <Button onClick={fetchUsers} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" /> Retry
          </Button>
        </div>
      ) : (
        <div className="rounded-md border border-stone-200 bg-white overflow-x-auto">
          <Table>
            <TableHeader className="bg-stone-50">
              <TableRow>
                <TableHead className="font-semibold text-stone-700">Name</TableHead>
                <TableHead className="font-semibold text-stone-700">Email</TableHead>
                <TableHead className="font-semibold text-stone-700">Current Role</TableHead>
                <TableHead className="font-semibold text-stone-700">Joined Date</TableHead>
                <TableHead className="text-right font-semibold text-stone-700">Change Role</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-stone-100">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-8 w-28 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-12 text-center text-stone-500 font-inter">
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <FilterX className="w-8 h-8 text-stone-400" />
                      <p className="font-medium text-stone-700">
                        {roleFilter !== 'all'
                          ? `No user accounts match the "${roleFilter}" role filter.`
                          : 'No user accounts found.'}
                      </p>
                      {roleFilter !== 'all' && (
                        <Button variant="outline" size="sm" onClick={() => setRoleFilter('all')}>
                          Clear Role Filter
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers.map((user) => (
                  <TableRow key={user.id} className="hover:bg-stone-50/50">
                    <TableCell className="font-semibold text-stone-900 font-inter">{user.name}</TableCell>
                    <TableCell className="font-inter text-stone-600 text-sm">{user.email}</TableCell>
                    <TableCell>{getRoleBadge(user.role)}</TableCell>
                    <TableCell className="font-inter text-stone-500 text-sm whitespace-nowrap">
                      {new Date(user.createdAt).toLocaleDateString('en-IN', {
                        year: 'numeric', month: 'short', day: 'numeric'
                      })}
                    </TableCell>
                    <TableCell className="text-right">
                      <Select
                        value={user.role === 'employee' ? 'read_only' : user.role}
                        onValueChange={(newRole) => {
                          const currentNormalized = user.role === 'employee' ? 'read_only' : user.role
                          if (newRole !== currentNormalized) {
                            setRoleChangeTarget({ user, currentRole: currentNormalized, newRole })
                          }
                        }}
                      >
                        <SelectTrigger className="w-[155px] ml-auto h-8 text-xs bg-white border-stone-200">
                          <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                        <SelectContent className="bg-white">
                          <SelectItem value="customer">Customer</SelectItem>
                          <SelectItem value="read_only">Viewer Employee</SelectItem>
                          <SelectItem value="editor">Editor Employee</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Specific User Role Change Confirmation Dialog */}
      <AlertDialog open={Boolean(roleChangeTarget)} onOpenChange={(open) => !open && setRoleChangeTarget(null)}>
        <AlertDialogContent className="bg-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display text-xl text-stone-900">Change User Role</AlertDialogTitle>
            <AlertDialogDescription className="font-inter text-stone-600 space-y-2">
              <span>
                Are you sure you want to change <span className="font-semibold text-stone-900">{roleChangeTarget?.user?.name}</span>'s role from{' '}
                <span className="font-semibold text-stone-900">{getRoleLabel(roleChangeTarget?.currentRole)}</span> to{' '}
                <span className="font-semibold text-saffron">{getRoleLabel(roleChangeTarget?.newRole)}</span>?
              </span>
              <span className="block text-xs text-stone-500 pt-1">
                This will immediately update their access permissions across the system.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmRoleChange} className="bg-[#FF6B00] hover:bg-[#e05e00] text-white font-inter">
              Confirm Role Change
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
