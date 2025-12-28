import React, { useMemo, useState } from "react";
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

const KG_PREFIX = "+996";
const phoneKG = /^\+996\d{9}$/;

const norm = (s) => String(s ?? "").trim();
const onlyDigits = (s) => String(s ?? "").replace(/\D/g, "");

function normalizeKgPhone(value) {
  const digits = onlyDigits(value);
  const tail = digits.startsWith("996") ? digits.slice(3) : digits;
  const tail9 = tail.slice(0, 9);
  return `${KG_PREFIX}${tail9}`;
}

export function RegisterPage() {
  const navigate = useNavigate();
  const auth = useAuth?.() || {};
  const registerFn = auth.register; // может быть undefined

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState(KG_PREFIX);
  const [password, setPassword] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const phoneValue = useMemo(() => normalizeKgPhone(phone), [phone]);

  const canSubmit = useMemo(() => {
    if (!norm(fullName)) return false;
    if (!norm(email)) return false;
    if (!phoneKG.test(phoneValue)) return false;
    if (String(password || "").length < 6) return false;
    return true;
  }, [fullName, email, phoneValue, password]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (typeof registerFn !== "function") {
      setError("Регистрация ещё не подключена в AuthContext (нет метода register).");
      return;
    }

    const name = norm(fullName);
    const mail = norm(email).toLowerCase();

    if (!name) return setError("Введите ФИО");
    if (!mail) return setError("Введите Email");
    if (!phoneKG.test(phoneValue)) return setError("Телефон должен быть в формате +996XXXXXXXXX");
    if (String(password || "").length < 6) return setError("Пароль минимум 6 символов");

    try {
      setIsLoading(true);

      // ожидаем, что register вернёт true/false (как login)
      const ok = await registerFn({
        fullName: name,
        email: mail,
        phone: phoneValue,
        password,
      });

      if (ok) navigate("/");
      else setError("Не удалось зарегистрироваться. Проверьте данные.");
    } catch (err) {
      console.error("Register error:", err);
      setError("Ошибка регистрации. Попробуйте ещё раз.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Регистрация</CardTitle>
          <CardDescription>Создайте аккаунт для доступа к курсам</CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <label className="text-sm">ФИО</label>
              <Input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Например: Асан Асанов"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm">Email</label>
              <Input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                type="email"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm">Телефон</label>
              <Input
                value={phoneValue}
                onChange={(e) => setPhone(e.target.value)}
                inputMode="tel"
                placeholder="+996700123456"
                required
              />
              <div className="text-xs text-gray-500">
                Формат: <span className="font-medium">+996XXXXXXXXX</span>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm">Пароль</label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Минимум 6 символов"
                required
              />
            </div>

            <Button type="submit" className="w-full" disabled={!canSubmit || isLoading}>
              {isLoading ? "Создаём аккаунт..." : "Зарегистрироваться"}
            </Button>
          </form>

          <div className="mt-5 text-sm text-gray-600">
            Уже есть аккаунт?{" "}
            <Link to="/login" className="text-blue-700 hover:underline font-medium">
              Войти
            </Link>
          </div>

          <div className="mt-6 p-4 bg-gray-100 rounded-lg">
            <p className="text-sm mb-2">Подсказка:</p>
            <div className="space-y-1 text-xs text-gray-700">
              <p>• Телефон сам приводится к +996XXXXXXXXX</p>
              <p>• Пароль минимум 6 символов</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default RegisterPage;
