import { useMemo, useState } from "react";
import { UploadResult } from "../../lib/api/endpoints";
import { normalizeRelativePath } from "./utils/fileSystemHelpers";
import { useFileQueue } from "./hooks/useFileQueue";
import { useUploadSession } from "./hooks/useUploadSession";
import { UploadSessionStats } from "./components/UploadSessionStats";
import { FileDropZone } from "./components/FileDropZone";
import { UploadQueue } from "./components/UploadQueue";
import { DestinationPathSelector } from "./components/DestinationPathSelector";
import { normalizeS3Path } from "./utils/pathValidation";

interface UploadManagerProps {
  bucket: string;
  prefix: string;
  onCompleted?: (results: UploadResult[]) => void;
  existingPaths?: string[];
}

export function UploadManager({
  bucket,
  prefix,
  onCompleted,
  existingPaths = [],
}: UploadManagerProps) {
  const { stats, savingsPct, updateStats } = useUploadSession();

  // Initialize destination path from the prefix prop (from navigation context)
  const [destinationPath, setDestinationPath] = useState(() => normalizeS3Path(prefix));

  const normalizedPrefix = useMemo(() => {
    return normalizeRelativePath(destinationPath || prefix);
  }, [destinationPath, prefix]);

  const { queue, isUploading, hasCompleted, addFiles, clearCompleted } = useFileQueue({
    bucket,
    prefix: normalizedPrefix,
    onCompleted,
    onStatsUpdate: updateStats,
  });

  return (
    <div className="space-y-6">
      <DestinationPathSelector
        value={destinationPath}
        onChange={setDestinationPath}
        existingPaths={existingPaths}
        disabled={isUploading}
      />
      <UploadSessionStats stats={stats} savingsPct={savingsPct} />
      <FileDropZone
        normalizedPrefix={normalizedPrefix}
        isUploading={isUploading}
        onFilesAdded={addFiles}
      />
      <UploadQueue queue={queue} hasCompleted={hasCompleted} onClearCompleted={clearCompleted} />
    </div>
  );
}

export default UploadManager;
