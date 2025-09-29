import { DEFAULT_OBJECTS_SEARCH_STATE, ObjectSortKey, ObjectsCompressionFilter, ObjectsSearchState } from "./types";

type RawSearch = Record<string, unknown> | undefined;

function parseSort(value: unknown): ObjectSortKey {
  return value === "name" || value === "size" || value === "modified"
    ? value
    : DEFAULT_OBJECTS_SEARCH_STATE.sort;
}

function parseOrder(value: unknown): ObjectsSearchState["order"] {
  return value === "asc" ? "asc" : "desc";
}

function parseCompression(value: unknown): ObjectsCompressionFilter {
  if (value === "compressed" || value === "original" || value === "all") {
    return value;
  }
  return DEFAULT_OBJECTS_SEARCH_STATE.compression;
}

function parseLimit(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number.parseInt(value, 10);
    if (!Number.isNaN(parsed)) {
      return parsed;
    }
  }
  return DEFAULT_OBJECTS_SEARCH_STATE.limit;
}

export function normalizeObjectsSearch(raw: RawSearch): ObjectsSearchState {
  const prefix = typeof raw?.prefix === "string" ? raw.prefix : DEFAULT_OBJECTS_SEARCH_STATE.prefix;
  const cursor = typeof raw?.cursor === "string" ? raw.cursor : undefined;
  const sort = parseSort(raw?.sort);
  const order = parseOrder(raw?.order);
  const limit = parseLimit(raw?.limit);
  const compression = parseCompression(raw?.compression);

  return {
    prefix,
    cursor,
    sort,
    order,
    limit,
    compression
  };
}

export function serializeObjectsSearch(state: ObjectsSearchState): Record<string, string | number | undefined> {
  return {
    prefix: state.prefix,
    cursor: state.cursor ?? undefined,
    sort: state.sort,
    order: state.order,
    limit: state.limit,
    compression: state.compression === "all" ? undefined : state.compression
  };
}

export function getCompressionQueryParam(state: ObjectsSearchState): "true" | "false" | "any" {
  if (state.compression === "compressed") {
    return "true";
  }
  if (state.compression === "original") {
    return "false";
  }
  return "any";
}
