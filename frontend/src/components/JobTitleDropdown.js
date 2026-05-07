import React, { useState, useEffect } from 'react';
import { buildApiUrl } from '../utils/apiConfig';

const JobTitleDropdown = ({ 
  value, 
  onChange, 
  name = "jobTitle",
  placeholder = "Select or add job title",
  className = "",
  required = false 
}) => {
  const [jobTitles, setJobTitles] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newJobTitle, setNewJobTitle] = useState('');

  // Fetch job titles on component mount
  useEffect(() => {
    fetchJobTitles();
  }, []);

  const fetchJobTitles = async () => {
    try {
      const response = await fetch(buildApiUrl('/job-titles'));
      if (response.ok) {
        const data = await response.json();
        setJobTitles(data);
      }
    } catch (error) {
      console.error('Error fetching job titles:', error);
    }
  };

  const handleJobTitleSearch = async (searchTerm) => {
    if (!searchTerm.trim()) {
      fetchJobTitles();
      return;
    }

    try {
      const response = await fetch(buildApiUrl(`/job-titles/search?q=${encodeURIComponent(searchTerm)}`));
      if (response.ok) {
        const data = await response.json();
        setJobTitles(data);
      }
    } catch (error) {
      console.error('Error searching job titles:', error);
    }
  };

  const handleAddJobTitle = async (jobTitleName) => {
    if (!jobTitleName.trim()) return;

    setIsLoading(true);
    try {
      const response = await fetch(buildApiUrl('/job-titles'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: jobTitleName.trim() }),
      });

      if (response.ok) {
        const newJobTitleData = await response.json();
        
        // Update the job titles list
        setJobTitles(prev => {
          const exists = prev.find(title => title._id === newJobTitleData._id);
          if (exists) return prev;
          return [newJobTitleData, ...prev];
        });

        // Select the new job title
        onChange({ target: { name, value: newJobTitleData.name } });
        setSearchTerm(newJobTitleData.name);
        setNewJobTitle('');
        setShowAddForm(false);
        setIsDropdownOpen(false);
      }
    } catch (error) {
      console.error('Error adding job title:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const inputValue = e.target.value;
    setSearchTerm(inputValue);
    onChange({ target: { name, value: inputValue } });
    
    if (inputValue.length > 0) {
      setIsDropdownOpen(true);
      handleJobTitleSearch(inputValue);
    } else {
      setIsDropdownOpen(false);
      fetchJobTitles();
    }
  };

  const handleSelectJobTitle = (jobTitle) => {
    setSearchTerm(jobTitle.name);
    onChange({ target: { name, value: jobTitle.name } });
    setIsDropdownOpen(false);
  };

  const handleInputFocus = () => {
    setIsDropdownOpen(true);
    if (!searchTerm) {
      fetchJobTitles();
    }
  };

  const handleInputBlur = () => {
    // Delay closing to allow for clicks on dropdown items
    setTimeout(() => {
      if (!showAddForm) {
        setIsDropdownOpen(false);
      }
    }, 200);
  };

  const filteredJobTitles = jobTitles.filter(title =>
    title.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const exactMatch = filteredJobTitles.find(title => 
    title.name.toLowerCase() === searchTerm.toLowerCase()
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
          {filteredJobTitles.length > 0 ? (
            <>
              {filteredJobTitles.map((jobTitle) => (
                <div
                  key={jobTitle._id}
                  className="px-3 py-2 hover:bg-gray-100 cursor-pointer text-sm"
                  onMouseDown={() => handleSelectJobTitle(jobTitle)}
                >
                  <div className="font-medium">{jobTitle.name}</div>
                  {jobTitle.description && (
                    <div className="text-xs text-gray-500">{jobTitle.description}</div>
                  )}
                </div>
              ))}
            </>
          ) : searchTerm && (
            <div className="px-3 py-2 text-sm text-gray-500">
              No job titles found
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
                  + Add "{searchTerm}" as new job title
                </button>
              ) : (
                <div className="p-3 border-t">
                  <div className="flex flex-col gap-2">
                    <input
                      type="text"
                      value={newJobTitle}
                      onChange={(e) => setNewJobTitle(e.target.value)}
                      placeholder="Enter job title name"
                      className="w-full px-2 py-1 text-sm border rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleAddJobTitle(newJobTitle || searchTerm)}
                        disabled={isLoading}
                        className="flex-1 px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                      >
                        {isLoading ? 'Adding...' : 'Add'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowAddForm(false);
                          setNewJobTitle('');
                        }}
                        className="flex-1 px-2 py-1 text-xs bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
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

export default JobTitleDropdown;
