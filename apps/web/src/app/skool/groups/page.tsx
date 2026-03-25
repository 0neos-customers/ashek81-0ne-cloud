'use client'

import { Suspense, useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
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
} from '@0ne/ui'
import { Plus, MoreHorizontal, Pencil, Trash2, Loader2, FileText, Calendar } from 'lucide-react'
import {
  useVariationGroups,
  createVariationGroup,
  updateVariationGroup,
  deleteVariationGroup,
} from '@/features/skool/hooks/use-variation-groups'
import {
  VariationGroupDialog,
  ConfirmDialog,
  type VariationGroupFormData,
} from '@/features/skool/components'

function VariationGroupsContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { groups, isLoading, refresh } = useVariationGroups(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedGroup, setSelectedGroup] = useState<VariationGroupFormData | null>(null)
  const [groupToDelete, setGroupToDelete] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // Check for ?new=true query param
  useEffect(() => {
    if (searchParams.get('new') === 'true') {
      setSelectedGroup(null)
      setDialogOpen(true)
    }
  }, [searchParams])

  const handleCreate = () => {
    setSelectedGroup(null)
    setDialogOpen(true)
  }

  const handleEdit = (group: VariationGroupFormData, e: React.MouseEvent) => {
    e.stopPropagation()
    setSelectedGroup(group)
    setDialogOpen(true)
  }

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setGroupToDelete(id)
    setDeleteDialogOpen(true)
  }

  const handleRowClick = (id: string) => {
    router.push(`/skool/groups/${id}`)
  }

  const handleSave = async (data: VariationGroupFormData) => {
    setIsSaving(true)
    try {
      if (data.id) {
        await updateVariationGroup(data.id, data)
      } else {
        await createVariationGroup(data)
      }
      refresh()
      setDialogOpen(false)
    } finally {
      setIsSaving(false)
    }
  }

  const handleConfirmDelete = async () => {
    if (!groupToDelete) return
    setIsDeleting(true)
    try {
      await deleteVariationGroup(groupToDelete)
      refresh()
      setDeleteDialogOpen(false)
      setGroupToDelete(null)
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Variation Groups</h1>
          <p className="text-muted-foreground">
            Organize post variations for flexible scheduling across multiple slots
          </p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="mr-2 h-4 w-4" />
          New Group
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : groups.length === 0 ? (
        <div className="text-center py-12 border rounded-lg bg-muted/50">
          <p className="text-muted-foreground">No variation groups yet.</p>
          <Button variant="outline" className="mt-4" onClick={handleCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Create First Group
          </Button>
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Posts</TableHead>
                <TableHead>Schedulers</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {groups.map((group) => (
                <TableRow
                  key={group.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleRowClick(group.id)}
                >
                  <TableCell className="font-medium">{group.name}</TableCell>
                  <TableCell className="text-muted-foreground max-w-[300px] truncate">
                    {group.description || '-'}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <FileText className="h-4 w-4" />
                      <span>{group.postCount || 0}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>{group.schedulerCount || 0}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={group.isActive ? 'default' : 'secondary'}>
                      {group.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={(e) =>
                            handleEdit(
                              {
                                id: group.id,
                                name: group.name,
                                description: group.description || '',
                                isActive: group.isActive,
                              },
                              e
                            )
                          }
                        >
                          <Pencil className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={(e) => handleDelete(group.id, e)}
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

      <VariationGroupDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        group={selectedGroup}
        onSave={handleSave}
        isSaving={isSaving}
      />

      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete Variation Group"
        description="Are you sure you want to delete this variation group? Posts and schedulers referencing this group will be unlinked."
        confirmText="Delete"
        onConfirm={handleConfirmDelete}
        isLoading={isDeleting}
        variant="destructive"
      />
    </div>
  )
}

export default function VariationGroupsPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-[400px]">Loading...</div>}>
      <VariationGroupsContent />
    </Suspense>
  )
}
