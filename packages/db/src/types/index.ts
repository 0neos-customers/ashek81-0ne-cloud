// Re-export all types from each app's types
export * from './kpi'
export * from './notifications'

// Shared types can go here
export interface UserPermissions {
  apps: {
    kpi: boolean
    prospector: boolean
    skoolSync: boolean
  }
  isAdmin: boolean
}
