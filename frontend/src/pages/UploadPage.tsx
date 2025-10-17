import { useCallback, useMemo } from "react";
import { ArrowLeft } from "lucide-react";
import { useNavigate, useParams, useSearch } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "../lib/ui/Button";
import { UploadManager } from "../features/upload/UploadManager";
import { normalizeObjectsSearch, serializeObjectsSearch } from "../features/objects/search";
import { removeFromLocalStorage } from "../lib/cache/localStorage";
import { qk } from "../lib/api/queryKeys";

export function UploadPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { bucket } = useParams({ from: "/b/$bucket/upload" });
  const rawSearch = useSearch({ from: "/b/$bucket/upload" }) as Record<string, unknown> | undefined;

  const currentSearch = useMemo(() => normalizeObjectsSearch(rawSearch), [rawSearch]);

  const handleBack = useCallback(() => {
    navigate({
      to: "/b/$bucket",
      params: { bucket },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      search: serializeObjectsSearch(currentSearch) as any,
    });
  }, [bucket, currentSearch, navigate]);

  const handleCompleted = useCallback(() => {
    // Clear localStorage cache for this bucket (smart invalidation)
    // We need to clear the cache for the current prefix and any parent prefixes
    const prefixParts = currentSearch.prefix.split("/").filter(Boolean);

    // Clear cache for current prefix
    removeFromLocalStorage(qk.objectsFull(bucket, currentSearch.prefix, undefined, "any"));

    // Clear cache for parent prefixes (since new files affect parent directory listings)
    for (let i = 0; i < prefixParts.length; i++) {
      const parentPrefix = prefixParts.slice(0, i).join("/");
      const normalizedParent = parentPrefix ? `${parentPrefix}/` : "";
      removeFromLocalStorage(qk.objectsFull(bucket, normalizedParent, undefined, "any"));
    }

    // Invalidate TanStack Query cache (memory) for both old cursor-based and new full cache
    queryClient.invalidateQueries({
      predicate: (query) =>
        Array.isArray(query.queryKey) &&
        (query.queryKey[0] === "objects" || query.queryKey[0] === "objects-full"),
    });
    queryClient.invalidateQueries({ queryKey: qk.buckets });
    queryClient.invalidateQueries({
      predicate: (query) =>
        Array.isArray(query.queryKey) &&
        query.queryKey[0] === "bucket-stats" &&
        query.queryKey[1] === bucket,
    });
    queryClient.invalidateQueries({
      predicate: (query) => Array.isArray(query.queryKey) && query.queryKey[0] === "stats",
    });
  }, [bucket, currentSearch.prefix, queryClient]);

  return (
    <div className="flex-1 overflow-auto">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-6">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <p className="text-sm text-ui-text-muted dark:text-ui-text-subtle">
              Bucket · {bucket} · Upload
            </p>
            <h1 className="text-2xl font-semibold text-ui-text dark:text-ui-text-dark">
              Upload to {bucket}
            </h1>
            <p className="text-sm text-ui-text-muted dark:text-ui-text-subtle">
              Drag, drop, or select files and folders. DeltaGlider picks the optimal storage
              strategy automatically.
            </p>
          </div>
          <Button variant="secondary" onClick={handleBack} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to browse
          </Button>
        </header>

        <UploadManager
          bucket={bucket}
          prefix={currentSearch.prefix}
          onCompleted={handleCompleted}
        />
      </div>
    </div>
  );
}

export default UploadPage;
