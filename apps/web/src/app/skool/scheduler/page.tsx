'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import {
  Button,
  Badge,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Input,
  toast,
} from '@0ne/ui'
import { Plus, MoreHorizontal, Pencil, Trash2, Loader2 } from 'lucide-react'
import { DAY_NAMES, formatScheduleTime, type SkoolScheduledPost, type DayOfWeek } from '@0ne/db'
import {
  useSchedulers,
  createScheduler,
  updateScheduler,
  deleteScheduler,
} from '@/features/skool/hooks'
import { SchedulerDialog, ConfirmDialog, type SchedulerFormData } from '@/features/skool/components'

// Day options for the inline select
const DAY_OPTIONS = [
  { value: '0', label: 'Sunday' },
  { value: '1', label: 'Monday' },
  { value: '2', label: 'Tuesday' },
  { value: '3', label: 'Wednesday' },
  { value: '4', label: 'Thursday' },
  { value: '5', label: 'Friday' },
  { value: '6', label: 'Saturday' },
]

export default function SchedulerPage() {
  const { schedulers, isLoading, refresh } = useSchedulers()

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingScheduler, setEditingScheduler] = useState<SkoolScheduledPost | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  // Delete confirmation state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Toggle loading state per row
  const [togglingIds, setTogglingIds] = useState<Set<string>>(new Set())

  // Inline editing state - simplified type for day/time changes only
  type InlineChanges = { day_of_week?: DayOfWeek; time?: string }
  const [pendingChanges, setPendingChanges] = useState<Record<string, InlineChanges>>({})
  const [savingRows, setSavingRows] = useState<Set<string>>(new Set())
  const debounceTimers = useRef<Record<string, NodeJS.Timeout>>({})

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      Object.values(debounceTimers.current).forEach(clearTimeout)
    }
  }, [])

  const handleAddClick = () => {
    setEditingScheduler(null)
    setDialogOpen(true)
  }

  const handleEditClick = (scheduler: SkoolScheduledPost) => {
    setEditingScheduler(scheduler)
    setDialogOpen(true)
  }

  const handleDeleteClick = (id: string) => {
    setDeletingId(id)
    setDeleteDialogOpen(true)
  }

  const handleSave = async (data: SchedulerFormData) => {
    setIsSaving(true)
    try {
      if (data.id) {
        // Update existing
        const result = await updateScheduler(data.id, {
          category: data.category,
          category_id: data.category_id,
          day_of_week: data.day_of_week,
          time: data.time,
          is_active: data.is_active,
          note: data.note || null,
        })
        if (result.error) {
          toast.error(result.error)
          return
        }
        toast.success('Schedule slot updated')
      } else {
        // Create new
        const result = await createScheduler({
          group_slug: data.group_slug,
          category: data.category,
          category_id: data.category_id,
          day_of_week: data.day_of_week,
          time: data.time,
          is_active: data.is_active,
          note: data.note || null,
          variation_group_id: null,
        })
        if (result.error) {
          toast.error(result.error)
          return
        }
        toast.success('Schedule slot created')
      }
      setDialogOpen(false)
      refresh()
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deletingId) return
    setIsDeleting(true)
    try {
      const result = await deleteScheduler(deletingId)
      if (result.error) {
        toast.error(result.error)
        return
      }
      toast.success('Schedule slot deleted')
      setDeleteDialogOpen(false)
      refresh()
    } finally {
      setIsDeleting(false)
      setDeletingId(null)
    }
  }

  const handleToggleActive = async (scheduler: SkoolScheduledPost) => {
    setTogglingIds((prev) => new Set(prev).add(scheduler.id))
    try {
      const result = await updateScheduler(scheduler.id, {
        is_active: !scheduler.is_active,
      })
      if (result.error) {
        toast.error(result.error)
        return
      }
      refresh()
    } finally {
      setTogglingIds((prev) => {
        const next = new Set(prev)
        next.delete(scheduler.id)
        return next
      })
    }
  }

  // Debounced save for inline editing
  const saveInlineChanges = useCallback(async (schedulerId: string, scheduler: SkoolScheduledPost, changesArg: InlineChanges) => {
    if (!changesArg) return

    setSavingRows((prev) => new Set(prev).add(schedulerId))
    try {
      const result = await updateScheduler(schedulerId, {
        day_of_week: changesArg.day_of_week ?? scheduler.day_of_week,
        time: changesArg.time ?? scheduler.time,
      })
      if (result.error) {
        toast.error(result.error)
        return
      }
      toast.success('Schedule updated')
      refresh()
    } finally {
      setSavingRows((prev) => {
        const next = new Set(prev)
        next.delete(schedulerId)
        return next
      })
      setPendingChanges((prev) => {
        const next = { ...prev }
        delete next[schedulerId]
        return next
      })
    }
  }, [refresh])

  // Handle inline day change with debounce
  const handleInlineDayChange = useCallback((scheduler: SkoolScheduledPost, newDay: string) => {
    const dayOfWeek = parseInt(newDay, 10) as DayOfWeek

    // Update pending changes and get the new accumulated changes
    const newChanges = {
      ...pendingChanges[scheduler.id],
      day_of_week: dayOfWeek,
    }
    setPendingChanges((prev) => ({
      ...prev,
      [scheduler.id]: newChanges,
    }))

    // Clear existing timer for this row
    if (debounceTimers.current[scheduler.id]) {
      clearTimeout(debounceTimers.current[scheduler.id])
    }

    // Set new debounced save timer
    debounceTimers.current[scheduler.id] = setTimeout(() => {
      saveInlineChanges(scheduler.id, scheduler, newChanges)
    }, 400)
  }, [pendingChanges, saveInlineChanges])

  // Handle inline time change with debounce
  const handleInlineTimeChange = useCallback((scheduler: SkoolScheduledPost, newTime: string) => {
    // Update pending changes and get the new accumulated changes
    const newChanges = {
      ...pendingChanges[scheduler.id],
      time: newTime,
    }
    setPendingChanges((prev) => ({
      ...prev,
      [scheduler.id]: newChanges,
    }))

    // Clear existing timer for this row
    if (debounceTimers.current[scheduler.id]) {
      clearTimeout(debounceTimers.current[scheduler.id])
    }

    // Set new debounced save timer
    debounceTimers.current[scheduler.id] = setTimeout(() => {
      saveInlineChanges(scheduler.id, scheduler, newChanges)
    }, 400)
  }, [pendingChanges, saveInlineChanges])

  // Get display value for day (pending change or current value)
  const getDisplayDay = (scheduler: SkoolScheduledPost) => {
    return pendingChanges[scheduler.id]?.day_of_week ?? scheduler.day_of_week
  }

  // Get display value for time (pending change or current value)
  const getDisplayTime = (scheduler: SkoolScheduledPost) => {
    return pendingChanges[scheduler.id]?.time ?? scheduler.time
  }

  // Group by day of week for display
  const schedulersByDay = schedulers.reduce(
    (acc, s) => {
      if (!acc[s.day_of_week]) acc[s.day_of_week] = []
      acc[s.day_of_week].push(s)
      return acc
    },
    {} as Record<number, SkoolScheduledPost[]>
  )

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Post Scheduler</h1>
          <p className="text-muted-foreground">
            Schedule slots for automated community posts.
          </p>
        </div>
        <Button onClick={handleAddClick}>
          <Plus className="h-4 w-4 mr-2" />
          Add Schedule Slot
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : schedulers.length === 0 ? (
        <div className="text-center py-12 border rounded-lg bg-muted/50">
          <p className="text-muted-foreground">No schedule slots configured yet.</p>
          <Button variant="outline" className="mt-4" onClick={handleAddClick}>
            <Plus className="h-4 w-4 mr-2" />
            Create First Slot
          </Button>
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Category</TableHead>
                <TableHead>Day</TableHead>
                <TableHead>Time</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Run</TableHead>
                <TableHead>Note</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Object.keys(schedulersByDay)
                .map(Number)
                .sort((a, b) => a - b)
                .flatMap((dayIndex) =>
                  schedulersByDay[dayIndex].map((scheduler) => (
                    <TableRow key={scheduler.id}>
                      <TableCell className="font-medium">{scheduler.category}</TableCell>
                      <TableCell>
                        {savingRows.has(scheduler.id) ? (
                          <div className="flex items-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span className="text-muted-foreground">
                              {DAY_NAMES[getDisplayDay(scheduler)]}
                            </span>
                          </div>
                        ) : (
                          <Select
                            value={String(getDisplayDay(scheduler))}
                            onValueChange={(value) => handleInlineDayChange(scheduler, value)}
                            disabled={savingRows.has(scheduler.id)}
                          >
                            <SelectTrigger size="sm" className="w-[110px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {DAY_OPTIONS.map((day) => (
                                <SelectItem key={day.value} value={day.value}>
                                  {day.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      </TableCell>
                      <TableCell>
                        {savingRows.has(scheduler.id) ? (
                          <div className="flex items-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span className="text-muted-foreground">
                              {formatScheduleTime(getDisplayTime(scheduler))}
                            </span>
                          </div>
                        ) : (
                          <Input
                            type="time"
                            value={getDisplayTime(scheduler)}
                            onChange={(e) => handleInlineTimeChange(scheduler, e.target.value)}
                            disabled={savingRows.has(scheduler.id)}
                            className="w-[100px] h-8 text-sm"
                          />
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {togglingIds.has(scheduler.id) ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Switch
                              checked={scheduler.is_active}
                              onCheckedChange={() => handleToggleActive(scheduler)}
                            />
                          )}
                          <Badge variant={scheduler.is_active ? 'default' : 'secondary'}>
                            {scheduler.is_active ? 'Active' : 'Paused'}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {scheduler.last_run_at
                          ? new Date(scheduler.last_run_at).toLocaleString()
                          : 'Never'}
                      </TableCell>
                      <TableCell className="text-muted-foreground max-w-[200px] truncate">
                        {scheduler.note || '-'}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEditClick(scheduler)}>
                              <Pencil className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDeleteClick(scheduler.id)}
                              className="text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Add/Edit Dialog */}
      <SchedulerDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        scheduler={
          editingScheduler
            ? {
                id: editingScheduler.id,
                group_slug: editingScheduler.group_slug,
                category: editingScheduler.category,
                category_id: editingScheduler.category_id,
                day_of_week: editingScheduler.day_of_week,
                time: editingScheduler.time,
                is_active: editingScheduler.is_active,
                note: editingScheduler.note || '',
                variation_group_id: editingScheduler.variation_group_id ?? null,
              }
            : null
        }
        onSave={handleSave}
        isSaving={isSaving}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete Schedule Slot"
        description="Are you sure you want to delete this schedule slot? This action cannot be undone. Posts in the library for this slot will not be deleted."
        onConfirm={handleDelete}
        isLoading={isDeleting}
      />
    </div>
  )
}
