/**
 * Toolbar component - replaces Header inner layout
 * Includes ConnectionChip, breadcrumbs slot, theme toggle, and overflow menu
 */

import { Moon, Sun, Menu, X, Keyboard, MoreVertical } from "lucide-react";
import { type ReactNode, useState, useRef, useEffect } from "react";
import { Button } from "../../lib/ui/Button";
import { useTheme } from "../theme";
import { useLayoutContext } from "./LayoutContext";
import { twMerge } from "tailwind-merge";
import { ConnectionChip } from "../../features/connection/ConnectionChip";
import { useConnectionStore } from "../../stores/connectionStore";
import { useCredentials } from "../../features/auth/useCredentials";

export interface ToolbarProps {
  /** Breadcrumbs to display (optional) */
  breadcrumbs?: ReactNode;
  /** Callback to open keyboard shortcuts help dialog */
  onOpenKeyboardShortcuts: () => void;
}

export function Toolbar({ breadcrumbs, onOpenKeyboardShortcuts }: ToolbarProps) {
  const [theme, toggleTheme] = useTheme();
  const { isDesktop, sidebarOpen, toggleSidebar } = useLayoutContext();
  const [overflowMenuOpen, setOverflowMenuOpen] = useState(false);
  const overflowMenuRef = useRef<HTMLDivElement>(null);
  const startPolling = useConnectionStore((state) => state.startPolling);
  const { hasCredentials } = useCredentials();

  // Start polling connection status when component mounts - only if credentials exist
  useEffect(() => {
    if (hasCredentials) {
      startPolling();
    }
  }, [startPolling, hasCredentials]);

  // Close overflow menu when clicking outside
  useEffect(() => {
    if (!overflowMenuOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (overflowMenuRef.current && !overflowMenuRef.current.contains(e.target as Node)) {
        setOverflowMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [overflowMenuOpen]);

  return (
    <header className="flex h-14 items-center justify-between border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-4">
      {/* Left section */}
      <div className="flex items-center gap-4">
        {/* Mobile menu toggle */}
        {!isDesktop && (
          <button
            type="button"
            onClick={toggleSidebar}
            className={twMerge(
              "inline-flex h-9 w-9 items-center justify-center",
              "rounded-md",
              "border border-gray-200 dark:border-gray-800",
              "bg-white dark:bg-gray-900",
              "text-gray-900 dark:text-gray-100",
              "shadow-sm",
              "transition-colors",
              "hover:bg-gray-50 dark:hover:bg-gray-800",
              "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900",
            )}
            aria-label={sidebarOpen ? "Close navigation menu" : "Open navigation menu"}
          >
            {sidebarOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        )}

        {/* ConnectionChip - desktop only */}
        {isDesktop && <ConnectionChip />}

        {/* Breadcrumbs - if provided */}
        {breadcrumbs && <div className="flex items-center">{breadcrumbs}</div>}
      </div>

      {/* Right section */}
      <div className="flex items-center gap-2">
        {/* Desktop actions */}
        <div className="hidden sm:flex items-center gap-2">
          <Button
            variant="ghost"
            aria-label="Show keyboard shortcuts (Shift+?)"
            onClick={onOpenKeyboardShortcuts}
            className="focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
            title="Keyboard shortcuts (Shift+?)"
          >
            <Keyboard className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            aria-label="Toggle theme"
            onClick={toggleTheme}
            className="focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
        </div>

        {/* Mobile overflow menu */}
        <div className="sm:hidden relative" ref={overflowMenuRef}>
          <Button
            variant="ghost"
            aria-label="More actions"
            onClick={() => setOverflowMenuOpen(!overflowMenuOpen)}
            className="focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
          >
            <MoreVertical className="h-4 w-4" />
          </Button>

          {overflowMenuOpen && (
            <div
              className={twMerge(
                "absolute right-0 top-full mt-2 w-48",
                "bg-white dark:bg-gray-900",
                "border border-gray-200 dark:border-gray-800",
                "rounded-md shadow-lg",
                "py-1",
                "z-50",
              )}
            >
              <button
                onClick={() => {
                  onOpenKeyboardShortcuts();
                  setOverflowMenuOpen(false);
                }}
                className={twMerge(
                  "w-full flex items-center gap-3 px-4 py-2",
                  "text-sm text-gray-900 dark:text-gray-100",
                  "hover:bg-gray-50 dark:hover:bg-gray-800",
                  "transition-colors",
                )}
              >
                <Keyboard className="h-4 w-4" />
                Keyboard shortcuts
              </button>
              <button
                onClick={() => {
                  toggleTheme();
                  setOverflowMenuOpen(false);
                }}
                className={twMerge(
                  "w-full flex items-center gap-3 px-4 py-2",
                  "text-sm text-gray-900 dark:text-gray-100",
                  "hover:bg-gray-50 dark:hover:bg-gray-800",
                  "transition-colors",
                )}
              >
                {theme === "dark" ? (
                  <>
                    <Sun className="h-4 w-4" />
                    Light theme
                  </>
                ) : (
                  <>
                    <Moon className="h-4 w-4" />
                    Dark theme
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
