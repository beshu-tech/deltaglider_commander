import { FormEvent, useMemo, useState } from "react";
import { Link, useMatch, useNavigate } from "@tanstack/react-router";
import {
  Archive,
  BookOpen,
  ChevronDown,
  ChevronRight,
  LifeBuoy,
  Loader2,
  LogOut,
  Plus,
  Search,
  Settings,
  X,
} from "lucide-react";
import { DEFAULT_OBJECTS_SEARCH_STATE } from "../../features/objects/types";
import { useBuckets } from "../../features/buckets/useBuckets";
import { useCreateBucket } from "../../features/buckets/useBucketManagement";
import { Badge } from "../../lib/ui/Badge";
import { Button } from "../../lib/ui/Button";
import { Input } from "../../lib/ui/Input";
import { SessionManager } from "../../services/sessionManager";
import { useLayoutContext } from "./LayoutContext";

function SidebarHeader({ onCreateClick }: { onCreateClick: () => void }) {
  return (
    <div className="rounded-xl border border-ui-border bg-ui-surface-active px-4 py-3 shadow-inner backdrop-blur-sm dark:border-ui-border-dark/40 dark:bg-ui-surface-active-dark/30">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 flex-col">
          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-ui-text-muted dark:text-ui-text-muted-dark">
            Storage
          </span>
          <span className="text-sm font-semibold text-ui-text dark:text-ui-text-dark">Buckets</span>
        </div>
        <Button
          type="button"
          onClick={onCreateClick}
          className="h-9 gap-2 px-3 text-xs font-semibold"
          aria-label="Create bucket"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

interface BucketFilterProps {
  filter: string;
  onFilterChange: (value: string) => void;
}

function BucketFilter({ filter, onFilterChange }: BucketFilterProps) {
  return (
    <div className="space-y-2">
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ui-text-muted dark:text-ui-text-muted"
          aria-hidden="true"
        />
        <Input
          id="sidebar-filter"
          type="search"
          value={filter}
          onChange={(event) => onFilterChange(event.target.value)}
          placeholder="Filter buckets..."
          className="h-9 border-ui-border bg-ui-surface-active pl-9 text-ui-text placeholder:text-ui-text-muted transition-all focus:border-red-900/50 focus:ring-2 focus:ring-red-900/30 dark:border-ui-border-dark/50 dark:bg-ui-surface-active-dark/50 dark:text-ui-text-dark"
        />
      </div>
    </div>
  );
}

interface CreateBucketFormProps {
  value: string;
  validationError: string | null;
  isSubmitting: boolean;
  onValueChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onCancel: () => void;
}

function CreateBucketForm({
  value,
  validationError,
  isSubmitting,
  onValueChange,
  onSubmit,
  onCancel,
}: CreateBucketFormProps) {
  return (
    <form
      onSubmit={onSubmit}
      className="space-y-3 rounded-lg border border-ui-border bg-ui-surface-active p-4 backdrop-blur-sm dark:border-ui-border-dark/50 dark:bg-ui-surface-active-dark/30"
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-primary-600 dark:text-red-300">
          New bucket
        </span>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md p-1 text-ui-text-muted transition-colors hover:bg-ui-surface-hover hover:text-ui-text dark:text-ui-text-subtle dark:hover:bg-ui-surface-hover-dark/50 dark:hover:text-white"
          aria-label="Cancel bucket creation"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="space-y-2">
        <label
          htmlFor="sidebar-bucket-name"
          className="text-xs font-medium uppercase tracking-wide text-ui-text-muted dark:text-ui-text-muted-dark"
        >
          Bucket name
        </label>
        <Input
          id="sidebar-bucket-name"
          value={value}
          onChange={(event) => onValueChange(event.target.value)}
          placeholder="e.g. images-prod"
          className="h-9 border-ui-border bg-ui-surface-hover text-ui-text placeholder:text-ui-text-muted transition-all focus:border-red-900/50 focus:ring-2 focus:ring-red-900/30 dark:border-ui-border-hover-dark/50 dark:bg-ui-surface-hover-dark/50 dark:text-white dark:placeholder:text-ui-text-subtle"
          disabled={isSubmitting}
          autoFocus
        />
        {validationError ? (
          <p className="text-xs font-medium text-primary-600 dark:text-red-300">{validationError}</p>
        ) : null}
      </div>
      <div className="flex items-center gap-2">
        <Button
          type="submit"
          className="h-9 flex-1 border-0 bg-gradient-to-r from-red-900/90 via-red-900 to-red-900/90 font-medium text-white shadow-lg transition-all duration-200 hover:from-red-800/80 hover:via-red-800 hover:to-red-800/80 hover:shadow-xl"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
          Create
        </Button>
        <Button
          type="button"
          variant="ghost"
          className="h-9 border border-ui-border-hover text-ui-text-muted transition-all hover:bg-ui-surface-hover hover:text-ui-text dark:border-ui-border-hover-dark/50 dark:text-ui-text-muted-dark dark:hover:bg-ui-surface-hover-dark/50 dark:hover:text-white"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}

interface BucketListProps {
  buckets: ReturnType<typeof useBuckets>["data"];
  isLoading: boolean;
  error: unknown;
  filter: string;
  activeBucket: string | null;
}

function BucketList({
  buckets,
  isLoading,
  error,
  filter,
  activeBucket,
}: BucketListProps) {
  const filteredBuckets = useMemo(() => {
    if (!buckets) {
      return [];
    }
    const term = filter.trim().toLowerCase();
    if (!term) {
      return buckets;
    }
    return buckets.filter((bucket) => bucket.name.toLowerCase().includes(term));
  }, [buckets, filter]);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 rounded-md px-3 py-2 text-xs text-ui-text-muted dark:text-ui-text-muted-dark">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading buckets…
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-md bg-primary-50 px-3 py-2 text-xs text-primary-700 dark:bg-white/10 dark:text-red-200">
        Could not load buckets: {String(error)}
      </div>
    );
  }

  if (!filteredBuckets.length) {
    return (
      <div className="rounded-md px-3 py-2 text-xs text-ui-text-muted dark:text-ui-text-muted-dark">
        No buckets {filter ? "match the filter" : "available"}.
      </div>
    );
  }

  return (
    <nav className="flex flex-col gap-1 text-sm">
      <Link
        to="/buckets"
        className="mb-3 flex items-center gap-3 rounded-lg border border-ui-border bg-gradient-to-r from-ui-surface-active to-ui-surface-active px-3 py-3 text-ui-text transition-all duration-200 hover:from-ui-surface-hover hover:to-ui-surface-active hover:border-ui-border-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-900 dark:border-ui-border-dark/50 dark:from-ui-surface-active-dark/50 dark:to-ui-surface-active-dark/30 dark:text-ui-text-dark dark:hover:from-ui-surface-active-dark/70 dark:hover:to-ui-surface-active-dark/50 dark:hover:border-ui-border-hover-dark/50"
        activeProps={{
          className:
            "from-red-900/20 to-red-900/20 border-red-900/40 text-ui-text dark:text-white shadow-lg shadow-red-900/10",
        }}
      >
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-red-900/90 via-red-900 to-red-900/80 text-white shadow-lg shadow-red-900/20 ring-1 ring-red-900/40">
          <svg className="h-4 w-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
            />
          </svg>
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-bold text-ui-text dark:text-ui-text-dark">Dashboard</span>
          <span className="text-xs text-ui-text-muted dark:text-ui-text-muted-dark">All Buckets Overview</span>
        </div>
      </Link>
      <div className="mb-2 px-3">
        <div className="h-px bg-gradient-to-r from-transparent via-ui-border to-transparent dark:via-ui-border-dark dark:to-transparent"></div>
      </div>
      {filteredBuckets.map((bucket) => {
        const isActive = activeBucket === bucket.name;
        return (
          <Link
            key={bucket.name}
            to="/b/$bucket"
            params={{ bucket: bucket.name }}
            search={DEFAULT_OBJECTS_SEARCH_STATE}
            className={`group flex items-center justify-between rounded-lg border px-3 py-2.5 text-sm transition-all duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-900 ${
              isActive
                ? "border-red-900/30 bg-gradient-to-r from-red-900/20 to-red-900/20 text-ui-text shadow-sm dark:text-white"
                : "border-transparent text-ui-text-muted hover:bg-ui-surface-hover hover:text-ui-text dark:text-ui-text-muted-dark dark:hover:bg-ui-surface-active-dark/50 dark:hover:text-white"
            }`}
            aria-current={isActive ? "page" : undefined}
          >
            <span className="flex min-w-0 items-center gap-3">
              <Archive className="h-4 w-4 flex-shrink-0" />
              <span className="truncate font-medium">{bucket.name}</span>
            </span>
            {bucket.pending ? (
              <Badge className="border-ui-border bg-ui-surface-active text-[10px] font-medium uppercase text-ui-text-muted dark:border-ui-border-dark dark:bg-ui-surface-active-dark dark:text-ui-text-muted-dark">
                Pending
              </Badge>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}

interface SidebarFooterProps {
  className?: string;
  onSignOut: () => void;
}

function SidebarFooter({ className, onSignOut }: SidebarFooterProps) {
  return (
    <div className={`space-y-4 ${className ?? ""}`}>
      {/* Typographic Logo Section */}
      <Link
        to="/buckets"
        className="group relative -mx-6 block overflow-hidden bg-gradient-to-r from-red-900/90 via-red-900 to-red-900/90 px-6 py-7 transition-all duration-200 hover:from-red-800/80 hover:via-red-800 hover:to-red-800/80 focus-visible:outline-none"
      >
        {/* Subtle shine effect on hover */}
        <div className="absolute inset-0 translate-x-[-100%] bg-gradient-to-r from-transparent via-white/10 to-transparent transition-transform duration-700 group-hover:translate-x-[100%]"></div>

        <div className="relative flex flex-col items-start">
          {/* Typographic Logo */}
          <div className="flex flex-col gap-2">
            <span
              className="text-[28px] font-light leading-none tracking-wide text-white drop-shadow-lg"
              style={{ letterSpacing: "0.08em" }}
            >
              DELTAGLIDER
            </span>
            <span className="pl-0.5 text-xs font-light uppercase tracking-[0.3em] text-white/85">
              Commander
            </span>
          </div>
        </div>
      </Link>

      {/* Navigation Links */}
      <div className="space-y-1 text-[13px] text-ui-text-muted dark:text-ui-text-dark">
        <Link
          to="/settings"
          className="flex items-center gap-3 rounded-lg px-3 py-2 transition-all duration-200 hover:bg-ui-surface-hover hover:text-ui-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-900 dark:hover:bg-ui-surface-active-dark/50 dark:hover:text-white"
        >
          <Settings className="h-4 w-4" />
          <span className="font-medium">Settings</span>
        </Link>
        <a
          href="https://github.com/beshu-tech/deltaglider_commander/"
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-3 rounded-lg px-3 py-2 transition-all duration-200 hover:bg-ui-surface-hover hover:text-ui-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-900 dark:hover:bg-ui-surface-active-dark/50 dark:hover:text-white"
        >
          <BookOpen className="h-4 w-4" />
          <span className="font-medium">Documentation</span>
        </a>
        <a
          href="https://github.com/beshu-tech/deltaglider_commander/issues"
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-3 rounded-lg px-3 py-2 transition-all duration-200 hover:bg-ui-surface-hover hover:text-ui-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-900 dark:hover:bg-ui-surface-active-dark/50 dark:hover:text-white"
        >
          <LifeBuoy className="h-4 w-4" />
          <span className="font-medium">Support</span>
        </a>
        <button
          type="button"
          onClick={onSignOut}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-all duration-200 hover:bg-ui-surface-hover hover:text-ui-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400 dark:hover:bg-ui-surface-active-dark/50 dark:hover:text-white"
        >
          <LogOut className="h-4 w-4" />
          <span className="font-medium">Sign Out</span>
        </button>
      </div>
    </div>
  );
}

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
      ? "relative z-0 border-r px-6 py-section"
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
        <div className="space-y-3 overflow-y-auto">
          {!isDesktop ? (
            <div className="-mx-6 mb-4 flex items-center justify-between px-6">
              <span className="text-sm font-semibold uppercase tracking-wide text-ui-text-muted dark:text-ui-text-muted-dark">
                Navigation
              </span>
              <button
                type="button"
                onClick={closeSidebar}
                className="inline-flex h-8 w-8 items-center justify-center rounded-md text-ui-text-muted transition hover:bg-ui-surface-hover hover:text-ui-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-900 dark:text-ui-text-subtle dark:hover:bg-ui-surface-active-dark/60 dark:hover:text-white"
              >
                <span className="sr-only">Close sidebar</span>
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : null}

          <SidebarHeader onCreateClick={openCreateForm} />
          {showCreateForm && (
            <CreateBucketForm
              value={bucketName}
              validationError={validationError}
              isSubmitting={createBucketMutation.isPending}
              onValueChange={(value) => {
                setBucketName(value);
                setValidationError(null);
              }}
              onSubmit={handleCreateSubmit}
              onCancel={handleCancelCreate}
            />
          )}
          <div className="space-y-item">
            <button
              type="button"
              onClick={() => setBucketsExpanded(!bucketsExpanded)}
              className="flex w-full items-center gap-2 rounded-md px-2 py-1 transition-colors hover:bg-ui-surface-hover focus-visible:outline-focus focus-visible:outline-offset-1 focus-visible:outline-red-900 dark:hover:bg-ui-surface-active-dark/50"
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
              <span className="text-label-sm uppercase tracking-wide text-ui-text-muted dark:text-ui-text-muted-dark">
                Your Buckets {buckets && buckets.length > 0 ? `(${buckets.length})` : ""}
              </span>
              <div className="h-px flex-1 bg-gradient-to-r from-ui-border to-transparent dark:from-ui-border-dark dark:to-transparent"></div>
            </button>
            {bucketsExpanded && (
              <div className="space-y-3 pt-2">
                <BucketFilter filter={filter} onFilterChange={setFilter} />
                <BucketList
                  buckets={buckets}
                  isLoading={isLoading}
                  error={isError ? error : null}
                  filter={filter}
                  activeBucket={activeBucket}
                />
              </div>
            )}
          </div>
        </div>
        <SidebarFooter
          onSignOut={handleSignOut}
          className={!isDesktop ? "mt-8 border-t border-ui-border pt-6 dark:border-ui-border-dark/40" : undefined}
        />
      </aside>
    </>
  );
}
