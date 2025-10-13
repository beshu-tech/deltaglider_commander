import { Loader2, RefreshCcw } from "lucide-react";
import { Button } from "../../lib/ui/Button";
import { useSavings } from "./useSavings";

interface BucketSavingsButtonProps {
  bucket: string;
  disabled?: boolean;
}

export function BucketSavingsButton({ bucket, disabled }: BucketSavingsButtonProps) {
  const mutation = useSavings(bucket);
  const pending = disabled || mutation.isPending;

  return (
    <Button
      variant="secondary"
      className="h-9 w-9 p-0"
      disabled={pending}
      onClick={() => mutation.mutate()}
      aria-label={pending ? "Computing savings..." : "Compute savings"}
      title={pending ? "Computing savings..." : "Compute savings"}
    >
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
    </Button>
  );
}
