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

  const publicPaths = useMemo(() => ["/login"], []);
  const isPublic = publicPaths.includes(location.pathname);

  return (
    <div>
      <Suspense fallback={<FullScreenLoader />}>
        {isPublic ? (
          appRoutes
        ) : (
          <PrivateRoute>
            <DefaultLayout>{appRoutes}</DefaultLayout>
          </PrivateRoute>
        )}
      </Suspense>
    </div>
  );
}
