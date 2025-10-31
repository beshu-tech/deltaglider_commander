import type { FormEvent } from "react";
import { useState } from "react";
import { useMatch, useNavigate } from "@tanstack/react-router";
import { ChevronDown, ChevronRight, X } from "lucide-react";
import { useBuckets } from "../../features/buckets/useBuckets";
import { useCreateBucket } from "../../features/buckets/useBucketManagement";
import { DEFAULT_OBJECTS_SEARCH_STATE } from "../../features/objects/types";
import { SessionManager } from "../../services/sessionManager";
import { useLayoutContext } from "./LayoutContext";
import { ProfileDropdown } from "./ProfileDropdown";
import { BucketFilter, BucketList, CreateBucketForm, SidebarFooter } from "./sidebarSections";

export function Sidebar() {
  const { isDesktop, sidebarOpen, closeSidebar } = useLayoutContext();
  const settingsMatch = useMatch({ from: "/settings", shouldThrow: false });
  const isOnSettingsPage = !!settingsMatch;

  // Only fetch buckets when NOT on settings page to avoid auth loop
  const { data: buckets, isLoading, isError, error } = useBuckets({ enabled: !isOnSettingsPage });
  const bucketMatch = useMatch({ from: "/b/$bucket", shouldThrow: false });
  const activeBucket = bucketMatch?.params?.bucket ?? null;
  const navigate = useNavigate();

  const [filter, setFilter] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [bucketName, setBucketName] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);
  const [bucketsExpanded, setBucketsExpanded] = useState(true);
  const createBucketMutation = useCreateBucket();
  const openCreateForm = () => {
    setShowCreateForm(true);
    setTimeout(() => setValidationError(null), 0);
  };

  const handleCreateSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = bucketName.trim();
    if (!trimmed) {
      setValidationError("Bucket name is required");
      return;
    }
    setValidationError(null);
    try {
      await createBucketMutation.mutateAsync(trimmed);
      setBucketName("");
      setShowCreateForm(false);
      setFilter("");
      navigate({
        to: "/b/$bucket",
        params: { bucket: trimmed },
        search: { ...DEFAULT_OBJECTS_SEARCH_STATE },
      });
    } catch (error) {
      console.error("Create bucket failed", error);
    }
  };

  const handleCancelCreate = () => {
    setShowCreateForm(false);
    setBucketName("");
    setValidationError(null);
  };

  const handleSignOut = async () => {
    try {
      await SessionManager.destroySession();
      // Redirect to settings page
      window.location.href = "/settings";
    } catch (error) {
      console.error("Sign out failed", error);
      // Even if the request fails, redirect to settings
      window.location.href = "/settings";
    }
  };

  const sidebarClasses = [
    "flex h-full w-72 min-w-[18rem] flex-col justify-between bg-ui-surface text-ui-text border-ui-border dark:bg-neutral-dark dark:text-ui-text-dark dark:border-ui-border-dark/30 transition-transform duration-200 ease-in-out",
    isDesktop
      ? "relative z-0 border-r px-6 py-8"
      : "fixed inset-y-0 left-0 z-50 border-r px-6 py-8 shadow-2xl",
    !isDesktop && !sidebarOpen ? "-translate-x-full pointer-events-none" : "translate-x-0",
  ].join(" ");

  const overlay = isDesktop ? null : (
    <div
      className={`fixed inset-0 z-40 bg-ui-bg-dark/60 backdrop-blur-sm transition-opacity duration-200 dark:bg-ui-bg-dark/60 ${
        sidebarOpen ? "opacity-100" : "pointer-events-none opacity-0"
      }`}
      aria-hidden="true"
      onClick={closeSidebar}
    />
  );

  return (
    <>
      {overlay}
      <aside className={sidebarClasses} aria-hidden={!isDesktop && !sidebarOpen}>
        <div className="space-y-5 overflow-y-auto">
          {!isDesktop ? (
            <div className="-mx-6 mb-6 flex items-center justify-between px-6">
              <span className="text-sm font-semibold uppercase tracking-wide text-ui-text-muted dark:text-ui-text-muted-dark">
                Navigation
              </span>
              <button
                type="button"
                onClick={closeSidebar}
                className="x-close-button inline-flex h-8 w-8 items-center justify-center rounded-md text-ui-text-muted transition hover:bg-ui-surface-hover hover:text-ui-text dark:text-ui-text-subtle dark:hover:bg-ui-surface-active-dark/60 dark:hover:text-white"
              >
                <span className="sr-only">Close sidebar</span>
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : null}

          {/* Environments Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <svg
                className="h-3 w-3 text-ui-text-muted dark:text-ui-text-muted-dark"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4"
                />
              </svg>
              <span className="text-xs font-medium uppercase tracking-wide text-ui-text-muted dark:text-ui-text-muted-dark">
                Your Environments
              </span>
              <div className="h-px flex-1 bg-gradient-to-r from-ui-border to-transparent dark:from-ui-border-dark dark:to-transparent"></div>
            </div>
            <ProfileDropdown />
          </div>

          {showCreateForm && (
            <CreateBucketForm
              value={bucketName}
              validationError={validationError}
              isSubmitting={createBucketMutation.isPending}
              onValueChange={(value: string) => {
                setBucketName(value);
                setValidationError(null);
              }}
              onSubmit={handleCreateSubmit}
              onCancel={handleCancelCreate}
            />
          )}

          <div className="space-y-2">
            <button
              type="button"
              onClick={() => setBucketsExpanded(!bucketsExpanded)}
              className="flex w-full items-center gap-2 rounded-md py-1 transition-colors hover:bg-ui-surface-hover focus-visible:outline-focus focus-visible:outline-offset-1 focus-visible:outline-primary-900 dark:hover:bg-ui-surface-active-dark/50"
            >
              {bucketsExpanded ? (
                <ChevronDown className="h-4 w-4 text-ui-text-muted dark:text-ui-text-muted-dark" />
              ) : (
                <ChevronRight className="h-4 w-4 text-ui-text-muted dark:text-ui-text-muted-dark" />
              )}
              <svg
                className="h-3 w-3 text-ui-text-muted dark:text-ui-text-muted-dark"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
                />
              </svg>
              <span className="text-xs font-medium uppercase tracking-wide text-ui-text-muted dark:text-ui-text-muted-dark">
                Your Buckets {buckets && buckets.length > 0 ? `(${buckets.length})` : ""}
              </span>
              <div className="h-px flex-1 bg-gradient-to-r from-ui-border to-transparent dark:from-ui-border-dark dark:to-transparent"></div>
            </button>
            {bucketsExpanded && (
              <div className="space-y-2 pt-2.5 pl-3">
                {buckets && buckets.length >= 5 && (
                  <BucketFilter filter={filter} onFilterChange={setFilter} />
                )}
                <BucketList
                  buckets={buckets}
                  isLoading={isLoading}
                  error={isError ? error : null}
                  filter={filter}
                  activeBucket={activeBucket}
                  onCreateClick={openCreateForm}
                />
              </div>
            )}
          </div>
        </div>
        <SidebarFooter
          onSignOut={handleSignOut}
          className={
            !isDesktop
              ? "mt-8 border-t border-ui-border pt-6 dark:border-ui-border-dark/40"
              : undefined
          }
        />
      </aside>
    </>
  );
}
