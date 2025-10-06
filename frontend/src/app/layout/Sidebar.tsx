import { FormEvent, useMemo, useState } from "react";
import { Link, useMatch, useNavigate } from "@tanstack/react-router";
import { Archive, BookOpen, LifeBuoy, Loader2, LogOut, Plus, Search, Settings, X } from "lucide-react";
import { DEFAULT_OBJECTS_SEARCH_STATE } from "../../features/objects/types";
import { useBuckets } from "../../features/buckets/useBuckets";
import { useCreateBucket } from "../../features/buckets/useBucketManagement";
import { Badge } from "../../lib/ui/Badge";
import { Button } from "../../lib/ui/Button";
import { Input } from "../../lib/ui/Input";
import { SessionManager } from "../../services/sessionManager";

interface SidebarHeaderProps {
  onNavigateHome: () => void;
}

function SidebarHeader({ onNavigateHome }: SidebarHeaderProps) {
  return (
    <Link to="/buckets" className="block focus-visible:outline-none group" onClick={onNavigateHome}>
      <div className="flex items-center gap-3 mb-2">
        {/* Deltaglider Logo - Compact Design */}
        <div className="relative">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-gradient-to-br from-red-500 to-red-600 shadow-lg ring-1 ring-red-400/20">
            {/* Delta symbol inspired by the logo */}
            <div className="relative">
              <div className="w-0 h-0 border-l-[6px] border-r-[6px] border-b-[10px] border-l-transparent border-r-transparent border-b-white"></div>
              <div className="absolute top-1 left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-[3px] border-r-[3px] border-b-[6px] border-l-transparent border-r-transparent border-b-red-500"></div>
            </div>
          </div>
        </div>
        <div className="flex flex-col leading-tight">
          <span className="text-sm font-bold text-white tracking-tight">Deltaglider</span>
          <span className="text-xs text-slate-300 font-medium">Commander</span>
        </div>
      </div>
      <div className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/8 px-2.5 py-1 text-[10px] font-medium uppercase tracking-wide text-slate-200 backdrop-blur-sm group-hover:bg-white/12 transition-colors">
        <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></div>
        <span>Object Console</span>
      </div>
    </Link>
  );
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
        className="flex items-center gap-3 rounded-md px-3 py-2 text-slate-400 text-xs uppercase tracking-wide font-semibold transition-all duration-200 hover:bg-slate-800/30 hover:text-slate-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400"
        activeProps={{ className: "bg-slate-800/50 text-slate-200" }}
      >
        <Archive className="h-3.5 w-3.5 flex-shrink-0" />
        <span>Overview</span>
      </Link>
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

interface SidebarActionsProps {
  creating: boolean;
  showCreateForm: boolean;
  bucketName: string;
  validationError: string | null;
  onCreateClick: () => void;
  onCancelCreate: () => void;
  onSubmitCreate: (event: FormEvent<HTMLFormElement>) => void;
  onBucketNameChange: (value: string) => void;
  filter: string;
  onFilterChange: (value: string) => void;
}

function SidebarActions({
  creating,
  showCreateForm,
  bucketName,
  validationError,
  onCancelCreate,
  onSubmitCreate,
  onBucketNameChange,
  filter,
  onFilterChange,
}: SidebarActionsProps) {
  return (
    <div className="space-y-4">
      {showCreateForm ? (
        <CreateBucketForm
          value={bucketName}
          validationError={validationError}
          isSubmitting={creating}
          onValueChange={onBucketNameChange}
          onSubmit={onSubmitCreate}
          onCancel={onCancelCreate}
        />
      ) : null}
      <BucketFilter filter={filter} onFilterChange={onFilterChange} />
    </div>
  );
}

interface SidebarFooterProps {
  className?: string;
  onSignOut: () => void;
}

function SidebarFooter({ className, onSignOut }: SidebarFooterProps) {
  return (
    <div
      className={`space-y-1 border-t border-slate-700/50 pt-4 text-sm text-slate-300 ${className ?? ""}`}
    >
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
    <aside className="flex h-full w-72 min-w-[18rem] flex-col justify-between bg-gradient-to-b from-slate-900 via-slate-950 to-slate-900 px-5 py-6 text-slate-100 border-r border-slate-800/50">
      <div className="space-y-6">
        <SidebarHeader onNavigateHome={() => setFilter("")} />
        <SidebarActions
          creating={createBucketMutation.isPending}
          showCreateForm={showCreateForm}
          bucketName={bucketName}
          validationError={validationError}
          onCreateClick={() => {
            setShowCreateForm(true);
            setTimeout(() => setValidationError(null), 0);
          }}
          onCancelCreate={handleCancelCreate}
          onSubmitCreate={handleCreateSubmit}
          onBucketNameChange={(value) => {
            setBucketName(value);
            setValidationError(null);
          }}
          filter={filter}
          onFilterChange={setFilter}
        />
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Buckets
            </span>
            <div className="flex-1 h-px bg-gradient-to-r from-slate-700 to-transparent"></div>
          </div>
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
      </div>
      <SidebarFooter onSignOut={handleSignOut} />
    </aside>
  );
}
