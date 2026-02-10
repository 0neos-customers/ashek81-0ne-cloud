'use client'

import { useState, useMemo } from 'react'
import {
  Button,
  Badge,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  toast,
} from '@0ne/ui'
import { Plus, MoreHorizontal, Pencil, Trash2, Loader2, Eye, Image, Video } from 'lucide-react'
import { DAY_NAMES, formatScheduleTime, type SkoolPostLibraryItem } from '@0ne/db'
import {
  usePostLibrary,
  createPost,
  updatePost,
  deletePost,
  useCategories,
  useVariationGroups,
} from '@/features/skool/hooks'
import { PostDialog, ConfirmDialog, PostPreviewPopover, type PostFormData } from '@/features/skool/components'

export default function PostsLibraryPage() {
  const [groupFilter, setGroupFilter] = useState<string>('all')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')

  // Build filters object based on active filters
  const filters = {
    ...(groupFilter !== 'all' ? { variationGroupId: groupFilter } : {}),
    ...(categoryFilter !== 'all' ? { category: categoryFilter } : {}),
  }
  const hasFilters = Object.keys(filters).length > 0

  const { posts, isLoading, refresh } = usePostLibrary(hasFilters ? filters : undefined)
  const { categories } = useCategories()
  const { groups } = useVariationGroups(true) // include stats for post counts

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingPost, setEditingPost] = useState<SkoolPostLibraryItem | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  // Delete confirmation state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Group posts by category
  const postsByCategory = useMemo(() => {
    return posts.reduce(
      (acc, p) => {
        if (!acc[p.category]) acc[p.category] = []
        acc[p.category].push(p)
        return acc
      },
      {} as Record<string, SkoolPostLibraryItem[]>
    )
  }, [posts])

  const handleAddClick = () => {
    setEditingPost(null)
    setDialogOpen(true)
  }

  const handleEditClick = (post: SkoolPostLibraryItem) => {
    setEditingPost(post)
    setDialogOpen(true)
  }

  const handleDeleteClick = (id: string) => {
    setDeletingId(id)
    setDeleteDialogOpen(true)
  }

  const handleSave = async (data: PostFormData) => {
    setIsSaving(true)
    try {
      if (data.id) {
        // Update existing
        const result = await updatePost(data.id, {
          category: data.category,
          day_of_week: data.day_of_week,
          time: data.time,
          title: data.title,
          body: data.body,
          image_url: data.image_url || null,
          video_url: data.video_url || null,
          is_active: data.is_active,
        })
        if (result.error) {
          toast.error(result.error)
          return
        }
        toast.success('Post updated')
      } else {
        // Create new
        const result = await createPost({
          category: data.category,
          day_of_week: data.day_of_week,
          time: data.time,
          title: data.title,
          body: data.body,
          image_url: data.image_url || null,
          video_url: data.video_url || null,
          is_active: data.is_active,
          variation_group_id: null,
        })
        if (result.error) {
          toast.error(result.error)
          return
        }
        toast.success('Post created')
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
      const result = await deletePost(deletingId)
      if (result.error) {
        toast.error(result.error)
        return
      }
      toast.success('Post deleted')
      setDeleteDialogOpen(false)
      refresh()
    } finally {
      setIsDeleting(false)
      setDeletingId(null)
    }
  }

  const sortedCategories = Object.keys(postsByCategory).sort()

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Posts Library</h1>
          <p className="text-muted-foreground">Content variations for rotation.</p>
        </div>
        <div className="flex items-center gap-4">
          {/* Variation Group Filter */}
          <Select value={groupFilter} onValueChange={setGroupFilter}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filter by group" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Groups</SelectItem>
              {groups.map((group) => (
                <SelectItem key={group.id} value={group.id}>
                  {group.name}
                  {group.post_count !== undefined && (
                    <span className="text-muted-foreground ml-1">({group.post_count})</span>
                  )}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {/* Category Filter */}
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat.name} value={cat.name}>
                  {cat.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={handleAddClick}>
            <Plus className="h-4 w-4 mr-2" />
            Add Post
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : posts.length === 0 ? (
        <div className="text-center py-12 border rounded-lg bg-muted/50">
          <p className="text-muted-foreground">
            {groupFilter !== 'all' && categoryFilter !== 'all'
              ? `No posts matching the selected group and category.`
              : groupFilter !== 'all'
                ? `No posts in the selected group.`
                : categoryFilter !== 'all'
                  ? `No posts in "${categoryFilter}" category.`
                  : 'No posts in the library yet.'}
          </p>
          <Button variant="outline" className="mt-4" onClick={handleAddClick}>
            <Plus className="h-4 w-4 mr-2" />
            Create First Post
          </Button>
        </div>
      ) : (
        <div className="space-y-8">
          {sortedCategories.map((category) => (
            <div key={category} className="space-y-3">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold">{category}</h2>
                <Badge variant="secondary">{postsByCategory[category].length} posts</Badge>
              </div>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[250px]">Title</TableHead>
                      <TableHead>Day</TableHead>
                      <TableHead>Time</TableHead>
                      <TableHead>Media</TableHead>
                      <TableHead>Used</TableHead>
                      <TableHead>Last Used</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-[100px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {postsByCategory[category]
                      .sort((a, b) => (a.day_of_week ?? 0) - (b.day_of_week ?? 0) || (a.time ?? '').localeCompare(b.time ?? ''))
                      .map((post) => (
                        <TableRow key={post.id}>
                          <TableCell>
                            <PostPreviewPopover post={post}>
                              <button className="flex items-center gap-2 text-left hover:text-primary transition-colors">
                                <Eye className="h-4 w-4 text-muted-foreground" />
                                <span className="font-medium truncate max-w-[200px]">
                                  {post.title}
                                </span>
                              </button>
                            </PostPreviewPopover>
                          </TableCell>
                          <TableCell>{post.day_of_week !== null ? DAY_NAMES[post.day_of_week] : '-'}</TableCell>
                          <TableCell>{post.time ? formatScheduleTime(post.time) : '-'}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              {post.image_url && (
                                <Image className="h-4 w-4 text-muted-foreground" />
                              )}
                              {post.video_url && (
                                <Video className="h-4 w-4 text-muted-foreground" />
                              )}
                              {!post.image_url && !post.video_url && (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>{post.use_count}x</TableCell>
                          <TableCell className="text-muted-foreground">
                            {post.last_used_at
                              ? new Date(post.last_used_at).toLocaleDateString()
                              : 'Never'}
                          </TableCell>
                          <TableCell>
                            <Badge variant={post.is_active ? 'default' : 'secondary'}>
                              {post.is_active ? 'Active' : 'Inactive'}
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
                                <DropdownMenuItem onClick={() => handleEditClick(post)}>
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
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <PostDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        post={
          editingPost
            ? {
                id: editingPost.id,
                category: editingPost.category,
                day_of_week: editingPost.day_of_week,
                time: editingPost.time,
                title: editingPost.title,
                body: editingPost.body,
                image_url: editingPost.image_url || '',
                video_url: editingPost.video_url || '',
                is_active: editingPost.is_active,
                variation_group_id: editingPost.variation_group_id ?? null,
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
        title="Delete Post"
        description="Are you sure you want to delete this post? This action cannot be undone."
        onConfirm={handleDelete}
        isLoading={isDeleting}
      />
    </div>
  )
}
