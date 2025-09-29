import { Link } from "@tanstack/react-router";
import { Moon, Sun } from "lucide-react";
import { getEnv } from "../../lib/config/env";
import { Button } from "../../lib/ui/Button";
import { useTheme } from "../theme";

export function Header() {
  const [theme, toggleTheme] = useTheme();
  const title = getEnv().VITE_APP_NAME;

  return (
    <header className="flex h-14 items-center justify-between border-b border-slate-200 bg-white px-4 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center gap-4">
        <Link
          to="/buckets"
          className="text-base font-semibold text-slate-900 hover:text-brand-600 dark:text-slate-100"
        >
          {title}
        </Link>
      </div>
      <Button
        variant="ghost"
        className="gap-2"
        aria-label="Toggle theme"
        onClick={toggleTheme}
      >
        {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        <span className="text-sm capitalize">{theme} mode</span>
      </Button>
    </header>
  );
}
