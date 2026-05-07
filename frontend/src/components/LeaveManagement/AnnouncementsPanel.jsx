import React from 'react';
import { Bell } from 'lucide-react';
import { formatDateDDMMYY } from '../../utils/dateFormatter';

const AnnouncementsPanel = ({ announcements }) => {
  return (
    <div className="h-full">
      <div className="flex items-center mb-4">
        <Bell className="h-5 w-5 text-gray-500 mr-2" />
        <h3 className="text-lg font-medium text-gray-900">Announcements</h3>
      </div>
      
      <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
        {announcements.map((announcement) => (
          <div key={announcement.id} className="flex items-start">
            <div className="flex-shrink-0 h-2 w-2 mt-2 rounded-full bg-blue-500"></div>
            <div className="ml-3 flex-1">
              <p className="text-sm text-gray-700">{announcement.text}</p>
              <p className="text-xs text-gray-500 mt-1">{formatDateDDMMYY(announcement.date)}</p>
            </div>
          </div>
        ))}
        
        {announcements.length === 0 && (
          <p className="text-sm text-gray-500 italic">No announcements</p>
        )}
      </div>
    </div>
  );
};

export default AnnouncementsPanel;
