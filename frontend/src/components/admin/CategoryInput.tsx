import { useState, useEffect, useRef } from 'react';
import { getCategories } from '../../lib/admin-api';

interface CategoryInputProps {
  value?: string;
  onChange: (category: string) => void;
  label?: string;
}

export function CategoryInput({ value = '', onChange, label = 'Categoría' }: CategoryInputProps) {
  const [categories, setCategories] = useState<string[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [inputValue, setInputValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    setInputValue(value);
  }, [value]);

  const loadCategories = async () => {
    try {
      const cats = await getCategories();
      setCategories(Array.isArray(cats) ? cats : cats.map((c: any) => c.name));
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputValue(val);
    onChange(val);

    if (val.trim()) {
      const filtered = categories.filter((cat) =>
        cat.toLowerCase().includes(val.toLowerCase())
      );
      setSuggestions(filtered.slice(0, 5));
      setShowSuggestions(filtered.length > 0);
    } else {
      setShowSuggestions(false);
    }
  };

  const handleSelectSuggestion = (category: string) => {
    setInputValue(category);
    onChange(category);
    setShowSuggestions(false);
    inputRef.current?.blur();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
        {label}
      </label>
      <input
        ref={inputRef}
        type="text"
        value={inputValue}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onFocus={() => {
          if (inputValue.trim() && suggestions.length > 0) {
            setShowSuggestions(true);
          }
        }}
        list="category-suggestions"
        className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
        placeholder="Escribe o selecciona una categoría"
      />
      {showSuggestions && suggestions.length > 0 && (
        <div
          ref={suggestionsRef}
          className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md border border-gray-300 bg-white shadow-lg dark:border-gray-600 dark:bg-gray-800"
        >
          {suggestions.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => handleSelectSuggestion(cat)}
              className="block w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              {cat}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

