import * as React from "react"
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { DatePicker as MUIDatePicker } from '@mui/x-date-pickers/DatePicker'
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'
import dayjs from "dayjs"

export function DatePicker({
  value,
  onChange,
  placeholder = "Pick a date",
  disabled = false,
  className,
  label,
  required = false,
  minDate,
  maxDate,
  name,
  min,
  max,
  container,
  ...props
}) {
  // Support both minDate/min and maxDate/max for compatibility
  const effectiveMinDate = minDate || min
  const effectiveMaxDate = maxDate || max

  // Convert value to dayjs object
  const getDateValue = () => {
    if (!value) return null
    if (dayjs.isDayjs(value)) return value
    if (value instanceof Date) return dayjs(value)

    // Handle DD/MM/YYYY format
    if (typeof value === 'string' && value.includes('/')) {
      const [day, month, year] = value.split('/')
      return dayjs(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`)
    }

    // Handle YYYY-MM-DD format
    if (typeof value === 'string') {
      return dayjs(value)
    }

    return null
  }

  const handleDateChange = (selectedDate) => {
    if (onChange) {
      // Check if onChange expects a synthetic event (for compatibility)
      if (name) {
        const syntheticEvent = {
          target: {
            name: name,
            value: selectedDate ? selectedDate.format('YYYY-MM-DD') : ''
          }
        }
        onChange(syntheticEvent)
      } else {
        // Pass dayjs object directly
        onChange(selectedDate)
      }
    }
  }

  return (
    <div className={className}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <LocalizationProvider dateAdapter={AdapterDayjs}>
        <MUIDatePicker
          value={getDateValue()}
          onChange={handleDateChange}
          minDate={effectiveMinDate ? dayjs(effectiveMinDate) : undefined}
          maxDate={effectiveMaxDate ? dayjs(effectiveMaxDate) : undefined}
          disabled={disabled}
          slotProps={{
            popper: {
              disablePortal: props.disablePortal,
              style: { zIndex: 99999 }
            },
            textField: {
              placeholder: placeholder,
              fullWidth: true,
              size: "small",
              required: required
            }
          }}
          // For backward compatibility (MUI v5)
          PopperProps={{
            disablePortal: props.disablePortal,
            container: container,
            style: { zIndex: 99999 }
          }}
          {...props}
        />
      </LocalizationProvider>
    </div>
  )
}
