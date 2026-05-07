import React, { useState, useEffect } from 'react';
import { buildApiUrl } from '../utils/apiConfig';

const JobLevelDropdown = ({ 
  value, 
  onChange, 
  name = "jobLevel",
  placeholder = "Select or add job level",
  className = "",
  required = false 
}) => {
  const [jobLevels, setJobLevels] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newJobLevel, setNewJobLevel] = useState('');

  // Fetch job levels on component mount
  useEffect(() => {
    fetchJobLevels();
  }, []);

  const fetchJobLevels = async () => {
    try {
      const response = await fetch(buildApiUrl('/job-levels'));
      if (response.ok) {
        const data = await response.json();
        console.log('Job levels fetched:', data.length, 'levels');
        setJobLevels(data);
      } else {
        console.error('Failed to fetch job levels:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('Error fetching job levels:', error);
    }
  };

  const handleJobLevelSearch = async (searchTerm) => {
    if (!searchTerm.trim()) {
      fetchJobLevels();
      return;
    }

    try {
      const response = await fetch(buildApiUrl(`/job-levels/search?q=${encodeURIComponent(searchTerm)}`));
      if (response.ok) {
        const data = await response.json();
        setJobLevels(data);
      }
    } catch (error) {
      console.error('Error searching job levels:', error);
    }
  };

  const handleAddJobLevel = async (jobLevelName) => {
    if (!jobLevelName.trim()) return;

    setIsLoading(true);
    try {
      const response = await fetch(buildApiUrl('/job-levels'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: jobLevelName.trim() }),
      });

      if (response.ok) {
        const newJobLevelData = await response.json();
        
        // Add to local state
        setJobLevels(prev => [...prev, newJobLevelData]);
        
        // Select the new job level
        setSearchTerm(newJobLevelData.name);
        onChange({ target: { name, value: newJobLevelData.name } });
        
        // Reset form
        setNewJobLevel('');
        setShowAddForm(false);
        setIsDropdownOpen(false);
      }
    } catch (error) {
      console.error('Error adding job level:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const inputValue = e.target.value;
    setSearchTerm(inputValue);
    
    if (inputValue.length > 0) {
      setIsDropdownOpen(true);
      handleJobLevelSearch(inputValue);
    } else {
      setIsDropdownOpen(false);
      fetchJobLevels();
    }
  };

  const handleSelectJobLevel = (jobLevel) => {
    setSearchTerm(jobLevel.name);
    onChange({ target: { name, value: jobLevel.name } });
    setIsDropdownOpen(false);
  };

  const handleInputFocus = () => {
    setIsDropdownOpen(true);
    fetchJobLevels(); // Always fetch on focus to ensure we have the latest data
  };

  const handleInputBlur = () => {
    // Delay closing to allow for clicks on dropdown items
    setTimeout(() => {
      if (!showAddForm) {
        setIsDropdownOpen(false);
      }
    }, 200);
  };

  const filteredJobLevels = jobLevels.filter(level =>
    level.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const exactMatch = filteredJobLevels.find(level => 
    level.name.toLowerCase() === searchTerm.toLowerCase()
  );

  return (
    <div className={`relative ${className}`}>
      <input
        type="text"
        name={name}
        value={searchTerm}
        onChange={handleInputChange}
        onFocus={handleInputFocus}
        onBlur={handleInputBlur}
        placeholder={placeholder}
        required={required}
        className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        autoComplete="off"
      />

      {isDropdownOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
          {jobLevels.length === 0 ? (
            <div className="px-3 py-2 text-sm text-gray-500">
              Loading job levels...
            </div>
          ) : filteredJobLevels.length > 0 ? (
            <>
              {filteredJobLevels.map((jobLevel) => (
                <div
                  key={jobLevel._id}
                  className="px-3 py-2 hover:bg-gray-100 cursor-pointer text-sm"
                  onMouseDown={() => handleSelectJobLevel(jobLevel)}
                >
                  <div className="font-medium">{jobLevel.name}</div>
                  {jobLevel.description && (
                    <div className="text-xs text-gray-500">{jobLevel.description}</div>
                  )}
                </div>
              ))}
            </>
          ) : searchTerm && (
            <div className="px-3 py-2 text-sm text-gray-500">
              No job levels found matching "{searchTerm}"
            </div>
          )}

          {searchTerm && !exactMatch && (
            <div className="border-t border-gray-200">
              {!showAddForm ? (
                <button
                  type="button"
                  className="w-full px-3 py-2 text-left text-sm text-blue-600 hover:bg-blue-50 focus:outline-none"
                  onMouseDown={() => setShowAddForm(true)}
                >
                  + Add "{searchTerm}" as new job level
                </button>
              ) : (
                <div className="p-3 border-t">
                  <div className="flex flex-col gap-2">
                    <input
                      type="text"
                      value={newJobLevel}
                      onChange={(e) => setNewJobLevel(e.target.value)}
                      placeholder="Enter job level name"
                      className="w-full px-2 py-1 text-sm border rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleAddJobLevel(newJobLevel)}
                        disabled={isLoading || !newJobLevel.trim()}
                        className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
                      >
                        {isLoading ? 'Adding...' : 'Add'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowAddForm(false);
                          setNewJobLevel('');
                        }}
                        className="px-3 py-1 text-xs bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default JobLevelDropdown;
