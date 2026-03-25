'use client'

import { useState } from 'react'
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from '@0ne/ui'
import { Edit, Plus, Trash2, CalendarDays, CheckCircle, Clock, XCircle } from 'lucide-react'
import {
  useCampaigns,
  createCampaign,
  updateCampaign,
  deleteCampaign,
} from '@/features/skool/hooks/use-campaigns'
import { CampaignDialog, ConfirmDialog, type CampaignFormData } from '@/features/skool/components'
import Link from 'next/link'

export default function CampaignsPage() {
  const { campaigns, isLoading, refresh } = useCampaigns({ includeStats: true })
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedCampaign, setSelectedCampaign] = useState<CampaignFormData | null>(null)
  const [campaignToDelete, setCampaignToDelete] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleCreate = () => {
    setSelectedCampaign(null)
    setDialogOpen(true)
  }

  const handleEdit = (campaign: CampaignFormData) => {
    setSelectedCampaign(campaign)
    setDialogOpen(true)
  }

  const handleDelete = (id: string) => {
    setCampaignToDelete(id)
    setDeleteDialogOpen(true)
  }

  const handleSave = async (data: CampaignFormData) => {
    setIsSaving(true)
    try {
      if (data.id) {
        await updateCampaign(data.id, data)
      } else {
        await createCampaign(data)
      }
      refresh()
      setDialogOpen(false)
    } finally {
      setIsSaving(false)
    }
  }

  const handleConfirmDelete = async () => {
    if (!campaignToDelete) return
    setIsDeleting(true)
    try {
      await deleteCampaign(campaignToDelete)
      refresh()
      setDeleteDialogOpen(false)
      setCampaignToDelete(null)
    } finally {
      setIsDeleting(false)
    }
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return null
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Campaigns</h1>
          <p className="text-sm text-muted-foreground">
            Organize one-off scheduled posts into campaigns
          </p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="mr-2 h-4 w-4" />
          New Campaign
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">Loading...</div>
      ) : campaigns.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground mb-4">No campaigns yet</p>
            <Button onClick={handleCreate}>
              <Plus className="mr-2 h-4 w-4" />
              Create your first campaign
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {campaigns.map((campaign) => (
            <Card key={campaign.id} className={!campaign.isActive ? 'opacity-60' : ''}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{campaign.name}</CardTitle>
                    {!campaign.isActive && (
                      <span className="text-xs text-muted-foreground">(Inactive)</span>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        handleEdit({
                          id: campaign.id,
                          name: campaign.name,
                          description: campaign.description || '',
                          startDate: campaign.startDate || '',
                          endDate: campaign.endDate || '',
                          isActive: campaign.isActive,
                        })
                      }
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(campaign.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
                {campaign.description && (
                  <CardDescription className="mt-1">{campaign.description}</CardDescription>
                )}
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Date Range */}
                {(campaign.startDate || campaign.endDate) && (
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <CalendarDays className="h-4 w-4" />
                    <span>
                      {formatDate(campaign.startDate) || 'No start'} -{' '}
                      {formatDate(campaign.endDate) || 'No end'}
                    </span>
                  </div>
                )}

                {/* Stats */}
                {campaign.stats && (
                  <div className="flex gap-4 text-sm">
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      <span>{campaign.stats.pendingPosts} pending</span>
                    </div>
                    <div className="flex items-center gap-1 text-green-600">
                      <CheckCircle className="h-4 w-4" />
                      <span>{campaign.stats.publishedPosts} published</span>
                    </div>
                    {campaign.stats.failedPosts > 0 && (
                      <div className="flex items-center gap-1 text-red-600">
                        <XCircle className="h-4 w-4" />
                        <span>{campaign.stats.failedPosts} failed</span>
                      </div>
                    )}
                  </div>
                )}

                {/* View Posts Link */}
                <Link
                  href={`/skool/scheduler?campaign_id=${campaign.id}`}
                  className="text-sm text-primary hover:underline"
                >
                  View {campaign.stats?.totalPosts || 0} posts
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <CampaignDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        campaign={selectedCampaign}
        onSave={handleSave}
        isSaving={isSaving}
      />

      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete Campaign"
        description="Are you sure you want to delete this campaign? Posts in this campaign will be unlinked but not deleted."
        confirmText="Delete"
        onConfirm={handleConfirmDelete}
        isLoading={isDeleting}
        variant="destructive"
      />
    </div>
  )
}
