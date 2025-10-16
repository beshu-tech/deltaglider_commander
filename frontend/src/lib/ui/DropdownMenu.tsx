import { ReactNode, useEffect, useRef, useState } from "react";
import { twMerge } from "tailwind-merge";

interface DropdownMenuProps {
  trigger: ReactNode;
  children: ReactNode;
  align?: "left" | "right";
  className?: string;
}

interface DropdownMenuItemProps {
  onClick?: () => void;
  disabled?: boolean;
  children: ReactNode;
  className?: string;
}

export function DropdownMenu({ trigger, children, align = "right", className }: DropdownMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleEscape);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
        document.removeEventListener("keydown", handleEscape);
      };
    }
  }, [isOpen]);

  return (
    <div ref={dropdownRef} className={twMerge("relative inline-block", className)}>
      <div onClick={() => setIsOpen(!isOpen)}>{trigger}</div>
      {isOpen && (
        <div
          className={twMerge(
            "absolute top-full z-50 mt-2 min-w-[200px] rounded-lg border border-ui-border bg-ui-surface py-1 shadow-elevation-md dark:border-ui-border-dark dark:bg-ui-surface-dark dark:shadow-elevation-md-dark",
            align === "right" ? "right-0" : "left-0",
          )}
        >
          {children}
        </div>
      )}
    </div>
  );
}

export function DropdownMenuItem({
  onClick,
  disabled,
  children,
  className,
}: DropdownMenuItemProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={twMerge(
        "flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition",
        disabled
          ? "cursor-not-allowed opacity-50"
          : "hover:bg-ui-surface-hover focus-visible:bg-ui-surface-hover focus-visible:outline-none dark:hover:bg-ui-surface-hover-dark dark:focus-visible:bg-ui-surface-hover-dark",
        "text-ui-text dark:text-ui-text-dark",
        className,
      )}
    >
      {children}
    </button>
  );
}
