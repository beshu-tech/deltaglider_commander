import { Link } from "@tanstack/react-router";
import { BookOpen, LifeBuoy, LogOut, Settings } from "lucide-react";

export interface SidebarFooterProps {
  className?: string;
  onSignOut: () => void;
}

export function SidebarFooter({ className, onSignOut }: SidebarFooterProps) {
  return (
    <div className={`space-y-4 ${className ?? ""}`}>
      <Link
        to="/buckets"
        className="group relative -mx-6 block overflow-hidden bg-gradient-to-r from-primary-900/90 via-primary-900 to-primary-900/90 px-6 py-7 transition-all duration-200 hover:from-primary-800/80 hover:via-primary-800 hover:to-primary-800/80 focus-visible:outline-none"
      >
        <div className="absolute inset-0 translate-x-[-100%] bg-gradient-to-r from-transparent via-white/10 to-transparent transition-transform duration-700 group-hover:translate-x-[100%]"></div>

        <div className="relative flex flex-col items-start">
          <div className="flex flex-col gap-2">
            <span
              className="text-[28px] font-light leading-none tracking-wide text-white drop-shadow-lg"
              style={{ letterSpacing: "0.08em" }}
            >
              DELTAGLIDER
            </span>
            <span className="pl-0.5 text-xs font-light uppercase tracking-[0.3em] text-white/85">
              Commander
              <span className="ml-2 text-[10px] font-normal tracking-wider text-white/50">
                v{__APP_VERSION__}
              </span>
            </span>
          </div>
        </div>
      </Link>

      <div className="mt-6 space-y-1 text-[13px] text-ui-text-muted dark:text-ui-text-dark">
        <Link
          to="/settings"
          className="flex items-center gap-3 rounded-lg py-2 transition-all duration-200 hover:bg-ui-surface-hover hover:text-ui-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-900 dark:hover:bg-ui-surface-active-dark/50 dark:hover:text-white"
        >
          <Settings className="h-4 w-4" />
          <span className="font-medium">Settings</span>
        </Link>
        <a
          href="https://github.com/beshu-tech/deltaglider_commander/"
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-3 rounded-lg py-2 transition-all duration-200 hover:bg-ui-surface-hover hover:text-ui-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-900 dark:hover:bg-ui-surface-active-dark/50 dark:hover:text-white"
        >
          <BookOpen className="h-4 w-4" />
          <span className="font-medium">Documentation</span>
        </a>
        <a
          href="https://github.com/beshu-tech/deltaglider_commander/issues"
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-3 rounded-lg py-2 transition-all duration-200 hover:bg-ui-surface-hover hover:text-ui-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-900 dark:hover:bg-ui-surface-active-dark/50 dark:hover:text-white"
        >
          <LifeBuoy className="h-4 w-4" />
          <span className="font-medium">Support</span>
        </a>
        <button
          type="button"
          onClick={onSignOut}
          className="flex w-full items-center gap-3 rounded-lg py-2 text-left transition-all duration-200 hover:bg-ui-surface-hover hover:text-ui-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400 dark:hover:bg-ui-surface-active-dark/50 dark:hover:text-white"
        >
          <LogOut className="h-4 w-4" />
          <span className="font-medium">Sign Out</span>
        </button>
      </div>
    </div>
  );
}

export default SidebarFooter;
