import { useState, useCallback } from "react";
import { useToast } from "../../../app/toast";

interface ManualCopyFallback {
  value: string;
  label: string;
}

interface CopyOptions {
  successMessage: string;
  fallbackLabel: string;
  includeDescription?: boolean;
}

export function useCopyToClipboard() {
  const toast = useToast();
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [manualCopyFallback, setManualCopyFallback] = useState<ManualCopyFallback | null>(null);

  const handleCopyWithFallback = useCallback(
    async (value: string, fieldId: string, options: CopyOptions) => {
      try {
        // Check if clipboard API is available
        if (!navigator.clipboard || !navigator.clipboard.writeText) {
          throw new Error("Clipboard API not available");
        }

        await navigator.clipboard.writeText(value);
        setCopiedField(fieldId);
        toast.push({
          title: options.successMessage,
          description: options.includeDescription ? "Link ready to share" : undefined,
          level: "success",
        });
        window.setTimeout(() => setCopiedField(null), 1500);
      } catch (error) {
        // Show manual copy fallback
        setManualCopyFallback({ value, label: options.fallbackLabel });
        toast.push({
          title: "Clipboard unavailable",
          description: "Use the manual copy option below",
          level: "info",
        });
      }
    },
    [toast],
  );

  const clearFallback = useCallback(() => {
    setManualCopyFallback(null);
  }, []);

  return {
    copiedField,
    manualCopyFallback,
    handleCopyWithFallback,
    clearFallback,
  };
}
