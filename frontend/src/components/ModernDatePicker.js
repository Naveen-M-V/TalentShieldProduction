import React from 'react';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';

const ModernDatePicker = ({
  name,
  value,
  onChange,
  placeholder = 'Select date',
  required = false,
  className = '',
  min = null,
  max = null,
  disabled = false,
  label = null
}) => {
  
  // Convert value to dayjs object
  const getDayjsValue = () => {
    if (!value) return null;
    
    // Handle DD/MM/YYYY format
    if (typeof value === 'string' && value.includes('/')) {
      const [day, month, year] = value.split('/');
      return dayjs(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`);
    }
    
    // Handle YYYY-MM-DD format
    if (typeof value === 'string' && value.includes('-')) {
      return dayjs(value);
    }
    
    return dayjs(value);
  };

  // Handle date change from Material UI DatePicker
  const handleDateChange = (newValue) => {
    if (newValue && newValue.isValid()) {
      // Convert to YYYY-MM-DD format
      const formattedValue = newValue.format('YYYY-MM-DD');
      
      const syntheticEvent = {
        target: {
          name: name,
          value: formattedValue
        }
      };
      onChange(syntheticEvent);
    } else {
      const syntheticEvent = {
        target: {
          name: name,
          value: ''
        }
      };
      onChange(syntheticEvent);
    }
  };

  return (
    <div className={className}>
      {label && (
        <label htmlFor={name} className="block text-sm font-medium text-gray-700 mb-1">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      
      <LocalizationProvider dateAdapter={AdapterDayjs}>
        <DatePicker
          value={getDayjsValue()}
          onChange={handleDateChange}
          disabled={disabled}
          minDate={min ? dayjs(min) : undefined}
          maxDate={max ? dayjs(max) : undefined}
          format="DD/MM/YYYY"
          slotProps={{
            textField: {
              id: name,
              placeholder: placeholder,
              required: required,
              name: name,
              fullWidth: true,
              size: "small",
              sx: {
                '& .MuiOutlinedInput-root': {
                  borderRadius: '8px',
                  backgroundColor: disabled ? '#F9FAFB' : 'white',
                  '&:hover fieldset': {
                    borderColor: '#3B82F6',
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: '#3B82F6',
                    borderWidth: '2px',
                  },
                },
                '& .MuiOutlinedInput-input': {
                  padding: '8px 12px',
                  fontSize: '14px',
                },
              }
            }
          }}
        />
      </LocalizationProvider>
    </div>
  );
};

export default ModernDatePicker;
