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
        <div className="flex h-screen w-screen overflow-hidden bg-ui-bg text-ui-text dark:bg-ui-bg-dark dark:text-ui-text-dark">
          <Sidebar />
          <div className="flex min-w-0 flex-1 flex-col">
            <Toolbar onOpenKeyboardShortcuts={openHelp} />
            <main className="flex min-h-0 flex-1 flex-col overflow-hidden">
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
