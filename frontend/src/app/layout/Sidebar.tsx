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

function SidebarHeader() {
  return null;
}

interface BucketFilterProps {
  filter: string;
  onFilterChange: (value: string) => void;
}

function BucketFilter({ filter, onFilterChange }: BucketFilterProps) {
  return (
    <div className="space-y-2">
      <label
        htmlFor="sidebar-filter"
        className="text-xs font-semibold uppercase tracking-wide text-slate-400"
      >
        Filter Buckets
      </label>
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500"
          aria-hidden="true"
        />
        <Input
          id="sidebar-filter"
          type="search"
          value={filter}
          onChange={(event) => onFilterChange(event.target.value)}
          placeholder="Search buckets..."
          className="pl-9 h-9 bg-slate-800/50 border-slate-700/50 text-slate-200 placeholder:text-slate-500 focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/50 transition-all"
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
      className="space-y-3 rounded-lg border border-slate-700/50 bg-slate-800/30 p-4 backdrop-blur-sm"
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-blue-300">
          New bucket
        </span>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md p-1 text-slate-400 transition-colors hover:bg-slate-700/50 hover:text-white"
          aria-label="Cancel bucket creation"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="space-y-2">
        <label
          htmlFor="sidebar-bucket-name"
          className="text-xs font-medium uppercase tracking-wide text-slate-300"
        >
          Bucket name
        </label>
        <Input
          id="sidebar-bucket-name"
          value={value}
          onChange={(event) => onValueChange(event.target.value)}
          placeholder="e.g. images-prod"
          className="h-9 border-slate-600/50 bg-slate-700/50 text-white placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/50 transition-all"
          disabled={isSubmitting}
          autoFocus
        />
        {validationError ? (
          <p className="text-xs text-red-300 font-medium">{validationError}</p>
        ) : null}
      </div>
      <div className="flex items-center gap-2">
        <Button
          type="submit"
          className="flex-1 h-9 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-medium border-0 shadow-lg hover:shadow-xl transition-all duration-200"
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
          className="h-9 border border-slate-600/50 text-slate-300 hover:bg-slate-700/50 hover:text-white transition-all"
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
  onCreateClick: () => void;
}

function BucketList({
  buckets,
  isLoading,
  error,
  filter,
  activeBucket,
  onCreateClick,
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
      <div className="flex items-center gap-2 rounded-md px-3 py-2 text-xs text-slate-300">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading buckets…
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-md bg-white/10 px-3 py-2 text-xs text-red-200">
        Could not load buckets: {String(error)}
      </div>
    );
  }

  if (!filteredBuckets.length) {
    return (
      <div className="rounded-md px-3 py-2 text-xs text-slate-300">
        No buckets {filter ? "match the filter" : "available"}.
      </div>
    );
  }

  return (
    <nav className="flex flex-col gap-1 text-sm">
      <Link
        to="/buckets"
        className="flex items-center gap-3 rounded-lg px-3 py-3 mb-3 bg-gradient-to-r from-slate-800/50 to-slate-800/30 border border-slate-700/50 text-slate-200 transition-all duration-200 hover:from-slate-800/70 hover:to-slate-800/50 hover:border-slate-600/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400"
        activeProps={{
          className:
            "from-blue-600/20 to-blue-700/20 border-blue-500/40 text-white shadow-lg shadow-blue-500/10",
        }}
      >
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-slate-700 to-slate-800 shadow-inner">
          <svg
            className="h-4 w-4 text-slate-300"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
            />
          </svg>
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-bold text-white">Dashboard</span>
          <span className="text-xs text-slate-400">All Buckets Overview</span>
        </div>
      </Link>
      <div className="mb-2 px-3">
        <div className="h-px bg-gradient-to-r from-transparent via-slate-700 to-transparent"></div>
      </div>
      {filteredBuckets.map((bucket) => {
        const isActive = activeBucket === bucket.name;
        return (
          <Link
            key={bucket.name}
            to="/b/$bucket"
            params={{ bucket: bucket.name }}
            search={DEFAULT_OBJECTS_SEARCH_STATE}
            className={`group flex items-center justify-between rounded-lg px-3 py-2.5 text-sm transition-all duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400 ${
              isActive
                ? "bg-gradient-to-r from-blue-500/20 to-blue-600/20 text-white shadow-sm border border-blue-500/30"
                : "text-slate-300 hover:bg-slate-800/50 hover:text-white border border-transparent"
            }`}
            aria-current={isActive ? "page" : undefined}
          >
            <span className="flex items-center gap-3 min-w-0">
              <Archive className="h-4 w-4 flex-shrink-0" />
              <span className="truncate font-medium">{bucket.name}</span>
            </span>
            {bucket.pending ? (
              <Badge className="border-amber-400/30 bg-amber-400/20 text-[10px] uppercase text-amber-200 font-medium">
                Pending
              </Badge>
            ) : null}
          </Link>
        );
      })}
      <button
        onClick={onCreateClick}
        className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-slate-400 text-sm transition-all duration-200 hover:bg-slate-800/50 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400 border border-dashed border-slate-600/50 hover:border-slate-500/50 mt-2"
      >
        <Plus className="h-4 w-4 flex-shrink-0" />
        <span className="font-medium">Create Bucket</span>
      </button>
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
      {/* Prominent Full-Width Logo Section */}
      <Link
        to="/buckets"
        className="block focus-visible:outline-none group -mx-6 px-6 py-4 bg-gradient-to-br from-slate-800/50 to-slate-900/50 border-y border-slate-700/50 hover:from-slate-800/70 hover:to-slate-900/70 transition-all duration-200"
      >
        <div className="flex items-center justify-center gap-4">
          <div className="relative">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-red-500 via-red-600 to-red-700 shadow-xl ring-2 ring-red-400/30">
              <div className="relative">
                <div className="w-0 h-0 border-l-[8px] border-r-[8px] border-b-[14px] border-l-transparent border-r-transparent border-b-white"></div>
                <div className="absolute top-1.5 left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-[4px] border-r-[4px] border-b-[8px] border-l-transparent border-r-transparent border-b-red-600"></div>
              </div>
            </div>
            <div className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full bg-green-500 border-2 border-slate-950 shadow-lg">
              <div className="w-full h-full rounded-full bg-green-400 animate-pulse"></div>
            </div>
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-bold text-white tracking-tight">DeltaGlider</span>
            <span className="text-sm text-slate-300 font-semibold tracking-wide">Commander</span>
          </div>
        </div>
      </Link>

      {/* Navigation Links */}
      <div className="space-y-1 text-[13px] text-slate-300">
        <Link
          to="/settings"
          className="flex items-center gap-3 rounded-lg px-3 py-2 transition-all duration-200 hover:bg-slate-800/50 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400"
        >
          <Settings className="h-4 w-4" />
          <span className="font-medium">Settings</span>
        </Link>
        <a
          href="https://github.com/beshu-tech/deltaglider_commander/"
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-3 rounded-lg px-3 py-2 transition-all duration-200 hover:bg-slate-800/50 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400"
        >
          <BookOpen className="h-4 w-4" />
          <span className="font-medium">Documentation</span>
        </a>
        <a
          href="https://github.com/beshu-tech/deltaglider_commander/issues"
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-3 rounded-lg px-3 py-2 transition-all duration-200 hover:bg-slate-800/50 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400"
        >
          <LifeBuoy className="h-4 w-4" />
          <span className="font-medium">Support</span>
        </a>
        <button
          type="button"
          onClick={onSignOut}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-all duration-200 hover:bg-slate-800/50 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400"
        >
          <LogOut className="h-4 w-4" />
          <span className="font-medium">Sign Out</span>
        </button>
      </div>
    </div>
  );
}

