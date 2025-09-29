import { QueryClient } from "@tanstack/react-query";
import { createRootRouteWithContext, createRoute, createRouter, redirect } from "@tanstack/react-router";
import { AppLayout } from "./layout/AppLayout";
import { BucketObjectsPage } from "../pages/BucketObjectsPage";
import { BucketsPage } from "../pages/BucketsPage";
import { ObjectDetailsPage } from "../pages/ObjectDetailsPage";

export interface RouterContext {
  queryClient: QueryClient;
}

const rootRoute = createRootRouteWithContext<RouterContext>()({
  component: AppLayout
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  beforeLoad: () => {
    throw redirect({ to: "/buckets" });
  }
});

const bucketsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/buckets",
  component: BucketsPage
});

const searchValidator = (search: Record<string, unknown>) => ({
  prefix: typeof search.prefix === "string" ? search.prefix : "",
  cursor: typeof search.cursor === "string" ? search.cursor : undefined,
  sort: typeof search.sort === "string" ? search.sort : "modified",
  order: search.order === "asc" ? "asc" : "desc",
  limit:
    typeof search.limit === "number"
      ? search.limit
      : typeof search.limit === "string"
      ? Number.parseInt(search.limit, 10) || 100
      : 100
});

const bucketObjectsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/b/$bucket",
  component: BucketObjectsPage,
  validateSearch: searchValidator
});

const objectDetailsRoute = createRoute({
  getParentRoute: () => bucketObjectsRoute,
  path: "o/$objectKey+",
  component: ObjectDetailsPage,
  validateSearch: searchValidator
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  bucketsRoute,
  bucketObjectsRoute.addChildren([objectDetailsRoute])
]);

export const router = createRouter({
  routeTree,
  context: {
    queryClient: undefined as unknown as QueryClient
  }
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
