import { useMemo, useCallback } from "react";
import { useNavigate } from "@tanstack/react-router";

export interface Breadcrumb {
  label: string;
  value: string | null;
  isHome?: boolean;
}

interface UseBreadcrumbsProps {
  bucket: string;
  prefix: string;
  selectedKey?: string | null;
  onPrefixChange: (prefix: string | undefined) => void;
}

export function useBreadcrumbs({ bucket, prefix, selectedKey, onPrefixChange }: UseBreadcrumbsProps) {
  const navigate = useNavigate();

  const breadcrumbSegments = useMemo(() => {
    const normalized = prefix.endsWith("/") ? prefix.slice(0, -1) : prefix;
    return normalized ? normalized.split("/").filter(Boolean) : [];
  }, [prefix]);

  const breadcrumbs = useMemo<Breadcrumb[]>(() => {
    const items: Breadcrumb[] = [
      { label: "Dashboard", value: null, isHome: true },
      { label: bucket, value: "" },
    ];
    breadcrumbSegments.forEach((segment, index) => {
      const value = `${breadcrumbSegments.slice(0, index + 1).join("/")}/`;
      items.push({ label: segment, value });
    });
    if (selectedKey) {
      const label = selectedKey.split("/").pop() ?? selectedKey;
      items.push({ label, value: null });
    }
    return items;
  }, [bucket, breadcrumbSegments, selectedKey]);

  const handleBreadcrumbNavigate = useCallback(
    (value: string | null, isHome?: boolean) => {
      if (value === null && !isHome) return;
      if (isHome) {
        navigate({ to: "/buckets" });
        return;
      }
      onPrefixChange(value ?? undefined);
    },
    [navigate, onPrefixChange],
  );

  return {
    breadcrumbs,
    handleBreadcrumbNavigate,
  };
}
