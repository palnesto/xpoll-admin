import { Suspense, useMemo } from "react";
import { useRoutes, useLocation } from "react-router-dom";
import routes from "~react-pages";
import PrivateRoute from "./layouts/private-route";
import DefaultLayout from "./layouts/default-layout";
import { FullScreenLoader } from "./components/full-screen-loader"; 
import { InkdWorkspaceLayout } from "./layouts/inkd-workspace-layout";

export function App() {
  const location = useLocation();
  const appRoutes = useRoutes(routes);

  const publicPaths = useMemo(() => ["/login", "/test"], []);

  // only this page should stay fullscreen without the left chat workspace layout
  const noLayoutPaths = useMemo(() => ["/inkd","/inkd/create"], []);

  // all INKD sub-pages that should use the shared left chat layout
  const inkdWorkspacePrefixes = useMemo(
    () => [
      "/inkd/inkd-internal-agents",
      "/inkd/inkd-blogs",
    ],
    [],
  );

  const pathname = location.pathname;
  const isPublic = publicPaths.includes(pathname);
  const isNoLayoutPrivate = noLayoutPaths.includes(pathname);

  const isInkdWorkspaceRoute = inkdWorkspacePrefixes.some((prefix) =>
    pathname.startsWith(prefix),
  );

  return (
    <div>
      <Suspense fallback={<FullScreenLoader />}>
        {isPublic ? (
          appRoutes
        ) : isNoLayoutPrivate ? (
          <PrivateRoute>{appRoutes}</PrivateRoute>
        ) : isInkdWorkspaceRoute ? (
          <PrivateRoute>
            <InkdWorkspaceLayout>{appRoutes}</InkdWorkspaceLayout>
          </PrivateRoute>
        ) : (
          <PrivateRoute>
            <DefaultLayout>{appRoutes}</DefaultLayout>
          </PrivateRoute>
        )}
      </Suspense>
    </div>
  );
}