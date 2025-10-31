import { useCallback, useEffect, useRef, useState } from "react";
import { FileText, FolderPlus, Loader2, UploadCloud } from "lucide-react";
import { Button } from "../../../lib/ui/Button";
import { useToast } from "../../../app/toast";
import { UploadFileInput } from "../../../lib/api/endpoints";
import { DirectoryCapableInput, extractDataTransferItems } from "../utils/fileSystemHelpers";

interface FileDropZoneProps {
  normalizedPrefix: string;
  isUploading: boolean;
  onFilesAdded: (files: UploadFileInput[]) => void;
}

export function FileDropZone({ normalizedPrefix, isUploading, onFilesAdded }: FileDropZoneProps) {
  const toast = useToast();
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const input = folderInputRef.current as DirectoryCapableInput | null;
    if (!input) {
      return;
    }
    input.setAttribute("webkitdirectory", "");
    input.setAttribute("directory", "");
    input.setAttribute("mozdirectory", "");
    input.setAttribute("msdirectory", "");
    input.webkitdirectory = true;
    if (typeof input.directory !== "undefined") {
      input.directory = true;
    }
    if (typeof input.mozdirectory !== "undefined") {
      input.mozdirectory = true;
    }
    if (typeof input.msdirectory !== "undefined") {
      input.msdirectory = true;
    }
  }, []);

  const handleFileSelection = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const list = event.target.files;
      if (!list) {
        return;
      }
      const entries: UploadFileInput[] = Array.from(list).map((file) => {
        const withPath = file as File & { webkitRelativePath?: string };
        return { file, relativePath: withPath.webkitRelativePath || file.name };
      });
      onFilesAdded(entries);
      event.target.value = "";
    },
    [onFilesAdded],
  );

  const handleDrop = useCallback(
    async (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      setIsDragging(false);
      if (isUploading) {
        toast.push({
          title: "Upload in progress",
          description: "Please wait for the active upload to finish before adding more files.",
          level: "info",
        });
        return;
      }
      const items = event.dataTransfer.items;
      if (!items) {
        return;
      }
      const uploads = await extractDataTransferItems(items);
      if (uploads.length) {
        onFilesAdded(uploads);
      }
    },
    [isUploading, onFilesAdded, toast],
  );

  const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
  }, []);

  return (
    <section>
      <div
        data-testid="upload-dropzone-area"
        className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-10 text-center transition ${
          isDragging
            ? "border-primary-600 bg-primary-50 dark:border-primary-500 dark:bg-primary-900/20"
            : "border-ui-border-hover bg-white dark:border-ui-border-dark dark:bg-ui-surface-dark"
        }`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={handleFileSelection}
        />
        <input
          ref={folderInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={handleFileSelection}
        />
        <UploadCloud className="mb-4 h-12 w-12 text-primary-600 dark:text-primary-500" />
        <h3 className="text-lg font-semibold">Drag and drop files or folders here</h3>
        <p className="mt-2 max-w-md text-sm text-ui-text-muted dark:text-ui-text-subtle">
          We'll automatically organise uploads under
          {normalizedPrefix ? ` ${normalizedPrefix}` : " the bucket root"}. Delta compression is
          applied when beneficial.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Button
            data-testid="upload-button-select-files"
            onClick={() => fileInputRef.current?.click()}
            className="gap-2"
          >
            <FileText className="h-4 w-4" />
            Select files
          </Button>
          <Button
            data-testid="upload-button-select-folder"
            variant="secondary"
            onClick={() => folderInputRef.current?.click()}
            className="gap-2"
          >
            <FolderPlus className="h-4 w-4" />
            Select folder
          </Button>
        </div>
        {isUploading ? (
          <p className="mt-4 flex items-center gap-2 text-sm text-ui-text-muted">
            <Loader2 className="h-4 w-4 animate-spin" /> Upload in progress...
          </p>
        ) : null}
      </div>
    </section>
  );
}
