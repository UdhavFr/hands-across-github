import { useState, KeyboardEvent } from 'react';
import { X } from 'lucide-react';

interface SkillsInputProps {
  skills: string[];
  onChange: (skills: string[]) => void;
  placeholder?: string;
  maxSkills?: number;
}

export function SkillsInput({ 
  skills, 
  onChange, 
  placeholder = "Add a skill and press Enter",
  maxSkills = 10 
}: SkillsInputProps) {
  const [inputValue, setInputValue] = useState('');

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addSkill();
    } else if (e.key === 'Backspace' && inputValue === '' && skills.length > 0) {
      // Remove last skill when backspacing on empty input
      removeSkill(skills.length - 1);
    }
  };

  const addSkill = () => {
    const skill = inputValue.trim();
    if (skill && !skills.includes(skill) && skills.length < maxSkills) {
      onChange([...skills, skill]);
      setInputValue('');
    }
  };

  const removeSkill = (index: number) => {
    const newSkills = skills.filter((_, i) => i !== index);
    onChange(newSkills);
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2 min-h-[40px] p-3 border border-border rounded-md bg-background focus-within:ring-2 focus-within:ring-primary focus-within:border-transparent">
        {skills.map((skill, index) => (
          <span
            key={index}
            className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-primary/10 text-primary border border-primary/20"
          >
            {skill}
            <button
              type="button"
              onClick={() => removeSkill(index)}
              className="ml-1 hover:bg-primary/20 rounded-full p-0.5"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        
        {skills.length < maxSkills && (
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={addSkill}
            placeholder={skills.length === 0 ? placeholder : ''}
            className="flex-1 min-w-[120px] outline-none bg-transparent text-foreground placeholder-muted-foreground"
          />
        )}
      </div>
      
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Press Enter or comma to add skills</span>
        <span>{skills.length}/{maxSkills} skills</span>
      </div>
      
      {skills.length >= maxSkills && (
        <p className="text-xs text-amber-600">
          Maximum {maxSkills} skills allowed
        </p>
      )}
    </div>
  );
}