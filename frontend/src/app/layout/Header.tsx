import { Moon, Sun, Menu, X, Keyboard, Settings } from "lucide-react";
import { useMatch, useNavigate } from "@tanstack/react-router";
import { Button } from "../../lib/ui/Button";
import { Badge } from "../../lib/ui/Badge";
import {
  ConnectionSummaryStatus,
  useConnectionSummary,
} from "../../features/auth/useConnectionSummary";
import { useBuckets } from "../../features/buckets/useBuckets";
import { useTheme } from "../theme";
import { useLayoutContext } from "./LayoutContext";

export interface HeaderProps {
  /** Callback to open keyboard shortcuts help dialog */
  onOpenKeyboardShortcuts: () => void;
}

export function Header({ onOpenKeyboardShortcuts }: HeaderProps) {
  const [theme, toggleTheme] = useTheme();
  const navigate = useNavigate();
  const { isDesktop, sidebarOpen, toggleSidebar } = useLayoutContext();
  const settingsMatch = useMatch({ from: "/settings", shouldThrow: false });
  const isOnSettingsPage = !!settingsMatch;

  const { isError: bucketsError, error: bucketsErrorDetails } = useBuckets({
    enabled: !isOnSettingsPage,
    refetchInterval: false,
  });

  const { connection, status, message } = useConnectionSummary({
    issue: bucketsError ? { isError: bucketsError, error: bucketsErrorDetails } : undefined,
  });

  return (
    <header className="flex h-14 items-center justify-between border-b border-ui-border bg-ui-surface px-4 dark:border-ui-border-dark dark:bg-ui-surface-dark">
      <div className="flex items-center gap-4">
        {!isDesktop ? (
          <button
            type="button"
            data-testid="header-button-menu-toggle"
            onClick={toggleSidebar}
            className="x-close-button inline-flex h-9 w-9 items-center justify-center rounded-md border border-ui-border bg-ui-surface text-ui-text shadow-sm transition hover:bg-ui-surface-hover dark:border-ui-border-dark dark:bg-ui-surface-dark dark:text-ui-text-dark dark:hover:bg-ui-surface-hover-dark"
            aria-label={sidebarOpen ? "Close navigation menu" : "Open navigation menu"}
          >
            {sidebarOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        ) : null}
        {isDesktop ? (
          <ConnectionSummaryPill
            status={status}
            connectionEndpoint={connection?.endpoint ?? null}
            connectionRegion={connection?.region ?? null}
            accessKeyId={connection?.accessKeyId ?? null}
            message={message}
            onManage={() => navigate({ to: "/settings" })}
          />
        ) : null}
      </div>
      <div className="flex items-center gap-2">
        <Button
          data-testid="header-button-keyboard-shortcuts"
          variant="ghost"
          aria-label="Show keyboard shortcuts (Shift+?)"
          onClick={onOpenKeyboardShortcuts}
          className="focus-visible:outline-focus focus-visible:outline-offset-focus focus-visible:outline-primary-600"
          title="Keyboard shortcuts (Shift+?)"
        >
          <Keyboard className="h-4 w-4" />
        </Button>
        <Button
          data-testid="header-button-theme-toggle"
          variant="ghost"
          aria-label="Toggle theme"
          onClick={toggleTheme}
          className="focus-visible:outline-focus focus-visible:outline-offset-focus focus-visible:outline-primary-600"
        >
          {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>
      </div>
    </header>
  );
}

interface ConnectionSummaryPillProps {
  status: ConnectionSummaryStatus;
  connectionEndpoint: string | null;
  connectionRegion: string | null;
  accessKeyId: string | null;
  message?: string;
  onManage: () => void;
}

const STATUS_STYLES: Record<
  ConnectionSummaryStatus,
  { dot: string; text: string; accent: string }
> = {
  connected: {
    dot: "bg-emerald-500",
    text: "text-emerald-600 dark:text-emerald-200",
    accent: "text-ui-text-muted dark:text-ui-text-muted-dark",
  },
  checking: {
    dot: "bg-amber-500",
    text: "text-amber-600 dark:text-amber-300",
    accent: "text-amber-600/80 dark:text-amber-200/80",
  },
  error: {
    dot: "bg-primary-500",
    text: "text-primary-600 dark:text-primary-300",
    accent: "text-primary-500/80 dark:text-primary-200/80",
  },
  disconnected: {
    dot: "bg-primary-500 dark:bg-primary-300",
    text: "text-primary-700 dark:text-primary-200",
    accent: "text-ui-text-muted dark:text-ui-text-muted-dark",
  },
};

function ConnectionSummaryPill({
  status,
  connectionEndpoint,
  connectionRegion,
  accessKeyId,
  message,
  onManage,
}: ConnectionSummaryPillProps) {
  const styles = STATUS_STYLES[status];
  const endpointLabel = connectionEndpoint?.trim() || "AWS S3 (default)";
  const regionLabel = connectionRegion?.trim() || "us-east-1";
  const accessKeyLabel = maskAccessKey(accessKeyId);
  const showMessage = !!message && status !== "connected";

  // Format: "$key @ $server ($region)"
  const summaryText = `${accessKeyLabel} @ ${endpointLabel} (${regionLabel})`;

  const titleParts = [`Status: ${statusLabel(status)}`, summaryText];
  if (showMessage) {
    titleParts.push(`Message: ${message}`);
  }
  const title = titleParts.join("\n");

  return (
    <button
      type="button"
      data-testid="header-connection-summary"
      onClick={onManage}
      title={title}
      className="group hidden max-w-full items-center gap-2 rounded-md border border-ui-border bg-ui-surface px-3 py-1.5 text-left text-sm text-ui-text shadow-sm transition hover:border-ui-border-hover hover:bg-ui-surface-hover focus-visible:outline-focus focus-visible:outline-offset-focus focus-visible:outline-primary-600 dark:border-ui-border-dark dark:bg-ui-surface-dark dark:text-ui-text-dark dark:hover:border-ui-border-hover-dark dark:hover:bg-ui-surface-hover-dark md:flex"
    >
      <span
        className={`mr-2 h-2.5 w-2.5 flex-shrink-0 rounded-full ${styles.dot}`}
        aria-hidden="true"
      />
      <span className="text-xs font-semibold uppercase tracking-wide text-ui-text-muted dark:text-ui-text-muted-dark">
        S3
      </span>
      <Badge className={`border-0 px-2 py-0.5 text-[10px] font-semibold uppercase ${styles.text}`}>
        {statusLabel(status)}
      </Badge>
      <span className="hidden sm:inline text-xs text-ui-text-muted dark:text-ui-text-muted-dark">
        •
      </span>
      <span className="max-w-[200px] truncate text-xs font-medium text-ui-text dark:text-ui-text-dark sm:max-w-[260px]">
        {endpointLabel}
      </span>
      <span className="hidden md:inline text-xs text-ui-text-muted dark:text-ui-text-muted-dark">
        • {regionLabel}
      </span>
      <span className="hidden lg:inline text-xs text-ui-text-muted dark:text-ui-text-muted-dark">
        • Key:{" "}
        <code className="rounded bg-ui-surface-hover px-1 py-0.5 font-mono text-[11px] dark:bg-ui-surface-hover-dark">
          {accessKeyLabel}
        </code>
      </span>
      {showMessage ? (
        <span className={`hidden xl:inline text-xs ${styles.accent}`}>• {message}</span>
      ) : null}
      <Settings className="ml-2 h-4 w-4 text-primary-600 transition group-hover:text-primary-500 dark:text-primary-400 dark:group-hover:text-primary-300" />
    </button>
  );
}

function statusLabel(status: ConnectionSummaryStatus) {
  switch (status) {
    case "connected":
      return "Connected";
    case "checking":
      return "Verifying";
    case "error":
      return "Connection issue";
    case "disconnected":
    default:
      return "Not connected";
  }
}

function maskAccessKey(accessKeyId: string | null) {
  if (!accessKeyId) {
    return "Not configured";
  }
  if (accessKeyId.length <= 8) {
    return accessKeyId;
  }
  return `${accessKeyId.slice(0, 4)}····${accessKeyId.slice(-4)}`;
}
