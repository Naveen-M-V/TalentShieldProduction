import React, { useState, useEffect } from 'react';
import { buildApiUrl } from '../utils/apiConfig';

const JobRoleCheckboxPicker = ({ 
  value = [], 
  onChange, 
  name = "jobRole",
  className = "",
  required = false 
}) => {
  const [jobRoles, setJobRoles] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showAll, setShowAll] = useState(false);

  // Fetch job roles on component mount
  useEffect(() => {
    fetchJobRoles();
  }, []);

  const fetchJobRoles = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(buildApiUrl('/job-roles'));
      if (response.ok) {
        const data = await response.json();
        console.log('Job roles fetched:', data.length, 'roles');
        setJobRoles(data);
      } else {
        console.error('Failed to fetch job roles:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('Error fetching job roles:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleJobRoleChange = (jobRoleName, isChecked) => {
    const currentRoles = Array.isArray(value) ? value : [];
    let newRoles;
    
    if (isChecked) {
      newRoles = [...currentRoles, jobRoleName];
    } else {
      newRoles = currentRoles.filter(role => role !== jobRoleName);
    }
    
    onChange({ target: { name, value: newRoles } });
  };

  const handleSelectAll = () => {
    const filteredRoles = getFilteredJobRoles();
    const allRoleNames = filteredRoles.map(role => role.name);
    onChange({ target: { name, value: allRoleNames } });
  };

  const handleClearAll = () => {
    onChange({ target: { name, value: [] } });
  };

  const getFilteredJobRoles = () => {
    if (!searchTerm) return jobRoles;
    return jobRoles.filter(role =>
      role.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  const filteredJobRoles = getFilteredJobRoles();
  const displayedRoles = showAll ? filteredJobRoles : filteredJobRoles.slice(0, 10);
  const selectedRoles = Array.isArray(value) ? value : [];

  return (
    <div className={`${className}`}>
      {/* Search and Controls */}
      <div className="mb-4 space-y-3">
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Search job roles..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 border rounded-lg p-2 text-sm"
          />
          <button
            type="button"
            onClick={handleSelectAll}
            className="px-3 py-2 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Select All
          </button>
          <button
            type="button"
            onClick={handleClearAll}
            className="px-3 py-2 text-xs bg-gray-500 text-white rounded hover:bg-gray-600"
          >
            Clear All
          </button>
        </div>
        
        {/* Selected count */}
        <div className="text-sm text-gray-600">
          {selectedRoles.length} of {filteredJobRoles.length} job roles selected
          {searchTerm && ` (filtered from ${jobRoles.length} total)`}
        </div>
      </div>

      {/* Selected Roles Display */}
      {selectedRoles.length > 0 && (
        <div className="mb-4 p-3 bg-blue-50 rounded-lg">
          <div className="text-sm font-medium text-blue-800 mb-2">Selected Job Roles:</div>
          <div className="flex flex-wrap gap-1">
            {selectedRoles.map((role, index) => (
              <span
                key={index}
                className="inline-flex items-center px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full"
              >
                {role}
                <button
                  type="button"
                  onClick={() => handleJobRoleChange(role, false)}
                  className="ml-1 text-blue-600 hover:text-blue-800"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Job Roles List */}
      <div className="border rounded-lg max-h-96 overflow-y-auto">
        {isLoading ? (
          <div className="p-4 text-center text-gray-500">Loading job roles...</div>
        ) : filteredJobRoles.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            {searchTerm ? `No job roles found matching "${searchTerm}"` : 'No job roles available'}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-1 p-2">
              {displayedRoles.map((jobRole) => {
                const isSelected = selectedRoles.includes(jobRole.name);
                return (
                  <label
                    key={jobRole._id}
                    className={`flex items-center p-2 rounded cursor-pointer hover:bg-gray-50 ${
                      isSelected ? 'bg-blue-50 border border-blue-200' : ''
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={(e) => handleJobRoleChange(jobRole.name, e.target.checked)}
                      className="mr-2 text-blue-600"
                    />
                    <span className={`text-sm ${isSelected ? 'text-blue-800 font-medium' : 'text-gray-700'}`}>
                      {jobRole.name}
                    </span>
                  </label>
                );
              })}
            </div>
            
            {/* Show More/Less Button */}
            {filteredJobRoles.length > 10 && (
              <div className="border-t p-2 text-center">
                <button
                  type="button"
                  onClick={() => setShowAll(!showAll)}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  {showAll ? 'Show Less' : `Show All ${filteredJobRoles.length} Roles`}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Validation message */}
      {required && selectedRoles.length === 0 && (
        <div className="mt-2 text-sm text-red-600">
          Please select at least one job role
        </div>
      )}
    </div>
  );
};

export default JobRoleCheckboxPicker;
