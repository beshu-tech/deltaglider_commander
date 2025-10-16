export type { ObjectItem, ObjectList } from "../../lib/api/schemas";

export type ObjectSortKey = "name" | "modified" | "size";

export type ObjectsCompressionFilter = "all" | "compressed" | "original";

export interface ObjectsSearchState {
  prefix: string;
  search: string | undefined;
  pageIndex: number;
  sort: ObjectSortKey;
  order: "asc" | "desc";
  limit: number;
  compression: ObjectsCompressionFilter;
}

export const DEFAULT_OBJECTS_SEARCH_STATE: ObjectsSearchState = {
  prefix: "",
  search: undefined,
  pageIndex: 0,
  sort: "modified",
  order: "desc",
  limit: 100,
  compression: "all",
};

export interface CompressionStats {
  variant: "none" | "savings" | "growth";
  percentage: number;
  effectiveSize: number;
  deltaBytes: number;
}
