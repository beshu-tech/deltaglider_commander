import { QueryClient } from "@tanstack/react-query";
import {
  createRootRouteWithContext,
  createRoute,
  createRouter,
  redirect,
} from "@tanstack/react-router";
import { AppLayout } from "./layout/AppLayout";
import { BucketObjectsPage } from "../pages/BucketObjectsPage";
import { BucketsPage } from "../pages/BucketsPage";
import { ObjectDetailsPage } from "../pages/ObjectDetailsPage";
import { SettingsPage } from "../pages/SettingsPage";
import { UploadPage } from "../pages/UploadPage";
import { EnvironmentsPage } from "../pages/EnvironmentsPage";
import { normalizeObjectsSearch } from "../features/objects/search";

export interface RouterContext {
  queryClient: QueryClient;
}

const rootRoute = createRootRouteWithContext<RouterContext>()({
  component: AppLayout,
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  beforeLoad: () => {
    throw redirect({ to: "/buckets" });
  },
});

const bucketsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/buckets",
  component: BucketsPage,
});

const searchValidator = (search: Record<string, unknown>) => normalizeObjectsSearch(search);

const bucketObjectsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/b/$bucket",
  component: BucketObjectsPage,
  validateSearch: searchValidator,
});

const objectDetailsRoute = createRoute({
  getParentRoute: () => bucketObjectsRoute,
  path: "o/$objectKey+",
  component: ObjectDetailsPage,
  validateSearch: searchValidator,
});

const uploadRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/b/$bucket/upload",
  component: UploadPage,
  validateSearch: searchValidator,
});

const settingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/settings",
  component: SettingsPage,
});

const environmentsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/environments",
  component: EnvironmentsPage,
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  bucketsRoute,
  bucketObjectsRoute.addChildren([objectDetailsRoute]),
  uploadRoute,
  settingsRoute,
  environmentsRoute,
]);

export const router = createRouter({
  routeTree,
  context: {
    queryClient: undefined as unknown as QueryClient,
  },
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
