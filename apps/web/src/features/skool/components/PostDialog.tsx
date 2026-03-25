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
import { Loader2, Image as ImageIcon, Video, Layers, FolderOpen, Bot, Upload, User, Plus } from 'lucide-react'
import { type DayOfWeek, type PostLibraryStatus, type PostLibrarySource } from '@0ne/db'
import { useVariationGroups, createVariationGroup } from '../hooks/use-variation-groups'
import { VariationGroupDialog, type VariationGroupFormData } from './VariationGroupDialog'
import { MediaPickerDialog } from '@/features/media'

export interface PostFormData {
  id?: string
  category?: string // kept for backward compatibility
  dayOfWeek?: DayOfWeek | null // kept for backward compatibility
  time?: string | null // kept for backward compatibility
  variationGroupId: string | null
  title: string
  body: string
  imageUrl: string
  videoUrl: string
  isActive: boolean
  status?: PostLibraryStatus
  source?: PostLibrarySource
}

interface PostDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  post?: PostFormData | null
  onSave: (data: PostFormData) => Promise<void>
  isSaving?: boolean
}

const defaultFormData: PostFormData = {
  variationGroupId: null,
  title: '',
  body: '',
  imageUrl: '',
  videoUrl: '',
  isActive: true,
  status: 'active',
  source: 'manual',
}


export function PostDialog({
  open,
  onOpenChange,
  post,
  onSave,
  isSaving = false,
}: PostDialogProps) {
  const [formData, setFormData] = useState<PostFormData>(defaultFormData)
  const [imagePickerOpen, setImagePickerOpen] = useState(false)
  const [videoPickerOpen, setVideoPickerOpen] = useState(false)
  const [groupDialogOpen, setGroupDialogOpen] = useState(false)
  const [isCreatingGroup, setIsCreatingGroup] = useState(false)
  const { groups: variationGroups, isLoading: groupsLoading, refresh: refreshGroups } = useVariationGroups()
  const isEditMode = !!post?.id
  const isEditingOrphan = isEditMode && !post?.variationGroupId

  // Reset form when dialog opens/closes or post changes
  useEffect(() => {
    if (open && post) {
      setFormData({
        id: post.id,
        variationGroupId: post.variationGroupId || null,
        title: post.title || '',
        body: post.body || '',
        imageUrl: post.imageUrl || '',
        videoUrl: post.videoUrl || '',
        isActive: post.isActive ?? true,
        status: post.status || 'active',
        source: post.source || 'manual',
      })
    } else if (open && !post) {
      setFormData(defaultFormData)
    }
  }, [open, post])

  const handleSubmit = async () => {
    await onSave(formData)
  }

  const handleCreateGroup = async (data: VariationGroupFormData) => {
    setIsCreatingGroup(true)
    try {
      const result = await createVariationGroup({
        name: data.name,
        description: data.description,
        isActive: data.isActive,
      })
      if (result.error) {
        console.error('Failed to create group:', result.error)
        return
      }
      if (result.group) {
        // Auto-select the new group
        setFormData({ ...formData, variationGroupId: result.group.id })
        // Refresh the groups list
        refreshGroups()
        setGroupDialogOpen(false)
      }
    } finally {
      setIsCreatingGroup(false)
    }
  }

  const isValid = formData.title && formData.body && (isEditMode || formData.variationGroupId)

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
          {/* Variation Group */}
          <div className="grid gap-2">
            <label htmlFor="post-group" className="text-sm font-medium flex items-center gap-1">
              <Layers className="h-4 w-4" />
              Variation Group
            </label>
            <Select
              value={formData.variationGroupId || (isEditingOrphan ? 'none' : '')}
              onValueChange={(value) => {
                if (value === 'create-new') {
                  setGroupDialogOpen(true)
                } else {
                  setFormData({ ...formData, variationGroupId: value === 'none' ? null : value })
                }
              }}
              disabled={groupsLoading}
            >
              <SelectTrigger id="post-group">
                <SelectValue
                  placeholder={groupsLoading ? 'Loading...' : 'Select variation group...'}
                />
              </SelectTrigger>
              <SelectContent>
                {isEditingOrphan && <SelectItem value="none">No Group</SelectItem>}
                <SelectItem value="create-new">
                  <span className="flex items-center gap-1">
                    <Plus className="h-3 w-3" />
                    Create New Group
                  </span>
                </SelectItem>
                {variationGroups
                  .filter((g) => g.isActive)
                  .map((group) => (
                    <SelectItem key={group.id} value={group.id}>
                      {group.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {isEditingOrphan
                ? 'Optionally assign to a group for scheduling'
                : 'Required: Select a group for scheduled rotations'}
            </p>
          </div>

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
                  value={formData.imageUrl}
                  onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
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
                  value={formData.videoUrl}
                  onChange={(e) => setFormData({ ...formData, videoUrl: e.target.value })}
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
          {formData.imageUrl && (
            <div className="rounded-md border p-2">
              <p className="text-xs text-muted-foreground mb-2">Image Preview:</p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={formData.imageUrl}
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
              checked={formData.isActive}
              onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
            />
          </div>

          {/* Status and Source (only shown in edit mode) */}
          {isEditMode && (
            <div className="grid grid-cols-2 gap-4 pt-2 border-t">
              {/* Status */}
              <div className="grid gap-2">
                <label htmlFor="post-status" className="text-sm font-medium">
                  Status
                </label>
                <Select
                  value={formData.status || 'active'}
                  onValueChange={(value) => setFormData({ ...formData, status: value as PostLibraryStatus })}
                >
                  <SelectTrigger id="post-status">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Source (read-only) */}
              <div className="grid gap-2">
                <label className="text-sm font-medium">Source</label>
                <div className="flex items-center h-9 px-3 rounded-md border bg-muted/50">
                  {formData.source === 'api' && (
                    <span className="flex items-center gap-1 text-sm">
                      <Bot className="h-4 w-4" />
                      Created by AI
                    </span>
                  )}
                  {formData.source === 'import' && (
                    <span className="flex items-center gap-1 text-sm">
                      <Upload className="h-4 w-4" />
                      Imported
                    </span>
                  )}
                  {(!formData.source || formData.source === 'manual') && (
                    <span className="flex items-center gap-1 text-sm text-muted-foreground">
                      <User className="h-4 w-4" />
                      Manual
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}
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
            setFormData({ ...formData, imageUrl: files[0].url })
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
            setFormData({ ...formData, videoUrl: files[0].url })
          }
        }}
        mode="single"
        allowedTypes={['video']}
      />

      {/* Inline Group Creation Dialog */}
      <VariationGroupDialog
        open={groupDialogOpen}
        onOpenChange={setGroupDialogOpen}
        group={null}
        onSave={handleCreateGroup}
        isSaving={isCreatingGroup}
      />
    </Dialog>
  )
}
