import { AppShell } from '@/components/shell'

export default function HomeLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AppShell title="0ne" showHomeLink={false}>
      {children}
    </AppShell>
  )
}
