/**
 * @deprecated Use CredentialManager from "./credentials" instead
 * This file is kept for backward compatibility only
 */

// Re-export everything from the new unified module
export type { CredentialProfile, AWSCredentials } from "./credentials";
export {
  CredentialManager as CredentialProfiles,
  CREDENTIAL_EVENTS as PROFILES_EVENTS,
} from "./credentials";
