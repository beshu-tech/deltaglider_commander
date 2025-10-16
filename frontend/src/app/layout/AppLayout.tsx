import { Outlet } from "@tanstack/react-router";
import { AuthGuard } from "../../features/auth/AuthGuard";
import { Header } from "./Header";
import { LayoutProvider } from "./LayoutContext";
import { Sidebar } from "./Sidebar";

export function AppLayout() {
  return (
    <AuthGuard>
      <LayoutProvider>
        <div className="flex h-screen w-screen overflow-hidden bg-surface-base text-slate-900 dark:bg-slate-950 dark:text-slate-100">
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
