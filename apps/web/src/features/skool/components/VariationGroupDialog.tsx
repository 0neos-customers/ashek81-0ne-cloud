'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Button,
  Input,
  Switch,
} from '@0ne/ui'
import { Loader2 } from 'lucide-react'

export interface VariationGroupFormData {
  id?: string
  name: string
  description: string
  isActive: boolean
}

interface VariationGroupDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  group?: VariationGroupFormData | null
  onSave: (data: VariationGroupFormData) => Promise<void>
  isSaving?: boolean
}

const defaultFormData: VariationGroupFormData = {
  name: '',
  description: '',
  isActive: true,
}

export function VariationGroupDialog({
  open,
  onOpenChange,
  group,
  onSave,
  isSaving = false,
}: VariationGroupDialogProps) {
  const [formData, setFormData] = useState<VariationGroupFormData>(defaultFormData)
  const isEditMode = !!group?.id

  // Reset form when dialog opens/closes or group changes
  useEffect(() => {
    if (open && group) {
      setFormData({
        id: group.id,
        name: group.name || '',
        description: group.description || '',
        isActive: group.isActive ?? true,
      })
    } else if (open && !group) {
      setFormData(defaultFormData)
    }
  }, [open, group])

  const handleSubmit = async () => {
    await onSave(formData)
  }

  const isValid = formData.name.trim().length > 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{isEditMode ? 'Edit Variation Group' : 'Create Variation Group'}</DialogTitle>
          <DialogDescription>
            {isEditMode
              ? 'Update the variation group details below.'
              : 'Create a new group to organize post variations for flexible scheduling.'}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {/* Name */}
          <div className="grid gap-2">
            <label htmlFor="group-name" className="text-sm font-medium">
              Name
            </label>
            <Input
              id="group-name"
              placeholder="e.g., Money Room Reminder Posts"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>

          {/* Description */}
          <div className="grid gap-2">
            <label htmlFor="group-description" className="text-sm font-medium">
              Description (optional)
            </label>
            <textarea
              id="group-description"
              placeholder="Describe the purpose of this variation group..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>

          {/* Active Toggle */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <label htmlFor="group-active" className="text-sm font-medium">
                Active
              </label>
              <p className="text-xs text-muted-foreground">
                Enable this group for use in schedulers
              </p>
            </div>
            <Switch
              id="group-active"
              checked={formData.isActive}
              onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!isValid || isSaving}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEditMode ? 'Save Changes' : 'Create Group'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
