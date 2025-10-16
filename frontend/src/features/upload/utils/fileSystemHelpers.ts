import { UploadFileInput } from "../../../lib/api/endpoints";

export type FileSystemEntry = FileSystemFileEntry | FileSystemDirectoryEntry;

export interface FileSystemEntryBase {
  isFile: boolean;
  isDirectory: boolean;
  name: string;
  fullPath: string;
}

export interface FileSystemFileEntry extends FileSystemEntryBase {
  isFile: true;
  isDirectory: false;
  file: (callback: (file: File) => void, errorCallback?: (error: DOMException) => void) => void;
}

export interface FileSystemDirectoryEntry extends FileSystemEntryBase {
  isFile: false;
  isDirectory: true;
  createReader: () => FileSystemDirectoryReader;
}

export interface FileSystemDirectoryReader {
  readEntries: (
    successCallback: (entries: FileSystemEntry[]) => void,
    errorCallback?: (error: DOMException) => void,
  ) => void;
}

export type DirectoryCapableInput = HTMLInputElement & {
  webkitdirectory?: boolean;
  directory?: boolean;
  mozdirectory?: boolean;
  msdirectory?: boolean;
};

export function generateId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function normalizeRelativePath(path: string): string {
  const sanitized = path.replace(/\\/g, "/");
  const segments = sanitized
    .split("/")
    .map((segment) => segment.trim())
    .filter((segment) => segment && segment !== "." && segment !== "..");
  return segments.join("/");
}

export async function readFileEntry(entry: FileSystemFileEntry): Promise<UploadFileInput | null> {
  return new Promise((resolve, reject) => {
    entry.file(
      (file) => {
        const relativePath = entry.fullPath.replace(/^\//, "") || file.name;
        try {
          Object.defineProperty(file, "webkitRelativePath", {
            value: relativePath,
            configurable: true,
          });
        } catch (error) {
          // Ignore if property is read-only in this environment
        }
        resolve({ file, relativePath });
      },
      (error) => reject(error),
    );
  });
}

export async function readDirectoryEntry(
  entry: FileSystemDirectoryEntry,
): Promise<UploadFileInput[]> {
  const reader = entry.createReader();
  const collected: UploadFileInput[] = [];

  return new Promise((resolve, reject) => {
    const readBatch = () => {
      reader.readEntries(
        async (entries) => {
          if (!entries.length) {
            resolve(collected);
            return;
          }
          for (const child of entries) {
            try {
              if (child.isFile) {
                const file = await readFileEntry(child as FileSystemFileEntry);
                if (file) {
                  collected.push(file);
                }
              } else if (child.isDirectory) {
                const files = await readDirectoryEntry(child as FileSystemDirectoryEntry);
                collected.push(...files);
              }
            } catch (error) {
              reject(error);
              return;
            }
          }
          readBatch();
        },
        (error) => reject(error),
      );
    };
    readBatch();
  });
}

export async function extractDataTransferItems(
  items: DataTransferItemList,
): Promise<UploadFileInput[]> {
  const uploads: UploadFileInput[] = [];
  const promises: Promise<UploadFileInput[] | UploadFileInput | null>[] = [];

  for (let index = 0; index < items.length; index += 1) {
    const item = items[index];
    const anyItem = item as DataTransferItem & { webkitGetAsEntry?: () => FileSystemEntry | null };
    if (typeof anyItem.webkitGetAsEntry === "function") {
      const entry = anyItem.webkitGetAsEntry();
      if (entry) {
        if (entry.isFile) {
          promises.push(readFileEntry(entry as unknown as FileSystemFileEntry));
        } else if (entry.isDirectory) {
          promises.push(readDirectoryEntry(entry as unknown as FileSystemDirectoryEntry));
        }
        continue;
      }
    }
    const file = item.getAsFile();
    if (file) {
      const withPath = file as File & { webkitRelativePath?: string };
      promises.push(
        Promise.resolve([{ file, relativePath: withPath.webkitRelativePath || file.name }]),
      );
    }
  }

  const settled = await Promise.all(promises);
  settled.forEach((result) => {
    if (!result) return;
    if (Array.isArray(result)) {
      uploads.push(...(result.filter(Boolean) as UploadFileInput[]));
    } else {
      uploads.push(result);
    }
  });

  return uploads;
}
