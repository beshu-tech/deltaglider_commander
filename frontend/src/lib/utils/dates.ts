import { format, formatDistanceToNow, parseISO } from "date-fns";

export function formatDateTime(iso: string): string {
  const date = parseISO(iso);
  return format(date, "PPpp");
}

export function formatRelativeDate(iso: string): string {
  const date = parseISO(iso);
  return formatDistanceToNow(date, { addSuffix: true });
}
