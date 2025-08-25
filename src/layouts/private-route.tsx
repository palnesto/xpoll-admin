import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { FullScreenLoader } from "@/components/full-screen-loader";

interface PrivateRouteProps {
  children: ReactNode;
}

export default function PrivateRoute({ children }: PrivateRouteProps) {
  const { authenticated, hasAuthVerdict, isLoading, isError } = useAdminAuth();
  const location = useLocation();

  // While probing /me (or verdict not ready), don't redirect yet.
  if (isLoading || !hasAuthVerdict) {
    return <FullScreenLoader />;
  }

  // Once settled, if unauthenticated → redirect
  if (isError || !authenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
