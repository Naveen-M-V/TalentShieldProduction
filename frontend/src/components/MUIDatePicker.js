import React from 'react';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';

const MUIDatePicker = ({ 
  label, 
  value, 
  onChange, 
  error, 
  helperText,
  minDate,
  maxDate,
  disabled = false,
  required = false,
  ...props 
}) => {
  // Convert value to dayjs
  const getDayjsValue = () => {
    if (!value) return null;
    if (dayjs.isDayjs(value)) return value;
    return dayjs(value);
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <DatePicker
        label={label}
        value={getDayjsValue()}
        onChange={(newValue) => {
          if (onChange) {
            onChange(newValue);
          }
        }}
        format="DD/MM/YY"
        minDate={minDate ? dayjs(minDate) : undefined}
        maxDate={maxDate ? dayjs(maxDate) : undefined}
        disabled={disabled}
        slotProps={{
          textField: {
            fullWidth: true,
            error: error,
            helperText: helperText,
            required: required,
            variant: 'outlined',
            size: 'medium'
          },
          popper: {
            sx: {
              zIndex: 10001
            }
          }
        }}
        {...props}
      />
    </LocalizationProvider>
  );
};

export default MUIDatePicker;
