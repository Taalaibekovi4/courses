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

function pickFirstFieldError(d, field) {
  const v = d?.[field];
  if (!v) return "";
  if (Array.isArray(v)) return String(v[0] ?? "");
  if (typeof v === "string") return v;
  return String(v);
}

export default function RegisterPage() {
  const navigate = useNavigate();

  // ✅ swagger fields
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState(""); // first_name
  const [lastName, setLastName] = useState("");   // last_name
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");

  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  const passwordsMatch = password && password === password2;

  const canSubmit = useMemo(() => {
    if (!str(email) || !str(firstName) || !str(lastName) || !password || !password2) return false;
    if (password.length < 8) return false;
    if (!passwordsMatch) return false;
    if (pending) return false;
    return true;
  }, [email, firstName, lastName, password, password2, passwordsMatch, pending]);

  async function onSubmit(e) {
    e.preventDefault();
    if (!canSubmit) return;

    setPending(true);
    setError("");

    try {
      const api = axios.create({ baseURL: getApiBase(), timeout: 20000 });

      await api.post("/auth/register/", {
        email: str(email),
        first_name: str(firstName),
        last_name: str(lastName),
        phone: str(phone) || "",
        password,
        password2,
      });

      navigate("/login");
    } catch (e) {
      const status = e?.response?.status;
      const d = e?.response?.data;

      console.log("REGISTER ERROR:", status, d);

      if (typeof d === "string") return setError(d);
      if (d?.detail) return setError(String(d.detail));

      const emailErr = pickFirstFieldError(d, "email");
      if (emailErr) return setError(emailErr);

      const fnErr = pickFirstFieldError(d, "first_name");
      if (fnErr) return setError(fnErr);

      const lnErr = pickFirstFieldError(d, "last_name");
      if (lnErr) return setError(lnErr);

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
    <div className="min-h-screen bg-white text-black flex items-center justify-center px-4">
      <Card className="w-full max-w-md rounded-2xl border border-black/10 bg-white shadow-[0_18px_60px_rgba(0,0,0,0.10)]">
        <CardHeader className="p-6 sm:p-8">
          <CardTitle className="text-2xl sm:text-3xl font-extrabold">
            Регистрация
          </CardTitle>
          <div className="text-sm text-black/60">
            Создайте аккаунт для доступа к курсам
          </div>
        </CardHeader>

        <CardContent className="p-6 pt-0 sm:p-8 sm:pt-0">
          <form onSubmit={onSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <label className="text-sm text-black/80">Email *</label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={pending}
                className="h-11 bg-white border-black/15 text-black rounded-xl"
              />
            </div>

            {/* ✅ 2 поля */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <label className="text-sm text-black/80">Имя *</label>
                <Input
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  disabled={pending}
                  className="h-11 bg-white border-black/15 text-black rounded-xl"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm text-black/80">Фамилия *</label>
                <Input
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  disabled={pending}
                  className="h-11 bg-white border-black/15 text-black rounded-xl"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm text-black/80">Номер телефона</label>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                disabled={pending}
                className="h-11 bg-white border-black/15 text-black rounded-xl"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm text-black/80">Пароль *</label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={pending}
                className="h-11 bg-white border-black/15 text-black rounded-xl"
              />
              {password && password.length < 8 && (
                <div className="text-xs text-red-600">Минимум 8 символов</div>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm text-black/80">Повторите пароль *</label>
              <Input
                type="password"
                value={password2}
                onChange={(e) => setPassword2(e.target.value)}
                disabled={pending}
                className="h-11 bg-white border-black/15 text-black rounded-xl"
              />
              {password2 && !passwordsMatch && (
                <div className="text-xs text-red-600">Пароли не совпадают</div>
              )}
            </div>

            <Button
              type="submit"
              disabled={!canSubmit}
              className="w-full h-11 rounded-xl bg-[#FFD70A] text-black font-bold hover:bg-[#ffde33]"
            >
              {pending ? "Регистрация..." : "Зарегистрироваться"}
            </Button>

            <div className="text-sm text-center text-black/60">
              Уже есть аккаунт?{" "}
              <Link to="/login" className="font-semibold hover:underline">
                Войти
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
