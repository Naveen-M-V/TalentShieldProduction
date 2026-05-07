import React, { useState, useEffect, useRef } from 'react';

const SearchableDropdown = ({ 
  value, 
  onChange, 
  options = [], 
  placeholder = "Type to search or select...",
  onSearch,
  onAddNew,
  className = "",
  name,
  required = false,
  disabled = false,
  isMultiSelect = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredOptions, setFilteredOptions] = useState(options);
  const dropdownRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    // Initialize search term with current value for single select
    if (!isMultiSelect && value && typeof value === 'string') {
      setSearchTerm(value);
    }
  }, [value, isMultiSelect]);

  useEffect(() => {
    // Filter options based on search term
    if (searchTerm) {
      const filtered = options.filter(option => 
        option.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredOptions(filtered);
    } else {
      setFilteredOptions(options);
    }
  }, [options, searchTerm]);

  useEffect(() => {
    // Handle click outside to close dropdown
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

  const handleInputChange = (e) => {
    const newValue = e.target.value;
    setSearchTerm(newValue);
    setIsOpen(true);
    
    // Only call onChange for single select mode (not multi-select)
    if (!isMultiSelect && onChange) {
      onChange({
        target: {
          name: name,
          value: newValue
        }
      });
    }

    // Call onSearch if provided (for API calls)
    if (onSearch) {
      onSearch(newValue);
    }
  };

  const handleOptionSelect = (option) => {
    if (!isMultiSelect) {
      setSearchTerm(option.name);
      setIsOpen(false);
    } else {
      setSearchTerm(''); // Clear search term for multi-select
    }
    
    if (onChange) {
      onChange({
        target: {
          name: name,
          value: option.name
        }
      });
    }

    // Call onAddNew to increment usage count
    if (onAddNew) {
      onAddNew(option.name);
    }
  };

  const handleInputFocus = () => {
    setIsOpen(true);
  };

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
      />
      
      {/* Dropdown arrow */}
      <div 
        className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none"
      >
        <svg 
          className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      {/* Dropdown menu */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {filteredOptions.length > 0 ? (
            <>
              {filteredOptions.map((option, index) => (
                <div
                  key={option._id || index}
                  className="px-3 py-2 cursor-pointer hover:bg-gray-100 flex justify-between items-center"
                  onClick={() => handleOptionSelect(option)}
                >
                  <span>{option.name}</span>
                  {option.usageCount > 1 && (
                    <span className="text-xs text-gray-500 bg-gray-200 px-2 py-1 rounded">
                      Used {option.usageCount} times
                    </span>
                  )}
                </div>
              ))}
            </>
          ) : (
            <div className="px-3 py-2 text-gray-500">
              {searchTerm ? "No options found" : "Start typing to search..."}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchableDropdown;
