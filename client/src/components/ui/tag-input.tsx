import { X, Plus } from "lucide-react";
import { useState, type KeyboardEvent } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface TagInputProps {
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  suggestions?: string[];
  disabled?: boolean;
}

export function TagInput({
  value = [],
  onChange,
  placeholder,
  suggestions = [],
  disabled = false,
}: TagInputProps) {
  const [inputValue, setInputValue] = useState("");
  
  const handleAddTag = (tag: string) => {
    const trimmedTag = tag.trim();
    if (trimmedTag && !value.includes(trimmedTag)) {
      onChange([...value, trimmedTag]);
    }
    setInputValue("");
  };
  
  const handleRemoveTag = (tag: string) => {
    onChange(value.filter((t) => t !== tag));
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddTag(inputValue);
    } else if (e.key === "Backspace" && !inputValue && value.length > 0) {
      // Remove the last tag if backspace is pressed and input is empty
      const newTags = [...value];
      newTags.pop();
      onChange(newTags);
    }
  };
  
  return (
    <div className="border rounded-md p-2">
      <div className="flex flex-wrap gap-2 mb-2">
        {value.map((tag) => (
          <Badge key={tag} variant="secondary" className="gap-1">
            {tag}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-4 w-4 p-0"
              onClick={() => handleRemoveTag(tag)}
              disabled={disabled}
            >
              <X className="h-3 w-3" />
              <span className="sr-only">Remove {tag}</span>
            </Button>
          </Badge>
        ))}
      </div>
      
      <div className="flex">
        <Input
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className="flex-1"
        />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => handleAddTag(inputValue)}
          disabled={disabled || !inputValue.trim()}
          className="ml-2"
        >
          <Plus className="h-4 w-4" />
          <span className="sr-only">Add tag</span>
        </Button>
      </div>
      
      {suggestions.length > 0 && (
        <div className="mt-2">
          <p className="text-sm text-muted-foreground mb-1">Suggestions:</p>
          <div className="flex flex-wrap gap-1">
            {suggestions.map((tag) => (
              <Badge
                key={tag}
                variant="outline"
                className={`cursor-pointer ${disabled ? 'opacity-50' : ''}`}
                onClick={() => !disabled && handleAddTag(tag)}
              >
                {tag}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}