import Link from 'next/link'
import { cn } from '@0ne/ui'
import type { LucideIcon } from 'lucide-react'

interface AppTileProps {
  name: string
  description: string
  icon: LucideIcon
  href: string
  color: string
  disabled?: boolean
}

export function AppTile({
  name,
  description,
  icon: Icon,
  href,
  color,
  disabled = false,
}: AppTileProps) {
  const content = (
    <div
      className={cn(
        'group flex flex-col gap-4 rounded-lg border border-border bg-card p-5 transition-all',
        'shadow-[0_1px_2px_rgba(34,32,29,0.05)]',
        'hover:shadow-[0_4px_12px_rgba(34,32,29,0.08)]',
        disabled
          ? 'opacity-50 cursor-not-allowed'
          : 'hover:border-primary/30 cursor-pointer'
      )}
    >
      <div className="flex items-center gap-3">
        <div
          className={cn(
            'flex h-10 w-10 items-center justify-center rounded-lg text-white',
            color
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
        <h3 className="text-base font-semibold text-foreground">{name}</h3>
      </div>
      <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
    </div>
  )

  if (disabled) {
    return content
  }

  return <Link href={href}>{content}</Link>
}
