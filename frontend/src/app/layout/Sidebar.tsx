import { FormEvent, useMemo, useState } from "react";
import { Link, useMatch, useNavigate } from "@tanstack/react-router";
import { Archive, BookOpen, LifeBuoy, Loader2, LogOut, Plus, Search, X } from "lucide-react";
import { DEFAULT_OBJECTS_SEARCH_STATE } from "../../features/objects/types";
import { useBuckets } from "../../features/buckets/useBuckets";
import { useCreateBucket } from "../../features/buckets/useBucketManagement";
import { Badge } from "../../lib/ui/Badge";
import { Button } from "../../lib/ui/Button";
import { Input } from "../../lib/ui/Input";

interface SidebarHeaderProps {
  onNavigateHome: () => void;
}

function SidebarHeader({ onNavigateHome }: SidebarHeaderProps) {
  return (
    <Link to="/buckets" className="block focus-visible:outline-none" onClick={onNavigateHome}>
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-500 text-white shadow-lg">
          <Archive className="h-5 w-5" />
        </div>
        <div className="flex flex-col">
          <span className="text-xs uppercase tracking-[0.2em] text-brand-200">DeltaGlider</span>
          <span className="text-lg font-semibold text-white">Commander</span>
        </div>
      </div>
      <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-medium uppercase tracking-wide text-brand-100">
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
      <label htmlFor="sidebar-filter" className="text-xs font-semibold uppercase tracking-wide text-slate-300">
        Filter Buckets
      </label>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
        <Input
          id="sidebar-filter"
          type="search"
          value={filter}
          onChange={(event) => onFilterChange(event.target.value)}
          placeholder="Search"
          className="pl-9 text-slate-100 placeholder:text-slate-400 focus:ring-brand-400/60"
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
  onCancel
}: CreateBucketFormProps) {
  return (
    <form onSubmit={onSubmit} className="space-y-3 rounded-lg border border-white/10 bg-white/5 p-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-brand-100">New bucket</span>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md p-1 text-slate-300 transition hover:bg-white/10 hover:text-white"
          aria-label="Cancel bucket creation"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="space-y-2">
        <label htmlFor="sidebar-bucket-name" className="text-xs uppercase tracking-wide text-slate-200">
          Bucket name
        </label>
        <Input
          id="sidebar-bucket-name"
          value={value}
          onChange={(event) => onValueChange(event.target.value)}
          placeholder="e.g. images-prod"
          className="border-white/10 bg-black/20 text-white placeholder:text-slate-400 focus:ring-brand-400/60"
          disabled={isSubmitting}
          autoFocus
        />
        {validationError ? <p className="text-xs text-rose-200">{validationError}</p> : null}
      </div>
      <div className="flex items-center gap-2">
        <Button type="submit" className="flex-1 border-white/10 bg-brand-500 text-white hover:bg-brand-400" disabled={isSubmitting}>
          {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          Create
        </Button>
        <Button
          type="button"
          variant="ghost"
          className="border-white/10 text-slate-200 hover:bg-white/10"
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

function BucketList({ buckets, isLoading, error, filter, activeBucket }: BucketListProps) {
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
        className="flex items-center gap-3 rounded-md px-3 py-2 text-slate-200 transition hover:bg-white/10 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        activeProps={{ className: "bg-white/15 text-white shadow" }}
      >
        <Archive className="h-4 w-4" />
        Buckets overview
      </Link>
      {filteredBuckets.map((bucket) => {
        const isActive = activeBucket === bucket.name;
        return (
          <Link
            key={bucket.name}
            to="/b/$bucket"
            params={{ bucket: bucket.name }}
            search={DEFAULT_OBJECTS_SEARCH_STATE}
            className={`group flex items-center justify-between rounded-md px-3 py-2 text-sm transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${
              isActive ? "bg-white/20 text-white shadow" : "text-slate-200 hover:bg-white/10 hover:text-white"
            }`}
            aria-current={isActive ? "page" : undefined}
          >
            <span className="flex items-center gap-3">
              <Archive className="h-4 w-4" />
              <span>{bucket.name}</span>
            </span>
            {bucket.pending ? (
              <Badge className="border-white/30 bg-white/20 text-[10px] uppercase text-white">Pending</Badge>
            ) : null}
          </Link>
        );
      })}
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
  onCreateClick,
  onCancelCreate,
  onSubmitCreate,
  onBucketNameChange,
  filter,
  onFilterChange
}: SidebarActionsProps) {
  return (
    <div className="space-y-3">
      {showCreateForm ? (
        <CreateBucketForm
          value={bucketName}
          validationError={validationError}
          isSubmitting={creating}
          onValueChange={onBucketNameChange}
          onSubmit={onSubmitCreate}
          onCancel={onCancelCreate}
        />
      ) : (
        <Button className="w-full border-white/10 bg-brand-500 text-white hover:bg-brand-400" onClick={onCreateClick}>
          <Plus className="mr-2 h-4 w-4" />
          Create Bucket
        </Button>
      )}
      <BucketFilter filter={filter} onFilterChange={onFilterChange} />
    </div>
  );
}

interface SidebarFooterProps {
  className?: string;
}

function SidebarFooter({ className }: SidebarFooterProps) {
  return (
    <div className={`space-y-1 border-t border-white/10 pt-4 text-sm text-slate-200 ${className ?? ""}`}>
      <a
        href="https://delta-glider.dev/docs"
        target="_blank"
        rel="noreferrer"
        className="flex items-center gap-3 rounded-md px-3 py-2 transition hover:bg-white/10 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
      >
        <BookOpen className="h-4 w-4" />
        Documentation
      </a>
      <a
        href="https://delta-glider.dev/support"
        target="_blank"
        rel="noreferrer"
        className="flex items-center gap-3 rounded-md px-3 py-2 transition hover:bg-white/10 hover:text-white focus-visible:outline focus-visible-outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
      >
        <LifeBuoy className="h-4 w-4" />
        Support
      </a>
      <button
        type="button"
        className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left transition hover:bg-white/10 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
      >
        <LogOut className="h-4 w-4" />
        Sign Out
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
      navigate({ to: "/b/$bucket", params: { bucket: trimmed }, search: { ...DEFAULT_OBJECTS_SEARCH_STATE } });
    } catch (error) {
      console.error("Create bucket failed", error);
    }
  };

  const handleCancelCreate = () => {
    setShowCreateForm(false);
    setBucketName("");
    setValidationError(null);
  };

  return (
    <aside className="flex h-full w-72 min-w-[18rem] flex-col justify-between bg-gradient-to-b from-slate-950 via-brand-900 to-slate-950 px-5 py-6 text-slate-100">
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
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-300">Buckets</span>
          <BucketList
            buckets={buckets}
            isLoading={isLoading}
            error={isError ? error : null}
            filter={filter}
            activeBucket={activeBucket}
          />
        </div>
      </div>
      <SidebarFooter />
    </aside>
  );
}
