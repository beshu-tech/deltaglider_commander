import { Outlet } from "@tanstack/react-router";
import { AuthGuard } from "../../features/auth/AuthGuard";
import { Toolbar } from "./Toolbar";
import { LayoutProvider } from "./LayoutContext";
import { Sidebar } from "./Sidebar";
import {
  KeyboardShortcutsHelp,
  useKeyboardShortcutsHelp,
} from "../../features/objects/components/KeyboardShortcutsHelp";
import { ConnectionSheet } from "../../features/connection/ConnectionSheet";
import { useProfileSwitch } from "../../features/auth/useProfileSwitch";

export function AppLayout() {
  const { helpOpen, openHelp, closeHelp } = useKeyboardShortcutsHelp();

  // Listen for profile switches and invalidate all queries
  useProfileSwitch();

  return (
    <AuthGuard>
      <LayoutProvider>
        {/* Skip Navigation Link */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:rounded focus:bg-primary-600 focus:px-4 focus:py-2 focus:text-white focus:shadow-lg focus:outline-focus focus:outline-offset-focus focus:outline-primary-900"
        >
          Skip to main content
        </a>

        <div className="flex h-screen w-screen overflow-hidden bg-ui-bg text-ui-text dark:bg-ui-bg-dark dark:text-ui-text-dark">
          <Sidebar />
          <div className="flex min-w-0 flex-1 flex-col">
            <Toolbar onOpenKeyboardShortcuts={openHelp} />
            <main id="main-content" className="flex min-h-0 flex-1 flex-col overflow-hidden">
              <Outlet />
            </main>
          </div>
        </div>

        {/* Global Keyboard Shortcuts Help Overlay */}
        <KeyboardShortcutsHelp open={helpOpen} onClose={closeHelp} />

        {/* Connection Sheet */}
        <ConnectionSheet />
      </LayoutProvider>
    </AuthGuard>
  );
}
