import { Loader2 } from "lucide-react";
import { EmptyState } from "../../../lib/ui/EmptyState";

interface ObjectsLoadingStateProps {
  isError: boolean;
  isLoading: boolean;
  error: Error | null;
  hasData: boolean;
  fetchProgress?: { loaded: number } | null;
}

export function ObjectsLoadingState({
  isError,
  isLoading,
  error,
  hasData,
  fetchProgress,
}: ObjectsLoadingStateProps) {
  if (isError) {
    return (
      <div className="flex flex-1 items-center justify-center py-12">
        <EmptyState title="Could not load objects" message={String(error)} />
      </div>
    );
  }

  if (isLoading && !hasData) {
    return (
      <div className="flex flex-1 items-center justify-center py-12">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-ui-text-subtle" />
          {fetchProgress && (
            <p className="text-sm text-ui-text-muted">Loading... {fetchProgress.loaded} objects</p>
          )}
        </div>
      </div>
    );
  }

  return null;
}
