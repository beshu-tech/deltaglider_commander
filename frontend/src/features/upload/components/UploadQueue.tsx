import { AlertCircle, CheckCircle2, FileText, Loader2 } from "lucide-react";
import { Button } from "../../../lib/ui/Button";
import { formatBytes } from "../../../lib/utils/bytes";
import { QueueItem } from "../types";

interface UploadQueueProps {
  queue: QueueItem[];
  hasCompleted: boolean;
  onClearCompleted: () => void;
}

export function UploadQueue({ queue, hasCompleted, onClearCompleted }: UploadQueueProps) {
  return (
    <section className="space-y-3">
      <header className="flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-ui-text-muted dark:text-ui-text-subtle">
          Upload Queue ({queue.length})
        </h3>
        <Button
          variant="ghost"
          disabled={!hasCompleted}
          onClick={onClearCompleted}
          className="text-sm"
        >
          Clear completed
        </Button>
      </header>
      <div className="space-y-2">
        {queue.length === 0 ? (
          <div className="rounded-lg border border-dashed border-ui-border-hover p-6 text-center text-sm text-ui-text-muted dark:border-ui-border-dark dark:text-ui-text-subtle">
            Files ready for upload will appear here with their compression results.
          </div>
        ) : null}
        {queue.map((item) => {
          const savings = item.result ? item.result.savings_pct : 0;
          let statusIcon = <Loader2 className="h-4 w-4 animate-spin text-ui-text-subtle" />;
          let statusText = "Pending";
          let statusColor = "text-ui-text-muted";

          if (item.status === "uploading") {
            statusText = "Uploading";
          } else if (item.status === "success") {
            statusIcon = <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
            statusColor = "text-emerald-600";
            statusText = item.result?.compressed
              ? `Compressed · ${savings.toFixed(1)}% saved`
              : "Stored original";
          } else if (item.status === "error") {
            statusIcon = <AlertCircle className="h-4 w-4 text-rose-500" />;
            statusColor = "text-rose-600";
            statusText = item.error || "Failed";
          }

          return (
            <div
              key={item.id}
              className="flex items-center justify-between rounded-lg border border-ui-border bg-white p-4 shadow-sm dark:border-ui-border-dark dark:bg-ui-surface-dark"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-ui-surface-active text-ui-text-muted dark:bg-ui-surface-active-dark dark:text-ui-text-muted-dark">
                  <FileText className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-sm font-medium text-ui-text dark:text-ui-text-dark">
                    {item.relativePath}
                  </p>
                  <p className="text-xs text-ui-text-muted dark:text-ui-text-subtle">
                    {formatBytes(item.size)}
                  </p>
                </div>
              </div>
              <div className={`flex items-center gap-2 text-sm ${statusColor}`}>
                {statusIcon}
                <span className="max-w-xs truncate text-right">{statusText}</span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
