import { Suspense, useMemo } from "react";
import { useRoutes, useLocation } from "react-router-dom";
import routes from "~react-pages";
import PrivateRoute from "./layouts/private-route";
import DefaultLayout from "./layouts/default-layout";
import { useAdminAuth } from "./hooks/useAdminAuth";

export function App() {
  const location = useLocation();
  const { user } = useAdminAuth();
  const appRoutes = useRoutes(routes);

  const publicPaths = useMemo(() => ["/login"], []);

  const isPublic = publicPaths.includes(location.pathname);
  console.log("user", user);

  return (
    <div>
      <Suspense fallback={<p>Loading…</p>}>
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
