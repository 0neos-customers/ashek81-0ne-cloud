'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Button,
  Badge,
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
  toast,
} from '@0ne/ui'
import {
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
  Loader2,
  Eye,
  Image,
  Video,
  ArrowLeft,
  Calendar,
  FileText,
} from 'lucide-react'
import { DAY_NAMES, formatScheduleTime, type SkoolPostLibraryItem } from '@0ne/db'
import {
  usePostLibrary,
  createPost,
  updatePost,
  deletePost,
  useVariationGroup,
  updateVariationGroup,
} from '@/features/skool/hooks'
import {
  PostDialog,
  ConfirmDialog,
  PostPreviewPopover,
  VariationGroupDialog,
  type PostFormData,
  type VariationGroupFormData,
} from '@/features/skool/components'

export default function VariationGroupDetailPage() {
  const params = useParams()
  const router = useRouter()
  const groupId = params.id as string

  // Fetch group details
  const { group, isLoading: groupLoading, error: groupError, refresh: refreshGroup } = useVariationGroup(groupId)

  // Fetch posts for this group
  const {
    posts,
    isLoading: postsLoading,
    refresh: refreshPosts,
  } = usePostLibrary({ variationGroupId: groupId })

  // Group edit dialog state
  const [groupDialogOpen, setGroupDialogOpen] = useState(false)
  const [isSavingGroup, setIsSavingGroup] = useState(false)

  // Post dialog state
  const [postDialogOpen, setPostDialogOpen] = useState(false)
  const [editingPost, setEditingPost] = useState<SkoolPostLibraryItem | null>(null)
  const [isSavingPost, setIsSavingPost] = useState(false)

  // Delete confirmation state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deletingPostId, setDeletingPostId] = useState<string | null>(null)
  const [isDeletingPost, setIsDeletingPost] = useState(false)

  const isLoading = groupLoading || postsLoading

  const handleEditGroup = () => {
    setGroupDialogOpen(true)
  }

  const handleSaveGroup = async (data: VariationGroupFormData) => {
    if (!group) return
    setIsSavingGroup(true)
    try {
      const result = await updateVariationGroup(group.id, {
        name: data.name,
        description: data.description || null,
        isActive: data.isActive,
      })
      if (result.error) {
        toast.error(result.error)
        return
      }
      toast.success('Group updated')
      setGroupDialogOpen(false)
      refreshGroup()
    } finally {
      setIsSavingGroup(false)
    }
  }

  const handleAddPost = () => {
    setEditingPost(null)
    setPostDialogOpen(true)
  }

  const handleEditPost = (post: SkoolPostLibraryItem) => {
    setEditingPost(post)
    setPostDialogOpen(true)
  }

  const handleDeleteClick = (id: string) => {
    setDeletingPostId(id)
    setDeleteDialogOpen(true)
  }

  const handleSavePost = async (data: PostFormData) => {
    setIsSavingPost(true)
    try {
      if (data.id) {
        // Update existing
        const result = await updatePost(data.id, {
          category: data.category,
          dayOfWeek: data.dayOfWeek,
          time: data.time,
          title: data.title,
          body: data.body,
          imageUrl: data.imageUrl || null,
          videoUrl: data.videoUrl || null,
          isActive: data.isActive,
          variationGroupId: groupId,
        })
        if (result.error) {
          toast.error(result.error)
          return
        }
        toast.success('Post updated')
      } else {
        // Create new - pre-set the variation group
        const result = await createPost({
          category: '', // kept for backward compatibility
          dayOfWeek: null,
          time: null,
          title: data.title,
          body: data.body,
          imageUrl: data.imageUrl || null,
          videoUrl: data.videoUrl || null,
          isActive: data.isActive,
          variationGroupId: groupId,
        })
        if (result.error) {
          toast.error(result.error)
          return
        }
        toast.success('Post created')
      }
      setPostDialogOpen(false)
      refreshPosts()
      refreshGroup() // Refresh to update post count
    } finally {
      setIsSavingPost(false)
    }
  }

  const handleDeletePost = async () => {
    if (!deletingPostId) return
    setIsDeletingPost(true)
    try {
      const result = await deletePost(deletingPostId)
      if (result.error) {
        toast.error(result.error)
        return
      }
      toast.success('Post deleted')
      setDeleteDialogOpen(false)
      refreshPosts()
      refreshGroup() // Refresh to update post count
    } finally {
      setIsDeletingPost(false)
      setDeletingPostId(null)
    }
  }

  // Handle 404
  if (groupError || (!groupLoading && !group)) {
    return (
      <div className="p-6">
        <div className="text-center py-12 border rounded-lg bg-muted/50">
          <p className="text-muted-foreground mb-4">Variation group not found.</p>
          <Button variant="outline" asChild>
            <Link href="/skool/groups">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Groups
            </Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Back Link */}
      <div>
        <Link
          href="/skool/groups"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Groups
        </Link>
      </div>

      {/* Group Header */}
      {isLoading && !group ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : group ? (
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{group.name}</h1>
              <Badge variant={group.isActive ? 'default' : 'secondary'}>
                {group.isActive ? 'Active' : 'Inactive'}
              </Badge>
            </div>
            {group.description && (
              <p className="text-muted-foreground max-w-2xl">{group.description}</p>
            )}
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <FileText className="h-4 w-4" />
                <span>{group.postCount || 0} posts</span>
              </div>
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                <span>{group.schedulerCount || 0} schedulers</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleEditGroup}>
              <Pencil className="h-4 w-4 mr-2" />
              Edit Group
            </Button>
            <Button onClick={handleAddPost}>
              <Plus className="h-4 w-4 mr-2" />
              Add Post
            </Button>
          </div>
        </div>
      ) : null}

      {/* Posts Table */}
      {postsLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : posts.length === 0 ? (
        <div className="text-center py-12 border rounded-lg bg-muted/50">
          <p className="text-muted-foreground">No posts in this group yet.</p>
          <Button variant="outline" className="mt-4" onClick={handleAddPost}>
            <Plus className="h-4 w-4 mr-2" />
            Create First Post
          </Button>
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[300px]">Title</TableHead>
                <TableHead>Media</TableHead>
                <TableHead>Used</TableHead>
                <TableHead>Last Used</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {posts
                .sort((a, b) => {
                  // Sort by last_used_at (nulls first for unused), then by title
                  if (!a.lastUsedAt && b.lastUsedAt) return -1
                  if (a.lastUsedAt && !b.lastUsedAt) return 1
                  if (a.lastUsedAt && b.lastUsedAt) {
                    return new Date(a.lastUsedAt).getTime() - new Date(b.lastUsedAt).getTime()
                  }
                  return a.title.localeCompare(b.title)
                })
                .map((post) => (
                  <TableRow key={post.id}>
                    <TableCell>
                      <PostPreviewPopover post={post}>
                        <button className="flex items-center gap-2 text-left hover:text-primary transition-colors">
                          <Eye className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium truncate max-w-[250px]">{post.title}</span>
                        </button>
                      </PostPreviewPopover>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {post.imageUrl && <Image className="h-4 w-4 text-muted-foreground" />}
                        {post.videoUrl && <Video className="h-4 w-4 text-muted-foreground" />}
                        {!post.imageUrl && !post.videoUrl && (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{post.useCount}x</TableCell>
                    <TableCell className="text-muted-foreground">
                      {post.lastUsedAt
                        ? new Date(post.lastUsedAt).toLocaleDateString()
                        : 'Never'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={post.isActive ? 'default' : 'secondary'}>
                        {post.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEditPost(post)}>
                            <Pencil className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDeleteClick(post.id)}
                            className="text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Group Edit Dialog */}
      {group && (
        <VariationGroupDialog
          open={groupDialogOpen}
          onOpenChange={setGroupDialogOpen}
          group={{
            id: group.id,
            name: group.name,
            description: group.description || '',
            isActive: group.isActive,
          }}
          onSave={handleSaveGroup}
          isSaving={isSavingGroup}
        />
      )}

      {/* Add/Edit Post Dialog */}
      <PostDialog
        open={postDialogOpen}
        onOpenChange={setPostDialogOpen}
        post={
          editingPost
            ? {
                id: editingPost.id,
                category: editingPost.category,
                dayOfWeek: editingPost.dayOfWeek,
                time: editingPost.time,
                variationGroupId: groupId,
                title: editingPost.title,
                body: editingPost.body,
                imageUrl: editingPost.imageUrl || '',
                videoUrl: editingPost.videoUrl || '',
                isActive: editingPost.isActive,
              }
            : {
                category: '',
                dayOfWeek: null,
                time: null,
                variationGroupId: groupId,
                title: '',
                body: '',
                imageUrl: '',
                videoUrl: '',
                isActive: true,
              }
        }
        onSave={handleSavePost}
        isSaving={isSavingPost}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete Post"
        description="Are you sure you want to delete this post? This action cannot be undone."
        onConfirm={handleDeletePost}
        isLoading={isDeletingPost}
      />
    </div>
  )
}
