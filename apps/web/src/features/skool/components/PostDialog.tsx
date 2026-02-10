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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
} from '@0ne/ui'
import { Loader2, Image as ImageIcon, Video, Layers, FolderOpen } from 'lucide-react'
import { DAY_NAMES, type DayOfWeek } from '@0ne/db'
import { useCategories } from '../hooks/use-categories'
import { useVariationGroups } from '../hooks/use-variation-groups'
import { MediaPickerDialog } from '@/features/media'

export interface PostFormData {
  id?: string
  category: string
  day_of_week: DayOfWeek | null
  time: string | null
  variation_group_id: string | null
  title: string
  body: string
  image_url: string
  video_url: string
  is_active: boolean
}

interface PostDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  post?: PostFormData | null
  onSave: (data: PostFormData) => Promise<void>
  isSaving?: boolean
}

const defaultFormData: PostFormData = {
  category: '',
  day_of_week: null,
  time: null,
  variation_group_id: null,
  title: '',
  body: '',
  image_url: '',
  video_url: '',
  is_active: true,
}


export function PostDialog({
  open,
  onOpenChange,
  post,
  onSave,
  isSaving = false,
}: PostDialogProps) {
  const [formData, setFormData] = useState<PostFormData>(defaultFormData)
  const [useLegacyMatching, setUseLegacyMatching] = useState(false)
  const [imagePickerOpen, setImagePickerOpen] = useState(false)
  const [videoPickerOpen, setVideoPickerOpen] = useState(false)
  const { categories, isLoading: categoriesLoading } = useCategories()
  const { groups: variationGroups, isLoading: groupsLoading } = useVariationGroups()
  const isEditMode = !!post?.id

  // Reset form when dialog opens/closes or post changes
  useEffect(() => {
    if (open && post) {
      const hasLegacyData = post.day_of_week !== null && post.time !== null
      setUseLegacyMatching(hasLegacyData && !post.variation_group_id)
      setFormData({
        id: post.id,
        category: post.category || '',
        day_of_week: post.day_of_week ?? null,
        time: post.time || null,
        variation_group_id: post.variation_group_id || null,
        title: post.title || '',
        body: post.body || '',
        image_url: post.image_url || '',
        video_url: post.video_url || '',
        is_active: post.is_active ?? true,
      })
    } else if (open && !post) {
      setUseLegacyMatching(false)
      setFormData(defaultFormData)
    }
  }, [open, post])

  const handleSubmit = async () => {
    // Clear legacy fields if using variation group
    const dataToSave = {
      ...formData,
      day_of_week: useLegacyMatching ? formData.day_of_week : null,
      time: useLegacyMatching ? formData.time : null,
      variation_group_id: useLegacyMatching ? null : formData.variation_group_id,
    }
    await onSave(dataToSave)
  }

  const isValid = formData.title && formData.body && (formData.variation_group_id || useLegacyMatching)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditMode ? 'Edit Post' : 'Add Post'}</DialogTitle>
          <DialogDescription>
            {isEditMode
              ? 'Update the post content below.'
              : 'Create a new post for the content library.'}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {/* Matching Mode Toggle */}
          <div className="rounded-md border p-3 bg-muted/50">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <label className="text-sm font-medium">Use Legacy Matching</label>
                <p className="text-xs text-muted-foreground">
                  {useLegacyMatching
                    ? 'Match by category, day, and time'
                    : 'Match by variation group (recommended)'}
                </p>
              </div>
              <Switch
                checked={useLegacyMatching}
                onCheckedChange={(checked) => {
                  setUseLegacyMatching(checked)
                  if (checked) {
                    setFormData({ ...formData, variation_group_id: null, day_of_week: 1, time: '09:00' })
                  } else {
                    setFormData({ ...formData, day_of_week: null, time: null })
                  }
                }}
              />
            </div>
          </div>

          {useLegacyMatching ? (
            /* Legacy Mode: Category, Day of Week, Time */
            <div className="grid grid-cols-3 gap-4">
              <div className="grid gap-2">
                <label htmlFor="post-category" className="text-sm font-medium">
                  Category
                </label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => setFormData({ ...formData, category: value })}
                  disabled={categoriesLoading}
                >
                  <SelectTrigger id="post-category">
                    <SelectValue placeholder={categoriesLoading ? 'Loading...' : 'Select'} />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.name} value={cat.name}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <label htmlFor="post-day" className="text-sm font-medium">
                  Day
                </label>
                <Select
                  value={formData.day_of_week !== null ? String(formData.day_of_week) : ''}
                  onValueChange={(value) =>
                    setFormData({ ...formData, day_of_week: parseInt(value, 10) as DayOfWeek })
                  }
                >
                  <SelectTrigger id="post-day">
                    <SelectValue placeholder="Day" />
                  </SelectTrigger>
                  <SelectContent>
                    {DAY_NAMES.map((day, index) => (
                      <SelectItem key={day} value={String(index)}>
                        {day}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <label htmlFor="post-time" className="text-sm font-medium">
                  Time
                </label>
                <Input
                  id="post-time"
                  type="time"
                  value={formData.time || ''}
                  onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                />
              </div>
            </div>
          ) : (
            /* New Mode: Variation Group */
            <div className="grid gap-2">
              <label htmlFor="post-group" className="text-sm font-medium flex items-center gap-1">
                <Layers className="h-4 w-4" />
                Variation Group
              </label>
              <Select
                value={formData.variation_group_id || ''}
                onValueChange={(value) => setFormData({ ...formData, variation_group_id: value })}
                disabled={groupsLoading}
              >
                <SelectTrigger id="post-group">
                  <SelectValue
                    placeholder={groupsLoading ? 'Loading...' : 'Select variation group'}
                  />
                </SelectTrigger>
                <SelectContent>
                  {variationGroups
                    .filter((g) => g.is_active)
                    .map((group) => (
                      <SelectItem key={group.id} value={group.id}>
                        {group.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                This post will be used by any scheduler that references this group
              </p>
            </div>
          )}

          {/* Title */}
          <div className="grid gap-2">
            <label htmlFor="post-title" className="text-sm font-medium">
              Title
            </label>
            <Input
              id="post-title"
              placeholder="Post title (shows in Skool)"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            />
          </div>

          {/* Body */}
          <div className="grid gap-2">
            <label htmlFor="post-body" className="text-sm font-medium">
              Body (Markdown)
            </label>
            <textarea
              id="post-body"
              placeholder="Write your post content here. Supports Markdown formatting..."
              value={formData.body}
              onChange={(e) => setFormData({ ...formData, body: e.target.value })}
              rows={8}
              className="flex min-h-[120px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            />
            <p className="text-xs text-muted-foreground">
              Supports Skool markdown: **bold**, *italic*, lists, etc.
            </p>
          </div>

          {/* Media URLs */}
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <label htmlFor="post-image" className="text-sm font-medium flex items-center gap-1">
                <ImageIcon className="h-4 w-4" />
                Image URL
              </label>
              <div className="flex gap-2">
                <Input
                  id="post-image"
                  placeholder="https://... or use picker"
                  value={formData.image_url}
                  onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setImagePickerOpen(true)}
                  title="Browse GHL Media"
                >
                  <FolderOpen className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="grid gap-2">
              <label htmlFor="post-video" className="text-sm font-medium flex items-center gap-1">
                <Video className="h-4 w-4" />
                Video URL
              </label>
              <div className="flex gap-2">
                <Input
                  id="post-video"
                  placeholder="https://... or use picker"
                  value={formData.video_url}
                  onChange={(e) => setFormData({ ...formData, video_url: e.target.value })}
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setVideoPickerOpen(true)}
                  title="Browse GHL Media"
                >
                  <FolderOpen className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Image Preview */}
          {formData.image_url && (
            <div className="rounded-md border p-2">
              <p className="text-xs text-muted-foreground mb-2">Image Preview:</p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={formData.image_url}
                alt="Preview"
                className="max-h-32 rounded-md object-contain"
                onError={(e) => {
                  e.currentTarget.style.display = 'none'
                }}
              />
            </div>
          )}

          {/* Active Toggle */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <label htmlFor="post-active" className="text-sm font-medium">
                Active
              </label>
              <p className="text-xs text-muted-foreground">
                Include this post in the rotation pool
              </p>
            </div>
            <Switch
              id="post-active"
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
            {isEditMode ? 'Save Changes' : 'Add Post'}
          </Button>
        </DialogFooter>
      </DialogContent>

      {/* Media Picker Dialogs */}
      <MediaPickerDialog
        open={imagePickerOpen}
        onOpenChange={setImagePickerOpen}
        onSelect={(files) => {
          if (files.length > 0) {
            setFormData({ ...formData, image_url: files[0].url })
          }
        }}
        mode="single"
        allowedTypes={['image']}
      />
      <MediaPickerDialog
        open={videoPickerOpen}
        onOpenChange={setVideoPickerOpen}
        onSelect={(files) => {
          if (files.length > 0) {
            setFormData({ ...formData, video_url: files[0].url })
          }
        }}
        mode="single"
        allowedTypes={['video']}
      />
    </Dialog>
  )
}
