import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext.jsx";

import { Button } from "../components/ui/button.jsx";
import { Input } from "../components/ui/input.jsx";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "../components/ui/card.jsx";
import { Alert, AlertDescription } from "../components/ui/alert.jsx";

const norm = (s) => String(s ?? "").trim();

function getAfterLoginPath(role) {
  const r = norm(role).toLowerCase();
  if (r === "teacher" || r === "admin") return "/teacher";
  if (r === "student") return "/dashboard";
  return "/";
}

export function LoginPage() {
  const { login, user, isLoading } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  const canSubmit = useMemo(() => {
    return !!norm(email) && !!norm(password) && !pending && !isLoading;
  }, [email, password, pending, isLoading]);

  useEffect(() => {
    // Если уже залогинен — не держим на /login
    if (!isLoading && user) {
      navigate(getAfterLoginPath(user.role), { replace: true });
    }
  }, [isLoading, user, navigate]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!canSubmit) return;

    setError("");
    setPending(true);

    try {
      const ok = await login(norm(email), password);

      if (!ok) {
        setError("Неверный email или пароль");
        return;
      }

      // роли подтянутся в AuthContext через /auth/me/
      // но на всякий случай направим на главную, дальше useEffect отработает
      navigate("/", { replace: true });
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Вход в систему</CardTitle>
          <CardDescription>Войдите в аккаунт для доступа к курсам</CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <label className="text-sm">Email</label>
              <Input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                placeholder="name@example.com"
                autoComplete="email"
                required
                disabled={pending || isLoading}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm">Пароль</label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Введите пароль"
                autoComplete="current-password"
                required
                disabled={pending || isLoading}
              />
            </div>

            <Button type="submit" className="w-full" disabled={!canSubmit}>
              {pending ? "Входим..." : "Войти"}
            </Button>
          </form>

          <div className="mt-5 text-sm text-gray-600 text-center">
            Нет аккаунта?{" "}
            <Link to="/register" className="text-blue-700 hover:underline font-medium">
              Регистрация
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default LoginPage;
