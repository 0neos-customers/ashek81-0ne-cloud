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

export interface CampaignFormData {
  id?: string
  name: string
  description: string
  start_date: string
  end_date: string
  is_active: boolean
}

interface CampaignDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  campaign?: CampaignFormData | null
  onSave: (data: CampaignFormData) => Promise<void>
  isSaving?: boolean
}

const defaultFormData: CampaignFormData = {
  name: '',
  description: '',
  start_date: '',
  end_date: '',
  is_active: true,
}

export function CampaignDialog({
  open,
  onOpenChange,
  campaign,
  onSave,
  isSaving = false,
}: CampaignDialogProps) {
  const [formData, setFormData] = useState<CampaignFormData>(defaultFormData)
  const isEditMode = !!campaign?.id

  // Reset form when dialog opens/closes or campaign changes
  useEffect(() => {
    if (open && campaign) {
      setFormData({
        id: campaign.id,
        name: campaign.name || '',
        description: campaign.description || '',
        start_date: campaign.start_date || '',
        end_date: campaign.end_date || '',
        is_active: campaign.is_active ?? true,
      })
    } else if (open && !campaign) {
      setFormData(defaultFormData)
    }
  }, [open, campaign])

  const handleSubmit = async () => {
    await onSave(formData)
  }

  const isValid = formData.name.trim().length > 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{isEditMode ? 'Edit Campaign' : 'Create Campaign'}</DialogTitle>
          <DialogDescription>
            {isEditMode
              ? 'Update the campaign details below.'
              : 'Create a new campaign to organize one-off scheduled posts.'}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {/* Name */}
          <div className="grid gap-2">
            <label htmlFor="campaign-name" className="text-sm font-medium">
              Name
            </label>
            <Input
              id="campaign-name"
              placeholder="e.g., February 2026 Offer Cycle"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>

          {/* Description */}
          <div className="grid gap-2">
            <label htmlFor="campaign-description" className="text-sm font-medium">
              Description (optional)
            </label>
            <textarea
              id="campaign-description"
              placeholder="Describe the campaign purpose and goals..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <label htmlFor="campaign-start" className="text-sm font-medium">
                Start Date (optional)
              </label>
              <Input
                id="campaign-start"
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <label htmlFor="campaign-end" className="text-sm font-medium">
                End Date (optional)
              </label>
              <Input
                id="campaign-end"
                type="date"
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
              />
            </div>
          </div>

          {/* Active Toggle */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <label htmlFor="campaign-active" className="text-sm font-medium">
                Active
              </label>
              <p className="text-xs text-muted-foreground">
                Show this campaign in the active list
              </p>
            </div>
            <Switch
              id="campaign-active"
              checked={formData.is_active}
              onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!isValid || isSaving}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEditMode ? 'Save Changes' : 'Create Campaign'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
