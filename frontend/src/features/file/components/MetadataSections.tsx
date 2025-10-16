import { Tag } from "lucide-react";
import { formatDateTime } from "../../../lib/utils/dates";
import { formatMetadataValue } from "../utils/metadataFormatters";

interface ObjectInfoSectionProps {
  modified: string;
  acceptRanges?: boolean;
}

export function ObjectInfoSection({ modified, acceptRanges }: ObjectInfoSectionProps) {
  return (
    <section className="space-y-2">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-ui-text-muted dark:text-ui-text-subtle">
        Object info
      </h3>
      <dl className="space-y-2 text-xs">
        <div className="rounded bg-ui-bg-subtle p-2 dark:bg-ui-surface-active-dark">
          <dt className="font-medium text-ui-text-muted dark:text-ui-text-subtle">
            Last modified
          </dt>
          <dd className="mt-0.5 text-ui-text dark:text-ui-text-dark">{formatDateTime(modified)}</dd>
        </div>
        <div className="rounded bg-ui-bg-subtle p-2 dark:bg-ui-surface-active-dark">
          <dt className="font-medium text-ui-text-muted dark:text-ui-text-subtle">
            Accept-Ranges
          </dt>
          <dd className="mt-0.5 text-ui-text dark:text-ui-text-dark">
            {acceptRanges ? "Enabled" : "Disabled"}
          </dd>
        </div>
      </dl>
    </section>
  );
}

interface S3MetadataSectionProps {
  contentType?: string | null;
  etag?: string | null;
}

export function S3MetadataSection({ contentType, etag }: S3MetadataSectionProps) {
  return (
    <section className="space-y-2">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-ui-text-muted dark:text-ui-text-subtle">
        S3 Metadata
      </h3>
      <dl className="space-y-1 text-xs">
        {contentType && (
          <div className="rounded bg-ui-bg-subtle p-2 dark:bg-ui-surface-active-dark">
            <dt className="font-medium text-ui-text-muted dark:text-ui-text-subtle">
              Content-Type
            </dt>
            <dd className="mt-0.5 font-mono text-ui-text dark:text-ui-text-dark">{contentType}</dd>
          </div>
        )}
        {etag && (
          <div className="rounded bg-ui-bg-subtle p-2 dark:bg-ui-surface-active-dark">
            <dt className="font-medium text-ui-text-muted dark:text-ui-text-subtle">ETag</dt>
            <dd className="mt-0.5 break-all font-mono text-ui-text dark:text-ui-text-dark">
              {etag}
            </dd>
          </div>
        )}
      </dl>
    </section>
  );
}

interface DeltaGliderMetadataSectionProps {
  metadata?: Record<string, string>;
}

export function DeltaGliderMetadataSection({ metadata }: DeltaGliderMetadataSectionProps) {
  const dgMetadata = metadata
    ? Object.entries(metadata).filter(([key]) => key.startsWith("dg-"))
    : [];

  if (dgMetadata.length === 0) {
    return null;
  }

  return (
    <section className="space-y-2">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-ui-text-muted dark:text-ui-text-subtle">
        DeltaGlider Metadata
      </h3>
      <dl className="space-y-1 text-xs">
        {dgMetadata.map(([key, value]) => {
          const displayKey = key.replace("dg-", "").replace(/-/g, " ");
          const formattedValue = formatMetadataValue(key, value);
          const isLongValue = formattedValue.length > 60;
          const isCommand = key === "dg-delta-cmd";

          return (
            <div key={key} className="rounded bg-ui-bg-subtle p-2 dark:bg-ui-surface-active-dark">
              <dt className="font-medium capitalize text-ui-text-muted dark:text-ui-text-subtle">
                {displayKey}
              </dt>
              <dd
                className={`mt-0.5 text-ui-text dark:text-ui-text-dark ${!key.includes("size") && !key.includes("created") ? "font-mono text-xs" : ""}`}
              >
                {isCommand || isLongValue ? (
                  <details className="cursor-pointer">
                    <summary className="select-none hover:underline">
                      {isCommand ? "Show command" : formattedValue}
                    </summary>
                    <div className="mt-1 break-all text-xs">{value}</div>
                  </details>
                ) : (
                  formattedValue
                )}
              </dd>
            </div>
          );
        })}
      </dl>
    </section>
  );
}

interface CustomMetadataSectionProps {
  metadata?: Record<string, string>;
}

export function CustomMetadataSection({ metadata }: CustomMetadataSectionProps) {
  const customMetadata = metadata
    ? Object.entries(metadata).filter(([key]) => !key.startsWith("dg-"))
    : [];

  return (
    <section className="space-y-2">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-ui-text-muted dark:text-ui-text-subtle">
        Custom Metadata
      </h3>
      {customMetadata.length > 0 ? (
        <dl className="space-y-1 text-xs">
          {customMetadata.map(([key, value]) => (
            <div key={key} className="rounded bg-ui-bg-subtle p-2 dark:bg-ui-surface-active-dark">
              <dt className="font-medium text-ui-text-muted dark:text-ui-text-subtle">{key}</dt>
              <dd className="mt-0.5 break-all font-mono text-ui-text dark:text-ui-text-dark">
                {value}
              </dd>
            </div>
          ))}
        </dl>
      ) : (
        <div className="flex items-center gap-2 rounded-lg border border-dashed border-ui-border p-2 text-xs text-ui-text-subtle dark:border-ui-border-dark dark:text-ui-text-muted">
          <Tag className="h-3 w-3" />
          No custom metadata
        </div>
      )}
    </section>
  );
}

export function TagsSection() {
  return (
    <section className="space-y-2">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-ui-text-muted dark:text-ui-text-subtle">
        Tags
      </h3>
      <div className="flex items-center gap-2 rounded-lg border border-dashed border-ui-border p-2 text-xs text-ui-text-subtle dark:border-ui-border-dark dark:text-ui-text-muted">
        <Tag className="h-3 w-3" />
        No tags available
      </div>
    </section>
  );
}
