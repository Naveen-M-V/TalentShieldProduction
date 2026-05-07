import React from 'react';
import { motion } from 'framer-motion';

const ReportCard = ({ report, icon: Icon, onClick, delay = 0 }) => {
  const getCategoryColor = (category) => {
    const colors = {
      Leave: 'from-blue-400 to-blue-600',
      Time: 'from-green-400 to-green-600',
      People: 'from-purple-400 to-purple-600',
      Finance: 'from-yellow-400 to-yellow-600',
      Payroll: 'from-red-400 to-red-600',
      Compliance: 'from-indigo-400 to-indigo-600'
    };
    return colors[category] || 'from-gray-400 to-gray-600';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      whileHover={{ scale: 1.05, y: -5 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => onClick(report)}
      className="bg-white rounded-xl shadow-lg overflow-hidden cursor-pointer transform transition-all duration-300 hover:shadow-2xl flex flex-col h-full"
    >
      {/* Icon Header */}
      <div className={`bg-gradient-to-r ${getCategoryColor(report.category)} p-6 text-white`}>
        <div className="flex items-center justify-between">
          {Icon && <Icon size={40} className="drop-shadow-lg" />}
          <span className="text-xs font-semibold uppercase tracking-wider opacity-90">
            {report.category}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-6 flex-1">
        <h3 className="text-xl font-bold text-gray-900 mb-2">
          {report.name}
        </h3>
        <p className="text-gray-600 text-sm leading-relaxed">
          {report.description}
        </p>
      </div>

      {/* Footer */}
      <div className="px-6 pb-6 mt-auto">
        <button className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white py-2 px-4 rounded-lg font-semibold hover:from-blue-600 hover:to-blue-700 transition-all duration-200 shadow-md hover:shadow-lg">
          Generate Report
        </button>
      </div>
    </motion.div>
  );
};

export default ReportCard;
