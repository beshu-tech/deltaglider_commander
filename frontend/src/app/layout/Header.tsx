import { Moon, Sun, Menu, X } from "lucide-react";
import { Button } from "../../lib/ui/Button";
import { useTheme } from "../theme";
import { useLayoutContext } from "./LayoutContext";

export function Header() {
  const [theme, toggleTheme] = useTheme();
  const { isDesktop, sidebarOpen, toggleSidebar } = useLayoutContext();

  return (
    <header className="flex h-14 items-center justify-between border-b border-slate-200 bg-surface-elevated px-group dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center gap-group">
        {!isDesktop ? (
          <button
            type="button"
            onClick={toggleSidebar}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-100 focus-visible:outline-focus focus-visible:outline-offset-focus focus-visible:outline-brand-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
            aria-label={sidebarOpen ? "Close navigation menu" : "Open navigation menu"}
          >
            {sidebarOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        ) : null}
      </div>
      <div className="flex items-center gap-inline">
        <Button
          variant="ghost"
          aria-label="Toggle theme"
          onClick={toggleTheme}
          className="focus-visible:outline-focus focus-visible:outline-offset-focus focus-visible:outline-blue-500"
        >
          {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>
      </div>
    </header>
  );
}
