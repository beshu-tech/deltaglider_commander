import { Moon, Sun, Menu, X } from "lucide-react";
import { Button } from "../../lib/ui/Button";
import { useTheme } from "../theme";
import { useLayoutContext } from "./LayoutContext";

export function Header() {
  const [theme, toggleTheme] = useTheme();
  const { isDesktop, sidebarOpen, toggleSidebar } = useLayoutContext();

  return (
    <header className="flex h-14 items-center justify-between border-b border-ui-border bg-ui-surface px-group dark:border-ui-border-dark dark:bg-ui-surface-dark">
      <div className="flex items-center gap-group">
        {!isDesktop ? (
          <button
            type="button"
            onClick={toggleSidebar}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-ui-border bg-ui-surface text-ui-text shadow-sm transition hover:bg-ui-surface-hover focus-visible:outline-focus focus-visible:outline-offset-focus focus-visible:outline-primary-600 dark:border-ui-border-dark dark:bg-ui-surface-dark dark:text-ui-text-dark dark:hover:bg-ui-surface-hover-dark"
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
          className="focus-visible:outline-focus focus-visible:outline-offset-focus focus-visible:outline-primary-600"
        >
          {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>
      </div>
    </header>
  );
}
