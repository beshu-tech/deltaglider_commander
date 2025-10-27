/**
 * Accordion primitive for collapsible sections
 * Used in ConnectionPanel for organizing sections
 */

import { useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { twMerge } from "tailwind-merge";

interface AccordionProps {
  children: ReactNode;
  defaultOpen?: boolean;
  title: string;
  subtitle?: string;
}

export function Accordion({ children, defaultOpen = false, title, subtitle }: AccordionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-gray-200 dark:border-gray-800">
      {/* Header */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={twMerge(
          "w-full flex items-center justify-between",
          "px-6 py-4",
          "text-left",
          "hover:bg-gray-50 dark:hover:bg-gray-800/50",
          "transition-colors",
          "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset",
        )}
        aria-expanded={isOpen}
      >
        <div className="flex-1">
          <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{title}</div>
          {subtitle && (
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{subtitle}</div>
          )}
        </div>

        <ChevronDown
          className={twMerge(
            "w-5 h-5 text-gray-500 dark:text-gray-400",
            "transition-transform",
            isOpen && "rotate-180",
          )}
        />
      </button>

      {/* Content */}
      {isOpen && <div className="px-6 py-4">{children}</div>}
    </div>
  );
}