export function Sidebar() {
  const { data: buckets, isLoading, isError, error } = useBuckets();
  const bucketMatch = useMatch({ from: "/b/$bucket", shouldThrow: false });
  const activeBucket = bucketMatch?.params?.bucket ?? null;
  const navigate = useNavigate();

  const [filter, setFilter] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [bucketName, setBucketName] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);
  const [bucketsExpanded, setBucketsExpanded] = useState(true);
  const createBucketMutation = useCreateBucket();

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

  return (
    <aside className="flex h-full w-72 min-w-[18rem] flex-col justify-between bg-neutral-dark px-6 py-section text-slate-100 border-r border-slate-700/30">
      <div className="space-y-3">
        <SidebarHeader />
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
            className="flex w-full items-center gap-2 px-2 py-1 rounded-md hover:bg-slate-800/50 transition-colors focus-visible:outline-focus focus-visible:outline-offset-1 focus-visible:outline-brand-500"
          >
            {bucketsExpanded ? (
              <ChevronDown className="h-4 w-4 text-slate-400" />
            ) : (
              <ChevronRight className="h-4 w-4 text-slate-400" />
            )}
            <svg
              className="h-3 w-3 text-slate-500"
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
            <span className="text-label-sm uppercase tracking-wide text-slate-400">
              Your Buckets {buckets && buckets.length > 0 ? `(${buckets.length})` : ""}
            </span>
            <div className="flex-1 h-px bg-gradient-to-r from-slate-700 to-transparent"></div>
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
                onCreateClick={() => {
                  setShowCreateForm(true);
                  setTimeout(() => setValidationError(null), 0);
                }}
              />
            </div>
          )}
        </div>
      </div>
      <SidebarFooter onSignOut={handleSignOut} />
    </aside>
  );
}
