import React, { useState, useRef, useEffect } from 'react';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import dayjs from 'dayjs';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
import isBetween from 'dayjs/plugin/isBetween';

dayjs.extend(isSameOrBefore);
dayjs.extend(isSameOrAfter);
dayjs.extend(isBetween);

const DateRangePicker = ({ value, onChange, className = "" }) => {
  const [currentMonth, setCurrentMonth] = useState(dayjs());
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionStart, setSelectionStart] = useState(null);
  const [hoveredDate, setHoveredDate] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  const calendarRef = useRef(null);

  const startDate = value?.[0] ? dayjs(value[0]) : null;
  const endDate = value?.[1] ? dayjs(value[1]) : null;

  const getDaysInMonth = (date) => {
    const start = date.startOf('month').startOf('week');
    const end = date.endOf('month').endOf('week');
    const days = [];
    
    let current = start;
    while (current.isBefore(end) || current.isSame(end)) {
      days.push(current);
      current = current.add(1, 'day');
    }
    
    return days;
  };

  const isDateInRange = (date) => {
    if (!startDate || !endDate) return false;
    return (date.isAfter(startDate) || date.isSame(startDate)) && 
           (date.isBefore(endDate) || date.isSame(endDate));
  };

  const isDateInSelection = (date) => {
    if (!isSelecting || !selectionStart || !hoveredDate) return false;
    const start = selectionStart.isBefore(hoveredDate) ? selectionStart : hoveredDate;
    const end = selectionStart.isAfter(hoveredDate) ? selectionStart : hoveredDate;
    return (date.isAfter(start) || date.isSame(start)) && 
           (date.isBefore(end) || date.isSame(end));
  };

  const handleDateMouseDown = (date) => {
    setIsSelecting(true);
    setSelectionStart(date);
    setHoveredDate(date);
    
    // Start new selection
    onChange([date.toDate(), date.toDate()]);
  };

  const handleDateMouseEnter = (date) => {
    if (!isSelecting) return;
    setHoveredDate(date);
    
    // Update selection range
    if (selectionStart) {
      const start = selectionStart.isBefore(date) ? selectionStart : date;
      const end = selectionStart.isAfter(date) ? selectionStart : date;
      onChange([start.toDate(), end.toDate()]);
    }
  };

  const handleMouseUp = () => {
    if (isSelecting && selectionStart && hoveredDate) {
      const start = selectionStart.isBefore(hoveredDate) ? selectionStart : hoveredDate;
      const end = selectionStart.isAfter(hoveredDate) ? selectionStart : hoveredDate;
      onChange([start.toDate(), end.toDate()]);
    }
    setIsSelecting(false);
    setSelectionStart(null);
    setHoveredDate(null);
  };

  const handleInputClick = () => {
    setIsOpen(!isOpen);
  };

  const handlePrevMonth = () => {
    setCurrentMonth(currentMonth.subtract(1, 'month'));
  };

  const handleNextMonth = () => {
    setCurrentMonth(currentMonth.add(1, 'month'));
  };

  const formatDateRange = () => {
    if (!startDate || !endDate) return 'Select date range';
    if (startDate.isSame(endDate)) {
      return startDate.format('DD MMM YYYY');
    }
    return `${startDate.format('DD MMM YYYY')} - ${endDate.format('DD MMM YYYY')}`;
  };

  const days = getDaysInMonth(currentMonth);
  const weekDays = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (isSelecting) {
        handleMouseUp();
      }
    };

    const handleClickOutside = (event) => {
      if (calendarRef.current && !calendarRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mouseup', handleGlobalMouseUp);
    document.addEventListener('mousedown', handleClickOutside);
    
    return () => {
      document.removeEventListener('mouseup', handleGlobalMouseUp);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isSelecting, selectionStart, hoveredDate]);

  return (
    <div className={`relative ${className}`}>
      {/* Input display */}
      <div 
        className="min-h-[42px] px-3 py-2 border border-gray-300 rounded-lg cursor-pointer focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white flex items-center gap-2"
        onClick={handleInputClick}
      >
        <Calendar size={18} className="text-gray-400" />
        <span className={startDate ? 'text-gray-900' : 'text-gray-500'}>
          {formatDateRange()}
        </span>
      </div>

      {/* Calendar dropdown - show only when open */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg p-4" ref={calendarRef}>
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={handlePrevMonth}
            className="p-1 hover:bg-gray-100 rounded-md transition-colors"
          >
            <ChevronLeft size={16} />
          </button>
          <h3 className="font-medium text-gray-900">
            {currentMonth.format('MMMM YYYY')}
          </h3>
          <button
            onClick={handleNextMonth}
            className="p-1 hover:bg-gray-100 rounded-md transition-colors"
          >
            <ChevronRight size={16} />
          </button>
        </div>

        {/* Week days */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {weekDays.map(day => (
            <div key={day} className="text-center text-xs font-medium text-gray-500 py-1">
              {day}
            </div>
          ))}
        </div>

        {/* Days */}
        <div 
          ref={calendarRef}
          className="grid grid-cols-7 gap-1"
          onMouseLeave={() => {
            if (isSelecting) {
              setHoveredDate(null);
            }
          }}
        >
          {days.map((date, index) => {
            const isCurrentMonth = date.isSame(currentMonth, 'month');
            const isToday = date.isSame(dayjs(), 'day');
            const isSelected = isDateInRange(date);
            const isSelection = isDateInSelection(date);
            const isStart = startDate && date.isSame(startDate, 'day');
            const isEnd = endDate && date.isSame(endDate, 'day');

            return (
              <div
                key={index}
                className={`
                  relative p-1 text-center cursor-pointer rounded-md transition-colors
                  ${!isCurrentMonth ? 'text-gray-400' : 'text-gray-900'}
                  ${isToday ? 'ring-2 ring-purple-500' : ''}
                  ${isSelected ? 'bg-purple-100 text-purple-900' : ''}
                  ${isSelection && !isSelected ? 'bg-purple-50 text-purple-700' : ''}
                  ${isStart || isEnd ? 'bg-purple-600 text-white' : ''}
                  ${!isSelected && !isSelection ? 'hover:bg-gray-100' : ''}
                `}
                onMouseDown={() => handleDateMouseDown(date)}
                onMouseEnter={() => handleDateMouseEnter(date)}
                onMouseUp={handleMouseUp}
              >
                <span className="text-sm">
                  {date.format('D')}
                </span>
                {(isStart || isEnd) && (
                  <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-purple-600 rounded-full" />
                )}
              </div>
            );
          })}
        </div>

        {/* Instructions */}
        <div className="mt-3 pt-3 border-t border-gray-200">
          <p className="text-xs text-gray-500">
            Click and drag to select a date range
          </p>
        </div>
        </div>
      )}
    </div>
  );
};

export default DateRangePicker;
