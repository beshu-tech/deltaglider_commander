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
      <div className="flex h-screen w-screen items-center justify-center bg-slate-100 dark:bg-slate-950">
        <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-lg dark:bg-slate-900">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              Welcome to DeltaGlider Commander
            </h1>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
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
