import { AppShell } from '@/components/shell'

export default function SkoolLayout({ children }: { children: React.ReactNode }) {
  return <AppShell appId="skoolScheduler">{children}</AppShell>
}
