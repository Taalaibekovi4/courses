import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { mockUsers } from "../data/mockData.js";

const AuthContext = createContext(null);

const LS_USER_KEY = "user";
const LS_USERS_KEY = "users"; // тут будут храниться зарегистрированные
const norm = (s) => String(s ?? "").trim();
const lower = (s) => norm(s).toLowerCase();

function safeJsonParse(raw, fallback) {
  try {
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch (e) {
    console.error("JSON parse error:", e);
    return fallback;
  }
}

function getStoredUsers() {
  const stored = safeJsonParse(localStorage.getItem(LS_USERS_KEY), []);
  return Array.isArray(stored) ? stored : [];
}

function setStoredUsers(users) {
  try {
    localStorage.setItem(LS_USERS_KEY, JSON.stringify(users));
  } catch (e) {
    console.error("localStorage set users error:", e);
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // единый список: мок + зарегистрированные
  const allUsers = useMemo(() => {
    const stored = getStoredUsers();
    const base = Array.isArray(mockUsers) ? mockUsers : [];
    return [...base, ...stored];
  }, []);

  useEffect(() => {
    const saved = safeJsonParse(localStorage.getItem(LS_USER_KEY), null);
    if (saved) setUser(saved);
    setIsLoading(false);
  }, []);

  async function login(email, password) {
    const mail = lower(email);
    if (!mail) return false;

    const stored = getStoredUsers();
    const base = Array.isArray(mockUsers) ? mockUsers : [];
    const users = [...base, ...stored];

    // пароль сейчас не проверяем (как у тебя было “мок”)
    const found = users.find((u) => lower(u.email) === mail);
    if (!found) return false;

    setUser(found);
    localStorage.setItem(LS_USER_KEY, JSON.stringify(found));
    return true;
  }

  async function register({ fullName, email, phone, password }) {
    const name = norm(fullName);
    const mail = lower(email);
    const ph = norm(phone);
    const pwd = String(password ?? "");

    if (!name) return { ok: false, error: "Введите ФИО" };
    if (!mail) return { ok: false, error: "Введите Email" };
    if (!ph) return { ok: false, error: "Введите телефон" };
    if (pwd.length < 6) return { ok: false, error: "Пароль минимум 6 символов" };

    const stored = getStoredUsers();
    const base = Array.isArray(mockUsers) ? mockUsers : [];
    const users = [...base, ...stored];

    const exists = users.some((u) => lower(u.email) === mail);
    if (exists) return { ok: false, error: "Такой Email уже зарегистрирован" };

    // создаём нового пользователя (по умолчанию student)
    const newUser = {
      id: `u_${Date.now()}`,
      role: "student",
      name,
      email: mail,
      phone: ph,
      // пароль можно не хранить (демо), но если хочешь — можешь оставить:
      password: pwd,
    };

    const nextStored = [newUser, ...stored];
    setStoredUsers(nextStored);

    // авто-вход после регистрации
    setUser(newUser);
    localStorage.setItem(LS_USER_KEY, JSON.stringify(newUser));

    return { ok: true };
  }

  function logout() {
    setUser(null);
    localStorage.removeItem(LS_USER_KEY);
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, register }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
