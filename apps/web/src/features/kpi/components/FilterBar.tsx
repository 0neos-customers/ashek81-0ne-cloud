'use client'

import { subDays, startOfMonth, subMonths, startOfYear } from 'date-fns'
import {
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  cn,
} from '@0ne/ui'
import { RotateCcw } from 'lucide-react'
import { DateRangePicker } from './DateRangePicker'
import { SourceFilter } from './SourceFilter'
import type { DateRange } from '@0ne/db/types/kpi'

type DatePreset = 'lifetime' | 'last7' | 'last30' | 'last90' | 'mtd' | 'lastMonth' | 'ytd' | 'custom'

// Map legacy API period strings to UI presets (for backward compatibility)
// Previously we stored '7d', '30d', '90d' but Select options use 'last7', 'last30', 'last90'
const apiPeriodToPreset: Record<string, DatePreset> = {
  '7d': 'last7',
  '30d': 'last30',
  '90d': 'last90',
  lifetime: 'lifetime',
  mtd: 'mtd',
  lastMonth: 'lastMonth',
  ytd: 'ytd',
  custom: 'custom',
  // Also map UI presets to themselves
  last7: 'last7',
  last30: 'last30',
  last90: 'last90',
}

interface FilterBarProps {
  dateRange: DateRange
  onDateRangeChange: (range: DateRange) => void
  /** Callback when period preset changes (for API calls) */
  onPeriodChange?: (period: string) => void
  /** Current period preset value (to show selected state) */
  period?: string
  /** Selected sources (empty array = all sources) */
  sources?: string[]
  onSourcesChange?: (sources: string[]) => void
  campaign?: string | 'all'
  onCampaignChange?: (campaign: string | 'all') => void
  campaigns?: Array<{ id: string; name: string }>
  /** Additional filter components to render */
  children?: React.ReactNode
  /** Show source filter */
  showSourceFilter?: boolean
  /** Show campaign filter */
  showCampaignFilter?: boolean
  /** Whether any filters are active (differ from defaults) */
  hasActiveFilters?: boolean
  /** Callback when reset is clicked */
  onReset?: () => void
  /** Additional CSS classes */
  className?: string
}

const datePresets: Array<{ value: DatePreset; label: string }> = [
  { value: 'mtd', label: 'Month to date' },
  { value: 'lifetime', label: 'Lifetime' },
  { value: 'last7', label: 'Last 7 days' },
  { value: 'last30', label: 'Last 30 days' },
  { value: 'last90', label: 'Last 90 days' },
  { value: 'lastMonth', label: 'Last month' },
  { value: 'ytd', label: 'Year to date' },
  { value: 'custom', label: 'Custom' },
]


function getPresetDateRange(preset: DatePreset): DateRange {
  const now = new Date()
  switch (preset) {
    case 'lifetime':
      return { from: new Date('2020-01-01'), to: now }
    case 'last7':
      return { from: subDays(now, 7), to: now }
    case 'last30':
      return { from: subDays(now, 30), to: now }
    case 'last90':
      return { from: subDays(now, 90), to: now }
    case 'mtd':
      return { from: startOfMonth(now), to: now }
    case 'lastMonth':
      return { from: startOfMonth(subMonths(now, 1)), to: startOfMonth(now) }
    case 'ytd':
      return { from: startOfYear(now), to: now }
    default:
      return { from: subDays(now, 30), to: now }
  }
}

// Shared trigger styles for consistent outline button appearance
const triggerStyles = 'h-9 border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground'

export function FilterBar({
  dateRange,
  onDateRangeChange,
  onPeriodChange,
  period,
  sources = [],
  onSourcesChange,
  campaign = 'all',
  onCampaignChange,
  campaigns = [],
  children,
  showSourceFilter = true,
  showCampaignFilter = false,
  hasActiveFilters: hasActiveFiltersProp,
  onReset,
  className,
}: FilterBarProps) {
  const handlePresetChange = (preset: DatePreset) => {
    if (preset !== 'custom') {
      onDateRangeChange(getPresetDateRange(preset))
      // Store the UI preset value (not API format) so Select can display it correctly
      // The API uses explicit startDate/endDate from dateRange, so period is mainly for display
      onPeriodChange?.(preset)
    }
  }

  const handleReset = () => {
    if (onReset) {
      // Use parent's reset function (resets all filters to defaults)
      onReset()
    } else {
      // Fallback: reset to MTD + all sources
      onDateRangeChange(getPresetDateRange('mtd'))
      onPeriodChange?.('mtd')
      onSourcesChange?.([])
      onCampaignChange?.('all')
    }
  }

  // Use provided hasActiveFilters or calculate locally (for backward compatibility)
  const showReset = hasActiveFiltersProp ?? (sources.length > 0 || campaign !== 'all' || (period && period !== 'mtd'))

  // Convert period to UI preset format (handles legacy '7d'/'30d'/'90d' values)
  const currentPreset = period ? (apiPeriodToPreset[period] || 'mtd') : 'mtd'

  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-3 rounded-lg border border-border bg-card p-3',
        'shadow-[0_1px_2px_rgba(34,32,29,0.05)]',
        className
      )}
    >
      {/* Date Preset Select */}
      <Select value={currentPreset} onValueChange={(v) => handlePresetChange(v as DatePreset)}>
        <SelectTrigger className={cn(triggerStyles, 'w-[160px]')}>
          <SelectValue placeholder="Month to date" />
        </SelectTrigger>
        <SelectContent>
          {datePresets.map((preset) => (
            <SelectItem key={preset.value} value={preset.value}>
              {preset.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Custom Date Range Picker */}
      <DateRangePicker value={dateRange} onChange={onDateRangeChange} />

      {/* Source Filter */}
      {showSourceFilter && onSourcesChange && (
        <SourceFilter selected={sources} onSelectionChange={onSourcesChange} />
      )}

      {/* Campaign Filter */}
      {showCampaignFilter && onCampaignChange && campaigns.length > 0 && (
        <Select value={campaign} onValueChange={(v) => onCampaignChange(v)}>
          <SelectTrigger className={cn(triggerStyles, 'w-[160px]')}>
            <SelectValue placeholder="All campaigns" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All campaigns</SelectItem>
            {campaigns.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {/* Additional filters slot */}
      {children}

      {/* Reset Button - at the END after all filters */}
      {showReset && (
        <Button variant="ghost" size="sm" onClick={handleReset} className="text-muted-foreground">
          <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
          Reset
        </Button>
      )}
    </div>
  )
}
