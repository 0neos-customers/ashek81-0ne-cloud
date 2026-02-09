'use client'

import * as React from 'react'
import { format } from 'date-fns'
import { Calendar as CalendarIcon } from 'lucide-react'
import {
  cn,
  Button,
  Calendar,
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@0ne/ui'
import type { DateRange } from '@0ne/db/types/kpi'

interface DateRangePickerProps {
  value: DateRange
  onChange: (range: DateRange) => void
}

export function DateRangePicker({ value, onChange }: DateRangePickerProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            'w-[280px] justify-start text-left font-normal',
            !value && 'text-muted-foreground'
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {value?.from ? (
            value.to ? (
              <>
                {format(value.from, 'LLL dd, y')} -{' '}
                {format(value.to, 'LLL dd, y')}
              </>
            ) : (
              format(value.from, 'LLL dd, y')
            )
          ) : (
            <span>Pick a date range</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="end">
        <Calendar
          initialFocus
          mode="range"
          defaultMonth={value?.from}
          selected={{ from: value?.from, to: value?.to }}
          onSelect={(range) => {
            if (range?.from && range?.to) {
              onChange({ from: range.from, to: range.to })
            }
          }}
          numberOfMonths={2}
        />
      </PopoverContent>
    </Popover>
  )
}
