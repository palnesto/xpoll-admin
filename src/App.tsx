import { Suspense, useMemo } from "react";
import { useRoutes, useLocation } from "react-router-dom";
import routes from "~react-pages";
import PrivateRoute from "./layouts/private-route";
import DefaultLayout from "./layouts/default-layout";
import { FullScreenLoader } from "./components/full-screen-loader";
// import { useAdminAuth } from "./hooks/useAdminAuth"; // ← remove

export function App() {
  const location = useLocation();
  const appRoutes = useRoutes(routes);

  const publicPaths = useMemo(() => ["/login", "/test"], []);
  const noLayoutPaths = useMemo(
    () => [
      "/inkd",
    ],
    [],
  );

  const pathname = location.pathname;
  const isPublic = publicPaths.includes(pathname);
  const isNoLayoutPrivate = noLayoutPaths.includes(pathname);

  return (
    <div>
      <Suspense fallback={<FullScreenLoader />}>
        {isPublic ? ( 
          appRoutes
        ) : isNoLayoutPrivate ? (
          // Private pages without sidebar/layout
          <PrivateRoute>{appRoutes}</PrivateRoute>
        ) : (
          // Default: private pages wrapped with sidebar layout
          <PrivateRoute>
            <DefaultLayout>{appRoutes}</DefaultLayout>
          </PrivateRoute>
        )}
      </Suspense>
    </div>
  );
}
