import React, { useState } from 'react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, isWithinInterval } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const LeaveCalendar = ({ onDateSelect, startDate, endDate }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  // Internal state for uncontrolled mode
  const [internalRange, setInternalRange] = useState({ start: null, end: null });

  // Use props if provided (controlled), otherwise internal state (uncontrolled)
  const isControlled = startDate !== undefined; // Check if controlled

  const selectedRange = isControlled
    ? { start: startDate, end: endDate }
    : internalRange;

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

  const handleDateClick = (day) => {
    let newRange;

    if (!selectedRange.start || (selectedRange.start && selectedRange.end)) {
      // Start new range
      newRange = { start: day, end: null };
    } else {
      // Complete range
      const start = day < selectedRange.start ? day : selectedRange.start;
      const end = day < selectedRange.start ? selectedRange.start : day;
      newRange = { start, end };
    }

    // Update internal state if uncontrolled
    if (!isControlled) {
      setInternalRange(newRange);
    }

    // Notify parent
    onDateSelect(newRange.start, newRange.end);
  };

  const isInRange = (day) => {
    if (!selectedRange.start || !selectedRange.end) return false;
    return isWithinInterval(day, {
      start: selectedRange.start,
      end: selectedRange.end,
    });
  };

  const isStartDate = (day) => {
    if (!selectedRange.start) return false;
    return isSameDay(day, selectedRange.start);
  };

  const isEndDate = (day) => {
    if (!selectedRange.end) return false;
    return isSameDay(day, selectedRange.end);
  };

  // Add empty cells for days before the start of the month
  // Adjust for Monday start (0 = Sunday, convert to Monday = 0)
  const startDay = monthStart.getDay();
  const adjustedStartDay = startDay === 0 ? 6 : startDay - 1;
  const emptyStartDays = Array.from({ length: adjustedStartDay }).map((_, i) => (
    <div key={`empty-start-${i}`} className="h-10"></div>
  ));

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={prevMonth}
          className="p-1 rounded-full hover:bg-gray-100"
          aria-label="Previous month"
        >
          <ChevronLeft className="h-5 w-5 text-gray-500" />
        </button>
        <h3 className="text-lg font-medium text-gray-900">
          {format(currentMonth, 'MMMM yyyy')}
        </h3>
        <button
          onClick={nextMonth}
          className="p-1 rounded-full hover:bg-gray-100"
          aria-label="Next month"
        >
          <ChevronRight className="h-5 w-5 text-gray-500" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center">
        {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map((day) => (
          <div
            key={day}
            className={`text-xs font-medium py-1 ${day === 'Sa' || day === 'Su' ? 'text-gray-400' : 'text-gray-500'}`}
          >
            {day}
          </div>
        ))}

        {emptyStartDays}

        {daysInMonth.map((day, i) => {
          const isCurrentMonth = isSameMonth(day, currentMonth);
          const isSelected = isInRange(day) || isStartDate(day) || isEndDate(day);
          const isStart = isStartDate(day);
          const isEnd = isEndDate(day);
          const isToday = isSameDay(day, new Date());

          const weekday = day.getDay(); // 0 = Sun, 6 = Sat
          const isWeekend = weekday === 0 || weekday === 6;

          let dayClass = "h-10 w-10 flex items-center justify-center rounded-full text-sm";

          if (isSelected) {
            dayClass += " bg-blue-100 text-blue-700 font-medium";
            if (isStart) dayClass += " rounded-r-none";
            if (isEnd) dayClass += " rounded-l-none";
            if (isStart && isEnd) dayClass = "h-10 w-10 flex items-center justify-center rounded-full bg-blue-600 text-white font-medium";
          } else if (isToday) {
            dayClass += " border-2 border-blue-500";
          } else if (!isCurrentMonth) {
            dayClass += " text-gray-300";
          }

          // slightly dim weekend days for leave calendar (no WOFF label here)
          if (isWeekend && isCurrentMonth && !isSelected) {
            dayClass += ' text-gray-400 opacity-80';
          }

          return (
            <button
              key={i}
              onClick={() => handleDateClick(day)}
              className={dayClass}
              aria-label={`Select ${format(day, 'MMMM d, yyyy')}`}
            >
              {format(day, 'd')}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default LeaveCalendar;
