import { useCallback, useState, useRef, useEffect } from "react";
import { Folder, ChevronDown, Plus } from "lucide-react";
import { validateS3Path } from "../utils/pathValidation";

interface DestinationPathSelectorProps {
  value: string;
  onChange: (path: string) => void;
  existingPaths?: string[];
  disabled?: boolean;
}

export function DestinationPathSelector({
  value,
  onChange,
  existingPaths = [],
  disabled = false,
}: DestinationPathSelectorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState(value);
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [showAllPaths, setShowAllPaths] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Debug logging
  useEffect(() => {
    console.log("[DestinationPathSelector] existingPaths:", existingPaths);
    console.log("[DestinationPathSelector] state:", { isEditing, showAutocomplete, showAllPaths });
  }, [existingPaths, isEditing, showAutocomplete, showAllPaths]);

  // Sync input value when prop changes
  useEffect(() => {
    if (!isEditing) {
      setInputValue(value);
    }
  }, [value, isEditing]);

  // Validate current path
  const validation = validateS3Path(inputValue);
  const isNewPath = inputValue && !existingPaths.includes(inputValue);

  // Filter autocomplete suggestions (when typing)
  const suggestions = existingPaths
    .filter((path) => path.toLowerCase().includes(inputValue.toLowerCase()))
    .slice(0, 10);

  // Show all paths when dropdown is opened (limit to 15)
  const allPathsSuggestions = existingPaths.slice(0, 15);

  // Debug autocomplete rendering
  useEffect(() => {
    console.log("[Autocomplete Debug]", {
      showAutocomplete,
      isEditing,
      suggestionsLength: suggestions.length,
      showAllPaths,
      allPathsSuggestionsLength: allPathsSuggestions.length,
      inputValue,
      existingPathsLength: existingPaths.length,
    });
  }, [
    showAutocomplete,
    isEditing,
    suggestions.length,
    showAllPaths,
    allPathsSuggestions.length,
    inputValue,
    existingPaths.length,
  ]);

  const handleFocus = useCallback(() => {
    setIsEditing(true);
    setShowAutocomplete(true);
    setSelectedIndex(-1);
  }, []);

  const handleBlur = useCallback(
    (e?: React.FocusEvent) => {
      // Don't blur if clicking within the container (autocomplete dropdown)
      if (e?.relatedTarget && containerRef.current?.contains(e.relatedTarget as Node)) {
        return;
      }

      // Commit the change if valid
      if (validation.isValid && inputValue !== value) {
        onChange(inputValue);
      } else if (!validation.isValid) {
        // Revert to previous valid value
        setInputValue(value);
      }
      setIsEditing(false);
      setShowAutocomplete(false);
      setShowAllPaths(false);
      setSelectedIndex(-1);
    },
    [inputValue, value, validation.isValid, onChange],
  );

  // Handle click outside to close autocomplete
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        handleBlur();
      }
    };

    if (isEditing || showAutocomplete || showAllPaths) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isEditing, showAutocomplete, showAllPaths, handleBlur]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    setShowAutocomplete(true);
    setShowAllPaths(false); // Hide all paths dropdown when typing
    setSelectedIndex(-1);
  }, []);

  const selectSuggestion = useCallback(
    (suggestion: string) => {
      setInputValue(suggestion);
      onChange(suggestion);
      setShowAutocomplete(false);
      setShowAllPaths(false);
      setIsEditing(false);
      inputRef.current?.blur();
    },
    [onChange],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Escape") {
        setInputValue(value);
        setShowAutocomplete(false);
        setShowAllPaths(false);
        setIsEditing(false);
        inputRef.current?.blur();
        return;
      }

      if (e.key === "Enter") {
        if (selectedIndex >= 0 && suggestions[selectedIndex]) {
          e.preventDefault();
          selectSuggestion(suggestions[selectedIndex]);
        } else if (validation.isValid) {
          e.preventDefault();
          handleBlur();
        }
        return;
      }

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, suggestions.length - 1));
        return;
      }

      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, -1));
        return;
      }
    },
    [value, selectedIndex, suggestions, validation.isValid, selectSuggestion, handleBlur],
  );

  const displayValue = inputValue || "(bucket root)";
  const showError = isEditing && !validation.isValid && inputValue.length > 0;

  return (
    <div ref={containerRef} className="relative">
      <div className="flex items-center gap-2">
        <label
          htmlFor="destination-path"
          className="text-sm font-medium text-ui-text-muted dark:text-ui-text-subtle"
        >
          Upload destination:
        </label>

        <div className="flex flex-1 items-center gap-2">
          <div className="relative flex-1">
            <div
              className={`flex items-center gap-2 rounded-lg border px-3 py-2 transition ${
                isEditing
                  ? "border-primary-500 bg-ui-surface dark:bg-ui-surface-dark"
                  : "border-transparent bg-ui-surface-secondary hover:bg-ui-surface dark:bg-ui-surface-dark dark:hover:bg-gray-800"
              } ${showError ? "border-red-500" : ""} ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-text"}`}
              onClick={() => {
                if (!disabled) {
                  setIsEditing(true);
                  setTimeout(() => inputRef.current?.focus(), 0);
                }
              }}
            >
              <Folder className="h-4 w-4 text-ui-text-muted dark:text-ui-text-subtle flex-shrink-0" />

              {isEditing ? (
                <input
                  ref={inputRef}
                  id="destination-path"
                  type="text"
                  value={inputValue}
                  onChange={handleInputChange}
                  onFocus={handleFocus}
                  onBlur={handleBlur}
                  onKeyDown={handleKeyDown}
                  disabled={disabled}
                  placeholder="path/to/folder"
                  className="flex-1 bg-transparent text-sm outline-none text-ui-text dark:text-ui-text-dark placeholder:text-ui-text-muted/50"
                  aria-label="Upload destination path"
                  aria-describedby={showError ? "path-error" : isNewPath ? "path-help" : undefined}
                  aria-invalid={showError}
                />
              ) : (
                <span
                  className={`flex-1 text-sm ${
                    !inputValue
                      ? "text-ui-text-muted dark:text-ui-text-subtle italic"
                      : "text-ui-text dark:text-ui-text-dark"
                  }`}
                >
                  {displayValue}
                </span>
              )}

              {isNewPath && !showError && (
                <span className="text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-0.5 rounded">
                  New folder
                </span>
              )}
            </div>

            {/* Autocomplete Dropdown (when typing) */}
            {showAutocomplete && isEditing && !showAllPaths && (
              <div className="absolute z-10 mt-1 w-full rounded-lg border border-ui-border dark:border-ui-border-dark bg-white dark:bg-gray-800 shadow-lg max-h-60 overflow-auto">
                <div className="p-1">
                  {suggestions.length > 0 ? (
                    <>
                      <div className="text-xs font-medium text-ui-text-muted dark:text-ui-text-subtle px-2 py-1">
                        Matching paths
                      </div>
                      {suggestions.map((suggestion, index) => (
                        <button
                          key={suggestion}
                          type="button"
                          className={`w-full text-left px-2 py-1.5 text-sm rounded transition ${
                            index === selectedIndex
                              ? "bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300"
                              : "hover:bg-ui-surface-secondary dark:hover:bg-gray-700 text-ui-text dark:text-ui-text-dark"
                          }`}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            selectSuggestion(suggestion);
                          }}
                          onMouseEnter={() => setSelectedIndex(index)}
                        >
                          <div className="flex items-center gap-2">
                            <Folder className="h-3 w-3 flex-shrink-0" />
                            <span className="truncate">{suggestion}</span>
                          </div>
                        </button>
                      ))}
                    </>
                  ) : existingPaths.length > 0 ? (
                    <div className="px-2 py-3 text-xs text-ui-text-muted dark:text-ui-text-subtle text-center">
                      No matching paths found. Press Enter to create "{inputValue}"
                    </div>
                  ) : (
                    <div className="px-2 py-3 text-xs text-ui-text-muted dark:text-ui-text-subtle text-center">
                      Type a path and press Enter to create a new folder
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* All Paths Dropdown (when chevron clicked) */}
            {showAllPaths && allPathsSuggestions.length > 0 && (
              <div className="absolute z-10 mt-1 w-full rounded-lg border border-ui-border dark:border-ui-border-dark bg-white dark:bg-gray-800 shadow-lg max-h-60 overflow-auto">
                <div className="p-1">
                  <div className="text-xs font-medium text-ui-text-muted dark:text-ui-text-subtle px-2 py-1">
                    Existing paths
                  </div>
                  {allPathsSuggestions.map((suggestion, index) => (
                    <button
                      key={suggestion}
                      type="button"
                      className={`w-full text-left px-2 py-1.5 text-sm rounded transition ${
                        index === selectedIndex
                          ? "bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300"
                          : "hover:bg-ui-surface-secondary dark:hover:bg-gray-700 text-ui-text dark:text-ui-text-dark"
                      }`}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        selectSuggestion(suggestion);
                      }}
                      onMouseEnter={() => setSelectedIndex(index)}
                    >
                      <div className="flex items-center gap-2">
                        <Folder className="h-3 w-3 flex-shrink-0" />
                        <span className="truncate">{suggestion}</span>
                      </div>
                    </button>
                  ))}
                  {existingPaths.length > 15 && (
                    <div className="text-xs text-ui-text-muted dark:text-ui-text-subtle px-2 py-1 italic">
                      Showing first 15 of {existingPaths.length} paths
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Quick Actions */}
          {existingPaths.length > 0 ? (
            <button
              type="button"
              className={`p-2 rounded-lg transition ${
                showAllPaths
                  ? "bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400"
                  : "hover:bg-ui-surface-secondary dark:hover:bg-gray-800 text-ui-text-muted dark:text-ui-text-subtle"
              }`}
              onClick={(e) => {
                e.stopPropagation();
                if (!disabled) {
                  setShowAllPaths(!showAllPaths);
                  setShowAutocomplete(false);
                  setIsEditing(false);
                }
              }}
              disabled={disabled}
              title="Browse existing paths"
              aria-label="Browse existing paths"
              aria-expanded={showAllPaths}
            >
              <ChevronDown className="h-4 w-4" />
            </button>
          ) : (
            <div
              className="p-2 rounded-lg text-ui-text-muted/50 dark:text-ui-text-subtle/50"
              title="No existing paths in bucket - type to create a new folder"
            >
              <ChevronDown className="h-4 w-4" />
            </div>
          )}

          <button
            type="button"
            className="p-2 rounded-lg hover:bg-ui-surface-secondary dark:hover:bg-gray-800 text-ui-text-muted dark:text-ui-text-subtle transition disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={() => {
              inputRef.current?.focus();
              setInputValue("");
            }}
            disabled={disabled}
            title="Create new folder"
            aria-label="Create new folder"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Helper/Error Messages */}
      {showError && validation.error && (
        <p id="path-error" className="mt-1 text-xs text-red-600 dark:text-red-400">
          {validation.error}
        </p>
      )}

      {isNewPath && !showError && (
        <p id="path-help" className="mt-1 text-xs text-emerald-600 dark:text-emerald-400">
          ✨ Will create: {inputValue}
        </p>
      )}

      {!isEditing && !inputValue && existingPaths.length === 0 && (
        <p className="mt-1 text-xs text-ui-text-muted dark:text-ui-text-subtle">
          💡 This bucket is empty. Type a folder path to create a new one, or leave empty to upload
          to the root.
        </p>
      )}
    </div>
  );
}
