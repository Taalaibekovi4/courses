import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { api, clearTokens, setTokens } from "../lib/api.js";

const AuthContext = createContext(null);

const LS_USER_KEY = "user";
const LS_ACCESS = "access"; // совпадает с твоим api.js

function safeJsonParse(raw, fallback) {
  try {
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch (e) {
    console.error("JSON parse error:", e);
    return fallback;
  }
}

function mapMeToUser(data) {
  if (!data) return null;
  return {
    id: data.id,
    name: data.username || data.name || "",
    email: data.email || "",
    role: data.role || "student",
  };
}

function extractErrorMessage(e) {
  const d = e?.response?.data;

  if (!d) return "Ошибка";
  if (typeof d === "string") return d;

  // DRF часто отдаёт ошибки по полям: { email: ["..."], password: ["..."] }
  if (typeof d === "object") {
    if (d.detail) return String(d.detail);
    if (d.error) return String(d.error);

    const parts = [];
    Object.entries(d).forEach(([k, v]) => {
      if (Array.isArray(v)) parts.push(`${k}: ${v.join(", ")}`);
      else if (typeof v === "string") parts.push(`${k}: ${v}`);
    });
    if (parts.length) return parts.join(" | ");
  }

  return "Ошибка";
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const persistUser = (u) => {
    setUser(u);
    try {
      if (u) localStorage.setItem(LS_USER_KEY, JSON.stringify(u));
      else localStorage.removeItem(LS_USER_KEY);
    } catch (e) {
      console.error("localStorage user error:", e);
    }
  };

  const fetchMe = async () => {
    const res = await api.get("/auth/me/");
    return mapMeToUser(res?.data);
  };

  useEffect(() => {
    (async () => {
      // 1) быстрый UI
      const saved = safeJsonParse(localStorage.getItem(LS_USER_KEY), null);
      if (saved) setUser(saved);

      // ✅ 2) НЕ долбим /auth/me/ если вообще нет access
      const hasAccess = !!localStorage.getItem(LS_ACCESS);
      if (!hasAccess) {
        persistUser(null);
        setIsLoading(false);
        return;
      }

      try {
        const me = await fetchMe();
        persistUser(me);
      } catch (e) {
        persistUser(null);
      } finally {
        setIsLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function login(email, password) {
    try {
      const res = await api.post("/auth/login/", { email, password });
      const access = res?.data?.access;
      const refresh = res?.data?.refresh;
      if (!access || !refresh) return { ok: false, error: "Неверный ответ от сервера" };

      setTokens({ access, refresh });

      const me = await fetchMe();
      persistUser(me);

      return { ok: true };
    } catch (e) {
      return { ok: false, error: extractErrorMessage(e) || "Ошибка входа" };
    }
  }

  async function register({ email, phone, password, password2 }) {
    try {
      // ✅ если password2 не передали — делаем = password (частая причина 400)
      const payload = {
        email,
        phone: phone || "",
        password,
        password2: password2 || password,
      };

      await api.post("/auth/register/", payload);

      // после регистрации — логин
      const r = await login(email, password);
      return r.ok ? { ok: true } : { ok: false, error: r.error || "Регистрация прошла, но вход не выполнен" };
    } catch (e) {
      return { ok: false, error: extractErrorMessage(e) || "Ошибка регистрации" };
    }
  }

  function logout() {
    clearTokens();
    persistUser(null);
  }

  const value = useMemo(() => ({ user, isLoading, login, logout, register }), [user, isLoading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
