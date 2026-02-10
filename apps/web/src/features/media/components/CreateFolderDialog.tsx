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
} from '@0ne/ui'
import { Loader2, FolderPlus } from 'lucide-react'

interface CreateFolderDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (name: string) => Promise<void>
  isLoading?: boolean
}

export function CreateFolderDialog({
  open,
  onOpenChange,
  onConfirm,
  isLoading = false,
}: CreateFolderDialogProps) {
  const [folderName, setFolderName] = useState('')

  // Reset input when dialog opens/closes
  useEffect(() => {
    if (open) {
      setFolderName('')
    }
  }, [open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (folderName.trim()) {
      await onConfirm(folderName.trim())
    }
  }

  const isValid = folderName.trim().length > 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FolderPlus className="h-5 w-5 text-primary" />
              Create New Folder
            </DialogTitle>
            <DialogDescription>
              Enter a name for the new folder. It will be created in the current
              directory.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <label htmlFor="folder-name" className="sr-only">
              Folder name
            </label>
            <Input
              id="folder-name"
              placeholder="Enter folder name..."
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
              autoFocus
              disabled={isLoading}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!isValid || isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Folder
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
