import { beforeEach, describe, expect, it, vi } from "vitest";

const apiWithAuthMock = vi.hoisted(() => vi.fn());

vi.mock("./authInterceptor", () => ({
  apiWithAuth: (...args: unknown[]) => apiWithAuthMock(...args),
}));

import { bulkDeleteObjects, BULK_DELETE_BATCH_SIZE, type BulkDeleteResponse } from "./endpoints";

describe("bulkDeleteObjects", () => {
  beforeEach(() => {
    apiWithAuthMock.mockReset();
  });

  it("processes keys in batches of five and aggregates results", async () => {
    const keys = Array.from({ length: 7 }, (_, index) => `key-${index + 1}`);
    const responses: BulkDeleteResponse[] = [
      {
        deleted: keys.slice(0, 5),
        errors: [],
        total_requested: 5,
        total_deleted: 5,
        total_errors: 0,
      },
      {
        deleted: [keys[5]],
        errors: [{ key: "key-7", error: "failed" }],
        total_requested: 2,
        total_deleted: 1,
        total_errors: 1,
      },
    ];

    const observedBatches: string[][] = [];
    const batchEvents: unknown[] = [];

    apiWithAuthMock.mockImplementation((_url: unknown, options: unknown) => {
      const opts = options as { body?: string };
      const parsed = JSON.parse(opts.body ?? "{}") as { keys?: string[] };
      observedBatches.push(parsed.keys ?? []);
      const response = responses.shift();
      if (!response) {
        throw new Error("Unexpected batch");
      }
      return Promise.resolve(response);
    });

    const result = await bulkDeleteObjects("test-bucket", keys, {
      onBatchComplete: (event) => batchEvents.push(event),
    });

    expect(apiWithAuthMock).toHaveBeenCalledTimes(2);
    expect(observedBatches).toEqual([keys.slice(0, 5), keys.slice(5)]);
    expect(batchEvents).toEqual([
      {
        batchIndex: 0,
        batchCount: Math.ceil(keys.length / BULK_DELETE_BATCH_SIZE),
        keys: keys.slice(0, 5),
        deleted: keys.slice(0, 5),
        errors: [],
      },
      {
        batchIndex: 1,
        batchCount: Math.ceil(keys.length / BULK_DELETE_BATCH_SIZE),
        keys: keys.slice(5),
        deleted: [keys[5]],
        errors: [{ key: "key-7", error: "failed" }],
      },
    ]);
    expect(result).toEqual({
      deleted: keys.slice(0, 6),
      errors: [{ key: "key-7", error: "failed" }],
      total_requested: keys.length,
      total_deleted: 6,
      total_errors: 1,
    });
  });

  it("skips API calls when no keys are provided", async () => {
    const result = await bulkDeleteObjects("test-bucket", []);

    expect(apiWithAuthMock).not.toHaveBeenCalled();
    expect(result).toEqual({
      deleted: [],
      errors: [],
      total_requested: 0,
      total_deleted: 0,
      total_errors: 0,
    });
  });
});
