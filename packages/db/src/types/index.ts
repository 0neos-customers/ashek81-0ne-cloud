// Re-export all types from each app's types
export * from './kpi'
export * from './notifications'
export * from './scheduler'

// Shared types can go here
export interface UserPermissions {
  apps: {
    kpi: boolean
    prospector: boolean
    skoolSync: boolean
  }
  isAdmin: boolean
}
