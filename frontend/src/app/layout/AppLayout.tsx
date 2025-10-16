import { Outlet } from "@tanstack/react-router";
import { AuthGuard } from "../../features/auth/AuthGuard";
import { Header } from "./Header";
import { LayoutProvider } from "./LayoutContext";
import { Sidebar } from "./Sidebar";

export function AppLayout() {
  return (
    <AuthGuard>
      <LayoutProvider>
        <div className="flex h-screen w-screen overflow-hidden bg-ui-bg text-ui-text dark:bg-ui-bg-dark dark:text-ui-text-dark">
          <Sidebar />
          <div className="flex min-w-0 flex-1 flex-col">
            <Header />
            <main className="flex min-h-0 flex-1 flex-col overflow-hidden">
              <Outlet />
            </main>
          </div>
        </div>
      </LayoutProvider>
    </AuthGuard>
  );
}
