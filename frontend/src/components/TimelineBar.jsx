import React, { useState, useEffect } from 'react';

const TIMELINE_START = 5;   // 05:00
const TIMELINE_END = 23;    // 23:00
const TIMELINE_HOURS = TIMELINE_END - TIMELINE_START;

const segmentColors = {
  late: '#EF4444',      // Red
  working: '#3B82F6',   // Blue
  break: '#06B6D4',     // Cyan
  overtime: '#F97316',  // Orange
  dayoff: '#EAB308'     // Yellow
};

// Convert time string "HH:MM" to decimal hours
const timeToDecimal = (time) => {
  const [hours, minutes] = time.split(':').map(Number);
  return hours + minutes / 60;
};

// Calculate percentage position within timeline
const getPositionPercent = (time) => {
  const decimal = timeToDecimal(time);
  const offset = decimal - TIMELINE_START;
  return Math.max(0, Math.min(100, (offset / TIMELINE_HOURS) * 100));
};

export const TimelineBar = ({ segments, clockInTime, clockOutTime, isToday = false }) => {
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update current time every minute for progressive animation
  useEffect(() => {
    if (!isToday) return;
    
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [isToday]);

  // Generate time labels (05:00, 07:00, 09:00, 11:00, 13:00, 15:00, 17:00, 19:00, 21:00, 23:00)
  const timeLabels = [];
  for (let hour = 5; hour <= 23; hour += 2) {
    const time = `${hour.toString().padStart(2, '0')}:00`;
    timeLabels.push({
      time,
      position: getPositionPercent(time)
    });
  }

  // Generate tick marks for every hour
  const tickMarks = [];
  for (let hour = 5; hour <= 23; hour += 1) {
    const time = `${hour.toString().padStart(2, '0')}:00`;
    tickMarks.push({
      position: getPositionPercent(time)
    });
  }

  // Calculate progressive width for ongoing segments
  const calculateProgressiveWidth = (segment, index) => {
    const leftPercent = getPositionPercent(segment.startTime);
    const rightPercent = getPositionPercent(segment.endTime);
    const fullWidthPercent = rightPercent - leftPercent;

    // If not today or segment has ended, return full width
    if (!isToday || segment.endTime !== 'Present') {
      return fullWidthPercent;
    }

    // Calculate current time position
    const now = currentTime;
    const currentHours = now.getHours();
    const currentMinutes = now.getMinutes();
    const currentTimeStr = `${currentHours.toString().padStart(2, '0')}:${currentMinutes.toString().padStart(2, '0')}`;
    const currentPercent = getPositionPercent(currentTimeStr);

    // If current time is before segment start, no width
    if (currentPercent <= leftPercent) {
      return 0;
    }

    // If current time is within segment, calculate partial width
    if (currentPercent < rightPercent) {
      return currentPercent - leftPercent;
    }

    // Otherwise, full width
    return fullWidthPercent;
  };

  return (
    <div className="relative w-full">
      {/* Time Labels */}
      <div className="relative w-full h-5 mb-1">
        {timeLabels.map((label, index) => (
          <div
            key={index}
            className="absolute"
            style={{
              left: `${label.position}%`,
              transform: 'translateX(-50%)',
              fontSize: '11px',
              color: '#9CA3AF',
              fontWeight: 400
            }}
          >
            {label.time}
          </div>
        ))}
      </div>

      {/* Timeline Bar Container */}
      <div className="relative w-full">
        {/* Background bar with tick marks */}
        <div 
          className="relative w-full bg-slate-100"
          style={{ height: '32px', borderRadius: '4px' }}
        >
          {/* Tick marks */}
          {tickMarks.map((tick, index) => (
            <div
              key={index}
              className="absolute top-0 bottom-0"
              style={{
                left: `${tick.position}%`,
                width: '1px',
                backgroundColor: '#E2E8F0',
                opacity: 0.5
              }}
            />
          ))}
        </div>

        {/* Clock-in starter line */}
        {clockInTime && (
          <div
            className="absolute"
            style={{
              left: `${getPositionPercent(clockInTime)}%`,
              top: '0',
              width: '2px',
              height: '32px',
              backgroundColor: '#64748B',
              zIndex: 10
            }}
          />
        )}

        {/* Clock-out stopper line */}
        {clockOutTime && clockOutTime !== 'Present' && (
          <div
            className="absolute"
            style={{
              left: `${getPositionPercent(clockOutTime)}%`,
              top: '0',
              width: '2px',
              height: '32px',
              backgroundColor: '#64748B',
              zIndex: 10
            }}
          />
        )}

        {/* Segments overlay */}
        <div 
          className="absolute top-0 left-0 w-full"
          style={{ height: '32px', padding: '3px 0' }}
        >
          {segments.map((segment, index) => {
            const leftPercent = getPositionPercent(segment.startTime);
            const widthPercent = calculateProgressiveWidth(segment, index);
            
            // Add small gap after each segment except the last one
            const isLastSegment = index === segments.length - 1;
            const gapSize = !isLastSegment ? 0.15 : 0;

            return (
              <div
                key={index}
                className="absolute flex items-center justify-center"
                style={{
                  left: `${leftPercent}%`,
                  width: `calc(${widthPercent}% - ${gapSize}%)`,
                  height: '26px',
                  top: '3px',
                  backgroundColor: segmentColors[segment.type],
                  color: '#FFFFFF',
                  fontSize: '11px',
                  fontWeight: 500,
                  borderRadius: '3px',
                  overflow: 'hidden',
                  whiteSpace: 'nowrap',
                  boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
                  transition: 'width 1s linear'
                }}
              >
                {widthPercent > 6 && segment.label}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default TimelineBar;
