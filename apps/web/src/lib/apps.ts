import {
  LayoutDashboard,
  GitBranch,
  Users,
  MessageSquare,
  Link2,
  BarChart3,
  Bell,
  DollarSign,
  GraduationCap,
  Building2,
  type LucideIcon,
} from 'lucide-react'
import type { AppId } from '@0ne/auth/permissions'

export interface AppConfig {
  id: AppId
  name: string
  description: string
  icon: LucideIcon
  href: string
  color: string
}

export type { AppId } from '@0ne/auth/permissions'

export const APPS: AppConfig[] = [
  {
    id: 'kpi',
    name: 'KPI Dashboard',
    description: 'Track business metrics, funnel performance, and revenue',
    icon: LayoutDashboard,
    href: '/kpi',
    color: 'bg-blue-500',
  },
  {
    id: 'prospector',
    name: 'Facebook Prospector',
    description: 'Find and engage prospects from Facebook groups',
    icon: Users,
    href: '/prospector',
    color: 'bg-indigo-500',
  },
  {
    id: 'skoolSync',
    name: 'Skool-GHL Sync',
    description: 'Sync Skool messages with GoHighLevel CRM',
    icon: Link2,
    href: '/skool-sync',
    color: 'bg-emerald-500',
  },
]

export function getAppById(id: AppId): AppConfig | undefined {
  return APPS.find((app) => app.id === id)
}

export interface AppNavItem {
  name: string
  href: string
  icon: LucideIcon
}

export function getAppNavigation(appId: AppId): AppNavItem[] {
  switch (appId) {
    case 'kpi':
      return [
        { name: 'Overview', href: '/kpi', icon: LayoutDashboard },
        { name: 'Funnel', href: '/kpi/funnel', icon: GitBranch },
        { name: 'Cohorts', href: '/kpi/cohorts', icon: Users },
        { name: 'Expenses', href: '/kpi/expenses', icon: DollarSign },
        { name: 'Facebook Ads', href: '/kpi/facebook-ads', icon: BarChart3 },
        { name: 'Skool', href: '/kpi/skool', icon: GraduationCap },
        { name: 'GHL', href: '/kpi/ghl', icon: Building2 },
        { name: 'Notifications', href: '/kpi/notifications', icon: Bell },
      ]
    default:
      return []
  }
}
