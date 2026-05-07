import { useEffect, useState } from "react";
import { useNotifications } from "../context/NotificationContext";
import { Mail, Check } from "lucide-react";
import { formatDateDDMMYY } from '../utils/dateFormatter';

export default function Notifications() {
  const { notifications, markAsRead, markAllAsRead, refreshNotifications } = useNotifications();

  // 👇 Track which notification is selected
  const [selected, setSelected] = useState(null);
  
  // Handle opening notification and marking as read
  const handleOpenNotification = async (note) => {
    setSelected(note);
    if (!note.read) {
      await markAsRead(note.id);
    }
  };

  useEffect(() => {
    if (notifications.some(note => !note.read)) {
      markAllAsRead();
    }
  }, [notifications, markAllAsRead]);

  return (
    <div className="p-6 min-h-screen" style={{ backgroundColor: '#f7f8f6' }}>
      {/* Page Title */}
      <h1 className="text-2xl font-bold mb-6">Notifications</h1>

      {/* Notifications List */}
      <div className="space-y-4">
        {notifications.map((note) => (
          <div
            key={note.id}
            onClick={() => handleOpenNotification(note)}
            className={`flex items-start justify-between bg-white shadow rounded-lg p-4 border ${
              'cursor-pointer hover:bg-gray-50 transition-colors'
            }`}
          >
            {/* Left side - icon + content */}
            <div className="flex items-start gap-4">
              <Mail className="w-6 h-6 text-gray-600 mt-1" />

              <div>
                <p className="text-sm text-gray-600">{formatDateDDMMYY(note.date)}</p>
                <p className="text-gray-800">{note.title}</p>
              </div>
            </div>

            {/* Status Badge */}
            {note.read ? (
              <div className="flex items-center gap-2 px-3 py-1 bg-green-100 text-green-700 rounded text-sm">
                <Check className="w-4 h-4" />
                <span>Read</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-700 rounded text-sm">
                <span>Unread</span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Floating Modal */}
      {selected && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-lg p-6 animate-fadeIn">
            {/* Header */}
            <h2 className="text-lg font-bold mb-2">{selected.title}</h2>
            <p className="text-sm text-gray-500 mb-1">
              Created: {selected.createdAt ? formatDateDDMMYY(selected.createdAt) : 'N/A'}
            </p>
            <p className="text-sm text-gray-500 mb-4">
              Status: {selected.status}
            </p>

            {/* Message */}
            <p className="text-gray-700">{selected.message}</p>

            {/* Actions */}
            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => setSelected(null)}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Refresh Button */}
      <div className="mt-6 flex justify-center">
        <button
          onClick={refreshNotifications}
          className="px-6 py-2 rounded bg-green-600 text-white hover:bg-green-700 shadow"
        >
          Refresh Notifications
        </button>
      </div>
    </div>
  );
}