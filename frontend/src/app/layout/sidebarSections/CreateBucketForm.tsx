import type { FormEvent } from "react";
import { Loader2, Plus, X } from "lucide-react";

import { Button } from "../../../lib/ui/Button";
import { Input } from "../../../lib/ui/Input";

export interface CreateBucketFormProps {
  value: string;
  validationError: string | null;
  isSubmitting: boolean;
  onValueChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onCancel: () => void;
}

export function CreateBucketForm({
  value,
  validationError,
  isSubmitting,
  onValueChange,
  onSubmit,
  onCancel,
}: CreateBucketFormProps) {
  return (
    <form
      onSubmit={onSubmit}
      className="space-y-4 rounded-lg border border-ui-border bg-ui-surface-active p-4 backdrop-blur-sm dark:border-ui-border-dark/50 dark:bg-ui-surface-active-dark/30"
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-ui-text dark:text-ui-text-dark">
          New bucket
        </span>
        <button
          type="button"
          onClick={onCancel}
          className="x-close-button rounded-md p-1 text-ui-text-muted transition-colors hover:bg-ui-surface-hover hover:text-ui-text dark:text-ui-text-subtle dark:hover:bg-ui-surface-hover-dark/50 dark:hover:text-white"
          aria-label="Cancel bucket creation"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="space-y-2.5">
        <label
          htmlFor="sidebar-bucket-name"
          className="text-xs font-medium uppercase tracking-wide text-ui-text-muted dark:text-ui-text-muted-dark"
        >
          Bucket name
        </label>
        <Input
          id="sidebar-bucket-name"
          value={value}
          onChange={(event) => onValueChange(event.target.value)}
          placeholder="e.g. images-prod"
          className="h-9 border-ui-border bg-ui-surface-hover text-ui-text placeholder:text-ui-text-muted transition-all focus:border-primary-900/50 focus:ring-2 focus:ring-primary-900/30 dark:border-ui-border-hover-dark/50 dark:bg-ui-surface-hover-dark/50 dark:text-white dark:placeholder:text-ui-text-subtle"
          disabled={isSubmitting}
          autoFocus
        />
        {validationError ? (
          <p className="text-xs font-medium text-primary-600 dark:text-primary-300">
            {validationError}
          </p>
        ) : null}
      </div>
      <div className="flex items-center gap-2">
        <Button
          type="submit"
          className="h-9 flex-1 border-0 bg-gradient-to-r from-primary-900/90 via-primary-900 to-primary-900/90 font-medium text-white shadow-lg transition-all duration-200 hover:from-primary-800/80 hover:via-primary-800 hover:to-primary-800/80 hover:shadow-xl"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
          Create
        </Button>
        <Button
          type="button"
          variant="ghost"
          className="h-9 border border-ui-border-hover text-ui-text-muted transition-all hover:bg-ui-surface-hover hover:text-ui-text dark:border-ui-border-hover-dark/50 dark:text-ui-text-muted-dark dark:hover:bg-ui-surface-hover-dark/50 dark:hover:text-white"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}

export default CreateBucketForm;
