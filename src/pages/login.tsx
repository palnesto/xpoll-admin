import { useState } from "react";
import { Navigate, useNavigate, useLocation } from "react-router-dom";
import { useApiMutation } from "@/hooks/useApiMutation";
import { endpoints } from "@/api/endpoints";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAdminAuth } from "@/hooks/useAdminAuth";

export default function AdminLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { user, isLoading } = useAdminAuth();
  const navigate = useNavigate();
  const location = useLocation<{ from?: Location }>();
  const from = location.state?.from?.pathname || "/";

  const login = useApiMutation<
    { email: string; password: string },
    { isSuperAdmin: boolean }
  >({
    route: endpoints.adminLogin,
    method: "POST",
    onSuccess: () => {
      navigate(from, { replace: true });
    },
  });

  if (isLoading) return <p>Loading…</p>;
  if (user) return <Navigate to="/" replace />;

  return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <div className="w-full max-w-md space-y-6">
        <h1 className="text-2xl font-bold text-center">Admin Login</h1>
        <Input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <Button
          className="w-full"
          onClick={() => login.mutate({ email, password })}
          disabled={login.isLoading}
        >
          {login.isLoading ? "Signing in…" : "Sign In"}
        </Button>
      </div>
    </div>
  );
}
