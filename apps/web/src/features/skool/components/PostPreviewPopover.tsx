'use client'

import {
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
  PopoverDescription,
} from '@0ne/ui'
import { Eye } from 'lucide-react'
import type { SkoolPostLibraryItem } from '@0ne/db'

interface PostPreviewPopoverProps {
  post: SkoolPostLibraryItem
  children: React.ReactNode
}

export function PostPreviewPopover({ post, children }: PostPreviewPopoverProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent className="w-96" align="start">
        <PopoverHeader>
          <PopoverTitle className="flex items-center gap-2">
            <Eye className="h-4 w-4 text-muted-foreground" />
            {post.title}
          </PopoverTitle>
          <PopoverDescription>Post Preview</PopoverDescription>
        </PopoverHeader>
        <div className="mt-3 space-y-3">
          {/* Body preview */}
          <div className="text-sm whitespace-pre-wrap line-clamp-6 text-muted-foreground">
            {post.body}
          </div>

          {/* Image preview */}
          {post.imageUrl && (
            <div className="rounded-md overflow-hidden border">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={post.imageUrl}
                alt="Post image"
                className="w-full h-24 object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = 'none'
                }}
              />
            </div>
          )}

          {/* Video indicator */}
          {post.videoUrl && (
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              <span className="inline-block w-2 h-2 rounded-full bg-blue-500" />
              Has video attachment
            </div>
          )}

          {/* Stats */}
          <div className="flex items-center gap-4 text-xs text-muted-foreground pt-2 border-t">
            <span>Used: {post.useCount}x</span>
            {post.lastUsedAt && (
              <span>Last: {new Date(post.lastUsedAt).toLocaleDateString()}</span>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
