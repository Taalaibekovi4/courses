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

function extractErrorMessage(err) {
  const d = err?.response?.data;

  if (typeof d === "string") {
    return d.replace(/^non_field_errors\s*:\s*/i, "").trim() || "Неверный email или пароль.";
  }
  if (Array.isArray(d?.non_field_errors) && d.non_field_errors[0]) {
    return String(d.non_field_errors[0]).trim();
  }
  if (d?.detail) return String(d.detail).trim();

  return "Неверный email или пароль.";
}

export function LoginPage() {
  const { login, user, isLoading } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  const canSubmit = useMemo(
    () => !!norm(email) && !!norm(password) && !pending && !isLoading,
    [email, password, pending, isLoading]
  );

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

      if (result === true) return;

      if (result && typeof result === "object") {
        const msg =
          result.error || result.detail || result.message || "Неверный email или пароль.";
        setError(String(msg).replace(/^non_field_errors\s*:\s*/i, "").trim());
        return;
      }

      setError("Неверный email или пароль.");
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="min-h-screen bg-white text-black flex items-center justify-center px-4">
      <Card className="w-full max-w-md rounded-2xl border border-black/10 bg-white shadow-[0_18px_60px_rgba(0,0,0,0.10)]">
        <CardHeader className="p-6 sm:p-8">
          <CardTitle className="text-2xl sm:text-3xl font-extrabold">
            Вход
          </CardTitle>
          <CardDescription className="text-black/60">
            Войдите в аккаунт для доступа к курсам
          </CardDescription>
        </CardHeader>

        <CardContent className="p-6 pt-0 sm:p-8 sm:pt-0">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <label className="text-sm text-black/80">Email</label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={pending || isLoading}
                className="h-11 bg-white border-black/15 text-black rounded-xl"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm text-black/80">Пароль</label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={pending || isLoading}
                className="h-11 bg-white border-black/15 text-black rounded-xl"
              />
            </div>

            <Button
              type="submit"
              disabled={!canSubmit}
              className="w-full h-11 rounded-xl bg-[#FFD70A] text-black font-bold hover:bg-[#ffde33]"
            >
              {pending ? "Входим..." : "Войти"}
            </Button>
          </form>

          <div className="mt-6 text-sm text-black/60 text-center">
            Нет аккаунта?{" "}
            <Link to="/register" className="text-black font-semibold hover:underline">
              Регистрация
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default LoginPage;
