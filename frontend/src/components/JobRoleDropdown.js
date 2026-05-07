import React, { useState, useEffect, useRef } from 'react';
import { buildApiUrl } from '../utils/apiConfig';

const JobRoleDropdown = ({
  value,
  onChange,
  name = "jobRole",
  placeholder = "Type to search job roles...",
  className = "",
  required = false,
  disabled = false
}) => {
  const [jobRoles, setJobRoles] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [filteredJobRoles, setFilteredJobRoles] = useState([]);
  const dropdownRef = useRef(null);
  const inputRef = useRef(null);

  const fetchJobRoles = async () => {
    try {
      const response = await fetch(buildApiUrl('/job-roles'));
      if (response.ok) {
        const data = await response.json();
        setJobRoles(data);
      } else {
        console.error('Failed to fetch job roles:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('Error fetching job roles:', error);
    }
  };

  useEffect(() => {
    if (value && typeof value === 'string') {
      setSearchTerm(value);
    }
  }, [value]);

  useEffect(() => {
    fetchJobRoles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (searchTerm) {
      const filtered = jobRoles.filter(role =>
        role.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredJobRoles(filtered);
    } else {
      setFilteredJobRoles(jobRoles);
    }
  }, [jobRoles, searchTerm]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleJobRoleSearch = async (searchTerm) => {
    if (!searchTerm.trim()) {
      fetchJobRoles();
      return;
    }

    try {
      const response = await fetch(buildApiUrl(`/job-roles/search?q=${encodeURIComponent(searchTerm)}`));
      if (response.ok) {
        const data = await response.json();
        setJobRoles(data);
      }
    } catch (error) {
      console.error('Error searching job roles:', error);
    }
  };

  const handleAddJobRole = async (jobRoleName) => {
    if (!jobRoleName.trim()) return;

    try {
      const response = await fetch(buildApiUrl('/job-roles'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: jobRoleName.trim() }),
      });

      if (response.ok) {
        const newJobRoleData = await response.json();
        setJobRoles(prev => [...prev, newJobRoleData]);
        setSearchTerm(newJobRoleData.name);
        if (onChange) {
          onChange({ target: { name, value: newJobRoleData.name } });
        }
        setIsOpen(false);
      }
    } catch (error) {
      console.error('Error adding job role:', error);
    }
  };

  const handleInputChange = (e) => {
    const newValue = e.target.value;
    setSearchTerm(newValue);
    setIsOpen(true);

    if (onChange) {
      onChange({
        target: {
          name: name,
          value: newValue
        }
      });
    }

    if (newValue) {
      handleJobRoleSearch(newValue);
    } else {
      fetchJobRoles();
    }
  };

  const handleOptionSelect = (jobRole) => {
    setSearchTerm(jobRole.name);
    setIsOpen(false);

    if (onChange) {
      onChange({
        target: {
          name: name,
          value: jobRole.name
        }
      });
    }
  };

  const handleInputFocus = () => setIsOpen(true);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      setIsOpen(false);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <input
        ref={inputRef}
        type="text"
        name={name}
        value={searchTerm}
        onChange={handleInputChange}
        onFocus={handleInputFocus}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="w-full border rounded-lg p-2 pr-8"
        required={required}
        disabled={disabled}
        autoComplete="off"
      />

      <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
        <svg
          className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {filteredJobRoles.length > 0 ? (
            <>
              {filteredJobRoles.map((jobRole, index) => (
                <div
                  key={jobRole._id || index}
                  className="px-3 py-2 cursor-pointer hover:bg-gray-100 flex justify-between items-center"
                  onClick={() => handleOptionSelect(jobRole)}
                >
                  <span>{jobRole.name}</span>
                  {jobRole.usageCount > 1 && (
                    <span className="text-xs text-gray-500 bg-gray-200 px-2 py-1 rounded">
                      Used {jobRole.usageCount} times
                    </span>
                  )}
                </div>
              ))}
            </>
          ) : (
            <div className="px-3 py-2 text-gray-500">
              {searchTerm ? "No job roles found" : "Start typing to search job roles..."}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default JobRoleDropdown;
