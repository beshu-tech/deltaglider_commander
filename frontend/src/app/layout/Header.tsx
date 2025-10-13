import { Moon, Sun } from "lucide-react";
import { Button } from "../../lib/ui/Button";
import { useTheme } from "../theme";

export function Header() {
  const [theme, toggleTheme] = useTheme();

  return (
    <header className="flex h-14 items-center justify-between border-b border-slate-200 bg-surface-elevated px-group dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center gap-group"></div>
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
