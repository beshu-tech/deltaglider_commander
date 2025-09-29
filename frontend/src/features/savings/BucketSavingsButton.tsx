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
      className="gap-2"
      disabled={pending}
      onClick={() => mutation.mutate()}
    >
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
      Compute savings
    </Button>
  );
}
