import { useMemo } from "react";
import { UploadResult } from "../../lib/api/endpoints";
import { normalizeRelativePath } from "./utils/fileSystemHelpers";
import { useFileQueue } from "./hooks/useFileQueue";
import { useUploadSession } from "./hooks/useUploadSession";
import { UploadSessionStats } from "./components/UploadSessionStats";
import { FileDropZone } from "./components/FileDropZone";
import { UploadQueue } from "./components/UploadQueue";

interface UploadManagerProps {
  bucket: string;
  prefix: string;
  onCompleted?: (results: UploadResult[]) => void;
}

export function UploadManager({ bucket, prefix, onCompleted }: UploadManagerProps) {
  const { stats, savingsPct, updateStats } = useUploadSession();

  const normalizedPrefix = useMemo(() => {
    return normalizeRelativePath(prefix);
  }, [prefix]);

  const { queue, isUploading, hasCompleted, addFiles, clearCompleted } = useFileQueue({
    bucket,
    prefix: normalizedPrefix,
    onCompleted,
    onStatsUpdate: updateStats,
  });

  return (
    <div className="space-y-6">
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
