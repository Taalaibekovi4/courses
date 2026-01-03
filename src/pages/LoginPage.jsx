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
const normLow = (s) => norm(s).toLowerCase();

function getAfterLoginPath(role) {
  const r = normLow(role);
  if (r === "teacher") return "/teacher";
  if (r === "admin") return "/Analystic";
  if (r === "student") return "/dashboard";
  return "/";
}

/**
 * ✅ ВСЕГДА возвращает чистый текст без `non_field_errors:`
 */
function extractErrorMessage(err) {
  const d = err?.response?.data;

  // если сервер вернул строку
  if (typeof d === "string") {
    return d
      .replace(/^non_field_errors\s*:\s*/i, "")
      .trim() || "Неверный email или пароль.";
  }

  // DRF: { non_field_errors: ["..."] }
  if (Array.isArray(d?.non_field_errors) && d.non_field_errors[0]) {
    return String(d.non_field_errors[0]).trim();
  }

  // DRF: { detail: "..." }
  if (d?.detail) {
    return String(d.detail).trim();
  }

  return "Неверный email или пароль.";
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

  // ✅ редирект только если реально залогинен
  useEffect(() => {
    if (!isLoading && user?.role) {
      navigate(getAfterLoginPath(user.role), { replace: true });
    }
  }, [isLoading, user, navigate]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!canSubmit) return;

    setError("");
    setPending(true);

    try {
      const result = await login(norm(email), password);

      // login() вернул true → всё ок, редирект будет в useEffect
      if (result === true) return;

      // если login() вернул объект с ошибкой
      if (result && typeof result === "object") {
        const msg =
          result.error ||
          result.detail ||
          result.message ||
          "Неверный email или пароль.";
        setError(
          String(msg).replace(/^non_field_errors\s*:\s*/i, "").trim()
        );
        return;
      }

      // false / undefined
      setError("Неверный email или пароль.");
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Вход в систему</CardTitle>
          <CardDescription>
            Войдите в аккаунт для доступа к курсам
          </CardDescription>
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
            <Link
              to="/register"
              className="text-blue-700 hover:underline font-medium"
            >
              Регистрация
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default LoginPage;
