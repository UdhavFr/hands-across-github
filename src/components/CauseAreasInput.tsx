import { useState, KeyboardEvent } from 'react';
import { X, Plus } from 'lucide-react';

interface CauseAreasInputProps {
  causeAreas: string[];
  onChange: (areas: string[]) => void;
  placeholder?: string;
  maxAreas?: number;
}

const PREDEFINED_CAUSES = [
  'Environment',
  'Education',
  'Healthcare',
  'Poverty Alleviation',
  'Child Welfare',
  'Women Empowerment',
  'Animal Welfare',
  'Disaster Relief',
  'Human Rights',
  'Community Development',
  'Mental Health',
  'Senior Care',
  'Youth Development',
  'Arts & Culture',
  'Technology for Good',
  'Food Security',
  'Clean Water',
  'Climate Change',
  'Conservation',
  'Social Justice'
];

export function CauseAreasInput({ 
  causeAreas, 
  onChange, 
  placeholder = "Add a cause area and press Enter",
  maxAreas = 10 
}: CauseAreasInputProps) {
  const [inputValue, setInputValue] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);

  const filteredSuggestions = PREDEFINED_CAUSES.filter(cause =>
    cause.toLowerCase().includes(inputValue.toLowerCase()) &&
    !causeAreas.includes(cause)
  );

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addCauseArea();
    } else if (e.key === 'Backspace' && inputValue === '' && causeAreas.length > 0) {
      removeCauseArea(causeAreas.length - 1);
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  const addCauseArea = (area?: string) => {
    const causeArea = (area || inputValue).trim();
    if (causeArea && !causeAreas.includes(causeArea) && causeAreas.length < maxAreas) {
      onChange([...causeAreas, causeArea]);
      setInputValue('');
      setShowSuggestions(false);
    }
  };

  const removeCauseArea = (index: number) => {
    const newAreas = causeAreas.filter((_, i) => i !== index);
    onChange(newAreas);
  };

  const addPredefinedCause = (cause: string) => {
    if (!causeAreas.includes(cause) && causeAreas.length < maxAreas) {
      onChange([...causeAreas, cause]);
    }
  };

  return (
    <div className="space-y-4">
      {/* Selected Cause Areas */}
      {causeAreas.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {causeAreas.map((area, index) => (
            <span
              key={index}
              className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-primary/10 text-primary border border-primary/20"
            >
              {area}
              <button
                type="button"
                onClick={() => removeCauseArea(index)}
                className="ml-2 hover:bg-primary/20 rounded-full p-0.5 transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Input Field */}
      <div className="relative">
        <div className="flex items-center border border-border rounded-md bg-background focus-within:ring-2 focus-within:ring-primary focus-within:border-transparent">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => {
              setInputValue(e.target.value);
              setShowSuggestions(e.target.value.length > 0);
            }}
            onKeyDown={handleKeyDown}
            onFocus={() => setShowSuggestions(inputValue.length > 0)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            placeholder={causeAreas.length === 0 ? placeholder : ''}
            disabled={causeAreas.length >= maxAreas}
            className="flex-1 px-3 py-2 outline-none bg-transparent text-foreground placeholder-muted-foreground disabled:opacity-50"
          />
          {inputValue && (
            <button
              type="button"
              onClick={() => addCauseArea()}
              className="p-2 text-primary hover:bg-primary/10 rounded-r-md transition-colors"
            >
              <Plus className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Suggestions Dropdown */}
        {showSuggestions && filteredSuggestions.length > 0 && (
          <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-md shadow-lg max-h-60 overflow-y-auto">
            {filteredSuggestions.slice(0, 8).map((cause) => (
              <button
                key={cause}
                type="button"
                onClick={() => addCauseArea(cause)}
                className="w-full px-4 py-2 text-left hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus:outline-none first:rounded-t-md last:rounded-b-md"
              >
                {cause}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Quick Add Buttons for Popular Causes */}
      {causeAreas.length === 0 && (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">Popular cause areas:</p>
          <div className="flex flex-wrap gap-2">
            {PREDEFINED_CAUSES.slice(0, 6).map((cause) => (
              <button
                key={cause}
                type="button"
                onClick={() => addPredefinedCause(cause)}
                className="px-3 py-1 text-xs border border-border rounded-full hover:bg-accent hover:text-accent-foreground transition-colors"
              >
                {cause}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Status */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Press Enter or comma to add areas</span>
        <span>{causeAreas.length}/{maxAreas} areas</span>
      </div>
      
      {causeAreas.length >= maxAreas && (
        <p className="text-xs text-amber-600">
          Maximum {maxAreas} cause areas allowed
        </p>
      )}
    </div>
  );
}