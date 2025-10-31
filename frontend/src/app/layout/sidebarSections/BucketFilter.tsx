import { Search } from "lucide-react";
import { Input } from "../../../lib/ui/Input";

export interface BucketFilterProps {
  filter: string;
  onFilterChange: (value: string) => void;
}

export function BucketFilter({ filter, onFilterChange }: BucketFilterProps) {
  return (
    <div className="space-y-2">
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ui-text-muted dark:text-ui-text-muted"
          aria-hidden="true"
        />
        <Input
          id="sidebar-filter"
          type="search"
          value={filter}
          onChange={(event) => onFilterChange(event.target.value)}
          placeholder="Filter buckets..."
          className="h-9 border-ui-border bg-ui-surface-active pl-9 text-ui-text placeholder:text-ui-text-muted transition-all focus:border-ui-border-hover focus:ring-2 focus:ring-ui-border-hover/30 dark:border-ui-border-dark/50 dark:bg-ui-surface-active-dark/50 dark:text-ui-text-dark dark:focus:border-ui-border-hover-dark dark:focus:ring-ui-border-hover-dark/30"
        />
      </div>
    </div>
  );
}

export default BucketFilter;
