import { useMemo, useState, useEffect } from "react";
import { useMatch, useNavigate, useParams, useSearch } from "@tanstack/react-router";
import { ObjectsView } from "../features/objects/ObjectsView";
import { ObjectsSearchState } from "../features/objects/types";
import { normalizeObjectsSearch, serializeObjectsSearch } from "../features/objects/search";
import { FilePanel } from "../features/file/FilePanel";
import { useLayoutContext } from "../app/layout/LayoutContext";
import { NavigationContextProvider } from "../features/objects/context/NavigationContext";
import { setLastVisitedKey } from "../features/objects/logic/navigationSelectionLogic";
import { useObjects } from "../features/objects/useObjects";

interface BucketObjectsContentProps {
  selectedKey: string | null;
}

function BucketObjectsContent({ selectedKey }: BucketObjectsContentProps) {
  const { bucket } = useParams({ from: "/b/$bucket" });
  const rawSearch = useSearch({ from: "/b/$bucket" }) as Record<string, unknown> | undefined;
  const navigate = useNavigate();
  const [selectionResetKey, setSelectionResetKey] = useState(0);
  const objectMatch = useMatch({ from: "/b/$bucket/o/$objectKey+", shouldThrow: false });
  const matchedObjectKey = objectMatch?.params?.["objectKey+"] ?? null;
  const effectiveSelectedKey = selectedKey ?? matchedObjectKey;
  const { isDesktop } = useLayoutContext();

  const currentSearch = useMemo(() => normalizeObjectsSearch(rawSearch), [rawSearch]);

  // Get current objects and directories for nearest neighbor calculation
  const { data: objectsData } = useObjects({ bucket, ...currentSearch });

  // Save bucket name for restoration when returning to buckets list
  useEffect(() => {
    setLastVisitedKey("lastVisitedBucket", bucket);
  }, [bucket]);

  const updateSearch = (next: ObjectsSearchState) => {
    // Only replace history for pagination, sort, filter changes - not directory navigation
    const isDirectoryChange = next.prefix !== currentSearch.prefix;

    navigate({
      to: "/b/$bucket",
      params: { bucket },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      search: serializeObjectsSearch(next) as any,
      replace: !isDirectoryChange, // Push new entry for directory navigation
    });
  };

  const handleNextPage = () => {
    navigate({
      to: "/b/$bucket",
      params: { bucket },
      search: serializeObjectsSearch({
        ...currentSearch,
        pageIndex: currentSearch.pageIndex + 1,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      }) as any,
      replace: true,
    });
  };

  const handlePreviousPage = () => {
    navigate({
      to: "/b/$bucket",
      params: { bucket },
      search: serializeObjectsSearch({
        ...currentSearch,
        pageIndex: Math.max(0, currentSearch.pageIndex - 1),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      }) as any,
      replace: true,
    });
  };

  const handleRowClick = (itemKey: string) => {
    navigate({
      to: "/b/$bucket/o/$objectKey+",
      params: { bucket, "objectKey+": itemKey },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      search: serializeObjectsSearch(currentSearch) as any,
    });
  };

  const handleCloseDetails = () => {
    navigate({
      to: "/b/$bucket",
      params: { bucket },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      search: serializeObjectsSearch(currentSearch) as any,
    });
  };

  const handleObjectDeleted = (deletedKey: string) => {
    setSelectionResetKey((value) => value + 1);

    // Build list of all navigable items (directories + objects)
    const directories = objectsData?.common_prefixes ?? [];
    const objects = objectsData?.objects ?? [];
    const allItems = [
      ...directories.map((prefix: string) => ({ key: prefix })),
      ...objects.map((obj) => ({ key: obj.key })),
    ];

    // Find nearest neighbor: prefer previous item, fallback to next
    const deletedIndex = allItems.findIndex((item) => item.key === deletedKey);
    let nearestKey: string | null = null;

    if (deletedIndex !== -1) {
      // Prefer previous item
      if (deletedIndex > 0) {
        nearestKey = allItems[deletedIndex - 1].key;
      }
      // Fallback to next item
      else if (deletedIndex < allItems.length - 1) {
        nearestKey = allItems[deletedIndex + 1].key;
      }
    }

    // Navigate to nearest neighbor or close panel if none exist
    if (nearestKey) {
      navigate({
        to: "/b/$bucket/o/$objectKey+",
        params: { bucket, "objectKey+": nearestKey },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        search: serializeObjectsSearch(currentSearch) as any,
      });
    } else {
      handleCloseDetails();
    }
  };

  const handleUploadNavigate = () => {
    navigate({
      to: "/b/$bucket/upload",
      params: { bucket },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      search: serializeObjectsSearch(currentSearch) as any,
    });
  };

  const showDetails = Boolean(effectiveSelectedKey);

  return (
    <NavigationContextProvider initialContext="objects">
      <div className="relative flex h-full w-full overflow-hidden">
        <div className="flex flex-1 flex-col overflow-hidden">
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
            displayMode={isDesktop ? "inline" : "overlay"}
          />
        ) : null}
      </div>
    </NavigationContextProvider>
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
