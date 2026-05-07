import React, { useState } from 'react';
import { CalendarDays, Clock, AlertCircle, CheckCircle2 } from 'lucide-react';
import LeaveForm from './LeaveForm';
import LeaveCalendar from './LeaveCalendar';
import AnnouncementsPanel from './AnnouncementsPanel';

const LeaveRequestCard = () => {
  const [selectedDates, setSelectedDates] = useState({
    start: null,
    end: null
  });

  const announcements = [
    { id: 1, text: 'Company holiday on Monday', date: '15/12/2024' },
    { id: 2, text: 'Team meeting at 2 PM', date: '16/12/2024' },
    { id: 3, text: 'HR policy update', date: '18/12/2024' },
  ];

  const handleDateSelect = (start, end) => {
    setSelectedDates({ start, end });
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <div className="p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-6">Leave Request</h2>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Panel - Form */}
          <div className="lg:col-span-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-6">
                <LeaveForm selectedDates={selectedDates} />
                
                {/* Selected Date Range */}
                {selectedDates.start && selectedDates.end && (
                  <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-100">
                    <div className="flex items-center text-sm text-blue-700">
                      <CalendarDays className="h-4 w-4 mr-2" />
                      <span>
                        {selectedDates.start.toLocaleDateString()} → {selectedDates.end.toLocaleDateString()}
                      </span>
                    </div>
                    <div className="mt-2 flex items-center text-sm text-gray-500">
                      <Clock className="h-4 w-4 mr-2" />
                      <span>Full day</span>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Calendar */}
              <div className="border-l border-gray-200 pl-6">
                <LeaveCalendar onDateSelect={handleDateSelect} />
              </div>
            </div>
          </div>
          
          {/* Right Panel - Announcements */}
          {/* <div className="lg:border-l lg:border-gray-200 lg:pl-6">
            <AnnouncementsPanel announcements={announcements} />
          </div> */}
        </div>
      </div>
    </div>
  );
};

export default LeaveRequestCard;
