import { Moon, Sun } from "lucide-react";
import { Button } from "../../lib/ui/Button";
import { useTheme } from "../theme";

export function Header() {
  const [theme, toggleTheme] = useTheme();

  return (
    <header className="flex h-14 items-center justify-between border-b border-slate-200 bg-white px-4 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center gap-4"></div>
      <div className="flex items-center gap-2">
        <Button variant="ghost" aria-label="Toggle theme" onClick={toggleTheme}>
          {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>
      </div>
    </header>
  );
}
