import { CalendarIcon } from 'lucide-react'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { dateFromISO, formatDate, isoFromLocalDate } from '@/lib/dates'

/**
 * The ISO boundary lives here and nowhere else. Callers pass and receive `YYYY-MM-DD` strings;
 * the only `Date` objects in the app are created and consumed inside this file, for the
 * calendar's benefit, from local components. lib/dates.ts explains why that matters.
 */
export function DateField({
  value,
  onChange,
  label = 'Note date',
}: {
  value: string
  onChange: (iso: string) => void
  label?: string
}) {
  const [open, setOpen] = useState(false)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          aria-label={label}
          className="w-full justify-start gap-2 font-normal tabular-nums"
        >
          <CalendarIcon aria-hidden />
          {formatDate(value)}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={dateFromISO(value)}
          defaultMonth={dateFromISO(value)}
          onSelect={(picked) => {
            // react-day-picker hands back `undefined` when the selected day is clicked again.
            // A note always has a date, so that is a dismissal, not a clear.
            if (picked !== undefined) onChange(isoFromLocalDate(picked))
            setOpen(false)
          }}
          autoFocus
        />
      </PopoverContent>
    </Popover>
  )
}
