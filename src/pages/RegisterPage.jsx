import React, { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";

import { Card, CardHeader, CardTitle, CardContent } from "../components/ui/card.jsx";
import { Button } from "../components/ui/button.jsx";
import { Input } from "../components/ui/input.jsx";
import { Alert, AlertDescription } from "../components/ui/alert.jsx";

const str = (v) => String(v ?? "").trim();

function getApiBase() {
  const raw =
    (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.VITE_API_URL) ||
    process.env.REACT_APP_API_URL ||
    "/api";
  return str(raw).replace(/\/+$/, "");
}

const USERNAME_REGEX = /^[\w.@+-]+$/;

export default function RegisterPage() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");

  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  const usernameValid = useMemo(() => USERNAME_REGEX.test(username), [username]);
  const passwordsMatch = password && password === password2;

  const canSubmit = useMemo(() => {
    if (!str(email) || !str(username) || !password || !password2) return false;
    if (!usernameValid) return false;
    if (password.length < 8) return false;
    if (!passwordsMatch) return false;
    if (pending) return false;
    return true;
  }, [email, username, password, password2, usernameValid, passwordsMatch, pending]);

  async function onSubmit(e) {
    e.preventDefault();
    if (!canSubmit) return;

    setPending(true);
    setError("");

    try {
      const api = axios.create({ baseURL: getApiBase(), timeout: 20000 });

      await api.post("/auth/register/", {
        email: str(email),
        username: str(username),
        phone: str(phone) || null,
        password,
        password2,
      });

      navigate("/login");
    } catch (e) {
      const d = e?.response?.data;

      if (typeof d === "string") {
        setError(d);
      } else if (d?.email?.[0]) {
        setError(d.email[0]);
      } else if (d?.username?.[0]) {
        setError(d.username[0]);
      } else if (d?.phone?.[0]) {
        setError(d.phone[0]);
      } else if (d?.password?.[0]) {
        setError(d.password[0]);
      } else if (d?.password2?.[0]) {
        setError(d.password2[0]);
      } else if (d?.detail) {
        setError(d.detail);
      } else {
        setError("Ошибка регистрации");
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--sb-bg)] px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Регистрация</CardTitle>
        </CardHeader>

        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* EMAIL */}
            <div>
              <label className="text-sm block mb-1">Email *</label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
                disabled={pending}
              />
            </div>

            {/* USERNAME */}
            <div>
              <label className="text-sm block mb-1">Имя пользователя *</label>
              <Input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="user_name"
                autoComplete="username"
                required
                disabled={pending}
              />
              {!usernameValid && username && (
                <div className="text-xs text-red-500 mt-1">
                  Только буквы, цифры и символы @ . + - _
                </div>
              )}
            </div>

            {/* PHONE */}
            <div>
              <label className="text-sm block mb-1">Номер телефона</label>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+996700000000"
                disabled={pending}
              />
            </div>

            {/* PASSWORD */}
            <div>
              <label className="text-sm block mb-1">Пароль *</label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                required
                disabled={pending}
              />
              {password && password.length < 8 && (
                <div className="text-xs text-red-500 mt-1">Минимум 8 символов</div>
              )}
            </div>

            {/* PASSWORD2 */}
            <div>
              <label className="text-sm block mb-1">Повторите пароль *</label>
              <Input
                type="password"
                value={password2}
                onChange={(e) => setPassword2(e.target.value)}
                autoComplete="new-password"
                required
                disabled={pending}
              />
              {password2 && !passwordsMatch && (
                <div className="text-xs text-red-500 mt-1">Пароли не совпадают</div>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={!canSubmit}>
              {pending ? "Регистрация..." : "Зарегистрироваться"}
            </Button>

            <div className="text-sm text-center text-[var(--sb-muted)]">
              Уже есть аккаунт?{" "}
              <Link to="/login" className="text-[var(--sb-accent)] hover:underline">
                Войти
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
