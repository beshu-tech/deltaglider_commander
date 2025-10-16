/**
 * Auth guard component that shows credential config form if no credentials exist
 */

import { useCredentials } from "./useCredentials";
import { CredentialConfigForm } from "./CredentialConfigForm";

interface AuthGuardProps {
  children: React.ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const { hasCredentials, markCredentialsSet } = useCredentials();

  if (!hasCredentials) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-ui-surface-active dark:bg-ui-bg-dark">
        <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-lg dark:bg-ui-surface-dark">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-ui-text dark:text-ui-text-dark">
              Welcome to DeltaGlider Commander
            </h1>
            <p className="mt-2 text-sm text-ui-text-muted dark:text-ui-text-subtle">
              Configure your AWS credentials to get started
            </p>
          </div>
          <CredentialConfigForm onSuccess={markCredentialsSet} />
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
