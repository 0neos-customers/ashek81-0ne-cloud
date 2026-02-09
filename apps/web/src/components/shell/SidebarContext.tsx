'use client'

import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from 'react'

interface SidebarContextValue {
  isOpen: boolean
  toggle: () => void
  open: () => void
  close: () => void
}

const SidebarContext = createContext<SidebarContextValue | undefined>(undefined)

const STORAGE_KEY = '0ne-sidebar-open'

export function SidebarProvider({ children }: { children: ReactNode }) {
  // Default to open on desktop, closed on mobile
  const [isOpen, setIsOpen] = useState(true)
  const [mounted, setMounted] = useState(false)

  // Load from localStorage on mount
  useEffect(() => {
    setMounted(true)
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored !== null) {
      setIsOpen(stored === 'true')
    } else {
      // Default: open on desktop (lg+), closed on mobile
      setIsOpen(window.innerWidth >= 1024)
    }
  }, [])

  // Persist to localStorage
  useEffect(() => {
    if (mounted) {
      localStorage.setItem(STORAGE_KEY, String(isOpen))
    }
  }, [isOpen, mounted])

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && window.innerWidth < 1024) {
        setIsOpen(false)
      }
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen])

  const toggle = () => setIsOpen((prev) => !prev)
  const open = () => setIsOpen(true)
  const close = () => setIsOpen(false)

  return (
    <SidebarContext.Provider value={{ isOpen, toggle, open, close }}>
      {children}
    </SidebarContext.Provider>
  )
}

export function useSidebar() {
  const context = useContext(SidebarContext)
  if (!context) {
    throw new Error('useSidebar must be used within a SidebarProvider')
  }
  return context
}
