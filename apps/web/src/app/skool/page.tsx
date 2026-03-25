'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@0ne/ui'
import {
  Calendar,
  CalendarClock,
  CheckCircle,
  Clock,
  FileText,
  Layers,
  Mail,
  Megaphone,
  RefreshCw,
  XCircle,
} from 'lucide-react'
import Link from 'next/link'
import { useSchedulers } from '@/features/skool/hooks/use-schedulers'
import { usePostLibrary } from '@/features/skool/hooks/use-post-library'
import { useVariationGroups } from '@/features/skool/hooks/use-variation-groups'
import { useCampaigns } from '@/features/skool/hooks/use-campaigns'
import { useOneOffPosts } from '@/features/skool/hooks/use-oneoff-posts'
import { useGroupSettings } from '@/features/skool/hooks/use-group-settings'
import { formatScheduleTime, getDayName } from '@0ne/db'

export default function SkoolOverviewPage() {
  const { schedulers } = useSchedulers()
  const { posts } = usePostLibrary()
  const { groups } = useVariationGroups(true)
  const { campaigns } = useCampaigns({ includeStats: true, activeOnly: true })
  const { posts: upcomingPosts } = useOneOffPosts({ upcoming: true, limit: 5 })
  const { emailBlastStatus } = useGroupSettings()

  const activeSchedulers = schedulers.filter((s) => s.isActive)
  const activePosts = posts.filter((p) => p.isActive)
  const activeGroups = groups.filter((g) => g.isActive)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Skool Scheduler</h1>
        <p className="text-sm text-muted-foreground">
          Automate community post scheduling with content rotation
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Link href="/skool/scheduler">
          <Card className="hover:border-primary/50 transition-colors cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Recurring Slots</CardTitle>
              <RefreshCw className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{activeSchedulers.length}</div>
              <p className="text-xs text-muted-foreground">
                {schedulers.length - activeSchedulers.length} inactive
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/skool/groups">
          <Card className="hover:border-primary/50 transition-colors cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Variation Groups</CardTitle>
              <Layers className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{activeGroups.length}</div>
              <p className="text-xs text-muted-foreground">{activePosts.length} posts in library</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/skool/campaigns">
          <Card className="hover:border-primary/50 transition-colors cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Campaigns</CardTitle>
              <Megaphone className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{campaigns.length}</div>
              <p className="text-xs text-muted-foreground">
                {campaigns.reduce((acc, c) => acc + (c.stats?.pendingPosts || 0), 0)} pending posts
              </p>
            </CardContent>
          </Card>
        </Link>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Email Blast</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {emailBlastStatus?.available ? (
              <>
                <div className="text-2xl font-bold text-green-600 flex items-center gap-2">
                  <CheckCircle className="h-5 w-5" />
                  Available
                </div>
                <p className="text-xs text-muted-foreground">Ready to use</p>
              </>
            ) : (
              <>
                <div className="text-2xl font-bold text-amber-600 flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  {emailBlastStatus?.hoursUntilAvailable}h
                </div>
                <p className="text-xs text-muted-foreground">Until available</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Upcoming One-Off Posts */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarClock className="h-5 w-5" />
              Upcoming Scheduled Posts
            </CardTitle>
            <CardDescription>Next 5 one-off posts to be published</CardDescription>
          </CardHeader>
          <CardContent>
            {upcomingPosts.length === 0 ? (
              <p className="text-sm text-muted-foreground">No upcoming scheduled posts</p>
            ) : (
              <div className="space-y-3">
                {upcomingPosts.map((post) => {
                  const scheduledDate = new Date(post.scheduledAt)
                  return (
                    <div
                      key={post.id}
                      className="flex items-center justify-between border-b pb-3 last:border-0 last:pb-0"
                    >
                      <div className="space-y-1">
                        <p className="text-sm font-medium leading-none">{post.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {post.category}
                          {post.campaign && ` • ${post.campaign.name}`}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">
                          {scheduledDate.toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {scheduledDate.toLocaleTimeString('en-US', {
                            hour: 'numeric',
                            minute: '2-digit',
                            hour12: true,
                          })}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
            <div className="mt-4">
              <Link
                href="/skool/scheduler"
                className="text-sm text-primary hover:underline inline-flex items-center gap-1"
              >
                View all scheduled posts
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Recurring Schedule Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Recurring Schedule
            </CardTitle>
            <CardDescription>Weekly recurring post slots</CardDescription>
          </CardHeader>
          <CardContent>
            {activeSchedulers.length === 0 ? (
              <p className="text-sm text-muted-foreground">No recurring schedules configured</p>
            ) : (
              <div className="space-y-3">
                {activeSchedulers.slice(0, 5).map((scheduler) => (
                  <div
                    key={scheduler.id}
                    className="flex items-center justify-between border-b pb-3 last:border-0 last:pb-0"
                  >
                    <div className="space-y-1">
                      <p className="text-sm font-medium leading-none">{scheduler.category}</p>
                      <p className="text-xs text-muted-foreground">
                        {scheduler.variationGroup
                          ? `Group: ${scheduler.variationGroup.name}`
                          : 'Legacy matching'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">{getDayName(scheduler.dayOfWeek)}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatScheduleTime(scheduler.time)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="mt-4">
              <Link
                href="/skool/scheduler"
                className="text-sm text-primary hover:underline inline-flex items-center gap-1"
              >
                Manage recurring schedules
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/skool/scheduler?newOneOff=true"
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90"
            >
              <CalendarClock className="h-4 w-4" />
              Schedule One-Off Post
            </Link>
            <Link
              href="/skool/scheduler?newRecurring=true"
              className="inline-flex items-center gap-2 px-4 py-2 border rounded-md text-sm font-medium hover:bg-muted"
            >
              <RefreshCw className="h-4 w-4" />
              Schedule Recurring Post
            </Link>
            <Link
              href="/skool/groups?new=true"
              className="inline-flex items-center gap-2 px-4 py-2 border rounded-md text-sm font-medium hover:bg-muted"
            >
              <Layers className="h-4 w-4" />
              Create Variation Group
            </Link>
            <Link
              href="/skool/posts?new=true"
              className="inline-flex items-center gap-2 px-4 py-2 border rounded-md text-sm font-medium hover:bg-muted"
            >
              <FileText className="h-4 w-4" />
              Add Post to Library
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
