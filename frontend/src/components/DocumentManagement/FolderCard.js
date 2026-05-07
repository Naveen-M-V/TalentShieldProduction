import React from 'react';
import { motion } from 'framer-motion';
import { Folder, FileText, ChevronRight, Calendar, User } from 'lucide-react';

const FolderCard = ({ folder, onClick }) => {
  // Format date
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  // Animation variants
  const cardVariants = {
    initial: { scale: 1, y: 0 },
    hover: { 
      scale: 1.02, 
      y: -2,
      transition: { 
        type: 'spring', 
        stiffness: 400, 
        damping: 17 
      }
    },
    tap: { scale: 0.98 }
  };

  return (
    <motion.div
      variants={cardVariants}
      initial="initial"
      whileHover="hover"
      whileTap="tap"
      onClick={onClick}
      className="bg-white border border-gray-200 rounded-xl p-4 cursor-pointer shadow-sm hover:shadow-md transition-all duration-200"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-blue-50 rounded-lg">
            <Folder className="w-6 h-6 text-blue-600" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900 text-sm">{folder.name}</h3>
            {folder.description && (
              <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                {folder.description}
              </p>
            )}
          </div>
        </div>
        <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
      </div>

      {/* Document Count */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2 text-xs text-gray-500">
          <FileText className="w-3 h-3" />
          <span>{folder.documentCount || 0} documents</span>
        </div>
        
        {/* Metadata */}
        <div className="flex items-center space-x-3 text-xs text-gray-400">
          {folder.createdBy && (
            <div className="flex items-center space-x-1">
              <User className="w-3 h-3" />
              <span>{folder.createdBy.firstName}</span>
            </div>
          )}
          <div className="flex items-center space-x-1">
            <Calendar className="w-3 h-3" />
            <span>{formatDate(folder.createdAt)}</span>
          </div>
        </div>
      </div>

      {/* Permission Badges */}
      {folder.permissions && (
        <div className="mt-3 flex flex-wrap gap-1">
          {folder.permissions.view && folder.permissions.view.length > 0 && (
            <span className="px-2 py-1 bg-green-50 text-green-600 text-xs rounded-full">
              View: {folder.permissions.view.join(', ')}
            </span>
          )}
          {folder.permissions.edit && folder.permissions.edit.length > 0 && (
            <span className="px-2 py-1 bg-blue-50 text-blue-600 text-xs rounded-full">
              Edit: {folder.permissions.edit.join(', ')}
            </span>
          )}
        </div>
      )}
    </motion.div>
  );
};

export default FolderCard;
