"use client";

import { useState, useEffect, useRef, KeyboardEvent } from 'react';
import { Input } from '@/components/ui/input';
import { Loader2, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface AutocompleteInputProps {
  value: string;
  onChange: (value: string) => void;
  onCompletionRequest: (value: string) => void;
  suggestions: string[];
  isLoading: boolean;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function AutocompleteInput({
  value,
  onChange,
  onCompletionRequest,
  suggestions,
  isLoading,
  placeholder,
  disabled,
  className,
}: AutocompleteInputProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Show dropdown when we have suggestions
  useEffect(() => {
    if (suggestions.length > 0) {
      setIsOpen(true);
      setSelectedIndex(-1);
    } else {
      setIsOpen(false);
    }
  }, [suggestions]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle input change
  const handleInputChange = (newValue: string) => {
    onChange(newValue);
    onCompletionRequest(newValue);
    setSelectedIndex(-1);
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || suggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;

      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;

      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
          selectSuggestion(suggestions[selectedIndex]);
        }
        break;

      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        setSelectedIndex(-1);
        break;
    }
  };

  // Select a suggestion
  const selectSuggestion = (suggestion: string) => {
    onChange(suggestion);
    setIsOpen(false);
    setSelectedIndex(-1);
    inputRef.current?.blur();
  };

  // Scroll selected item into view
  useEffect(() => {
    if (selectedIndex >= 0 && dropdownRef.current) {
      const selectedElement = dropdownRef.current.children[selectedIndex] as HTMLElement;
      if (selectedElement) {
        selectedElement.scrollIntoView({
          block: 'nearest',
          behavior: 'smooth',
        });
      }
    }
  }, [selectedIndex]);

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <div className="relative">
        <Input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => handleInputChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className="pr-8"
        />
        {isLoading && (
          <div className="absolute right-2 top-1/2 -translate-y-1/2">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        )}
        {!isLoading && suggestions.length > 0 && (
          <div className="absolute right-2 top-1/2 -translate-y-1/2">
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </div>
        )}
      </div>

      {/* Dropdown menu */}
      {isOpen && suggestions.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-md shadow-md max-h-60 overflow-auto"
        >
          {suggestions.map((suggestion, index) => (
            <button
              key={index}
              type="button"
              onClick={() => selectSuggestion(suggestion)}
              onMouseEnter={() => setSelectedIndex(index)}
              className={cn(
                "w-full px-3 py-2 text-left text-sm transition-colors",
                "hover:bg-accent hover:text-accent-foreground",
                "focus:bg-accent focus:text-accent-foreground focus:outline-none",
                selectedIndex === index && "bg-accent text-accent-foreground"
              )}
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
