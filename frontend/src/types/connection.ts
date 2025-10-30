/**
 * Connection status types for ConnectionChip and connection management
 */

export type ConnState = "idle" | "ok" | "warn" | "error" | "offline" | "reconnecting";

export interface ConnectionStatus {
  state: ConnState;
  provider: "s3" | "gcs" | "azure" | "custom";
  accountAlias: string | null;
  accessKeyId: string;
  endpoint: string;
  region: string;
  expiresAt: string | null; // ISO 8601 timestamp
  lastChecked: string; // ISO 8601 timestamp
  errorMessage: string | null;
}

export interface ConnectionActivity {
  timestamp: string; // ISO 8601 timestamp
  event: "connected" | "disconnected" | "error" | "rotated" | "reconnected";
  message: string;
}

export interface RotateCredentialsRequest {
  newAccessKeyId: string;
  newSecretAccessKey: string;
  newRegion?: string;
  newEndpoint?: string;
}

export interface ReconnectRequest {
  forceRefresh?: boolean;
}
