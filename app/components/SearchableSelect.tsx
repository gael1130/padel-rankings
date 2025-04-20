'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { FaSearch } from 'react-icons/fa';

// Updated to use string IDs
interface Player {
  id: string;
  name: string;
  email: string;
  elo: number;
  matches: number;
  wins: number;
}

interface SearchableSelectProps {
  options: Player[];
  value: string;  // Changed from number to string
  onChange: (value: string) => void;  // Changed from number to string
  placeholder: string;
  id?: string; // Optional ID for the dropdown
}

const SearchableSelect: React.FC<SearchableSelectProps> = ({
  options,
  value,
  onChange,
  placeholder,
  id = 'dropdown' // Default ID
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  // Generate a unique ID for this dropdown instance
  const dropdownId = useMemo(() => `searchable-dropdown-${id}-${Math.random().toString(36).substring(2, 11)}`, [id]);
  
  const selectedOption = useMemo(() => 
    options.find(option => option.id === value), 
    [options, value]
  );
  
  const filteredOptions = useMemo(() => 
    options.filter(option => 
      option.name.toLowerCase().includes(search.toLowerCase())
    ),
    [options, search]
  );
  
  // Close dropdown when clicking outside using ref instead of ID
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (isOpen && e.target instanceof HTMLElement) {
        if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
          setIsOpen(false);
        }
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);
  
  return (
    <div className="relative" ref={dropdownRef}>
      <div 
        className="flex items-center justify-between cursor-pointer bg-gray-800 border border-gray-700 text-gray-100 p-2 rounded-md"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className={selectedOption ? "text-gray-100" : "text-gray-400"}>
          {selectedOption ? selectedOption.name : placeholder}
        </span>
        <FaSearch className="text-gray-400" />
      </div>
      
      {isOpen && (
        <div className="absolute z-10 w-full mt-1 bg-gray-800 border border-gray-700 rounded-md shadow-lg">
          <div className="p-2">
            <input
              type="text"
              className="w-full bg-gray-900 border border-gray-700 text-gray-100 p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              autoFocus
            />
          </div>
          
          <div className="max-h-60 overflow-y-auto">
            {filteredOptions.length === 0 ? (
              <div className="px-4 py-2 text-gray-400">No results found</div>
            ) : (
              filteredOptions.map((option) => (
                <div
                  key={option.id}
                  className={`
                    px-4 py-2 cursor-pointer hover:bg-gray-700
                    ${option.id === value ? 'bg-blue-900 text-blue-100' : 'text-gray-100'}
                  `}
                  onClick={() => {
                    onChange(option.id);
                    setIsOpen(false);
                    setSearch('');
                  }}
                >
                  <div className="font-medium">{option.name}</div>
                  <div className="text-sm text-gray-400">
                    ELO: {option.elo} | W: {option.wins} | M: {option.matches}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchableSelect;