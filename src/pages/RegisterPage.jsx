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

/**
 * Поле "Имя и фамилия" в UI:
 * - любой язык
 * - разрешены пробелы
 * - только буквы
 * - без цифр и спецсимволов
 */
const FULLNAME_REGEX = /^[\p{L}]+(?:\s+[\p{L}]+)*$/u;

/**
 * Swagger: username должен соответствовать ^[\w.@+-]+$
 */
const USERNAME_REGEX = /^[\w.@+-]+$/;

/**
 * Транслитерация (минимальная) + генерация username под Swagger:
 * - пробелы -> _
 * - убираем все кроме [A-Za-z0-9_.@+-]
 * - если имя не латиница -> fallback user + suffix
 *
 * Важно: без бекенда мы НЕ можем хранить "реальное имя" отдельно,
 * поэтому username неизбежно будет латиницей/slug-ом.
 */
function makeSwaggerUsernameFromFullName(fullName) {
  const clean = str(fullName);

  // заменим пробелы на _
  let candidate = clean.replace(/\s+/g, "_");

  // уберем всё, что не проходит swagger-regex
  candidate = candidate.replace(/[^\w.@+-]/g, "");

  // на всякий: если пусто или не валидно — делаем user_xxxx
  if (!candidate || !USERNAME_REGEX.test(candidate)) {
    const suffix = Math.random().toString(36).slice(2, 6);
    candidate = `user_${suffix}`;
  }

  // ограничение swagger maxLength=150
  return candidate.slice(0, 150);
}

function pickFirstFieldError(d, field) {
  const v = d?.[field];
  if (!v) return "";
  if (Array.isArray(v)) return String(v[0] ?? "");
  if (typeof v === "string") return v;
  return String(v);
}

export default function RegisterPage() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState(""); // UI: Имя и фамилия
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");

  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  const fullNameValid = useMemo(() => FULLNAME_REGEX.test(fullName), [fullName]);
  const passwordsMatch = password && password === password2;

  // username который реально пойдет на бек
  const swaggerUsername = useMemo(
    () => makeSwaggerUsernameFromFullName(fullName),
    [fullName]
  );

  const canSubmit = useMemo(() => {
    if (!str(email) || !str(fullName) || !password || !password2) return false;
    if (!fullNameValid) return false;
    if (password.length < 8) return false;
    if (!passwordsMatch) return false;
    if (pending) return false;
    return true;
  }, [email, fullName, password, password2, fullNameValid, passwordsMatch, pending]);

  async function onSubmit(e) {
    e.preventDefault();
    if (!canSubmit) return;

    setPending(true);
    setError("");

    try {
      const api = axios.create({
        baseURL: getApiBase(),
        timeout: 20000,
      });

      // ✅ СТРОГО ПО SWAGGER: только эти поля
      await api.post("/auth/register/", {
        email: str(email),
        username: swaggerUsername,
        phone: str(phone) || "",
        password,
        password2,
      });

      navigate("/login");
    } catch (e) {
      const status = e?.response?.status;
      const d = e?.response?.data;

      console.log("REGISTER ERROR:", status, d);
      console.log("REGISTER ERROR JSON:", JSON.stringify(d, null, 2));

      if (typeof d === "string") {
        setError(d);
        return;
      }
      if (d?.detail) {
        setError(String(d.detail));
        return;
      }

      const emailErr = pickFirstFieldError(d, "email");
      if (emailErr) return setError(emailErr);

      const usernameErr = pickFirstFieldError(d, "username");
      if (usernameErr) return setError(usernameErr);

      const phoneErr = pickFirstFieldError(d, "phone");
      if (phoneErr) return setError(phoneErr);

      const passErr = pickFirstFieldError(d, "password");
      if (passErr) return setError(passErr);

      const pass2Err = pickFirstFieldError(d, "password2");
      if (pass2Err) return setError(pass2Err);

      setError(status === 400 ? "Ошибка регистрации (проверьте данные)" : "Ошибка регистрации");
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

            {/* FULL NAME */}
            <div>
              <label className="text-sm block mb-1">Имя и фамилия *</label>
              <Input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Расул Камалов"
                required
                disabled={pending}
              />
              {!fullNameValid && fullName && (
                <div className="text-xs text-red-500 mt-1">
                  Только буквы и пробелы. Цифры и символы запрещены.
                </div>
              )}

              {/* показываем что реально уйдет на бек */}
              {fullNameValid && fullName && (
                <div className="text-xs text-[var(--sb-muted)] mt-1">
                  
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
