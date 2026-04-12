import { type LucideIcon } from 'lucide-react'

/**
 * App registry for the customer instance dashboard.
 *
 * Customers add their own apps here. The default template ships with no
 * apps — the AppId union is intentionally empty so customers can extend it
 * locally without conflicting with template updates.
 */

export type AppId = string

export interface AppConfig {
  id: AppId
  name: string
  description: string
  icon: LucideIcon
  href: string
  color: string
}

export const APPS: AppConfig[] = []

export function getAppById(id: AppId): AppConfig | undefined {
  return APPS.find((app) => app.id === id)
}

export interface AppNavItem {
  name: string
  href: string
  icon: LucideIcon
}

export function getAppNavigation(_appId: string): AppNavItem[] {
  return []
}
