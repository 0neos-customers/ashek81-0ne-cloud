import { AppShell } from '@/components/shell'

export default function MediaLayout({ children }: { children: React.ReactNode }) {
  return <AppShell appId="ghlMedia">{children}</AppShell>
}
