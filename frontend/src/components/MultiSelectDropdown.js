import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, X } from 'lucide-react';

const MultiSelectDropdown = ({ 
  options = [], 
  selectedValues = [], 
  onChange, 
  placeholder = "Select options...",
  className = "",
  enableSelectAll = false,
  selectAllLabel = 'Select All'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const dropdownRef = useRef(null);

  const filteredOptions = options.filter(option =>
    option.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (option.subLabel || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedOptions = options.filter(option =>
    selectedValues.includes(option.value)
  );

  const handleToggle = (value) => {
    const newSelected = selectedValues.includes(value)
      ? selectedValues.filter(v => v !== value)
      : [...selectedValues, value];
    onChange(newSelected);
  };

  const handleToggleSelectAll = () => {
    if (filteredOptions.length === 0) return;

    const filteredValues = filteredOptions.map(option => option.value);
    const allFilteredSelected = filteredValues.every(value => selectedValues.includes(value));

    if (allFilteredSelected) {
      onChange(selectedValues.filter(value => !filteredValues.includes(value)));
    } else {
      onChange(Array.from(new Set([...selectedValues, ...filteredValues])));
    }
  };

  const allFilteredSelected = filteredOptions.length > 0 && filteredOptions.every(option => selectedValues.includes(option.value));

  const handleRemove = (value) => {
    const newSelected = selectedValues.filter(v => v !== value);
    onChange(newSelected);
  };

  const handleClearAll = () => {
    onChange([]);
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Selected items display */}
      <div 
        className="min-h-[42px] px-3 py-2 border border-gray-300 rounded-lg cursor-pointer focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white"
        onClick={() => setIsOpen(!isOpen)}
      >
        {selectedOptions.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {selectedOptions.map(option => (
              <span
                key={option.value}
                className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-800 text-sm rounded-md"
              >
                {option.label}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemove(option.value);
                  }}
                  className="hover:text-purple-600"
                >
                  <X size={14} />
                </button>
              </span>
            ))}
          </div>
        ) : (
          <span className="text-gray-500">{placeholder}</span>
        )}
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-hidden">
          {/* Search */}
          <div className="p-2 border-b border-gray-200">
            <input
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              onClick={(e) => e.stopPropagation()}
            />
          </div>

          {/* Options */}
          <div className="max-h-48 overflow-y-auto">
            {enableSelectAll && filteredOptions.length > 0 && (
              <div
                className="px-3 py-2 hover:bg-gray-100 cursor-pointer flex items-center gap-2 border-b border-gray-100 sticky top-0 bg-white z-10"
                onClick={(e) => {
                  e.stopPropagation();
                  handleToggleSelectAll();
                }}
              >
                <input
                  type="checkbox"
                  checked={allFilteredSelected}
                  onChange={() => {}}
                  className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                />
                <span className="flex-1 font-medium text-gray-800">{selectAllLabel}</span>
                <span className="text-xs text-gray-500">{filteredOptions.length} visible</span>
              </div>
            )}
            {filteredOptions.length > 0 ? (
              filteredOptions.map(option => (
                <div
                  key={option.value}
                  className="px-3 py-2 hover:bg-gray-100 cursor-pointer flex items-center gap-2"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggle(option.value);
                  }}
                >
                  <input
                    type="checkbox"
                    checked={selectedValues.includes(option.value)}
                    onChange={() => {}}
                    className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                  />
                  <span className="flex-1">{option.label}</span>
                  {option.subLabel && (
                    <span className="text-xs text-gray-500">{option.subLabel}</span>
                  )}
                </div>
              ))
            ) : (
              <div className="px-3 py-2 text-gray-500 text-center">
                No options found
              </div>
            )}
          </div>

          {/* Actions */}
          {selectedOptions.length > 0 && (
            <div className="p-2 border-t border-gray-200 flex justify-between">
              <span className="text-sm text-gray-600">
                {selectedOptions.length} selected
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleClearAll();
                }}
                className="text-sm text-red-600 hover:text-red-800"
              >
                Clear all
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MultiSelectDropdown;
