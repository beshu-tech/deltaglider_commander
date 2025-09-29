import { useEffect, useMemo, useRef, useState } from "react";
import { useMatch, useNavigate, useParams, useSearch } from "@tanstack/react-router";
import { ObjectsView } from "../features/objects/ObjectsView";
import { ObjectsSearchState } from "../features/objects/types";
import { normalizeObjectsSearch, serializeObjectsSearch } from "../features/objects/search";
import { FilePanel } from "../features/file/FilePanel";

interface BucketObjectsContentProps {
  selectedKey: string | null;
}

function BucketObjectsContent({ selectedKey }: BucketObjectsContentProps) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const { bucket } = useParams({ from: "/b/$bucket" });
  const rawSearch = useSearch({ from: "/b/$bucket" }) as Record<string, unknown> | undefined;
  const navigate = useNavigate();
  const cursorHistory = useRef<(string | undefined)[]>([]);
  const [selectionResetKey, setSelectionResetKey] = useState(0);
  const objectMatch = useMatch({ from: "/b/$bucket/o/$objectKey+", shouldThrow: false });
  const matchedObjectKey = objectMatch?.params?.["objectKey+"] ?? null;
  const effectiveSelectedKey = selectedKey ?? matchedObjectKey;

  const currentSearch = useMemo(() => normalizeObjectsSearch(rawSearch), [rawSearch]);

  useEffect(() => {
    headingRef.current?.focus();
  }, [bucket]);

  useEffect(() => {
    cursorHistory.current = [];
  }, [bucket, currentSearch.prefix, currentSearch.sort, currentSearch.order, currentSearch.limit]);

  const updateSearch = (next: ObjectsSearchState) => {
    cursorHistory.current = [];
    navigate({
      to: "/b/$bucket",
      params: { bucket },
      search: serializeObjectsSearch(next),
      replace: true
    });
  };

  const handleNextPage = (cursor: string) => {
    cursorHistory.current.push(currentSearch.cursor);
    navigate({
      to: "/b/$bucket",
      params: { bucket },
      search: serializeObjectsSearch({ ...currentSearch, cursor }),
      replace: true
    });
  };

  const handlePreviousPage = () => {
    const prevCursor = cursorHistory.current.pop() ?? undefined;
    navigate({
      to: "/b/$bucket",
      params: { bucket },
      search: serializeObjectsSearch({ ...currentSearch, cursor: prevCursor }),
      replace: true
    });
  };

  const handleRowClick = (itemKey: string) => {
    navigate({
      to: "/b/$bucket/o/$objectKey+",
      params: { bucket, "objectKey+": itemKey },
      search: serializeObjectsSearch(currentSearch)
    });
  };

  const handleCloseDetails = () => {
    navigate({
      to: "/b/$bucket",
      params: { bucket },
      search: serializeObjectsSearch(currentSearch)
    });
  };

  const handleObjectDeleted = () => {
    setSelectionResetKey((value) => value + 1);
    handleCloseDetails();
  };

  const handleUploadNavigate = () => {
    navigate({
      to: "/b/$bucket/upload",
      params: { bucket },
      search: serializeObjectsSearch(currentSearch)
    });
  };

  const showDetails = Boolean(effectiveSelectedKey);

  return (
    <div className="flex h-full w-full overflow-hidden">
      <div className={`flex flex-1 flex-col overflow-hidden p-6 ${showDetails ? "" : "pr-6"}`}>
        <div className="mb-4">
          <h1 ref={headingRef} tabIndex={-1} className="text-2xl font-semibold">
            Bucket: {bucket}
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Browse objects and inspect details.
          </p>
        </div>
        <ObjectsView
          bucket={bucket}
          search={currentSearch}
          onSearchChange={updateSearch}
          onRowClick={(item) => handleRowClick(item.key)}
          selectedKey={effectiveSelectedKey}
          onNextPage={handleNextPage}
          onPreviousPage={handlePreviousPage}
          selectionResetKey={selectionResetKey}
          onUploadClick={handleUploadNavigate}
        />
      </div>
      {showDetails ? (
        <FilePanel
          bucket={bucket}
          objectKey={effectiveSelectedKey}
          onClose={handleCloseDetails}
          onDeleted={handleObjectDeleted}
        />
      ) : null}
    </div>
  );
}

export function BucketObjectsPage() {
  return <BucketObjectsContent selectedKey={null} />;
}

export function useBucketAndObjectKey() {
  const params = useParams({ from: "/b/$bucket/o/$objectKey+" });
  const rawKey = params["objectKey+"];
  const objectKey = rawKey ?? null;
  return { bucket: params.bucket, objectKey };
}

export function BucketObjectsPageWithSelection() {
  const { objectKey } = useBucketAndObjectKey();
  return <BucketObjectsContent selectedKey={objectKey} />;
}
